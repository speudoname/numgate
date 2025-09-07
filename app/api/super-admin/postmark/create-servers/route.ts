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
    const { tenantId, postmarkId } = body

    if (!tenantId || !postmarkId) {
      return NextResponse.json(
        { error: 'tenantId and postmarkId are required' },
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

    const transServer = await transServerResponse.json()

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
      
      // If marketing server fails, try to delete the transactional server
      await fetch(`https://api.postmarkapp.com/servers/${transServer.ID}`, {
        method: 'DELETE',
        headers: {
          'X-Postmark-Account-Token': accountToken
        }
      })
      
      return NextResponse.json(
        { error: `Failed to create marketing server: ${error}` },
        { status: marketServerResponse.status }
      )
    }

    const marketServer = await marketServerResponse.json()

    // Configure spam complaint webhook for both servers
    const configureSpamWebhook = async (serverId: number) => {
      await fetch(`https://api.postmarkapp.com/servers/${serverId}`, {
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
    }

    await Promise.all([
      configureSpamWebhook(transServer.ID),
      configureSpamWebhook(marketServer.ID)
    ])

    // Create message streams for both servers (if needed)
    // By default, servers come with 'outbound' (transactional) and 'broadcasts' (broadcast) streams
    // We don't need to create them, but we could create custom ones if needed

    // Save the server configuration to database - using actual database column names
    const { error: dbError } = await supabaseAdmin
      .schema('contacts')
      .from('postmark_settings')
      .upsert({
        tenant_id: tenantId,
        postmark_id: postmarkId,
        server_token: transServer.ApiTokens[0],
        server_id: transServer.ID,
        server_mode: 'dedicated',
        transactional_stream_id: 'outbound',
        marketing_stream_id: 'broadcasts',
        marketing_server_token: marketServer.ApiTokens[0],
        marketing_server_id: marketServer.ID,
        default_from_email: `noreply@${postmarkId.toLowerCase()}.komunate.com`,
        default_from_name: 'Komunate',
        default_reply_to: `support@${postmarkId.toLowerCase()}.komunate.com`,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id'
      })

    if (dbError) {
      console.error('Failed to save server config to database:', dbError)
      // Don't fail the request since servers were created successfully
    }

    return NextResponse.json({
      success: true,
      transactionalServer: {
        ID: transServer.ID,
        Name: transServer.Name,
        ApiToken: transServer.ApiTokens[0],
        TrackOpens: transServer.TrackOpens,
        TrackLinks: transServer.TrackLinks
      },
      marketingServer: {
        ID: marketServer.ID,
        Name: marketServer.Name,
        ApiToken: marketServer.ApiTokens[0],
        TrackOpens: marketServer.TrackOpens,
        TrackLinks: marketServer.TrackLinks
      },
      webhookUrl: WEBHOOK_URL
    })
    
  } catch (error) {
    console.error('Server creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}