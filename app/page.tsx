import { headers } from 'next/headers'
import { getTenantByDomain, isPlatformDomain } from '@/lib/tenant/lookup'
import { TenantPagesService, BlobFolder } from '@/lib/blob/tenant-pages'
import { supabaseAdmin } from '@/lib/supabase/server'

async function getKomunateTenantId(): Promise<string | null> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', 'komunate')
    .single()
  
  return tenant?.id || null
}

export default async function HomePage() {
  const headersList = await headers()
  const hostname = headersList.get('host')
  const isPlatform = isPlatformDomain(hostname)
  
  // For platform mode, serve komunate's homepage
  if (isPlatform) {
    const komunateTenant = await getKomunateTenantId()
    if (komunateTenant) {
      const pageResponse = await TenantPagesService.getPage(
        komunateTenant,
        'index.html',
        BlobFolder.HOMEPAGE
      )
      
      if (pageResponse) {
        const content = await pageResponse.text()
        return <div dangerouslySetInnerHTML={{ __html: content }} />
      }
    }
    
    // Fallback for platform without content
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to Komunate</h1>
          <p className="text-lg text-gray-600 mb-8">Multi-tenant platform gateway</p>
          <div className="space-x-4">
            <a href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Login
            </a>
            <a href="/register" className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
              Register
            </a>
          </div>
        </div>
      </div>
    )
  }
  
  // For tenant mode, get tenant and serve their homepage
  const tenant = await getTenantByDomain(hostname)
  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Site Not Found</h1>
          <p className="text-gray-600">This domain is not configured.</p>
        </div>
      </div>
    )
  }
  
  const pageResponse = await TenantPagesService.getPage(
    tenant.id,
    'index.html',
    BlobFolder.HOMEPAGE
  )
  
  if (pageResponse) {
    const content = await pageResponse.text()
    return <div dangerouslySetInnerHTML={{ __html: content }} />
  }
  
  // Fallback for tenant without content
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to {tenant.name}</h1>
        <p className="text-gray-600 mb-8">This site is being set up.</p>
        <a href="/admin" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Go to Admin Panel
        </a>
      </div>
    </div>
  )
}