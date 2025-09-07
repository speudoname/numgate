'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { usePlatformDetection } from '@/hooks/usePlatformDetection'

export default function LoginPage() {
  const router = useRouter()
  const { isPlatform, tenantSlug } = usePlatformDetection()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showTenantSelection, setShowTenantSelection] = useState(false)
  const [availableTenants, setAvailableTenants] = useState<any[]>([])
  const [userData, setUserData] = useState<any>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleTenantSelect = async (tenantId: string) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      // Redirect to the tenant domain
      if (data.redirectUrl) {
        if (data.redirectUrl.startsWith('http')) {
          window.location.href = data.redirectUrl
        } else {
          router.push(data.redirectUrl)
        }
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      // Check if tenant selection is required
      if (data.requiresTenantSelection) {
        setAvailableTenants(data.tenants)
        setUserData(data.user)
        setShowTenantSelection(true)
        setLoading(false)
        return
      }

      // Check if we need to redirect to a custom domain
      if (data.redirectUrl) {
        if (data.redirectUrl.startsWith('http')) {
          // External redirect to custom domain
          window.location.href = data.redirectUrl
        } else {
          // Internal redirect
          router.push(data.redirectUrl)
        }
      } else {
        // Fallback to dashboard
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (showTenantSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Select Your Organization</CardTitle>
            <CardDescription>
              Welcome back, {userData?.name || userData?.email}! 
              You have access to multiple organizations. Please select one to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              {availableTenants.map((tenant) => (
                <Button
                  key={tenant.id}
                  variant="outline"
                  className="w-full justify-between p-4 h-auto"
                  onClick={() => handleTenantSelect(tenant.id)}
                  disabled={loading}
                >
                  <div className="text-left">
                    <div className="font-semibold">{tenant.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {tenant.primaryDomain || `${tenant.slug}.komunate.com`} • {tenant.role}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setShowTenantSelection(false)
                setFormData({ email: '', password: '' })
              }}
            >
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to your account</CardTitle>
          <CardDescription>
            {isPlatform 
              ? 'Welcome back to Komunate' 
              : `Welcome back${tenantSlug ? ` to ${tenantSlug}` : ''}`
            }
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            
            <div className="flex items-center justify-between w-full text-sm">
              <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
                Forgot password?
              </Link>
              {isPlatform && (
                <Link href="/register" className="text-muted-foreground hover:text-foreground">
                  Create account
                </Link>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}