import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@clerk/nextjs'

export default async function DashboardPage() {
  const { userId, orgId } = await auth()
  const user = await currentUser()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const appConfig = {
    page_builder: {
      title: 'Page Builder',
      description: 'Create and manage landing pages',
      icon: '📄',
      color: 'bg-blue-400',
      enabled: true,
      path: '/page-builder'
    },
    contacts: {
      title: 'Contact Management',
      description: 'Manage leads and customers',
      icon: '👥',
      color: 'bg-indigo-400',
      enabled: true,
      path: '/contacts'
    },
    email: {
      title: 'Email Marketing',
      description: 'Send email campaigns',
      icon: '✉️',
      color: 'bg-green-400',
      enabled: false,
      path: '#'
    },
    webinar: {
      title: 'Webinar Platform',
      description: 'Host online webinars',
      icon: '🎥',
      color: 'bg-purple-400',
      enabled: false,
      path: '#'
    },
    lms: {
      title: 'LMS',
      description: 'Manage courses and lessons',
      icon: '🎓',
      color: 'bg-orange-400',
      enabled: false,
      path: '#'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold">NumGate</h1>
              <p className="text-sm text-gray-600">{orgId || 'Personal'}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.emailAddresses[0]?.emailAddress}</span>
              <SignOutButton>
                <button className="px-4 py-2 border-2 border-black text-sm font-medium rounded-md bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
                  Logout
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.firstName || 'User'}!</h2>
          <p className="text-gray-600">Manage your applications and settings</p>
        </div>

        {/* Applications */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Your Applications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(appConfig).map(([key, config]) => (
              <Link
                key={key}
                href={config.enabled ? config.path : '#'}
                className={`relative bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                  !config.enabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer'
                } transition-all block`}
                onClick={(e) => !config.enabled && e.preventDefault()}
              >
                <div className="text-3xl mb-3">{config.icon}</div>
                <h4 className="text-lg font-bold mb-1">{config.title}</h4>
                <p className="text-sm text-gray-600 mb-4">{config.description}</p>
                {config.enabled ? (
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    Coming Soon
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}