import { NextRequest, NextResponse } from 'next/server'
import { createProxyHeaders, processResponseHeaders } from './proxy-utils'

/**
 * Shared proxy handler that consolidates common proxy logic
 * Used by all proxy route files to eliminate code duplication
 */
export class SharedProxyHandler {
  /**
   * Handles proxy requests with common logic for all route types
   */
  static async handleRequest(
    request: NextRequest,
    targetUrl: string,
    method: string,
    pathSegments: string[] = []
  ): Promise<NextResponse> {
    try {
      // Build the target endpoint URL
      const path = pathSegments.length > 0 ? pathSegments.join('/') : ''
      const targetEndpoint = path ? `${targetUrl}/${path}` : targetUrl
      
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
      // Proxy error logged server-side only
      return NextResponse.json(
        { error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  }

  /**
   * Handles proxy requests with HTML content modification for page-builder
   * This is a specialized version that modifies HTML content for page-builder routes
   */
  static async handleRequestWithHtmlModification(
    request: NextRequest,
    targetUrl: string,
    method: string,
    pathSegments: string[] = []
  ): Promise<NextResponse> {
    try {
      // Build the target endpoint URL
      const path = pathSegments.length > 0 ? pathSegments.join('/') : ''
      const targetEndpoint = path ? `${targetUrl}/${path}` : targetUrl
      
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
        // For HTML responses, modify the content to fix relative URLs
        let html = await response.text()
        
        // Replace relative URLs in HTML to point back to the proxy
        html = html.replace(
          /href="\/page-builder/g,
          `href="/page-builder`
        ).replace(
          /src="\/page-builder/g,
          `src="/page-builder`
        ).replace(
          /action="\/page-builder/g,
          `action="/page-builder`
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
      // Proxy error logged server-side only
      return NextResponse.json(
        { error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  }
}
