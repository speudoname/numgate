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
  is_primary?: boolean
  vercelStatus?: 'missing' | 'error' | 'active'
}

interface DNSRecord {
  type: string
  name: string
  value: string
  ttl?: number
  purpose?: 'verification' | 'routing'
}

export default function DomainsPage() {
  const router = useRouter()
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingDomains, setLoadingDomains] = useState(true)
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
    setLoadingDomains(true)
    try {
      const response = await fetch('/api/domains')
      if (response.ok) {
        const data = await response.json()
        const domainsWithStatus = data.domains || []
        
        // Fetch real-time status for each domain
        const updatedDomains = await Promise.all(
          domainsWithStatus.map(async (domain: CustomDomain) => {
            try {
              const statusResponse = await fetch(`/api/domains/${domain.id}/status`)
              if (statusResponse.ok) {
                const statusData = await statusResponse.json()
                return {
                  ...domain,
                  verified: statusData.verified || false,
                  vercelStatus: statusData.domain?.vercelStatus || statusData.domainMissing ? 'missing' : 'active'
                }
              }
            } catch (err) {
              console.error(`Error fetching status for ${domain.domain}:`, err)
              return {
                ...domain,
                verified: false,
                vercelStatus: 'error' as const
              }
            }
            return domain
          })
        )
        
        setDomains(updatedDomains)
      }
    } catch (err) {
      console.error('Error fetching domains:', err)
    } finally {
      setLoadingDomains(false)
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
      // First get current status from Vercel
      const statusResponse = await fetch(`/api/domains/${domainId}/status`)
      if (!statusResponse.ok) {
        setError('Failed to check domain status')
        return
      }
      
      const statusData = await statusResponse.json()
      
      if (statusData.verified) {
        setSuccess('Domain is already verified! SSL certificate is active.')
        fetchDomains()
        setShowInstructions(false)
      } else {
        // Show current DNS requirements
        const verificationRecords = statusData.dnsRecords?.filter((r: DNSRecord) => r.purpose === 'verification') || []
        if (verificationRecords.length > 0) {
          setError('Domain verification pending. Please add the required DNS records below:')
          setDnsRecords(statusData.dnsRecords)
          setShowInstructions(true)
          const domain = domains.find(d => d.id === domainId)
          if (domain) setSelectedDomain(domain)
        } else {
          // Try to trigger verification check
          const response = await fetch(`/api/domains/${domainId}/verify`, {
            method: 'POST'
          })
          
          const data = await response.json()
          
          if (response.ok && data.verified) {
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
        }
      }
    } catch (err) {
      setError('Verification failed. Please check your DNS records.')
    } finally {
      setVerifying(null)
    }
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Custom Domains</h1>
          <p className="text-lg">
            Connect your own domain to serve your content from your custom URL
          </p>
        </div>

        {/* Add Domain Form */}
        <div className="bg-background rounded-base border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Add New Domain</h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-100 border-2 border-red-600 rounded-base text-red-900 font-medium">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 bg-green-100 border-2 border-green-600 rounded-base text-green-900 font-medium">
              {success}
            </div>
          )}

          <form onSubmit={handleAddDomain} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">
                Domain Name
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com or www.example.com"
                  className="flex-1 h-12 px-4 border-2 border-border bg-secondary-background rounded-base font-medium focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 h-12 bg-main text-main-foreground border-2 border-border rounded-base font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  {loading ? 'Adding...' : 'Add Domain'}
                </button>
              </div>
              <p className="mt-2 text-sm font-medium">
                Enter your domain without http:// or https://
              </p>
            </div>
          </form>
        </div>

        {/* DNS Instructions */}
        {showInstructions && (
          <div className="dns-instructions bg-background rounded-base border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 mb-8">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">
                {selectedDomain?.verified ? 'DNS Configuration' : 'DNS Configuration Required'}
              </h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-2xl font-bold hover:opacity-70 transition-opacity"
              >
                ✕
              </button>
            </div>
            {dnsRecords.length > 0 ? (
              <DNSInstructions 
                domain={selectedDomain?.domain || newDomain}
                dnsRecords={dnsRecords}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-lg font-medium mb-2">DNS Records</p>
                <p className="text-sm text-muted-foreground">
                  {selectedDomain?.verified 
                    ? 'This domain is already verified and configured properly.' 
                    : 'No DNS records available. Try verifying the domain to get the latest status.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Domains List */}
        <div className="bg-background rounded-base border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Your Domains</h2>
            
            {loadingDomains ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-border border-t-main"></div>
                  <p className="text-lg font-bold">Searching for domains...</p>
                </div>
              </div>
            ) : domains.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-lg font-medium mb-4">No custom domains added yet.</p>
                <p className="text-sm">
                  Add your first domain above to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {domains.map((domain) => (
                  <div 
                    key={domain.id} 
                    className="flex items-center justify-between p-4 border-2 border-border rounded-base bg-background hover:bg-secondary-background transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg">{domain.domain}</p>
                        {domain.is_primary && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-main border-2 border-border rounded-base">
                            Primary
                          </span>
                        )}
                        {domain.vercelStatus === 'missing' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-red-900 bg-red-100 border-2 border-red-600 rounded-base">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Missing in Vercel
                          </span>
                        ) : domain.vercelStatus === 'error' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-gray-900 bg-gray-100 border-2 border-gray-600 rounded-base">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Status Unknown
                          </span>
                        ) : domain.verified ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-green-900 bg-green-100 border-2 border-green-600 rounded-base">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-yellow-900 bg-yellow-100 border-2 border-yellow-600 rounded-base">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Pending
                          </span>
                        )}
                        {domain.ssl_status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-blue-900 bg-blue-100 border-2 border-blue-600 rounded-base">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            SSL Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-1">
                        Added {new Date(domain.created_at).toLocaleDateString()}
                      </p>
                      {domain.verified && (
                        <a 
                          href={`https://${domain.domain}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-main font-bold hover:underline mt-1 inline-block"
                        >
                          Visit site →
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {domain.vercelStatus === 'missing' ? (
                        <>
                          <button
                            onClick={async () => {
                              setLoading(true)
                              try {
                                // Re-add domain
                                const response = await fetch('/api/domains', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ domain: domain.domain })
                                })
                                const data = await response.json()
                                if (response.ok) {
                                  setSuccess('Domain re-added. Please configure DNS.')
                                  setDnsRecords(data.dnsRecords || [])
                                  setSelectedDomain(domain)
                                  setShowInstructions(true)
                                  fetchDomains()
                                } else {
                                  setError(data.error || 'Failed to re-add domain')
                                }
                              } catch (err) {
                                setError('Failed to re-add domain')
                              } finally {
                                setLoading(false)
                              }
                            }}
                            className="px-4 py-2 font-bold bg-main text-main-foreground border-2 border-border rounded-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
                          >
                            Re-add
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete ${domain.domain}?`)) {
                                try {
                                  const response = await fetch(`/api/domains/${domain.id}`, {
                                    method: 'DELETE'
                                  })
                                  if (response.ok) {
                                    setSuccess('Domain removed from your list')
                                    fetchDomains()
                                  } else {
                                    setError('Failed to delete domain')
                                  }
                                } catch (err) {
                                  setError('Failed to delete domain')
                                }
                              }
                            }}
                            className="px-4 py-2 font-bold bg-red-500 text-white border-2 border-border rounded-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={async () => {
                              setError('')
                              setSuccess('')
                              try {
                                const response = await fetch(`/api/domains/${domain.id}/status`)
                                if (response.ok) {
                                  const data = await response.json()
                                  if (data.domainMissing) {
                                    setError(data.message || 'Domain not found in Vercel')
                                    // Update local state to show missing status
                                    setDomains(prev => prev.map(d => 
                                      d.id === domain.id ? { ...d, vercelStatus: 'missing' } : d
                                    ))
                                  } else {
                                    // Successfully got DNS records, show them
                                    setSelectedDomain(data.domain || domain)
                                    setDnsRecords(data.dnsRecords || [])
                                    setShowInstructions(true)
                                    // Scroll to instructions
                                    setTimeout(() => {
                                      document.querySelector('.dns-instructions')?.scrollIntoView({ behavior: 'smooth' })
                                    }, 100)
                                  }
                                }
                              } catch (err) {
                                console.error('Error fetching domain details:', err)
                                setError('Failed to fetch domain details')
                              }
                            }}
                            className="px-4 py-2 font-bold bg-secondary-background border-2 border-border rounded-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
                          >
                            View DNS
                          </button>
                          <button
                            onClick={() => handleVerifyDomain(domain.id, domain.domain)}
                            disabled={verifying === domain.id}
                            className="px-4 py-2 font-bold bg-main text-main-foreground border-2 border-border rounded-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                          >
                            {verifying === domain.id ? 'Checking...' : 'Verify'}
                          </button>
                        </>
                      )}
                      {domain.verified && !domain.is_primary && (
                        <button
                          onClick={async () => {
                            if (confirm(`Make ${domain.domain} the primary domain?`)) {
                              try {
                                const response = await fetch(`/api/domains/${domain.id}/primary`, {
                                  method: 'POST'
                                })
                                if (response.ok) {
                                  setSuccess('Primary domain updated')
                                  fetchDomains()
                                }
                              } catch (err) {
                                setError('Failed to update primary domain')
                              }
                            }
                          }}
                          className="px-4 py-2 font-bold bg-main text-main-foreground border-2 border-border rounded-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
                        >
                          Make Primary
                        </button>
                      )}
                      {domain.verified && (
                        <button
                          onClick={async () => {
                            setError('')
                            setSuccess('')
                            try {
                              const response = await fetch(`/api/domains/${domain.id}/status`)
                              if (response.ok) {
                                const data = await response.json()
                                setSelectedDomain(data.domain || domain)
                                setDnsRecords(data.dnsRecords || [])
                                setShowInstructions(true)
                                // Scroll to instructions
                                setTimeout(() => {
                                  document.querySelector('.dns-instructions')?.scrollIntoView({ behavior: 'smooth' })
                                }, 100)
                              }
                            } catch (err) {
                              console.error('Error fetching domain details:', err)
                              setError('Failed to fetch domain details')
                            }
                          }}
                          className="px-4 py-2 font-bold bg-secondary-background border-2 border-border rounded-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
                        >
                          View DNS
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-main border-2 border-border rounded-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
          <h3 className="font-bold text-xl mb-3 text-main-foreground">Need Help?</h3>
          <div className="space-y-2 text-sm text-main-foreground font-medium">
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
                className="text-main-foreground font-bold underline hover:no-underline"
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