import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Middleware already verified super admin status
    const isSuperAdmin = request.headers.get('x-is-super-admin')
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get total tenants
    const { count: totalTenants } = await supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact', head: true })

    // Get active tenants
    const { count: activeTenants } = await supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Get total users
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Get total domains
    const { count: totalDomains } = await supabaseAdmin
      .from('custom_domains')
      .select('*', { count: 'exact', head: true })
      .eq('verified', true)

    // Get app usage stats
    const { data: appStats } = await supabaseAdmin
      .from('app_access')
      .select('app_name, enabled')
      .eq('enabled', true)

    // Count enabled apps
    const appsEnabled = {
      page_builder: 0,
      email: 0,
      webinar: 0,
      lms: 0
    }

    if (appStats) {
      appStats.forEach(app => {
        if (app.app_name in appsEnabled) {
          appsEnabled[app.app_name as keyof typeof appsEnabled]++
        }
      })
    }

    return NextResponse.json({
      totalTenants: totalTenants || 0,
      activeTenants: activeTenants || 0,
      totalUsers: totalUsers || 0,
      totalDomains: totalDomains || 0,
      appsEnabled
    })
  } catch (error) {
    // Error logged server-side only
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}