import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

// Define proxy routes that need special handling
const isProxyRoute = createRouteMatcher([
  '/page-builder(.*)',
  '/contacts(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Protect all routes except public ones
  if (!isPublicRoute(req)) {
    await auth.protect()
    
    // For proxy routes, add headers for downstream apps
    if (isProxyRoute(req)) {
      const { userId, orgId, sessionClaims } = await auth()
      
      if (userId && orgId) {
        // Add headers that proxy apps expect
        const requestHeaders = new Headers(req.headers)
        requestHeaders.set('x-tenant-id', orgId) // Organization ID is tenant ID
        requestHeaders.set('x-user-id', userId)
        requestHeaders.set('x-user-email', sessionClaims?.email as string || '')
        requestHeaders.set('x-user-role', sessionClaims?.org_role as string || 'member')
        
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      }
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}