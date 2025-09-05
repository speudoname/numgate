import { NextRequest, NextResponse } from 'next/server'

// This file handles /page-builder (root path)
// The [...path]/route.ts handles /page-builder/* (sub paths)

export async function GET(request: NextRequest) {
  return handleProxyRequest(request, 'GET')
}

export async function POST(request: NextRequest) {
  return handleProxyRequest(request, 'POST')
}

export async function PUT(request: NextRequest) {
  return handleProxyRequest(request, 'PUT')
}

export async function DELETE(request: NextRequest) {
  return handleProxyRequest(request, 'DELETE')
}

export async function PATCH(request: NextRequest) {
  return handleProxyRequest(request, 'PATCH')
}

async function handleProxyRequest(
  request: NextRequest,
  method: string
) {
  try {
    // Get the target URL from environment or default
    const targetUrl = process.env.PAGE_BUILDER_URL || 'http://localhost:3002'
    
    // For root path, proxy to /page-builder on the target
    const targetEndpoint = `${targetUrl}/page-builder`
    
    // Add query parameters if they exist
    const url = new URL(request.url)
    const finalUrl = url.search ? `${targetEndpoint}${url.search}` : targetEndpoint
    
    console.log(`Page builder proxy: ${method} /page-builder -> ${finalUrl}`)

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

    // Forward cookies
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
      // For HTML responses, we need to modify the content to fix relative URLs
      let html = await response.text()
      
      // The page-builder app already serves assets from /page-builder/* paths
      // So we don't need to rewrite those, they should work as-is
      
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
    console.error('Page builder proxy error:', error)
    return NextResponse.json(
      { error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}