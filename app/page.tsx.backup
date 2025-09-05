import Link from 'next/link'
import { headers } from 'next/headers'

export default async function Home() {
  const headersList = await headers()
  const isPlatform = headersList.get('x-platform-mode') === 'true'
  const isUnknownDomain = headersList.get('x-unknown-domain') === 'true'
  const tenantId = headersList.get('x-tenant-id')
  const tenantName = headersList.get('x-tenant-name')
  const tenantSlug = headersList.get('x-tenant-slug')

  // Unknown domain error
  if (isUnknownDomain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Domain Not Found
          </h1>
          <p className="text-gray-600 mb-8">
            This domain is not registered with our platform.
          </p>
          <Link
            href="https://komunate.com"
            className="text-blue-600 hover:underline"
          >
            Visit komunate.com
          </Link>
        </div>
      </div>
    )
  }

  // Platform mode - show signup page
  if (isPlatform) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
            Welcome to Komunate
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Build your business with our multi-app platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-black text-base font-medium rounded-md text-black bg-yellow-400 hover:bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              Start Your Business
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-black text-base font-medium rounded-md text-black bg-white hover:bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Tenant mode - show tenant's homepage
  // For now, show a simple page. Later this will come from Blob storage
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to {tenantName}
        </h1>
        <p className="text-gray-600 mb-8">
          This is the homepage for {tenantName}. 
          In production, this content will be loaded from your page builder.
        </p>
        <div className="bg-gray-100 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-2">Tenant Information</h2>
          <p>Tenant ID: {tenantId}</p>
          <p>Tenant Slug: {tenantSlug}</p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  )
}