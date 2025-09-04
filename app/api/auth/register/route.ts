import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/auth/password'
import { generateToken } from '@/lib/auth/jwt'
import type { Tenant, User } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const { tenantName, email, password, name } = await request.json()

    // Validate input
    if (!tenantName || !email || !password) {
      return NextResponse.json(
        { error: 'Tenant name, email and password are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Create slug from tenant name
    const slug = tenantName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Check if slug exists
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('slug')
      .eq('slug', slug)
      .single()

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Tenant name already taken' },
        { status: 400 }
      )
    }

    // Start transaction by creating tenant first
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: tenantName,
        slug,
        email,
        subscription_plan: 'free'
      })
      .select()
      .single()

    if (tenantError || !tenant) {
      console.error('Tenant creation error:', tenantError)
      return NextResponse.json(
        { error: 'Failed to create tenant' },
        { status: 500 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user as owner
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        tenant_id: tenant.id,
        email,
        password_hash: passwordHash,
        name: name || email.split('@')[0],
        role: 'owner',
        permissions: ['all']
      })
      .select()
      .single()

    if (userError || !user) {
      // Rollback: delete tenant
      await supabaseAdmin
        .from('tenants')
        .delete()
        .eq('id', tenant.id)
      
      console.error('User creation error:', userError)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Enable default apps for the tenant
    const defaultApps = ['page_builder', 'email', 'webinar', 'lms']
    const appPromises = defaultApps.map(app => 
      supabaseAdmin
        .from('app_access')
        .insert({
          tenant_id: tenant.id,
          app_name: app,
          enabled: app === 'page_builder' // Only enable page_builder initially
        })
    )
    
    await Promise.all(appPromises)

    // Generate JWT token
    const token = await generateToken({
      tenant_id: tenant.id,
      user_id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    })

    // Create response with data
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
      token
    })

    // Set cookie on the response - use simple settings for development
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: false, // Set to false for localhost
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}