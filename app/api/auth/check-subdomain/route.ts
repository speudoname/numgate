import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { subdomain } = await request.json()

    // Validate subdomain format
    if (!subdomain || subdomain.length < 3) {
      return NextResponse.json(
        { available: false, error: 'Subdomain must be at least 3 characters' },
        { status: 400 }
      )
    }

    // Check if subdomain contains only valid characters
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return NextResponse.json(
        { available: false, error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    // Check if subdomain starts or ends with hyphen
    if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
      return NextResponse.json(
        { available: false, error: 'Subdomain cannot start or end with a hyphen' },
        { status: 400 }
      )
    }

    // Reserved subdomains that cannot be used
    const reservedSubdomains = [
      'www', 'api', 'admin', 'app', 'mail', 'email', 
      'blog', 'help', 'support', 'docs', 'status',
      'komunate', 'dashboard', 'login', 'register'
    ]

    if (reservedSubdomains.includes(subdomain)) {
      return NextResponse.json(
        { available: false, error: 'This subdomain is reserved' },
        { status: 200 }
      )
    }

    // Check if subdomain already exists in database
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('slug')
      .eq('slug', subdomain)
      .single()

    if (existingTenant) {
      return NextResponse.json(
        { available: false },
        { status: 200 }
      )
    }

    // Subdomain is available
    return NextResponse.json(
      { available: true },
      { status: 200 }
    )

  } catch (error) {
    console.error('Subdomain check error:', error)
    return NextResponse.json(
      { available: false, error: 'Failed to check subdomain availability' },
      { status: 500 }
    )
  }
}