import { NextRequest, NextResponse } from 'next/server'
import { TenantPagesService } from '@/lib/blob/tenant-pages'

/**
 * Catch-all route to serve tenant pages from Blob storage
 * This handles all non-admin routes and serves the appropriate page
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  try {
    // Await params as it's now a Promise in Next.js 15
    const params = await context.params
    
    // Get tenant info from headers (set by middleware)
    const tenantId = request.headers.get('x-tenant-id')
    const isPlatform = request.headers.get('x-platform-mode') === 'true'
    
    // Skip if on platform domain or no tenant found
    if (isPlatform || !tenantId) {
      // Let Next.js handle the route normally
      return new Response(null, { status: 404 })
    }
    
    // Determine which page to serve
    const path = params.slug?.join('/') || 'index.html'
    
    // Don't serve blob content for admin routes
    if (path.startsWith('admin') || 
        path.startsWith('api') || 
        path.startsWith('_next') ||
        path.startsWith('login') ||
        path.startsWith('register')) {
      // Let Next.js handle these routes
      return new Response(null, { status: 404 })
    }
    
    // Add .html extension if no extension present
    const pagePath = path.includes('.') ? path : `${path}.html`
    
    // Fetch the page from Blob storage
    const pageResponse = await TenantPagesService.getPage(tenantId, pagePath)
    
    if (!pageResponse) {
      // Try without .html for exact matches
      const exactResponse = await TenantPagesService.getPage(tenantId, path)
      if (!exactResponse) {
        // Try index.html as fallback
        if (path === 'index.html') {
          // Return a simple 404 page
          return new NextResponse(
            `<!DOCTYPE html>
            <html>
            <head>
              <title>Page Not Found</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  background: #f5f5f5;
                }
                .container {
                  text-align: center;
                  padding: 2rem;
                }
                h1 { color: #333; }
                p { color: #666; }
                a {
                  color: #0070f3;
                  text-decoration: none;
                  font-weight: 500;
                }
                a:hover { text-decoration: underline; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Welcome</h1>
                <p>This site is being set up.</p>
                <p><a href="/admin">Go to Admin Panel</a></p>
              </div>
            </body>
            </html>`,
            {
              status: 200,
              headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
              },
            }
          )
        }
        // Page not found
        return new Response('Page not found', { status: 404 })
      }
      return new NextResponse(await exactResponse.text(), {
        status: 200,
        headers: {
          'Content-Type': exactResponse.headers.get('content-type') || 'text/html',
          'Cache-Control': 'public, max-age=60',
        },
      })
    }
    
    // Return the page content
    const content = await pageResponse.text()
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': pageResponse.headers.get('content-type') || 'text/html',
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (error) {
    console.error('Error serving page from Blob:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}