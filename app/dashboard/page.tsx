'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TenantData {
  tenant: {
    id: string
    name: string
    slug: string
    email: string
    subscription_plan: string
    custom_domains: string[]
  }
  user: {
    id: string
    email: string
    name: string
    role: string
  }
  apps: Array<{
    id: string
    app_name: string
    enabled: boolean
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TenantData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTenantData()
  }, [])

  const fetchTenantData = async () => {
    try {
      const response = await fetch('/api/tenant')
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch tenant data')
      }

      const tenantData = await response.json()
      setData(tenantData)
    } catch (err) {
      setError('Failed to load dashboard')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleNavigateToApp = async (appName: string) => {
    if (appName === 'page_builder') {
      // Navigate to page builder - nginx will handle cookie/header passing securely
      window.location.href = '/page-builder'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  const appConfig = {
    page_builder: {
      title: 'Page Builder',
      description: 'Create and manage landing pages',
      icon: '📄',
      color: 'bg-blue-400'
    },
    email: {
      title: 'Email Marketing',
      description: 'Send email campaigns',
      icon: '✉️',
      color: 'bg-green-400'
    },
    webinar: {
      title: 'Webinar Platform',
      description: 'Host online webinars',
      icon: '🎥',
      color: 'bg-purple-400'
    },
    lms: {
      title: 'LMS',
      description: 'Manage courses and lessons',
      icon: '🎓',
      color: 'bg-orange-400'
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
              <p className="text-sm text-gray-600">{data.tenant.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{data.user.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border-2 border-black text-sm font-medium rounded-md bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {data.user.name}!</h2>
          <p className="text-gray-600">Manage your applications and settings</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Plan</h3>
            <p className="text-2xl font-bold capitalize">{data.tenant.subscription_plan}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Role</h3>
            <p className="text-2xl font-bold capitalize">{data.user.role}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Custom Domains</h3>
            <p className="text-2xl font-bold">{data.tenant.custom_domains.length || 0}</p>
          </div>
        </div>

        {/* Applications */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Your Applications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.apps.map((app) => {
              const config = appConfig[app.app_name as keyof typeof appConfig]
              return (
                <div
                  key={app.id}
                  className={`relative bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                    !app.enabled ? 'opacity-60' : 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer'
                  } transition-all`}
                  onClick={() => app.enabled && handleNavigateToApp(app.app_name)}
                >
                  <div className={`text-3xl mb-3`}>{config.icon}</div>
                  <h4 className="text-lg font-bold mb-1">{config.title}</h4>
                  <p className="text-sm text-gray-600 mb-4">{config.description}</p>
                  {app.enabled ? (
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/settings"
            className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <h3 className="text-lg font-bold mb-2">⚙️ Settings</h3>
            <p className="text-sm text-gray-600">Manage your account and organization settings</p>
          </Link>
          <Link
            href="/domains"
            className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <h3 className="text-lg font-bold mb-2">🌐 Domains</h3>
            <p className="text-sm text-gray-600">Add and manage custom domains</p>
          </Link>
        </div>
      </main>
    </div>
  )
}