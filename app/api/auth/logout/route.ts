import { NextResponse } from 'next/server'
import { clearTokenCookie } from '@/lib/auth/jwt'

export async function POST() {
  try {
    // Clear the auth token cookie
    await clearTokenCookie()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}