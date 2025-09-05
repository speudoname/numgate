import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase/client'
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

    // Find user by email - This MUST use service key because we need password_hash
    // which should never be exposed via RLS
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if we're on platform or tenant domain
    const isPlatform = isPlatformDomain(host)

    // Get user's tenant memberships - Still needs service key for cross-tenant query
    let { data: memberships, error: membershipError } = await supabaseAdmin
      .from('tenant_users')
      .select(`
        *,
        tenants (
          id,
          name,
          slug,
          email,
          subscription_plan,
          settings
        )
      `)
      .eq('user_id', user.id)

    if (membershipError || !memberships || memberships.length === 0) {
      // User has no tenant memberships - handle legacy users
      // Check if they have a tenant_id (old system)
      if (user.tenant_id) {
        // Migrate this user to new system
        await supabaseAdmin
          .from('tenant_users')
          .insert({
            tenant_id: user.tenant_id,
            user_id: user.id,
            role: user.role || 'admin'
          })
        
        // Retry getting memberships
        const { data: retryMemberships } = await supabaseAdmin
          .from('tenant_users')
          .select(`
            *,
            tenants (*)
          `)
          .eq('user_id', user.id)
        
        if (retryMemberships && retryMemberships.length > 0) {
          memberships = retryMemberships
        }
      } else {
        return NextResponse.json(
          { error: 'No tenant access found' },
          { status: 403 }
        )
      }
    }

    let targetTenant = null
    let userRole = 'member'

    if (!memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: 'No tenant access found' },
        { status: 403 }
      )
    }

    if (isPlatform) {
      // Platform login - user can belong to multiple tenants
      // For now, use their first tenant (later we can show a tenant selector)
      targetTenant = memberships[0].tenants
      userRole = memberships[0].role
    } else {
      // Tenant domain login - verify user belongs to THIS tenant
      if (!tenantIdFromHeader) {
        return NextResponse.json(
          { error: 'Invalid tenant domain' },
          { status: 403 }
        )
      }

      // Find membership for this specific tenant
      const membership = memberships.find(m => m.tenant_id === tenantIdFromHeader)
      
      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this organization' },
          { status: 403 }
        )
      }

      targetTenant = membership.tenants
      userRole = membership.role
    }

    if (!targetTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Get primary verified custom domain for this tenant
    const { data: primaryDomain } = await supabaseAdmin
      .from('custom_domains')
      .select('domain')
      .eq('tenant_id', targetTenant.id)
      .eq('verified', true)
      .eq('is_primary', true)
      .single()

    // Generate JWT token with tenant context
    const token = await generateToken({
      tenant_id: targetTenant.id,
      tenant_slug: targetTenant.slug, // Add tenant slug for super admin check
      user_id: user.id,
      email: user.email,
      role: userRole,
      permissions: user.permissions || [],
      is_super_admin: user.is_super_admin || false
    })

    // Determine redirect URL
    let redirectUrl = '/dashboard' // Default to dashboard on same domain
    
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
        id: user.id,
        email: user.email,
        name: user.name,
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
    // Error logged server-side only
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}