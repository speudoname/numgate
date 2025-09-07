import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin
    const isSuperAdmin = request.headers.get('x-is-super-admin')
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all tenants
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (tenantsError) {
      throw tenantsError
    }

    // For each tenant, get user count, domain count, and app access
    const tenantsWithDetails = await Promise.all(
      tenants.map(async (tenant) => {
        // Get user count
        const { count: usersCount } = await supabaseAdmin
          .from('tenant_users')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)

        // Get domain count
        const { count: domainsCount } = await supabaseAdmin
          .from('custom_domains')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('verified', true)

        // Get app access
        const { data: appAccess } = await supabaseAdmin
          .from('app_access')
          .select('app_name, enabled')
          .eq('tenant_id', tenant.id)

        // Convert app access to object
        const apps = {
          page_builder: false,
          email: false,
          webinar: false,
          lms: false
        }

        if (appAccess) {
          appAccess.forEach(app => {
            if (app.app_name in apps) {
              apps[app.app_name as keyof typeof apps] = app.enabled
            }
          })
        }

        // Get postmark_id from postmark_settings
        const { data: postmarkSettings } = await supabaseAdmin
          .schema('contacts')
          .from('postmark_settings')
          .select('postmark_id')
          .eq('tenant_id', tenant.id)
          .single()

        return {
          ...tenant,
          postmark_id: postmarkSettings?.postmark_id || null,
          users_count: usersCount || 0,
          domains_count: domainsCount || 0,
          apps
        }
      })
    )

    return NextResponse.json({ tenants: tenantsWithDetails })
  } catch (error) {
    // Error logged server-side only
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    )
  }
}