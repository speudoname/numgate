import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Check super-admin authorization
    const isSuperAdmin = request.headers.get('x-is-super-admin') === 'true'
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super admin only' },
        { status: 401 }
      )
    }

    // Check if fetching for specific tenant
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId')
    
    let data, error
    
    if (tenantId && tenantId !== 'default') {
      // First try to get tenant-specific config
      const tenantResult = await supabaseAdmin
        .schema('contacts')
        .from('postmark_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()
      
      // Also get default config for fallback sender details
      const defaultResult = await supabaseAdmin
        .schema('contacts')
        .from('shared_postmark_config')
        .select('*')
        .maybeSingle()
      
      if (tenantResult.data) {
        // Merge with defaults for sender details if not set
        data = {
          ...tenantResult.data,
          // Use tenant's sender details if set, otherwise fall back to defaults
          default_from_email: tenantResult.data.default_from_email || defaultResult.data?.default_from_email || 'noreply@komunate.com',
          default_from_name: tenantResult.data.default_from_name || defaultResult.data?.default_from_name || 'Komunate Platform',
          default_reply_to: tenantResult.data.default_reply_to || defaultResult.data?.default_reply_to || 'noreply@komunate.com'
        }
      } else if (!tenantResult.error || tenantResult.error.code === 'PGRST116') {
        // If no tenant-specific config exists, use defaults for sender details
        data = {
          default_from_email: defaultResult.data?.default_from_email || 'noreply@komunate.com',
          default_from_name: defaultResult.data?.default_from_name || 'Komunate Platform',
          default_reply_to: defaultResult.data?.default_reply_to || 'noreply@komunate.com'
        }
      } else {
        // For other errors, use default config
        data = defaultResult.data
        error = defaultResult.error
      }
    } else {
      // Fetch default shared config
      const result = await supabaseAdmin
        .schema('contacts')
        .from('shared_postmark_config')
        .select('*')
        .single()
      data = result.data
      error = result.error
    }

    // Don't treat "not found" as an error - it's expected for new tenants
    if (error && error.code !== 'PGRST116' && error.code !== '42501') {
      console.error('Error fetching config:', error)
      return NextResponse.json(
        { error: 'Failed to fetch configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ currentConfig: data })
    
  } catch (error) {
    console.error('Config fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check super-admin authorization
    const isSuperAdmin = request.headers.get('x-is-super-admin') === 'true'
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super admin only' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId')
    const body = await request.json()
    
    let result
    
    if (tenantId && tenantId !== 'default') {
      // Save tenant-specific config in postmark_settings table
      const { data: existing } = await supabaseAdmin
        .schema('contacts')
        .from('postmark_settings')
        .select('id')
        .eq('tenant_id', tenantId)
        .single()
      
      if (existing) {
        // Update existing tenant config - using correct column names
        result = await supabaseAdmin
          .schema('contacts')
          .from('postmark_settings')
          .update({
            transactional_server_token: body.transactional_server_token,
            transactional_server_id: body.transactional_server_id,
            server_mode: 'dedicated',
            transactional_stream_id: body.transactional_stream_id,
            marketing_stream_id: body.marketing_stream_id,
            marketing_server_token: body.marketing_server_token,
            marketing_server_id: body.marketing_server_id,
            default_from_email: body.default_from_email,
            default_from_name: body.default_from_name,
            default_reply_to: body.default_reply_to,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
      } else {
        // Create new tenant config - using correct column names
        result = await supabaseAdmin
          .schema('contacts')
          .from('postmark_settings')
          .insert({
            tenant_id: tenantId,
            transactional_server_token: body.transactional_server_token,
            transactional_server_id: body.transactional_server_id,
            server_mode: 'dedicated',
            transactional_stream_id: body.transactional_stream_id,
            marketing_stream_id: body.marketing_stream_id,
            marketing_server_token: body.marketing_server_token,
            marketing_server_id: body.marketing_server_id,
            default_from_email: body.default_from_email,
            default_from_name: body.default_from_name,
            default_reply_to: body.default_reply_to
          })
      }
    } else {
      // Save default config in shared_postmark_config table
      const { data: existing } = await supabaseAdmin
        .schema('contacts')
        .from('shared_postmark_config')
        .select('id')
        .single()

      if (existing) {
        // Update existing default config
        result = await supabaseAdmin
          .schema('contacts')
          .from('shared_postmark_config')
          .update({
            transactional_server_token: body.transactional_server_token,
            transactional_server_id: body.transactional_server_id,
            transactional_stream_id: body.transactional_stream_id,
            marketing_server_token: body.marketing_server_token,
            marketing_server_id: body.marketing_server_id,
            marketing_stream_id: body.marketing_stream_id,
            default_from_email: body.default_from_email,
            default_from_name: body.default_from_name,
            default_reply_to: body.default_reply_to,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
      } else {
        // Create new default config
        result = await supabaseAdmin
          .schema('contacts')
          .from('shared_postmark_config')
          .insert({
            transactional_server_token: body.transactional_server_token,
            transactional_server_id: body.transactional_server_id,
            transactional_stream_id: body.transactional_stream_id,
            marketing_server_token: body.marketing_server_token,
            marketing_server_id: body.marketing_server_id,
            marketing_stream_id: body.marketing_stream_id,
            default_from_email: body.default_from_email,
            default_from_name: body.default_from_name,
            default_reply_to: body.default_reply_to
          })
      }
    }

    if (result.error) {
      console.error('Save error:', result.error)
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Config save error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}