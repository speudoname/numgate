import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyPassword } from '@/lib/auth/password'
import { generateToken } from '@/lib/auth/jwt'
import { isPlatformDomain } from '@/lib/tenant/lookup'
import { loginSchema } from '@/lib/validations/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const host = request.headers.get('host')
    const tenantIdFromHeader = request.headers.get('x-tenant-id')

    // Validate input with zod
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }
    
    const { email, password } = validation.data

    // OPTIMIZED: Single query to get user with tenant memberships and domains
    // Uses left join for custom_domains to include users without custom domains
    // This reduces 3 separate queries to 1 optimized query
    // IMPORTANT: Specify the exact foreign key relationship to avoid ambiguity
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        tenant_users!tenant_users_user_id_fkey!inner (
          *,
          tenants!inner (
            id,
            name,
            slug,
            email,
            subscription_plan,
            settings,
            custom_domains (
              domain,
              verified,
              is_primary
            )
          )
        )
      `)
      .eq('email', email)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, userData.password_hash)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if we're on platform or tenant domain
    // Pass the pathname to enable dual-mode for komunate.com
    const isPlatform = isPlatformDomain(host, '/api/auth/login')

    // Process the optimized query results
    const memberships = userData.tenant_users || []
    
    if (memberships.length === 0) {
      // Handle legacy users with tenant_id
      if (userData.tenant_id) {
        // Migrate this user to new system
        await supabaseAdmin
          .from('tenant_users')
          .insert({
            tenant_id: userData.tenant_id,
            user_id: userData.id,
            role: userData.role || 'admin'
          })

        // Get tenant details for legacy user
        const { data: legacyTenant } = await supabaseAdmin
          .from('tenants')
          .select(`
            id,
            name,
            slug,
            email,
            subscription_plan,
            settings,
            custom_domains (
              domain,
              verified,
              is_primary
            )
          `)
          .eq('id', userData.tenant_id)
          .single()

        if (legacyTenant) {
          // Process legacy tenant's custom domains for verified primary domain
          const processedLegacyTenant = {
            ...legacyTenant,
            custom_domains: legacyTenant.custom_domains || []
          }
          
          memberships.push({
            tenant_id: legacyTenant.id,
            user_id: userData.id,
            role: userData.role || 'admin',
            tenants: processedLegacyTenant
          })
        }
      }

      if (memberships.length === 0) {
        return NextResponse.json(
          { error: 'No tenant access found' },
          { status: 403 }
        )
      }
    }

    // Determine target tenant
    let targetTenant: any = null
    let userRole: string | null = null

    if (isPlatform) {
      // Platform mode - user can choose tenant
      if (tenantIdFromHeader) {
        // Specific tenant requested
        targetTenant = memberships.find((m: any) => m.tenant_id === tenantIdFromHeader)?.tenants
        userRole = memberships.find((m: any) => m.tenant_id === tenantIdFromHeader)?.role
      } else if (memberships.length === 1) {
        // Only one tenant, auto-select
        targetTenant = memberships[0]?.tenants
        userRole = memberships[0]?.role
      } else {
        // Multiple tenants available - return list for selection
        const availableTenants = memberships.map((m: any) => ({
          id: m.tenants.id,
          name: m.tenants.name,
          slug: m.tenants.slug,
          role: m.role,
          hasCustomDomain: m.tenants.custom_domains?.some((d: any) => d.verified && d.is_primary),
          primaryDomain: m.tenants.custom_domains?.find((d: any) => d.verified && d.is_primary)?.domain
        }))
        
        return NextResponse.json({
          success: true,
          requiresTenantSelection: true,
          tenants: availableTenants,
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name
          }
        }, { status: 200 })
      }
    } else {
      // Tenant mode - need to identify which tenant based on domain
      // Clean the host (remove port and www)
      const cleanHost = host?.toLowerCase()
        .replace(/:\d+$/, '') // Remove port
        .replace(/^www\./, '') // Remove www prefix
      
      // First check if this is a custom domain
      targetTenant = memberships.find((m: any) => {
        const customDomains = m.tenants.custom_domains || []
        return customDomains.some((cd: any) => 
          cd.domain === cleanHost && cd.verified === true
        )
      })?.tenants
      
      if (targetTenant) {
        userRole = memberships.find((m: any) => m.tenants.id === targetTenant.id)?.role
      } else {
        // Not a custom domain, check if it's a subdomain pattern
        // e.g., acme.komunate.com -> slug = acme
        if (cleanHost?.includes('.komunate.com') || cleanHost?.includes('.localhost')) {
          const slug = cleanHost.split('.')[0]
          targetTenant = memberships.find((m: any) => m.tenants.slug === slug)?.tenants
          userRole = memberships.find((m: any) => m.tenants.slug === slug)?.role
        }
      }
    }

    if (!targetTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Get primary verified domain from the optimized query result
    // Filter for verified and primary domains in post-processing
    const primaryDomain = targetTenant.custom_domains?.find(
      (domain: any) => domain.verified === true && domain.is_primary === true
    )

    // Generate JWT token with tenant context
    const token = await generateToken({
      tenant_id: targetTenant.id,
      tenant_slug: targetTenant.slug,
      user_id: userData.id,
      email: userData.email,
      role: userRole || 'user',
      permissions: userData.permissions || [],
      is_super_admin: userData.is_super_admin || false
    })

    // Determine redirect URL
    let redirectUrl = '/dashboard'
    
    if (isPlatform) {
      // Redirect from platform to tenant's domain with token for auto-login
      if (primaryDomain?.domain) {
        // Use verified custom domain with token
        redirectUrl = `https://${primaryDomain.domain}/auth/callback?token=${token}`
      } else {
        // Use subdomain with token (always works)
        redirectUrl = `https://${targetTenant.slug}.komunate.com/auth/callback?token=${token}`
      }
    } else {
      // Already on tenant domain, stay here
      redirectUrl = '/dashboard'
    }
    
    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      tenant: {
        id: targetTenant.id,
        name: targetTenant.name,
        slug: targetTenant.slug
      },
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userRole
      },
      token,
      redirectUrl
    }, {
      status: 200,
      headers: {
        'Set-Cookie': `auth-token=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`
      }
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}