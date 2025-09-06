import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET - Get tenant settings and subscription info
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant with plan details
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        email,
        settings,
        plan_expires_at,
        is_active,
        created_at,
        plan:plan_id (
          id,
          name,
          display_name,
          description,
          price_monthly,
          price_yearly,
          features,
          limits
        )
      `)
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get user count for the tenant
    const { count: userCount } = await supabaseAdmin
      .from('tenant_users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)

    // Get domain count
    const { count: domainCount } = await supabaseAdmin
      .from('custom_domains')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('verified', true)

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        settings: tenant.settings || {},
        planExpiresAt: tenant.plan_expires_at,
        isActive: tenant.is_active,
        createdAt: tenant.created_at
      },
      subscription: {
        plan: tenant.plan || { name: 'free', display_name: 'Free Plan' },
        expiresAt: tenant.plan_expires_at,
        daysRemaining: tenant.plan_expires_at 
          ? Math.floor((new Date(tenant.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null
      },
      usage: {
        users: userCount || 0,
        domains: domainCount || 0
      }
    })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update tenant settings
export async function PATCH(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, settings } = body

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Only update provided fields
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (settings !== undefined) {
      // Merge settings with existing ones
      const { data: currentTenant } = await supabaseAdmin
        .from('tenants')
        .select('settings')
        .eq('id', tenantId)
        .single()

      updateData.settings = {
        ...(currentTenant?.settings || {}),
        ...settings
      }
    }

    // Update tenant
    const { data: updatedTenant, error: updateError } = await supabaseAdmin
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      tenant: updatedTenant
    })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}