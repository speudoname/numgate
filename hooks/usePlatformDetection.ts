'use client'

import { useEffect, useState } from 'react'

export function usePlatformDetection() {
  const [isPlatform, setIsPlatform] = useState<boolean | null>(null)
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const hostname = window.location.hostname
    
    // Platform domains (exact matches)
    const platformDomains = [
      'komunate.com',
      'www.komunate.com',
      'localhost',
      'numgate.vercel.app'
    ]
    
    const isPlat = platformDomains.includes(hostname)
    setIsPlatform(isPlat)
    
    // If not platform, extract tenant slug if it's a subdomain
    if (!isPlat && hostname.includes('.komunate.com')) {
      const slug = hostname.split('.')[0]
      setTenantSlug(slug)
    }
  }, [])
  
  return { isPlatform, tenantSlug, isLoading: isPlatform === null }
}