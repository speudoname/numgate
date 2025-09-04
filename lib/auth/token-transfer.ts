// Utility for transferring JWT tokens between apps

export function createAppRedirectUrl(appUrl: string, token: string): string {
  // Create a secure redirect URL with token
  const url = new URL(appUrl)
  
  // We'll use a temporary token transfer mechanism
  // In production, you might want to use a more secure method
  url.searchParams.set('token', token)
  url.searchParams.set('from', 'gateway')
  
  return url.toString()
}

export function extractTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  
  // Clean up URL after extracting token
  if (token) {
    params.delete('token')
    params.delete('from')
    const newUrl = window.location.pathname + 
      (params.toString() ? '?' + params.toString() : '')
    window.history.replaceState({}, '', newUrl)
  }
  
  return token
}