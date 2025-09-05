import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyPassword } from '@/lib/auth/password'
import { generateToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
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

    // Get tenant information with custom domains
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', user.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Check for verified custom domains
    const { data: customDomains } = await supabaseAdmin
      .from('custom_domains')
      .select('domain')
      .eq('tenant_id', tenant.id)
      .eq('verified', true)
      .limit(1)

    // Generate JWT token
    const token = await generateToken({
      tenant_id: tenant.id,
      user_id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || []
    })

    // Determine redirect URL based on domain
    let redirectUrl = '/dashboard' // Default to dashboard on same domain
    
    // Check if we're on the platform domain (komunate.com)
    const host = request.headers.get('host')
    const isPlatformDomain = host?.includes('localhost') || 
                            host?.includes('komunate.com') || 
                            host?.includes('numgate.vercel.app')
    
    if (isPlatformDomain) {
      // User is logging in from komunate.com
      if (customDomains && customDomains.length > 0) {
        // Redirect to their custom domain
        redirectUrl = `https://${customDomains[0].domain}/dashboard`
      } else {
        // Redirect to subdomain (future feature)
        // For now, stay on platform with dashboard
        redirectUrl = '/dashboard'
      }
    }
    
    // Create response with cookie header
    const response = NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token,
      redirectUrl // Include where frontend should redirect
    }, {
      status: 200,
      headers: {
        'Set-Cookie': `auth-token=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`
      }
    })
    
    console.log('Login successful for:', email)
    console.log('Token generated:', token.substring(0, 20) + '...')
    console.log('Setting cookie with manual header')

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}