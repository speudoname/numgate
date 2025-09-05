import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vercelDomains } from '@/lib/vercel/domains'

export async function POST(
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

    if (domain.verified) {
      return NextResponse.json({ message: 'Domain already verified' })
    }

    // Check verification status with Vercel
    const vercelStatus = await vercelDomains.verifyDomain(domain.domain)
    
    if (!vercelStatus.verified) {
      // Get fresh status to return DNS records
      const status = await vercelDomains.getDomainStatus(domain.domain)
      
      return NextResponse.json({ 
        error: 'Domain not yet verified',
        message: vercelStatus.message,
        dnsRecords: status.dnsRecords,
        verified: false
      }, { status: 400 })
    }

    // Update domain as verified
    const { error: updateError } = await supabaseAdmin
      .from('custom_domains')
      .update({ 
        verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', resolvedParams.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Also update tenant's custom_domains array
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('custom_domains')
      .eq('id', tenantId)
      .single()

    const currentDomains = tenant?.custom_domains || []
    if (!currentDomains.includes(domain.domain)) {
      await supabaseAdmin
        .from('tenants')
        .update({ 
          custom_domains: [...currentDomains, domain.domain],
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Domain verified successfully!' 
    })
  } catch (error) {
    console.error('Error verifying domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

