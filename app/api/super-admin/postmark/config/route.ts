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

    // Fetch current shared config
    const { data, error } = await supabaseAdmin
      .from('shared_postmark_config')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
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

    const body = await request.json()
    
    // Check if config exists
    const { data: existing } = await supabaseAdmin
      .from('shared_postmark_config')
      .select('id')
      .single()

    let result
    
    if (existing) {
      // Update existing config
      result = await supabaseAdmin
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
      // Create new config
      result = await supabaseAdmin
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