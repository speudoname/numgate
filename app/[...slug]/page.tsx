import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getTenantByDomain } from '@/lib/tenant/lookup'
import { list } from '@vercel/blob'

interface PageProps {
  params: Promise<{
    slug: string[]
  }>
}

export default async function PublishedPage({ params }: PageProps) {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  
  // Build the file path from slug segments
  const filePath = slug.join('/')
  
  // IMPORTANT: Block any path containing "unpublished" - these are draft pages
  if (filePath.includes('unpublished/') || filePath.includes('/unpublished')) {
    return notFound()
  }
  
  try {
    // Get the current domain to identify the tenant
    const headersList = await headers()
    const hostname = headersList.get('host')
    
    if (!hostname) {
      return notFound()
    }
    
    // Get tenant from domain (subdomain or custom domain)
    const tenant = await getTenantByDomain(hostname)
    
    if (!tenant) {
      console.error(`No tenant found for domain: ${hostname}`)
      return notFound()
    }
    
    // Look for the file in blob storage under tenant's folder
    // PageNumGate saves files as: {tenant_id}/path/to/file.html
    const { blobs } = await list({
      prefix: `${tenant.id}/${filePath}`,
      limit: 1
    })
    
    if (blobs.length === 0) {
      // Try with .html extension if not provided
      const { blobs: htmlBlobs } = await list({
        prefix: `${tenant.id}/${filePath}.html`,
        limit: 1
      })
      
      if (htmlBlobs.length === 0) {
        // Try index.html for folder paths
        const { blobs: indexBlobs } = await list({
          prefix: `${tenant.id}/${filePath}/index.html`,
          limit: 1
        })
        
        if (indexBlobs.length === 0) {
          return notFound()
        }
        
        // Serve the index.html
        const response = await fetch(indexBlobs[0].url)
        if (!response.ok) {
          return notFound()
        }
        
        const content = await response.text()
        return (
          <div dangerouslySetInnerHTML={{ __html: content }} />
        )
      }
      
      // Serve the .html file
      const response = await fetch(htmlBlobs[0].url)
      if (!response.ok) {
        return notFound()
      }
      
      const content = await response.text()
      return (
        <div dangerouslySetInnerHTML={{ __html: content }} />
      )
    }
    
    // Fetch and serve the content
    const response = await fetch(blobs[0].url)
    if (!response.ok) {
      return notFound()
    }
    
    const content = await response.text()
    
    // Return the HTML content directly
    return (
      <div dangerouslySetInnerHTML={{ __html: content }} />
    )
  } catch (error) {
    console.error('Error serving published page:', error)
    return notFound()
  }
}

// Generate metadata for the page
export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  const filePath = slug.join('/')
  
  // Extract a title from the path
  const title = filePath
    .replace(/\.html?$/i, '')
    .split('/')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' - ')
  
  return {
    title: title || 'Page',
  }
}