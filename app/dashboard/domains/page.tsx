'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface CustomDomain {
  id: string
  domain: string
  verified: boolean
  created_at: string
}

export default function DomainsPage() {
  const router = useRouter()
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      const response = await fetch('/api/domains')
      if (response.ok) {
        const data = await response.json()
        setDomains(data.domains || [])
      }
    } catch (err) {
      console.error('Error fetching domains:', err)
    }
  }

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain: newDomain })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to add domain')
        return
      }

      setSuccess(`Domain added! Please add this DNS record to verify: TXT _komunate-verify.${newDomain} = ${data.verificationToken}`)
      setNewDomain('')
      fetchDomains()
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyDomain = async (domainId: string) => {
    try {
      const response = await fetch(`/api/domains/${domainId}/verify`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Verification failed')
        return
      }

      setSuccess('Domain verified successfully!')
      fetchDomains()
    } catch (err) {
      setError('Verification failed. Please check your DNS records.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Custom Domains</h1>

        {/* Add Domain Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add Custom Domain</h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleAddDomain} className="flex gap-4">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Domain'}
            </button>
          </form>
        </div>

        {/* Domains List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Domains</h2>
            
            {domains.length === 0 ? (
              <p className="text-gray-500">No custom domains added yet.</p>
            ) : (
              <div className="space-y-4">
                {domains.map((domain) => (
                  <div key={domain.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{domain.domain}</p>
                      <p className="text-sm text-gray-500">
                        Status: {domain.verified ? 
                          <span className="text-green-600">✓ Verified</span> : 
                          <span className="text-yellow-600">⏳ Pending verification</span>
                        }
                      </p>
                    </div>
                    {!domain.verified && (
                      <button
                        onClick={() => handleVerifyDomain(domain.id)}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Verify
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold mb-2">How to add your domain:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Add your domain above</li>
            <li>Add the TXT record shown to your DNS settings</li>
            <li>Click Verify once DNS has propagated (usually 5-30 minutes)</li>
            <li>Add a CNAME record pointing your domain to: numgate.vercel.app</li>
            <li>Your site will be available at your custom domain!</li>
          </ol>
        </div>
      </div>
    </div>
  )
}