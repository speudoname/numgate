import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// Webhook URL - using Supabase Edge Function
const WEBHOOK_URL = 'https://hbopxprpgvrkucztsvnq.supabase.co/functions/v1/postmark-webhook'

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
    const { tenantId, postmarkId, serverType } = body

    if (!tenantId || !postmarkId || !serverType) {
      return NextResponse.json(
        { error: 'tenantId, postmarkId, and serverType are required' },
        { status: 400 }
      )
    }

    const accountToken = process.env.POSTMARK_ACCOUNT_TOKEN
    if (!accountToken) {
      return NextResponse.json(
        { error: 'POSTMARK_ACCOUNT_TOKEN not configured' },
        { status: 500 }
      )
    }

    let createdServer = null

    if (serverType === 'transactional') {
      // Create transactional server (no tracking)
      const transServerName = `${postmarkId}-trans`
      const transServerResponse = await fetch('https://api.postmarkapp.com/servers', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Account-Token': accountToken
        },
        body: JSON.stringify({
          Name: transServerName,
          Color: 'blue',
          RawEmailEnabled: false,
          SmtpApiActivated: true,
          DeliveryHookUrl: WEBHOOK_URL,
          InboundHookUrl: WEBHOOK_URL,
          BounceHookUrl: WEBHOOK_URL,
          OpenHookUrl: '', // No open tracking for transactional
          PostFirstOpenOnly: false,
          TrackOpens: false, // Disable open tracking for better deliverability
          TrackLinks: 'None', // Disable link tracking
          IncludeBounceContentInHook: true,
          EnableSmtpApiErrorHooks: true
        })
      })

      if (!transServerResponse.ok) {
        const error = await transServerResponse.text()
        return NextResponse.json(
          { error: `Failed to create transactional server: ${error}` },
          { status: transServerResponse.status }
        )
      }

      createdServer = await transServerResponse.json()

      // Configure spam complaint webhook
      await fetch(`https://api.postmarkapp.com/servers/${createdServer.ID}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Account-Token': accountToken
        },
        body: JSON.stringify({
          SpamComplaintHookUrl: WEBHOOK_URL
        })
      })

      // Update database with transactional server info - using correct column names
      const { error: dbError } = await supabaseAdmin
        .schema('contacts')
        .from('postmark_settings')
        .upsert({
          tenant_id: tenantId,
          postmark_id: postmarkId,
          transactional_server_token: createdServer.ApiTokens[0],
          transactional_server_id: createdServer.ID,
          server_mode: 'dedicated',
          transactional_stream_id: 'outbound',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id',
          ignoreDuplicates: false
        })

      if (dbError) {
        console.error('Failed to save transactional server config:', dbError)
      }

      return NextResponse.json({
        success: true,
        transactionalServer: {
          ID: createdServer.ID,
          Name: createdServer.Name,
          ApiToken: createdServer.ApiTokens[0],
          TrackOpens: createdServer.TrackOpens,
          TrackLinks: createdServer.TrackLinks
        }
      })

    } else if (serverType === 'marketing') {
      // Create marketing server (with tracking)
      const marketServerName = `${postmarkId}-market`
      const marketServerResponse = await fetch('https://api.postmarkapp.com/servers', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Account-Token': accountToken
        },
        body: JSON.stringify({
          Name: marketServerName,
          Color: 'green',
          RawEmailEnabled: false,
          SmtpApiActivated: true,
          DeliveryHookUrl: WEBHOOK_URL,
          InboundHookUrl: WEBHOOK_URL,
          BounceHookUrl: WEBHOOK_URL,
          OpenHookUrl: WEBHOOK_URL, // Enable open tracking for marketing
          ClickHookUrl: WEBHOOK_URL, // Enable click tracking for marketing
          PostFirstOpenOnly: false,
          TrackOpens: true, // Enable open tracking for analytics
          TrackLinks: 'HtmlAndText', // Enable link tracking
          IncludeBounceContentInHook: true,
          EnableSmtpApiErrorHooks: true
        })
      })

      if (!marketServerResponse.ok) {
        const error = await marketServerResponse.text()
        return NextResponse.json(
          { error: `Failed to create marketing server: ${error}` },
          { status: marketServerResponse.status }
        )
      }

      createdServer = await marketServerResponse.json()

      // Configure spam complaint webhook
      await fetch(`https://api.postmarkapp.com/servers/${createdServer.ID}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Account-Token': accountToken
        },
        body: JSON.stringify({
          SpamComplaintHookUrl: WEBHOOK_URL
        })
      })

      // Update database with marketing server info
      const { error: dbError } = await supabaseAdmin
        .schema('contacts')
        .from('postmark_settings')
        .upsert({
          tenant_id: tenantId,
          postmark_id: postmarkId,
          marketing_server_token: createdServer.ApiTokens[0],
          marketing_server_id: createdServer.ID,
          marketing_stream_id: 'broadcasts',
          server_mode: 'dedicated',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id',
          ignoreDuplicates: false
        })

      if (dbError) {
        console.error('Failed to save marketing server config:', dbError)
      }

      return NextResponse.json({
        success: true,
        marketingServer: {
          ID: createdServer.ID,
          Name: createdServer.Name,
          ApiToken: createdServer.ApiTokens[0],
          TrackOpens: createdServer.TrackOpens,
          TrackLinks: createdServer.TrackLinks
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid server type. Must be "transactional" or "marketing"' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Server creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}