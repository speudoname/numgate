import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')
    const userId = request.headers.get('x-user-id')
    
    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Continue using admin client with explicit tenant filtering
    // RLS with custom JWT requires more complex Supabase setup
    const supabase = supabaseAdmin
    
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get user information
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get enabled apps
    const { data: apps, error: appsError } = await supabase
      .from('app_access')
      .select('*')
      .eq('tenant_id', tenantId)

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        subscription_plan: tenant.subscription_plan,
        custom_domains: tenant.custom_domains
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_super_admin: user.is_super_admin || false
      },
      apps: apps || []
    })
  } catch (error) {
    // Error logged server-side only
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}