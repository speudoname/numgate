import { put, del, list, head } from '@vercel/blob'

/**
 * Service for managing tenant pages in Vercel Blob Storage
 * Each tenant's pages are stored under their tenant_id prefix
 */

/**
 * Folder structure for tenant content:
 * - {tenant_id}/homepage/ - Main homepage and site-wide pages
 * - {tenant_id}/landing-pages/ - Marketing and campaign landing pages
 * - {tenant_id}/media/ - Images, videos, and other media assets
 * - {tenant_id}/versions/ - Versioned content (future implementation)
 */
export enum BlobFolder {
  HOMEPAGE = 'homepage',
  LANDING_PAGES = 'landing-pages',
  MEDIA = 'media',
  VERSIONS = 'versions'
}

export class TenantPagesService {
  /**
   * Generate a default index page for new tenants
   */
  static generateDefaultIndexPage(tenantName: string, tenantSlug: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tenantName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
      border: 1px solid rgba(255, 255, 255, 0.18);
      max-width: 600px;
      margin: 0 20px;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    p {
      font-size: 1.2rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }
    .btn {
      display: inline-block;
      padding: 12px 30px;
      background: white;
      color: #667eea;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 600;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      box-shadow: 0 4px 15px 0 rgba(31, 38, 135, 0.2);
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px 0 rgba(31, 38, 135, 0.3);
    }
    .footer {
      margin-top: 3rem;
      font-size: 0.9rem;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to ${tenantName}</h1>
    <p>Your website is being set up. This is your default landing page.</p>
    <a href="/admin" class="btn">Go to Admin Panel</a>
    <div class="footer">
      <p>Customize this page in your admin panel</p>
    </div>
  </div>
</body>
</html>`
  }

  /**
   * Store a page for a tenant in the specified folder
   */
  static async storePage(
    tenantId: string, 
    pagePath: string, 
    content: string,
    contentType: string = 'text/html',
    folder: BlobFolder = BlobFolder.HOMEPAGE
  ): Promise<{ url: string; pathname: string }> {
    const blobPath = `${tenantId}/${folder}/${pagePath}`
    
    const blob = await put(blobPath, content, {
      access: 'public',
      contentType,
      addRandomSuffix: false, // Keep the same path
    })
    
    return {
      url: blob.url,
      pathname: blob.pathname
    }
  }

  /**
   * Get a page for a tenant from the specified folder
   * Falls back to old 'pages' folder for backward compatibility
   */
  static async getPage(
    tenantId: string,
    pagePath: string,
    folder: BlobFolder = BlobFolder.HOMEPAGE
  ): Promise<Response | null> {
    // First try the new folder structure
    const blobPath = `${tenantId}/${folder}/${pagePath}`
    
    try {
      // Try to get the blob metadata first
      let metadata = await head(blobPath)
      
      // If not found in new structure, try old 'pages' folder for backward compatibility
      if (!metadata) {
        const oldPath = `${tenantId}/pages/${pagePath}`
        try {
          metadata = await head(oldPath)
        } catch {
          // Old path also doesn't exist
        }
      }
      
      if (!metadata) return null
      
      // Fetch the actual content
      const response = await fetch(metadata.url)
      return response
    } catch (error) {
      console.error(`Error fetching page ${blobPath}:`, error)
      return null
    }
  }

  /**
   * Delete a page for a tenant from the specified folder
   */
  static async deletePage(
    tenantId: string,
    pagePath: string,
    folder: BlobFolder = BlobFolder.HOMEPAGE
  ): Promise<void> {
    const blobPath = `${tenantId}/${folder}/${pagePath}`
    await del(blobPath)
  }

  /**
   * List all pages for a tenant from the specified folder
   */
  static async listPages(tenantId: string, folder: BlobFolder = BlobFolder.HOMEPAGE) {
    const prefix = `${tenantId}/${folder}/`
    const { blobs } = await list({ prefix })
    
    return blobs.map(blob => ({
      pathname: blob.pathname.replace(prefix, ''),
      size: blob.size,
      uploadedAt: blob.uploadedAt,
      url: blob.url
    }))
  }

  /**
   * List all content across all folders for a tenant
   */
  static async listAllContent(tenantId: string) {
    const folders = Object.values(BlobFolder)
    const allContent: { [key: string]: any[] } = {}
    
    for (const folder of folders) {
      allContent[folder] = await this.listPages(tenantId, folder as BlobFolder)
    }
    
    return allContent
  }

  /**
   * Create default pages for a new tenant
   */
  static async createDefaultPages(tenantId: string, tenantName: string, tenantSlug: string) {
    // Create default index page in homepage folder
    const indexContent = this.generateDefaultIndexPage(tenantName, tenantSlug)
    await this.storePage(tenantId, 'index.html', indexContent, 'text/html', BlobFolder.HOMEPAGE)
    
    // Could add more default pages here (404, about, etc.)
    console.log(`Created default pages for tenant ${tenantId} in homepage folder`)
  }

  /**
   * Copy all pages from one tenant to another (for cloning)
   */
  static async clonePages(sourceTenantId: string, targetTenantId: string) {
    const pages = await this.listPages(sourceTenantId)
    
    for (const page of pages) {
      const response = await this.getPage(sourceTenantId, page.pathname)
      if (response) {
        const content = await response.text()
        await this.storePage(targetTenantId, page.pathname, content)
      }
    }
  }
}

export default TenantPagesService