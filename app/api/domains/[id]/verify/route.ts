import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vercelDomains } from '@/lib/vercel/domains'

// POST - Trigger domain verification with Vercel
export async function POST(
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

    // Trigger verification with Vercel
    const verificationResult = await vercelDomains.verifyDomain(domain.domain)
    
    // Update our database with the verification status
    if (verificationResult.verified) {
      // Update domain as verified with ssl_status handling
      try {
        await supabase
          .from('custom_domains')
          .update({ 
            verified: true,
            ssl_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', resolvedParams.id)
      } catch (err: any) {
        // If ssl_status column doesn't exist, try without it
        if (err.message?.includes('ssl_status')) {
          await supabase
            .from('custom_domains')
            .update({ 
              verified: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', resolvedParams.id)
        } else {
          throw err
        }
      }

      // Also update tenant's custom_domains array
      const { data: tenant } = await supabase
        .from('tenants')
        .select('custom_domains')
        .eq('id', tenantId)
        .single()

      const currentDomains = tenant?.custom_domains || []
      if (!currentDomains.includes(domain.domain)) {
        await supabase
          .from('tenants')
          .update({ 
            custom_domains: [...currentDomains, domain.domain],
            updated_at: new Date().toISOString()
          })
          .eq('id', tenantId)
      }
    }

    return NextResponse.json({ 
      success: verificationResult.success,
      verified: verificationResult.verified,
      message: verificationResult.message || (verificationResult.verified ? 'Domain verified successfully!' : 'Verification pending'),
      dnsRecords: verificationResult.dnsRecords || []
    })
  } catch (error) {
    console.error('Error verifying domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

