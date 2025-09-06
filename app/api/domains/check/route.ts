import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// POST - Check if a domain already exists and get ownership info
export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json()
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Sanitize domain input
    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
    
    // Use admin client to check across all tenants
    const supabase = supabaseAdmin
    
    const { data: existingDomain, error: fetchError } = await supabase
      .from('custom_domains')
      .select(`
        id,
        domain,
        verified,
        tenant_id,
        created_at,
        tenants (
          id,
          name,
          slug,
          subdomain
        )
      `)
      .eq('domain', cleanDomain)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected for available domains
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!existingDomain) {
      // Domain is available
      return NextResponse.json({ 
        available: true,
        domain: cleanDomain
      })
    }

    // Domain exists - return ownership info without sensitive details
    return NextResponse.json({
      available: false,
      domain: cleanDomain,
      owner: {
        tenant_name: (existingDomain.tenants as any)?.name || 'Unknown',
        tenant_slug: (existingDomain.tenants as any)?.slug || 'unknown',
        added_date: existingDomain.created_at,
        verified: existingDomain.verified
      }
    })
  } catch (error) {
    console.error('Domain check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}