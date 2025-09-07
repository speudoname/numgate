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

    if (!serverId || !serverToken || !trackingType) {
      return NextResponse.json(
        { error: 'serverId, serverToken, and trackingType are required' },
        { status: 400 }
      )
    }

    // Update tracking settings on Postmark
    const response = await fetch(`https://api.postmarkapp.com/servers/${serverId}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': serverToken
      },
      body: JSON.stringify({
        [trackingType === 'opens' ? 'TrackOpens' : 'TrackLinks']: enabled ? 'HtmlAndText' : 'None'
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