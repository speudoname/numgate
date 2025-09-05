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
    // Use admin client since custom JWT doesn't integrate with RLS for domain operations
    const supabase = supabaseAdmin
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the domain from our database
    const { data: domain, error: fetchError } = await supabase
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
      // Check if domain doesn't exist in Vercel
      const notFoundError = vercelStatus.error?.toLowerCase().includes('not found') || 
                           vercelStatus.error?.toLowerCase().includes('domain not found')
      
      if (notFoundError) {
        return NextResponse.json({ 
          error: 'Domain not found in Vercel',
          domainMissing: true,
          domain: {
            ...domain,
            verified: false,
            vercelStatus: 'missing'
          },
          message: 'This domain exists in your account but not in Vercel. Would you like to re-add it?',
          dnsRecords: []
        }, { status: 200 }) // Return 200 so frontend can handle it
      }
      
      // Other errors - return as error without assuming any status
      return NextResponse.json({ 
        error: vercelStatus.error || 'Failed to get domain status',
        domain: {
          ...domain,
          verified: false,
          vercelStatus: 'error'
        },
        message: 'Unable to fetch domain status from Vercel',
        dnsRecords: []
      }, { status: 200 }) // Return 200 so frontend can handle the error gracefully
    }

    // Update our database with current verification status
    if (vercelStatus.verified !== domain.verified) {
      await supabase
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