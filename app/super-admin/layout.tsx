import Link from 'next/link'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-600 text-white border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold">🛡️ Super Admin</h1>
              <p className="text-sm opacity-90">Platform Control Center</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-md hover:bg-red-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                Exit Super Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 py-4">
            <Link
              href="/super-admin"
              className="text-gray-900 hover:text-red-600 px-3 py-2 text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/super-admin/tenants"
              className="text-gray-900 hover:text-red-600 px-3 py-2 text-sm font-medium"
            >
              Tenants
            </Link>
            <Link
              href="/super-admin/apps"
              className="text-gray-900 hover:text-red-600 px-3 py-2 text-sm font-medium"
            >
              App Access
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}