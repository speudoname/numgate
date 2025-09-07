'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)
  const [formData, setFormData] = useState({
    tenantName: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  })

  // Generate subdomain from company name
  useEffect(() => {
    if (formData.tenantName) {
      const generatedSubdomain = formData.tenantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 30) // Limit length
      setSubdomain(generatedSubdomain)
    }
  }, [formData.tenantName])

  // Check subdomain availability with debounce
  useEffect(() => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null)
      return
    }

    const timer = setTimeout(async () => {
      setCheckingSubdomain(true)
      try {
        const response = await fetch('/api/auth/check-subdomain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subdomain })
        })
        const data = await response.json()
        setSubdomainAvailable(data.available)
      } catch (err) {
        console.error('Error checking subdomain:', err)
      } finally {
        setCheckingSubdomain(false)
      }
    }, 500) // Debounce 500ms

    return () => clearTimeout(timer)
  }, [subdomain])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '') // Only allow alphanumeric and hyphens
    setSubdomain(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    // Validate subdomain
    if (!subdomain || subdomain.length < 3) {
      setError('Subdomain must be at least 3 characters')
      return
    }

    if (subdomainAvailable === false) {
      setError('This subdomain is already taken')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantName: formData.tenantName,
          slug: subdomain, // Pass the chosen subdomain
          email: formData.email,
          password: formData.password,
          name: formData.name
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      // Redirect to tenant's subdomain dashboard
      if (data.tenant && data.tenant.slug) {
        // Use window.location for full page redirect to subdomain
        const subdomain = data.tenant.slug
        const protocol = window.location.protocol
        const port = window.location.port ? `:${window.location.port}` : ''
        const newUrl = `${protocol}//${subdomain}.komunate.com${port}/dashboard`
        
        // For localhost development, use the same port
        if (window.location.hostname === 'localhost') {
          window.location.href = `${protocol}//${subdomain}.localhost${port}/dashboard`
        } else {
          window.location.href = newUrl
        }
      } else {
        // Fallback to regular dashboard
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Start your 14-day free trial
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 border-2 border-red-400 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="tenantName" className="block text-sm font-medium text-gray-700">
                Organization Name
              </label>
              <input
                id="tenantName"
                name="tenantName"
                type="text"
                required
                value={formData.tenantName}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border-2 border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="My Company"
              />
            </div>

            <div>
              <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700">
                Your Subdomain
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  id="subdomain"
                  name="subdomain"
                  type="text"
                  required
                  value={subdomain}
                  onChange={handleSubdomainChange}
                  className={`flex-1 appearance-none relative block w-full px-3 py-2 border-2 ${
                    checkingSubdomain ? 'border-gray-300' :
                    subdomainAvailable === true ? 'border-green-500' :
                    subdomainAvailable === false ? 'border-red-500' :
                    'border-gray-300'
                  } rounded-l-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="mycompany"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border-2 border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                  .komunate.com
                </span>
              </div>
              {checkingSubdomain && (
                <p className="mt-1 text-xs text-gray-500">Checking availability...</p>
              )}
              {!checkingSubdomain && subdomainAvailable === true && (
                <p className="mt-1 text-xs text-green-600">✓ Available</p>
              )}
              {!checkingSubdomain && subdomainAvailable === false && (
                <p className="mt-1 text-xs text-red-600">✗ Already taken</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                This will be your unique access point for your organization
              </p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Your Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border-2 border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border-2 border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border-2 border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border-2 border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border-2 border-black text-sm font-medium rounded-md text-black bg-yellow-400 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}