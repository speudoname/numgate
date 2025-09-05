import { NextRequest, NextResponse } from 'next/server'
import { TenantPagesService, BlobFolder } from '@/lib/blob/tenant-pages'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * Get the tenant ID for komunate.com platform
 * NOTE: This MUST use service key because it's a public query (no auth)
 * and RLS would block it. This is safe because we're only reading
 * the komunate tenant which is public information.
 */
async function getKomunateTenantId(): Promise<string | null> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', 'komunate')
    .single()
  
  return tenant?.id || null
}

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
    const tenantSlug = request.headers.get('x-tenant-slug')
    const isPlatform = request.headers.get('x-platform-mode') === 'true'
    
    // For platform mode, check if it's a system route
    if (isPlatform) {
      const path = params.slug?.join('/') || ''
      
      // These routes have their own handlers
      const systemRoutes = ['api', '_next', 'dashboard', 'login', 'register', 'admin', 'page-builder']
      const isSystemRoute = systemRoutes.some(route => 
        path.startsWith(route) || path === route
      )
      
      if (isSystemRoute) {
        // Let Next.js handle system routes
        return new Response(null, { status: 404 })
      }
      
      // For platform domain root or other pages, serve from komunate tenant blob
      // komunate.com itself is a tenant!
      const komunateTenant = await getKomunateTenantId()
      if (komunateTenant) {
        const pagePath = path || 'index.html'
        const pageResponse = await TenantPagesService.getPage(
          komunateTenant,
          pagePath.includes('.') ? pagePath : `${pagePath}.html`,
          BlobFolder.HOMEPAGE
        )
        
        if (pageResponse) {
          const content = await pageResponse.text()
          return new NextResponse(content, {
            status: 200,
            headers: {
              'Content-Type': pageResponse.headers.get('content-type') || 'text/html',
              'Cache-Control': 'public, max-age=60',
            },
          })
        }
      }
      
      // Platform page not found - return 404
      return new Response('Page not found', { status: 404 })
    }
    
    // Tenant mode - must have tenant ID
    if (!tenantId) {
      return new Response('Tenant not found', { status: 404 })
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
    
    // Fetch the page from Blob storage (from homepage folder)
    const pageResponse = await TenantPagesService.getPage(tenantId, pagePath, BlobFolder.HOMEPAGE)
    
    if (!pageResponse) {
      // Try without .html for exact matches
      const exactResponse = await TenantPagesService.getPage(tenantId, path, BlobFolder.HOMEPAGE)
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