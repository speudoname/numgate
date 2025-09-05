import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vercelDomains } from '@/lib/vercel/domains'
import crypto from 'crypto'

// GET - List tenant's domains
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: domains, error } = await supabaseAdmin
      .from('custom_domains')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ domains })
  } catch (error) {
    console.error('Error fetching domains:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add new domain
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { domain } = await request.json()
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Clean domain (remove protocol, www, trailing slash)
    const cleanDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')

    // Check if domain already exists
    const { data: existingDomain } = await supabaseAdmin
      .from('custom_domains')
      .select('id')
      .eq('domain', cleanDomain)
      .single()

    if (existingDomain) {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 400 })
    }

    // Add domain to Vercel first
    const vercelResult = await vercelDomains.addDomain(cleanDomain)
    
    if (!vercelResult.success) {
      return NextResponse.json({ 
        error: vercelResult.error || 'Failed to add domain to Vercel' 
      }, { status: 400 })
    }

    // Save to our database
    const { data: newDomain, error } = await supabaseAdmin
      .from('custom_domains')
      .insert({
        tenant_id: tenantId,
        domain: cleanDomain,
        verification_token: vercelResult.domain?.verification?.[0]?.value || '',
        verified: vercelResult.domain?.verified || false,
        ssl_status: vercelResult.domain?.verified ? 'active' : 'pending'
      })
      .select()
      .single()

    if (error) {
      // Rollback Vercel domain if DB save fails
      await vercelDomains.removeDomain(cleanDomain)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      domain: newDomain,
      vercelDomain: vercelResult.domain,
      dnsRecords: vercelResult.dnsRecords,
      message: 'Domain added successfully. Please configure your DNS records.',
      verified: vercelResult.domain?.verified || false
    })
  } catch (error) {
    console.error('Error adding domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}