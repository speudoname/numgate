'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (token) {
      // Set the token as a cookie
      document.cookie = `auth-token=${token}; path=/; max-age=86400; SameSite=Lax`
      
      // Redirect to dashboard
      router.push('/dashboard')
    } else {
      // No token, redirect to login
      router.push('/login')
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Logging you in...</h2>
        <p className="text-gray-600">Please wait while we complete your login.</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}