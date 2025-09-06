import { NextRequest, NextResponse } from 'next/server'

// This file handles /contacts/* (sub paths)
// The parent route.ts handles /contacts (root path)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  return handleProxyRequest(request, 'GET', params.path)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  return handleProxyRequest(request, 'POST', params.path)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  return handleProxyRequest(request, 'PUT', params.path)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  return handleProxyRequest(request, 'DELETE', params.path)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  return handleProxyRequest(request, 'PATCH', params.path)
}

async function handleProxyRequest(
  request: NextRequest,
  method: string,
  pathSegments: string[]
) {
  try {
    // Get the target URL from environment or default
    const targetUrl = process.env.CONTACTGATE_URL || process.env.NEXT_PUBLIC_CONTACTGATE_URL || 'http://localhost:3001'
    
    // Build the full path
    const path = pathSegments.join('/')
    const targetEndpoint = `${targetUrl}/${path}`
    
    // Add query parameters if they exist
    const url = new URL(request.url)
    const finalUrl = url.search ? `${targetEndpoint}${url.search}` : targetEndpoint
    
    // Prepare headers for the proxy request
    const proxyHeaders = new Headers()
    
    // Copy important headers from the original request
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

    // Forward cookies - IMPORTANT: ContactGate needs the auth-token cookie
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      proxyHeaders.set('cookie', cookieHeader)
    }

    // Add custom headers to identify this as a proxied request
    proxyHeaders.set('x-proxied-from', 'numgate')
    proxyHeaders.set('x-original-host', request.headers.get('host') || '')
    proxyHeaders.set('x-forwarded-host', request.headers.get('host') || '')
    proxyHeaders.set('x-forwarded-proto', request.headers.get('x-forwarded-proto') || 'https')

    // Prepare the proxy request options
    const proxyOptions: RequestInit = {
      method,
      headers: proxyHeaders,
    }

    // For requests with body, include the body
    if (method !== 'GET' && method !== 'HEAD') {
      const body = await request.arrayBuffer()
      if (body.byteLength > 0) {
        proxyOptions.body = body
      }
    }

    // Make the proxy request
    const response = await fetch(finalUrl, proxyOptions)

    // Create response headers
    const responseHeaders = new Headers()

    // Copy response headers, but filter out some that might cause issues
    const headersToSkip = new Set([
      'content-encoding',
      'content-length',
      'transfer-encoding',
      'connection',
      'upgrade',
      'x-powered-by'
    ])

    response.headers.forEach((value, key) => {
      if (!headersToSkip.has(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    })

    // Handle different content types
    const contentType = response.headers.get('content-type') || ''
    
    if (contentType.includes('text/html')) {
      // For HTML responses, pass through as-is
      let html = await response.text()
      
      return new NextResponse(html, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      })
    } else if (contentType.includes('application/json')) {
      // For JSON responses, pass through as-is
      const json = await response.text()
      return new NextResponse(json, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      })
    } else {
      // For other content types (images, CSS, JS, etc.), pass through as binary
      const arrayBuffer = await response.arrayBuffer()
      return new NextResponse(arrayBuffer, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      })
    }

  } catch (error) {
    // ContactGate proxy error logged server-side only
    return NextResponse.json(
      { error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}