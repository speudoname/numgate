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

    // OPTIMIZED: Single query to get user with tenant memberships and primary domain
    // This reduces 3 separate queries to 1 optimized query
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        tenant_users!inner (
          *,
          tenants!inner (
            id,
            name,
            slug,
            email,
            subscription_plan,
            settings,
            custom_domains!inner (
              domain
            )
          )
        )
      `)
      .eq('email', email)
      .eq('tenant_users.tenants.custom_domains.verified', true)
      .eq('tenant_users.tenants.custom_domains.is_primary', true)
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
    const isPlatform = isPlatformDomain(host)

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
            custom_domains!inner (
              domain
            )
          `)
          .eq('id', userData.tenant_id)
          .eq('custom_domains.verified', true)
          .eq('custom_domains.is_primary', true)
          .single()

        if (legacyTenant) {
          memberships.push({
            tenant_id: legacyTenant.id,
            user_id: userData.id,
            role: userData.role || 'admin',
            tenants: legacyTenant
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
      } else {
        // Default to first tenant
        targetTenant = memberships[0]?.tenants
        userRole = memberships[0]?.role
      }
    } else {
      // Tenant mode - find matching tenant
      targetTenant = memberships.find((m: any) => m.tenants.slug === host?.split('.')[0])?.tenants
      userRole = memberships.find((m: any) => m.tenants.slug === host?.split('.')[0])?.role
    }

    if (!targetTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Get primary domain from the optimized query result
    const primaryDomain = targetTenant.custom_domains?.[0]

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
      // Redirect from platform to tenant's domain
      if (primaryDomain?.domain) {
        // Use verified custom domain
        redirectUrl = `https://${primaryDomain.domain}/dashboard`
      } else {
        // Use subdomain (always works)
        redirectUrl = `https://${targetTenant.slug}.komunate.com/dashboard`
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