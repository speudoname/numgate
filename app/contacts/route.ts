import { NextRequest, NextResponse } from 'next/server'
import { createProxyHeaders, processResponseHeaders } from '@/lib/proxy/proxy-utils'

// This file handles /contacts (root path)
// The [...path]/route.ts handles /contacts/* (sub paths)

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
    const targetUrl = process.env.CONTACTGATE_URL || process.env.NEXT_PUBLIC_CONTACTGATE_URL || 'http://localhost:3001'
    
    // For root path, proxy to /contacts (ContactGate's basePath in production)
    const targetEndpoint = `${targetUrl}/contacts`
    
    // Add query parameters if they exist
    const url = new URL(request.url)
    const finalUrl = url.search ? `${targetEndpoint}${url.search}` : targetEndpoint
    
    // Prepare headers for the proxy request using shared utility
    const proxyHeaders = createProxyHeaders(request)

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

    // Process response headers using shared utility
    const responseHeaders = processResponseHeaders(response.headers)

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