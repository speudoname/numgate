'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  totalDomains: number
  appsEnabled: {
    page_builder: number
    email: number
    webinar: number
    lms: number
  }
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/super-admin/stats')
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError('Failed to load statistics')
      // Error handled in UI
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading statistics...</div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Platform Overview</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Tenants</h3>
          <p className="text-3xl font-bold">{stats.totalTenants}</p>
          <p className="text-sm text-green-600 mt-2">
            {stats.activeTenants} active
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Users</h3>
          <p className="text-3xl font-bold">{stats.totalUsers}</p>
          <p className="text-sm text-gray-500 mt-2">
            Across all tenants
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Custom Domains</h3>
          <p className="text-3xl font-bold">{stats.totalDomains}</p>
          <p className="text-sm text-gray-500 mt-2">
            Configured domains
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Page Builder</h3>
          <p className="text-3xl font-bold">{stats.appsEnabled.page_builder}</p>
          <p className="text-sm text-gray-500 mt-2">
            Tenants with access
          </p>
        </div>
      </div>

      {/* App Usage */}
      <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8">
        <h3 className="text-xl font-bold mb-4">App Adoption</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Page Builder</span>
              <span className="text-sm">{stats.appsEnabled.page_builder} tenants</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${(stats.appsEnabled.page_builder / stats.totalTenants) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Email Marketing</span>
              <span className="text-sm">{stats.appsEnabled.email} tenants</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${(stats.appsEnabled.email / stats.totalTenants) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Webinar Platform</span>
              <span className="text-sm">{stats.appsEnabled.webinar} tenants</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full" 
                style={{ width: `${(stats.appsEnabled.webinar / stats.totalTenants) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">LMS</span>
              <span className="text-sm">{stats.appsEnabled.lms} tenants</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-600 h-2 rounded-full" 
                style={{ width: `${(stats.appsEnabled.lms / stats.totalTenants) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/super-admin/tenants"
          className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <h3 className="text-lg font-bold mb-2">👥 Manage Tenants</h3>
          <p className="text-sm text-gray-600">View and manage all organizations</p>
        </Link>

        <Link
          href="/super-admin/apps"
          className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <h3 className="text-lg font-bold mb-2">📱 App Access Control</h3>
          <p className="text-sm text-gray-600">Enable/disable apps per tenant</p>
        </Link>

        <Link
          href="/super-admin/tenants/new"
          className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <h3 className="text-lg font-bold mb-2">➕ Create Tenant</h3>
          <p className="text-sm text-gray-600">Manually add new organization</p>
        </Link>
      </div>
    </div>
  )
}