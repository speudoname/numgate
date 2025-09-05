import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vercelDomains } from '@/lib/vercel/domains'

// GET - Get domain details including DNS records
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const tenantId = request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the domain
    const { data: domain, error: fetchError } = await supabaseAdmin
      .from('custom_domains')
      .select('*')
      .eq('id', resolvedParams.id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // If domain is not verified, get DNS records from Vercel
    let dnsRecords: any[] = []
    if (!domain.verified) {
      const status = await vercelDomains.getDomainStatus(domain.domain)
      dnsRecords = status.dnsRecords || []
    }

    return NextResponse.json({ 
      domain,
      dnsRecords
    })
  } catch (error) {
    console.error('Error fetching domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}