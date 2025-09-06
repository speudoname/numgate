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
    // Error logged server-side only
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

    // Try to remove from Vercel with detailed error handling
    try {
      const removeResult = await vercelDomains.removeDomain(domain.domain)
      if (!removeResult.success && removeResult.error) {
        // Check for specific Vercel error patterns
        const errorMessage = removeResult.error.toLowerCase()
        
        if (errorMessage.includes('parked') || errorMessage.includes('parking')) {
          return NextResponse.json({ 
            error: 'Domain is parked elsewhere. Please remove it from the parking service first, then try again.',
            code: 'DOMAIN_PARKED'
          }, { status: 409 })
        }
        
        if (errorMessage.includes('in use') || errorMessage.includes('another project')) {
          return NextResponse.json({ 
            error: 'Domain is in use by another Vercel project. Please remove it from that project first.',
            code: 'DOMAIN_IN_USE'
          }, { status: 409 })
        }
        
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
          // Domain doesn't exist in Vercel - this is OK, continue with database removal
          console.warn(`Domain ${domain.domain} not found in Vercel during deletion - continuing`)
        } else {
          // Other Vercel errors
          return NextResponse.json({ 
            error: `Failed to remove domain from Vercel: ${removeResult.error}`,
            code: 'VERCEL_ERROR'
          }, { status: 500 })
        }
      }
    } catch (vercelError) {
      // Network or unexpected errors
      console.error('Unexpected error removing domain from Vercel:', vercelError)
      return NextResponse.json({ 
        error: 'Failed to communicate with domain service. Please try again.',
        code: 'NETWORK_ERROR'
      }, { status: 500 })
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
    // Error logged server-side only
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}