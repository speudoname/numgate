'use client'

import { useEffect, useState } from 'react'

interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  subscription_plan: string
  is_active: boolean
  created_at: string
  users_count: number
  domains_count: number
  apps: {
    page_builder: boolean
    email: boolean
    webinar: boolean
    lms: boolean
  }
}

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/super-admin/tenants')
      
      if (!response.ok) {
        throw new Error('Failed to fetch tenants')
      }

      const data = await response.json()
      setTenants(data.tenants)
    } catch (err) {
      setError('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  const toggleApp = async (tenantId: string, appName: string, currentState: boolean) => {
    setUpdating(`${tenantId}-${appName}`)
    
    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}/apps`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_name: appName,
          enabled: !currentState
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update app access')
      }

      // Update local state
      setTenants(prevTenants => 
        prevTenants.map(tenant => 
          tenant.id === tenantId 
            ? { ...tenant, apps: { ...tenant.apps, [appName]: !currentState } }
            : tenant
        )
      )
    } catch (err) {
      alert('Failed to update app access')
    } finally {
      setUpdating(null)
    }
  }

  const toggleTenantActive = async (tenantId: string, currentState: boolean) => {
    setUpdating(`${tenantId}-active`)
    
    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentState
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update tenant')
      }

      // Update local state
      setTenants(prevTenants => 
        prevTenants.map(tenant => 
          tenant.id === tenantId 
            ? { ...tenant, is_active: !currentState }
            : tenant
        )
      )
    } catch (err) {
      alert('Failed to update tenant status')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading tenants...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Manage Tenants</h2>
        <div className="text-sm text-gray-600">
          {tenants.length} total organizations
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100 border-b-2 border-black">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Page Builder
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Webinar
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-900 uppercase tracking-wider">
                  LMS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className={!tenant.is_active ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                      <div className="text-xs text-gray-500">{tenant.slug}.komunate.com</div>
                      <div className="text-xs text-gray-400">{tenant.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleTenantActive(tenant.id, tenant.is_active)}
                      disabled={updating === `${tenant.id}-active`}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        tenant.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      } cursor-pointer hover:opacity-80`}
                    >
                      {tenant.is_active ? 'Active' : 'Suspended'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tenant.subscription_plan}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tenant.users_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => toggleApp(tenant.id, 'page_builder', tenant.apps.page_builder)}
                      disabled={updating === `${tenant.id}-page_builder`}
                      className={`w-12 h-6 rounded-full relative transition-colors ${
                        tenant.apps.page_builder ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                        tenant.apps.page_builder ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => toggleApp(tenant.id, 'email', tenant.apps.email)}
                      disabled={updating === `${tenant.id}-email`}
                      className={`w-12 h-6 rounded-full relative transition-colors ${
                        tenant.apps.email ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                        tenant.apps.email ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => toggleApp(tenant.id, 'webinar', tenant.apps.webinar)}
                      disabled={updating === `${tenant.id}-webinar`}
                      className={`w-12 h-6 rounded-full relative transition-colors ${
                        tenant.apps.webinar ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                        tenant.apps.webinar ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => toggleApp(tenant.id, 'lms', tenant.apps.lms)}
                      disabled={updating === `${tenant.id}-lms`}
                      className={`w-12 h-6 rounded-full relative transition-colors ${
                        tenant.apps.lms ? 'bg-orange-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                        tenant.apps.lms ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}