import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('auth-token')
    const token = authCookie?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify and decode the token
    const payload = await verifyToken(token)
    
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Return user information
    return NextResponse.json({
      user: {
        id: payload.user_id,
        email: payload.email,
        tenant_id: payload.tenant_id,
        role: payload.role
      },
      authenticated: true
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}