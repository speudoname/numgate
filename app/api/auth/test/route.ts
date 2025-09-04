import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')
  
  return NextResponse.json({
    hasAuthToken: !!authToken,
    tokenValue: authToken?.value ? 'Token exists (hidden for security)' : null,
    allCookies: request.cookies.getAll().map(c => c.name)
  })
}