import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/auth/password'
import { generateToken } from '@/lib/auth/jwt'
import { isPlatformDomain } from '@/lib/tenant/lookup'
import { TenantPagesService } from '@/lib/blob/tenant-pages'
import { createPostmarkServersForTenant } from '@/lib/postmark/server-manager'
import type { Tenant, User } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const { tenantName, slug, email, password, name } = await request.json()
    const host = request.headers.get('host')
    
    // Check if this is a platform domain
    // Registration is only allowed on platform domains
    // Pass the pathname to enable dual-mode for komunate.com
    if (!isPlatformDomain(host, '/api/auth/register')) {
      return NextResponse.json(
        { error: 'Registration is not available on tenant domains. Please visit komunate.com to create an account.' },
        { status: 403 }
      )
    }

    // Validate input
    if (!tenantName || !email || !password || !slug) {
      return NextResponse.json(
        { error: 'Organization name, subdomain, email and password are required' },
        { status: 400 }
      )
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug) || slug.length < 3) {
      return NextResponse.json(
        { error: 'Invalid subdomain format' },
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

    // Check if slug exists (double-check, even though frontend checks)
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('slug')
      .eq('slug', slug)
      .single()

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Subdomain already taken' },
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

    // Create tenant_users entry (user as admin of their tenant)
    const { error: membershipError } = await supabaseAdmin
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: 'admin', // Owner becomes admin
        created_by: user.id
      })

    if (membershipError) {
      console.error('Failed to create tenant membership:', membershipError)
      // Don't fail registration, but log the error
    }

    // Create default pages in Blob storage for the new tenant
    try {
      await TenantPagesService.createDefaultPages(tenant.id, tenant.name, tenant.slug)
    } catch (blobError) {
      console.error('Failed to create default pages:', blobError)
      // Don't fail registration if blob creation fails
    }

    // Create Postmark servers for the new tenant
    try {
      const serverCodes = await createPostmarkServersForTenant(tenant.id, tenant.name, tenant.slug)
      if (serverCodes) {
        console.log(`Created Postmark servers for ${tenant.name}:`, serverCodes)
      } else {
        console.warn(`Failed to create Postmark servers for ${tenant.name}`)
      }
    } catch (postmarkError) {
      console.error('Failed to create Postmark servers:', postmarkError)
      // Don't fail registration if Postmark setup fails
    }

    // Generate JWT token
    const token = await generateToken({
      tenant_id: tenant.id,
      tenant_slug: tenant.slug, // Add tenant slug for super admin check
      user_id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      is_super_admin: user.is_super_admin || false
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