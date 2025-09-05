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

    // Use admin client since custom JWT doesn't integrate with RLS for domain operations
    const supabase = supabaseAdmin
    
    const { data: domain, error: fetchError } = await supabase
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

// DELETE - Delete a domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const tenantId = request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client since custom JWT doesn't integrate with RLS for domain operations
    const supabase = supabaseAdmin
    
    const { data: domain, error: fetchError } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('id', resolvedParams.id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Try to remove from Vercel (ignore errors if domain doesn't exist there)
    try {
      await vercelDomains.removeDomain(domain.domain)
    } catch (vercelError) {
      console.warn('Domain may not exist in Vercel:', vercelError)
    }

    // Delete from our database
    const { error: deleteError } = await supabase
      .from('custom_domains')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Update tenant's custom_domains array
    const { data: tenant } = await supabase
      .from('tenants')
      .select('custom_domains')
      .eq('id', tenantId)
      .single()

    if (tenant?.custom_domains) {
      const updatedDomains = tenant.custom_domains.filter((d: string) => d !== domain.domain)
      await supabase
        .from('tenants')
        .update({ 
          custom_domains: updatedDomains,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId)
    }

    return NextResponse.json({ success: true, message: 'Domain deleted successfully' })
  } catch (error) {
    console.error('Error deleting domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}