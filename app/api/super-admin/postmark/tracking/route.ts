import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
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
    const { serverId, serverToken, trackingType, enabled } = body

    if (!serverId || !trackingType) {
      return NextResponse.json(
        { error: 'serverId and trackingType are required' },
        { status: 400 }
      )
    }

    // Get the account token from environment
    const accountToken = process.env.POSTMARK_ACCOUNT_TOKEN
    if (!accountToken) {
      return NextResponse.json(
        { error: 'POSTMARK_ACCOUNT_TOKEN not configured' },
        { status: 500 }
      )
    }

    // Update tracking settings on Postmark using Account token
    const response = await fetch(`https://api.postmarkapp.com/servers/${serverId}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Account-Token': accountToken
      },
      body: JSON.stringify({
        [trackingType === 'opens' ? 'TrackOpens' : 'TrackLinks']: enabled
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `Failed to update tracking: ${error}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    return NextResponse.json({ 
      success: true,
      server: data
    })
    
  } catch (error) {
    console.error('Tracking update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}