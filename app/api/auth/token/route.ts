import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromCookie } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    const token = await getTokenFromCookie()
    
    if (!token) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 })
    }

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Get token error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}