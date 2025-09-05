import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { vercelDomains } from '@/lib/vercel/domains'
import crypto from 'crypto'
import { z } from 'zod'

// Validation schema for adding domain
const addDomainSchema = z.object({
  domain: z.string().min(3).max(255).regex(/^[a-z0-9.-]+$/i, 'Invalid domain format')
})

// GET - List tenant's domains
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use anon client - RLS will ensure tenant isolation
    const supabase = createServerClient(request)
    
    const { data: domains, error } = await supabase
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

    const body = await request.json()
    
    // Validate input
    const validation = addDomainSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }
    
    const { domain } = validation.data

    // Clean domain (remove protocol, www, trailing slash)
    const cleanDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')

    // Check if domain already exists - use anon client
    const supabase = createServerClient(request)
    
    const { data: existingDomain } = await supabase
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
      // Check if error is because domain already exists in Vercel
      if (vercelResult.error?.includes('already exists') || vercelResult.error?.includes('is already in use')) {
        // Try to get existing domain status from Vercel
        const existingStatus = await vercelDomains.getDomainStatus(cleanDomain)
        if (existingStatus.success) {
          // Domain exists in Vercel, continue with our database
          vercelResult.domain = existingStatus.domain
          vercelResult.dnsRecords = existingStatus.dnsRecords
          vercelResult.success = true
        } else {
          return NextResponse.json({ 
            error: vercelResult.error || 'Failed to add domain to Vercel' 
          }, { status: 400 })
        }
      } else {
        return NextResponse.json({ 
          error: vercelResult.error || 'Failed to add domain to Vercel' 
        }, { status: 400 })
      }
    }

    // Check if this is the first domain for this tenant
    const { count } = await supabase
      .from('custom_domains')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    
    // Save to our database - try without ssl_status first in case column doesn't exist
    let dbInsertData: any = {
      tenant_id: tenantId,
      domain: cleanDomain,
      verification_token: vercelResult.domain?.verification?.[0]?.value || '',
      verified: vercelResult.domain?.verified || false,
      is_primary: count === 0 // First domain is automatically primary
    }

    // Try with ssl_status first
    try {
      const { data: newDomain, error } = await supabase
        .from('custom_domains')
        .insert({
          ...dbInsertData,
          ssl_status: vercelResult.domain?.verified ? 'active' : 'pending'
        })
        .select()
        .single()

      if (!error) {
        return NextResponse.json({ 
          domain: newDomain,
          vercelDomain: vercelResult.domain,
          dnsRecords: vercelResult.dnsRecords,
          message: 'Domain added successfully. Please configure your DNS records.',
          verified: vercelResult.domain?.verified || false
        })
      }

      // If ssl_status column doesn't exist, try without it
      if (error.message.includes('ssl_status')) {
        console.warn('ssl_status column not found, inserting without it')
        const { data: newDomainNoSSL, error: errorNoSSL } = await supabase
          .from('custom_domains')
          .insert(dbInsertData)
          .select()
          .single()

        if (!errorNoSSL && newDomainNoSSL) {
          return NextResponse.json({ 
            domain: newDomainNoSSL,
            vercelDomain: vercelResult.domain,
            dnsRecords: vercelResult.dnsRecords,
            message: 'Domain added successfully. Please configure your DNS records.',
            verified: vercelResult.domain?.verified || false
          })
        }
        
        // If still fails, rollback Vercel domain
        await vercelDomains.removeDomain(cleanDomain)
        return NextResponse.json({ error: errorNoSSL?.message || 'Failed to save domain' }, { status: 500 })
      }

      // Other errors - rollback Vercel domain
      await vercelDomains.removeDomain(cleanDomain)
      return NextResponse.json({ error: error.message }, { status: 500 })
      
    } catch (err: any) {
      console.error('Database error:', err)
      // Rollback Vercel domain if DB save fails
      await vercelDomains.removeDomain(cleanDomain)
      return NextResponse.json({ error: err.message || 'Failed to save domain' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error adding domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}