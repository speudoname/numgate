import { NextRequest, NextResponse } from 'next/server'
import { APP_ROUTES } from '@/lib/proxy-config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams.path, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams.path, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams.path, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams.path, 'DELETE')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams.path, 'PATCH')
}

async function handleProxyRequest(
  request: NextRequest,
  path: string[],
  method: string
) {
  try {
    // For the proxy route, the first segment should identify the app
    const appName = path[0] // e.g., "page-builder"
    
    if (appName !== 'page-builder') {
      return NextResponse.json({ error: 'App not supported yet' }, { status: 404 })
    }

    // Get the target URL from environment or default
    const targetUrl = process.env.PAGE_BUILDER_URL || 'http://localhost:3002'
    
    // Reconstruct the path for the target app
    // Remove the first segment (app name) and build the path for the target
    const remainingPath = path.slice(1)
    let targetEndpoint: string
    
    if (remainingPath.length === 0) {
      // Root path: /api/proxy/page-builder -> http://localhost:3002/page-builder
      targetEndpoint = `${targetUrl}/page-builder`
    } else {
      // Sub path: /api/proxy/page-builder/some/path -> http://localhost:3002/page-builder/some/path
      targetEndpoint = `${targetUrl}/page-builder/${remainingPath.join('/')}`
    }
    
    // Add query parameters if they exist
    const url = new URL(request.url)
    if (url.search) {
      targetEndpoint += url.search
    }
    
    // Proxy request to target endpoint

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
    const response = await fetch(targetEndpoint, proxyOptions)

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
      
      // Replace relative URLs in HTML to point back to the proxy
      // This is a simple replacement - you might need more sophisticated URL rewriting
      html = html.replace(
        /href="\/page-builder/g,
        `href="/api/proxy/page-builder`
      ).replace(
        /src="\/page-builder/g,
        `src="/api/proxy/page-builder`
      ).replace(
        /action="\/page-builder/g,
        `action="/api/proxy/page-builder`
      )

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
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}