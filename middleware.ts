import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { APP_ROUTES, getAppFromPath } from '@/lib/proxy-config'
import { getTenantByDomain, isPlatformDomain } from '@/lib/tenant/lookup'

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/register', '/forgot-password']

// API routes that don't require authentication
const publicApiRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/test', '/api/proxy']

// Routes that are handled by route handlers (not pages)
const routeHandlerPaths = ['/page-builder']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host')
  
  // Helper to create response with security headers
  const createSecureResponse = (response: NextResponse) => {
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    // Only set HSTS for production
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    return response
  }

  // Step 1: Detect if this is platform or tenant domain
  const isPlatform = isPlatformDomain(hostname)
  const requestHeaders = new Headers(request.headers)
  
  if (isPlatform) {
    // Platform mode - komunate.com
    requestHeaders.set('x-platform-mode', 'true')
  } else {
    // Tenant mode - check for tenant
    const tenant = await getTenantByDomain(hostname)
    if (tenant) {
      requestHeaders.set('x-tenant-domain', hostname || '')
      requestHeaders.set('x-tenant-id', tenant.id)
      requestHeaders.set('x-tenant-slug', tenant.slug)
      // Encode tenant name to handle non-ASCII characters (like Georgian)
      requestHeaders.set('x-tenant-name', encodeURIComponent(tenant.name))
    } else {
      // Unknown domain - show error page
      requestHeaders.set('x-unknown-domain', 'true')
    }
  }

  // Skip middleware for route handler paths (they handle auth themselves)
  for (const routePath of routeHandlerPaths) {
    if (pathname.startsWith(routePath)) {
      // Still add auth headers if available, but don't block
      const authCookie = request.cookies.get('auth-token')
      const token = authCookie?.value
      
      if (token) {
        const payload = await verifyToken(token)
        if (payload) {
          const requestHeaders = new Headers(request.headers)
          requestHeaders.set('x-tenant-id', payload.tenant_id)
          requestHeaders.set('x-user-id', payload.user_id)
          requestHeaders.set('x-user-email', payload.email)
          requestHeaders.set('x-user-role', payload.role)
          requestHeaders.set('x-auth-token', token)
          
          return NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
        }
      }
      
      // Allow through even without auth (route handler will handle it)
      return NextResponse.next()
    }
  }

  // Allow proxy API routes to pass through without authentication
  if (pathname.startsWith('/api/proxy/')) {
    // For proxy routes, we still need authentication but we handle it in the proxy itself
    // Get token from cookie if available and add to headers
    const authCookie = request.cookies.get('auth-token')
    const token = authCookie?.value
    
    if (token) {
      // Verify token
      const payload = await verifyToken(token)
      if (payload) {
        // Add headers for downstream app
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-tenant-id', payload.tenant_id)
        requestHeaders.set('x-user-id', payload.user_id)
        requestHeaders.set('x-user-email', payload.email)
        requestHeaders.set('x-user-role', payload.role)
        requestHeaders.set('x-auth-token', token)
        
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      }
    }
    
    // Even if no auth, let proxy handle it (it will return appropriate errors)
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Check if this is an app route that needs proxying (for direct access, not through proxy)
  const app = getAppFromPath(pathname)
  if (app) {
    // Get token from cookie for authentication
    const authCookie = request.cookies.get('auth-token')
    const token = authCookie?.value
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Verify token
    const payload = await verifyToken(token)
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth-token')
      return response
    }
    
    // Add headers for downstream app and rewrite cookies
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-tenant-id', payload.tenant_id)
    requestHeaders.set('x-user-id', payload.user_id)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-role', payload.role)
    requestHeaders.set('x-auth-token', token)
    
    // Also set the Page Builder cookie format
    requestHeaders.set('cookie', `pb-auth-token=${token}; ${request.headers.get('cookie') || ''}`)
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Check if it's a public route - still pass tenant/platform headers
  if (publicRoutes.includes(pathname) || publicApiRoutes.includes(pathname)) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Check if it's a super admin route
  if (pathname.startsWith('/super-admin')) {
    const authCookie = request.cookies.get('auth-token')
    const token = authCookie?.value
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    const payload = await verifyToken(token)
    
    if (!payload || !payload.is_super_admin) {
      // Not a super admin, redirect to regular dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    // Add headers and continue
    requestHeaders.set('x-user-id', payload.user_id)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-role', payload.role)
    requestHeaders.set('x-is-super-admin', 'true')
    requestHeaders.set('x-tenant-id', payload.tenant_id)
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Get token from cookie
  const authCookie = request.cookies.get('auth-token')
  const token = authCookie?.value
  
  // No token, redirect to login
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify token
  const payload = await verifyToken(token)
  
  if (!payload) {
    // Invalid token, clear cookie and redirect
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
    
    response.cookies.delete('auth-token')
    return response
  }

  // Add user info to headers for API routes
  requestHeaders.set('x-user-id', payload.user_id)
  requestHeaders.set('x-user-email', payload.email)
  requestHeaders.set('x-user-role', payload.role)
  
  // For tenant ID: use subdomain tenant if available, otherwise use JWT's tenant
  // This allows users to access their tenant data on platform domain too
  if (!requestHeaders.has('x-tenant-id')) {
    // Platform mode - use tenant from JWT
    requestHeaders.set('x-tenant-id', payload.tenant_id)
  }
  // If x-tenant-id is already set (from subdomain), keep it

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}