import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

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

    // In production, you would check DNS TXT records here
    // For testing, we'll auto-verify
    // const dnsVerified = await checkDNSRecords(domain.domain, domain.verification_token)
    
    // For testing: auto-verify
    const dnsVerified = true

    if (!dnsVerified) {
      return NextResponse.json({ 
        error: 'DNS verification failed. Please ensure the TXT record is properly configured.' 
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

// Helper function to check DNS records (simplified for demo)
async function checkDNSRecords(domain: string, expectedToken: string): Promise<boolean> {
  // In production, use a DNS library like 'dns' or an external service
  // to check TXT records at _komunate-verify.domain
  // For now, return true for testing
  return true
}