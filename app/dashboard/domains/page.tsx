'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DNSInstructions from '@/components/domains/DNSInstructions'

interface CustomDomain {
  id: string
  domain: string
  verified: boolean
  ssl_status: string
  created_at: string
}

interface DNSRecord {
  type: string
  name: string
  value: string
  ttl?: number
}

export default function DomainsPage() {
  const router = useRouter()
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<CustomDomain | null>(null)
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([])
  const [showInstructions, setShowInstructions] = useState(false)

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
    setDnsRecords([])

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

      if (data.verified) {
        setSuccess('Domain added and verified successfully!')
      } else {
        setSuccess('Domain added! Please configure your DNS records.')
        setDnsRecords(data.dnsRecords || [])
        setShowInstructions(true)
        setSelectedDomain(data.domain)
      }
      
      setNewDomain('')
      fetchDomains()
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyDomain = async (domainId: string, domainName: string) => {
    setVerifying(domainId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/domains/${domainId}/verify`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('Domain verified successfully! SSL certificate will be provisioned shortly.')
        fetchDomains()
        setShowInstructions(false)
      } else {
        setError(data.message || 'Verification pending. Please ensure DNS records are configured.')
        if (data.dnsRecords) {
          setDnsRecords(data.dnsRecords)
          setShowInstructions(true)
          const domain = domains.find(d => d.id === domainId)
          if (domain) setSelectedDomain(domain)
        }
      }
    } catch (err) {
      setError('Verification failed. Please check your DNS records.')
    } finally {
      setVerifying(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Custom Domains</h1>
          <p className="text-gray-600">
            Connect your own domain to serve your content from your custom URL
          </p>
        </div>

        {/* Add Domain Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Domain</h2>
          
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

          <form onSubmit={handleAddDomain} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain Name
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com or www.example.com"
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
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Enter your domain without http:// or https://
              </p>
            </div>
          </form>
        </div>

        {/* DNS Instructions */}
        {showInstructions && dnsRecords.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">DNS Configuration Required</h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <DNSInstructions 
              domain={selectedDomain?.domain || newDomain}
              dnsRecords={dnsRecords}
            />
          </div>
        )}

        {/* Domains List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Domains</h2>
            
            {domains.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No custom domains added yet.</p>
                <p className="text-sm text-gray-400">
                  Add your first domain above to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {domains.map((domain) => (
                  <div 
                    key={domain.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-lg">{domain.domain}</p>
                        {domain.verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Pending
                          </span>
                        )}
                        {domain.ssl_status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            SSL Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Added {new Date(domain.created_at).toLocaleDateString()}
                      </p>
                      {domain.verified && (
                        <a 
                          href={`https://${domain.domain}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                        >
                          Visit site →
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!domain.verified && (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/domains/${domain.id}`)
                                if (response.ok) {
                                  const data = await response.json()
                                  setSelectedDomain(data.domain)
                                  setDnsRecords(data.dnsRecords || [])
                                  setShowInstructions(true)
                                }
                              } catch (err) {
                                console.error('Error fetching domain details:', err)
                              }
                            }}
                            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            View DNS
                          </button>
                          <button
                            onClick={() => handleVerifyDomain(domain.id, domain.domain)}
                            disabled={verifying === domain.id}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {verifying === domain.id ? 'Checking...' : 'Verify'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Need Help?</h3>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Domain Verification:</strong> After adding your domain, you need to verify ownership by adding DNS records to your domain provider.
            </p>
            <p>
              <strong>SSL Certificates:</strong> Once verified, SSL certificates are automatically provisioned by Vercel.
            </p>
            <p>
              <strong>DNS Propagation:</strong> DNS changes typically take 5-30 minutes to propagate worldwide.
            </p>
            <p className="mt-3">
              For detailed instructions, check the{' '}
              <a 
                href="https://vercel.com/docs/concepts/projects/domains" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Vercel documentation
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}