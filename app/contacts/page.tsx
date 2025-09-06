'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCookie } from 'cookies-next'

export default function ContactsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Get the auth token from cookies
    const token = getCookie('auth-token')
    
    if (!token) {
      // No token, redirect to login
      router.push('/login')
      return
    }

    // Get ContactGate URL from environment or use default
    const contactGateUrl = process.env.NEXT_PUBLIC_CONTACTGATE_URL || 'http://localhost:3001'
    
    // Redirect to ContactGate with token
    window.location.href = `${contactGateUrl}?token=${token}`
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Loading Contact Management...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  )
}