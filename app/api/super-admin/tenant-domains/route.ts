import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Check super-admin authorization
    const isSuperAdmin = request.headers.get('x-is-super-admin') === 'true'
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super admin only' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

    // Fetch all verified custom domains for the tenant
    const { data: domains, error } = await supabaseAdmin
      .from('custom_domains')
      .select('domain, verified')
      .eq('tenant_id', tenantId)
      .eq('verified', true)

    if (error) {
      console.error('Failed to fetch tenant domains:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tenant domains' },
        { status: 500 }
      )
    }

    // Also get the tenant's slug as a potential domain
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('slug')
      .eq('id', tenantId)
      .single()

    const allDomains = domains?.map(d => d.domain) || []
    
    // Add the komunate subdomain as a potential domain
    if (tenant?.slug) {
      allDomains.push(`${tenant.slug}.komunate.com`)
    }

    return NextResponse.json({ domains: allDomains })
    
  } catch (error) {
    console.error('Tenant domains fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}