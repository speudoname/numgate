import { NextRequest } from 'next/server'

/**
 * Creates headers for proxying requests to downstream services
 * Includes authentication context and proxy identification
 */
export function createProxyHeaders(request: NextRequest): Headers {
  const proxyHeaders = new Headers()
  
  // Headers to forward from original request
  const headersToForward = [
    'authorization',
    'content-type',
    'user-agent',
    'accept',
    'accept-language',
    'accept-encoding',
    'x-tenant-id',
    'x-user-id',
    'x-user-email',
    'x-user-role',
    'x-auth-token'
  ]

  headersToForward.forEach(headerName => {
    const value = request.headers.get(headerName)
    if (value) {
      proxyHeaders.set(headerName, value)
    }
  })

  // Forward cookies
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    proxyHeaders.set('cookie', cookieHeader)
  }

  // Add proxy identification headers
  proxyHeaders.set('x-proxied-from', 'numgate')
  proxyHeaders.set('x-original-host', request.headers.get('host') || '')
  proxyHeaders.set('x-forwarded-host', request.headers.get('host') || '')
  proxyHeaders.set('x-forwarded-proto', request.headers.get('x-forwarded-proto') || 'https')
  
  // Add proxy secret for security (if configured)
  if (process.env.PROXY_SECRET) {
    proxyHeaders.set('x-proxy-secret', process.env.PROXY_SECRET)
  }
  
  return proxyHeaders
}

/**
 * Headers that should not be forwarded in proxy responses
 */
export const RESPONSE_HEADERS_TO_SKIP = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'upgrade',
  'x-powered-by'
])

/**
 * Process proxy response headers
 */
export function processResponseHeaders(responseHeaders: Headers): Headers {
  const processedHeaders = new Headers()
  
  responseHeaders.forEach((value, key) => {
    if (!RESPONSE_HEADERS_TO_SKIP.has(key.toLowerCase())) {
      processedHeaders.set(key, value)
    }
  })
  
  return processedHeaders
}