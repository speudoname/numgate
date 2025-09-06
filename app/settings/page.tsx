'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

interface SettingsData {
  tenant: {
    id: string
    name: string
    slug: string
    email: string
    settings: {
      description?: string
      timezone?: string
      language?: string
    }
    planExpiresAt?: string
    isActive: boolean
    createdAt: string
  }
  subscription: {
    plan: {
      id?: string
      name: string
      display_name: string
      description?: string
      price_monthly?: number
      price_yearly?: number
      features?: string[]
      limits?: Record<string, any>
    }
    expiresAt?: string
    daysRemaining?: number
  }
  usage: {
    users: number
    domains: number
  }
}

interface OrganizationForm {
  name: string
  email: string
  description: string
  timezone: string
  language: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<SettingsData | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState<OrganizationForm>({
    name: '',
    email: '',
    description: '',
    timezone: 'UTC',
    language: 'en'
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings')
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch settings')
      }

      const settingsData = await response.json()
      setData(settingsData)
      
      // Populate form with current data
      setFormData({
        name: settingsData.tenant.name || '',
        email: settingsData.tenant.email || '',
        description: settingsData.tenant.settings?.description || '',
        timezone: settingsData.tenant.settings?.timezone || 'UTC',
        language: settingsData.tenant.settings?.language || 'en'
      })
    } catch (err) {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof OrganizationForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear any existing messages when user starts editing
    setError('')
    setSuccess('')
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          settings: {
            description: formData.description,
            timezone: formData.timezone,
            language: formData.language
          }
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      setSuccess('Settings saved successfully!')
      
      // Refresh the data to show updated values
      await fetchSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getPlanStatus = () => {
    if (!data?.subscription.expiresAt) return 'Active'
    
    const daysRemaining = data.subscription.daysRemaining
    if (daysRemaining === null || daysRemaining === undefined) return 'Active'
    if (daysRemaining < 0) return 'Expired'
    if (daysRemaining <= 7) return `Expires in ${daysRemaining} days`
    return 'Active'
  }

  const getPlanStatusColor = () => {
    if (!data?.subscription.expiresAt) return 'text-green-600'
    
    const daysRemaining = data.subscription.daysRemaining
    if (daysRemaining === null || daysRemaining === undefined) return 'text-green-600'
    if (daysRemaining < 0) return 'text-red-600'
    if (daysRemaining <= 7) return 'text-orange-600'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-lg font-semibold">Loading settings...</div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg border-2 border-red-500 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
          <div className="text-red-600 font-semibold">{error}</div>
          <Button 
            onClick={fetchSettings}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Dashboard
              </Link>
              <h1 className="text-2xl font-bold">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Organization Settings</h2>
          <p className="text-gray-600">Manage your organization details and preferences</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6">
            <Alert className="border-2 border-green-500 bg-green-50 text-green-800">
              <div className="font-semibold">✅ {success}</div>
            </Alert>
          </div>
        )}
        
        {error && (
          <div className="mb-6">
            <Alert className="border-2 border-red-500 bg-red-50 text-red-600">
              <div className="font-semibold">❌ {error}</div>
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Organization Settings */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div>
                    <Label htmlFor="name" className="text-sm font-semibold">Organization Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="mt-2 border-2 border-black focus:border-blue-500"
                      placeholder="Enter organization name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-semibold">Contact Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="mt-2 border-2 border-black focus:border-blue-500"
                      placeholder="Enter contact email"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                    <Input
                      id="description"
                      type="text"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="mt-2 border-2 border-black focus:border-blue-500"
                      placeholder="Brief description of your organization"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="timezone" className="text-sm font-semibold">Timezone</Label>
                      <select
                        id="timezone"
                        value={formData.timezone}
                        onChange={(e) => handleInputChange('timezone', e.target.value)}
                        className="mt-2 w-full px-3 py-2 border-2 border-black rounded-md focus:border-blue-500 focus:outline-none bg-white"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Berlin">Berlin (CET)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Dubai">Dubai (GST)</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="language" className="text-sm font-semibold">Language</Label>
                      <select
                        id="language"
                        value={formData.language}
                        onChange={(e) => handleInputChange('language', e.target.value)}
                        className="mt-2 w-full px-3 py-2 border-2 border-black rounded-md focus:border-blue-500 focus:outline-none bg-white"
                      >
                        <option value="en">English</option>
                        <option value="ka">Georgian</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="ru">Russian</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button 
                      type="submit" 
                      disabled={saving}
                      className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Subscription & Quick Links */}
          <div className="space-y-6">
            {/* Subscription Information */}
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Current Plan</div>
                  <div className="text-lg font-bold">{data?.subscription.plan.display_name}</div>
                  {data?.subscription.plan.description && (
                    <div className="text-sm text-gray-600 mt-1">{data.subscription.plan.description}</div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-600">Status</div>
                  <div className={`font-semibold ${getPlanStatusColor()}`}>
                    {getPlanStatus()}
                  </div>
                </div>

                {data?.subscription.expiresAt && (
                  <div>
                    <div className="text-sm font-medium text-gray-600">Expires</div>
                    <div className="font-medium">{formatDate(data.subscription.expiresAt)}</div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-gray-600">Member Since</div>
                  <div className="font-medium">{data && formatDate(data.tenant.createdAt)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Statistics */}
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader>
                <CardTitle>Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Team Members</span>
                  <span className="font-bold text-lg">{data?.usage.users}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Custom Domains</span>
                  <span className="font-bold text-lg">{data?.usage.domains}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href="/dashboard/users"
                  className="block p-3 bg-gray-50 rounded border-2 border-gray-300 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <div className="font-semibold text-sm">👥 Manage Users</div>
                  <div className="text-xs text-gray-600">Add and remove team members</div>
                </Link>
                
                <Link
                  href="/dashboard/domains"
                  className="block p-3 bg-gray-50 rounded border-2 border-gray-300 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <div className="font-semibold text-sm">🌐 Manage Domains</div>
                  <div className="text-xs text-gray-600">Add and verify custom domains</div>
                </Link>

                <Link
                  href="/dashboard"
                  className="block p-3 bg-gray-50 rounded border-2 border-gray-300 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <div className="font-semibold text-sm">📊 Dashboard</div>
                  <div className="text-xs text-gray-600">Back to main dashboard</div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}