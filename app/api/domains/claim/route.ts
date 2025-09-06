import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { 
  generateVerificationToken, 
  getTXTRecordName, 
  cleanDomainName,
  isValidDomain,
  verifyTXTRecord 
} from '@/lib/dns/verification'

// POST - Start domain claim process
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { domain, action } = await request.json()
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const cleanDomain = cleanDomainName(domain)
    
    if (!isValidDomain(cleanDomain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
    }

    const supabase = supabaseAdmin

    if (action === 'start') {
      return handleStartClaim(supabase, cleanDomain, tenantId)
    } else if (action === 'verify') {
      return handleVerifyClaim(supabase, cleanDomain, tenantId)
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "start" or "verify"' }, { status: 400 })
    }
  } catch (error) {
    console.error('Domain claim error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleStartClaim(supabase: any, domain: string, claimingTenantId: string) {
  // Check if domain exists and get current owner
  const { data: existingDomain } = await supabase
    .from('custom_domains')
    .select(`
      id,
      tenant_id,
      verified,
      tenants (
        name,
        slug
      )
    `)
    .eq('domain', domain)
    .single()

  if (!existingDomain) {
    return NextResponse.json({ 
      error: 'Domain not found. You can add it directly without claiming.' 
    }, { status: 404 })
  }

  if (existingDomain.tenant_id === claimingTenantId) {
    return NextResponse.json({ 
      error: 'You already own this domain' 
    }, { status: 400 })
  }

  // Check for existing active claim
  const { data: existingClaim } = await supabase
    .from('domain_claims')
    .select('*')
    .eq('domain', domain)
    .eq('claiming_tenant_id', claimingTenantId)
    .eq('status', 'pending')
    .gte('expires_at', new Date().toISOString())
    .single()

  if (existingClaim) {
    return NextResponse.json({
      success: true,
      claim_exists: true,
      verification_token: existingClaim.verification_token,
      txt_record_name: existingClaim.txt_record_name,
      expires_at: existingClaim.expires_at,
      message: 'Claim already in progress. Use the same TXT record.'
    })
  }

  // Generate new verification token and create claim
  const verificationToken = generateVerificationToken()
  const txtRecordName = getTXTRecordName(domain)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const { data: newClaim, error: claimError } = await supabase
    .from('domain_claims')
    .insert({
      domain,
      claiming_tenant_id: claimingTenantId,
      current_tenant_id: existingDomain.tenant_id,
      verification_token: verificationToken,
      txt_record_name: txtRecordName,
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single()

  if (claimError) {
    console.error('Error creating domain claim:', claimError)
    return NextResponse.json({ error: 'Failed to start claim process' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    verification_token: verificationToken,
    txt_record_name: txtRecordName,
    txt_record_value: verificationToken,
    expires_at: expiresAt.toISOString(),
    current_owner: {
      name: (existingDomain.tenants as any)?.name || 'Unknown',
      slug: (existingDomain.tenants as any)?.slug || 'unknown'
    },
    instructions: {
      step1: `Add a TXT record to your DNS`,
      step2: `Name: ${txtRecordName}`,
      step3: `Value: ${verificationToken}`,
      step4: `Wait for DNS propagation (5-30 minutes)`,
      step5: `Click verify to complete the claim`
    }
  })
}

async function handleVerifyClaim(supabase: any, domain: string, claimingTenantId: string) {
  // Get the claim
  const { data: claim, error: claimError } = await supabase
    .from('domain_claims')
    .select('*')
    .eq('domain', domain)
    .eq('claiming_tenant_id', claimingTenantId)
    .eq('status', 'pending')
    .gte('expires_at', new Date().toISOString())
    .single()

  if (claimError || !claim) {
    return NextResponse.json({ 
      error: 'No active claim found or claim expired. Please start a new claim.' 
    }, { status: 404 })
  }

  // Verify the TXT record
  const verificationResult = await verifyTXTRecord(claim.txt_record_name, claim.verification_token)
  
  if (!verificationResult.success) {
    return NextResponse.json({
      success: false,
      verified: false,
      error: verificationResult.error,
      txt_record_name: claim.txt_record_name,
      txt_record_value: claim.verification_token
    })
  }

  if (!verificationResult.found) {
    return NextResponse.json({
      success: false,
      verified: false,
      error: 'TXT record not found. Please ensure you added the record and wait for DNS propagation.',
      txt_record_name: claim.txt_record_name,
      txt_record_value: claim.verification_token,
      dns_check_result: verificationResult.error
    })
  }

  // TXT record verified! Now transfer the domain
  try {
    // Start transaction by updating domain ownership
    const { error: transferError } = await supabase
      .from('custom_domains')
      .update({
        tenant_id: claimingTenantId,
        updated_at: new Date().toISOString()
      })
      .eq('domain', domain)

    if (transferError) {
      console.error('Error transferring domain:', transferError)
      return NextResponse.json({ error: 'Failed to transfer domain' }, { status: 500 })
    }

    // Update the claim status
    await supabase
      .from('domain_claims')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', claim.id)

    // Update tenant's custom_domains array
    const { data: claimingTenant } = await supabase
      .from('tenants')
      .select('custom_domains')
      .eq('id', claimingTenantId)
      .single()

    if (claimingTenant) {
      const updatedDomains = [...(claimingTenant.custom_domains || []), domain]
      await supabase
        .from('tenants')
        .update({ 
          custom_domains: updatedDomains,
          updated_at: new Date().toISOString()
        })
        .eq('id', claimingTenantId)
    }

    // Remove from previous tenant's custom_domains array
    if (claim.current_tenant_id) {
      const { data: previousTenant } = await supabase
        .from('tenants')
        .select('custom_domains')
        .eq('id', claim.current_tenant_id)
        .single()

      if (previousTenant?.custom_domains) {
        const updatedDomains = previousTenant.custom_domains.filter((d: string) => d !== domain)
        await supabase
          .from('tenants')
          .update({ 
            custom_domains: updatedDomains,
            updated_at: new Date().toISOString()
          })
          .eq('id', claim.current_tenant_id)
      }
    }

    return NextResponse.json({
      success: true,
      verified: true,
      transferred: true,
      message: 'Domain successfully claimed and transferred to your account!',
      domain
    })
  } catch (transferError) {
    console.error('Error during domain transfer:', transferError)
    return NextResponse.json({ error: 'Verification successful but transfer failed. Please contact support.' }, { status: 500 })
  }
}

// GET - Get claim status for a domain
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')
    const url = new URL(request.url)
    const domain = url.searchParams.get('domain')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!domain) {
      return NextResponse.json({ error: 'Domain parameter is required' }, { status: 400 })
    }

    const cleanDomain = cleanDomainName(domain)
    const supabase = supabaseAdmin

    // Get active claim for this domain and tenant
    const { data: claim, error } = await supabase
      .from('domain_claims')
      .select('*')
      .eq('domain', cleanDomain)
      .eq('claiming_tenant_id', tenantId)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .single()

    if (error || !claim) {
      return NextResponse.json({ 
        has_active_claim: false,
        domain: cleanDomain
      })
    }

    return NextResponse.json({
      has_active_claim: true,
      domain: cleanDomain,
      verification_token: claim.verification_token,
      txt_record_name: claim.txt_record_name,
      expires_at: claim.expires_at,
      created_at: claim.created_at
    })
  } catch (error) {
    console.error('Get claim status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}