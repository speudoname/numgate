import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vercelDomains } from '@/lib/vercel/domains'

// GET - Get real-time domain status from Vercel
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

    // Get the domain from our database
    const { data: domain, error: fetchError } = await supabaseAdmin
      .from('custom_domains')
      .select('*')
      .eq('id', resolvedParams.id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Get real-time status from Vercel
    const vercelStatus = await vercelDomains.getDomainStatus(domain.domain)
    
    if (!vercelStatus.success) {
      return NextResponse.json({ 
        error: vercelStatus.error || 'Failed to get domain status',
        domain: {
          ...domain,
          verified: false
        },
        dnsRecords: []
      }, { status: 500 })
    }

    // Update our database with current verification status
    if (vercelStatus.verified !== domain.verified) {
      await supabaseAdmin
        .from('custom_domains')
        .update({ 
          verified: vercelStatus.verified,
          updated_at: new Date().toISOString()
        })
        .eq('id', resolvedParams.id)
    }

    return NextResponse.json({ 
      domain: {
        ...domain,
        verified: vercelStatus.verified, // Use Vercel's real status
        vercelDomain: vercelStatus.domain,
        configStatus: vercelStatus.config
      },
      dnsRecords: vercelStatus.dnsRecords || [],
      verified: vercelStatus.verified
    })
  } catch (error) {
    console.error('Error fetching domain status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}