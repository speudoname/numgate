/**
 * Vercel Domain Management Service
 * Handles adding, verifying, and managing custom domains via Vercel API
 */

interface VercelDomainResponse {
  name: string
  apexName: string
  projectId: string
  redirect?: string | null
  redirectStatusCode?: number | null
  gitBranch?: string | null
  updatedAt?: number
  createdAt?: number
  verified: boolean
  verification?: {
    type: string
    domain: string
    value: string
    reason: string
  }[]
}

interface VercelConfigResponse {
  configuredBy?: string | null
  acceptedChallenges?: string[]
  misconfigured: boolean
}

interface DNSRecord {
  type: 'A' | 'AAAA' | 'ALIAS' | 'CNAME' | 'TXT'
  name: string
  value: string
  ttl?: number
  purpose?: 'verification' | 'routing'
}

class VercelDomainsService {
  private apiToken: string
  private projectId: string
  private teamId?: string
  private baseUrl = 'https://api.vercel.com'

  constructor() {
    this.apiToken = process.env.VERCEL_API_TOKEN || ''
    this.projectId = process.env.VERCEL_PROJECT_ID || 'prj_ALWAE3X32HhBvyzKSX83M396LmwC'
    this.teamId = process.env.VERCEL_TEAM_ID // Optional, for team accounts
    
    if (!this.apiToken) {
      console.warn('VERCEL_API_TOKEN not set. Domain management will not work.')
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    }
  }

  private getTeamQuery() {
    return this.teamId ? `?teamId=${this.teamId}` : ''
  }

  /**
   * Add a domain to the Vercel project
   */
  async addDomain(domain: string): Promise<{
    success: boolean
    domain?: VercelDomainResponse
    verification?: any
    error?: string
    dnsRecords?: DNSRecord[]
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v10/projects/${this.projectId}/domains${this.getTeamQuery()}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ 
            name: domain,
            gitBranch: null // Use default branch
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        
        // Domain might already exist, try to get its status
        if (error.error?.code === 'domain_already_exists' || error.error?.message?.includes('already')) {
          return await this.getDomainStatus(domain)
        }
        
        return {
          success: false,
          error: error.error?.message || 'Failed to add domain'
        }
      }

      const data: VercelDomainResponse = await response.json()
      
      // Get DNS records needed (including verification)
      const dnsRecords = this.extractDNSRecords(domain, data)
      
      return {
        success: true,
        domain: data,
        verification: data.verification,
        dnsRecords
      }
    } catch (error) {
      console.error('Error adding domain to Vercel:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get domain status and verification info
   */
  async getDomainStatus(domain: string): Promise<{
    success: boolean
    domain?: VercelDomainResponse
    config?: VercelConfigResponse
    verified: boolean
    dnsRecords?: DNSRecord[]
    error?: string
  }> {
    try {
      // Get domain info
      const domainResponse = await fetch(
        `${this.baseUrl}/v9/projects/${this.projectId}/domains/${domain}${this.getTeamQuery()}`,
        {
          headers: this.getHeaders()
        }
      )

      if (!domainResponse.ok) {
        const error = await domainResponse.json()
        return {
          success: false,
          verified: false,
          error: error.error?.message || 'Domain not found'
        }
      }

      const domainData: VercelDomainResponse = await domainResponse.json()

      // Get domain configuration status
      const configResponse = await fetch(
        `${this.baseUrl}/v6/domains/${domain}/config${this.getTeamQuery()}`,
        {
          headers: this.getHeaders()
        }
      )

      const configData: VercelConfigResponse = configResponse.ok 
        ? await configResponse.json() 
        : { misconfigured: true }

      // Extract DNS records including verification if not verified
      const dnsRecords = !domainData.verified 
        ? this.extractDNSRecords(domain, domainData)
        : undefined

      return {
        success: true,
        domain: domainData,
        config: configData,
        verified: domainData.verified && !configData.misconfigured,
        dnsRecords
      }
    } catch (error) {
      console.error('Error checking domain status:', error)
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Verify domain (trigger Vercel to check DNS)
   */
  async verifyDomain(domain: string): Promise<{
    success: boolean
    verified: boolean
    message?: string
    error?: string
    dnsRecords?: DNSRecord[]
  }> {
    try {
      // First, get current status
      const status = await this.getDomainStatus(domain)
      
      if (status.verified) {
        return {
          success: true,
          verified: true,
          message: 'Domain is verified and active!'
        }
      }

      // Try to trigger verification by re-adding (this often triggers a recheck)
      const response = await fetch(
        `${this.baseUrl}/v10/projects/${this.projectId}/domains${this.getTeamQuery()}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ name: domain })
        }
      )

      const data = await response.json()

      if (data.verified) {
        return {
          success: true,
          verified: true,
          message: 'Domain verified successfully!'
        }
      }

      // Extract DNS records including verification
      const dnsRecords = this.extractDNSRecords(domain, data)

      // Build helpful message based on verification requirements
      const verificationRecords = dnsRecords.filter(r => r.purpose === 'verification')
      let message = 'Domain verification pending. Please add the following DNS records:\n'
      
      verificationRecords.forEach(record => {
        message += `\n${record.type} record: ${record.name} → ${record.value}`
      })

      return {
        success: false,
        verified: false,
        message,
        dnsRecords
      }
    } catch (error) {
      console.error('Error verifying domain:', error)
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Remove domain from project
   */
  async removeDomain(domain: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v9/projects/${this.projectId}/domains/${domain}${this.getTeamQuery()}`,
        {
          method: 'DELETE',
          headers: this.getHeaders()
        }
      )

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          error: error.error?.message || 'Failed to remove domain'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error removing domain:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Extract DNS records from Vercel response
   * Includes both verification records and routing records
   */
  private extractDNSRecords(domain: string, vercelData?: VercelDomainResponse): DNSRecord[] {
    const records: DNSRecord[] = []
    const apexDomain = domain.replace(/^www\./, '')
    const isApex = domain === apexDomain
    
    // Add verification records if present
    if (vercelData?.verification && vercelData.verification.length > 0) {
      vercelData.verification.forEach(v => {
        // Format the name correctly for display
        let recordName = v.domain
        if (recordName === domain) {
          recordName = '@'
        } else if (recordName.startsWith('_vercel.')) {
          recordName = '_vercel'
        }

        records.push({
          type: v.type as DNSRecord['type'],
          name: recordName,
          value: v.value,
          ttl: 300,
          purpose: 'verification'
        })
      })
    }

    // Add routing records
    if (isApex) {
      // For apex domain (example.com)
      records.push({
        type: 'A',
        name: '@',
        value: '76.76.21.21',
        ttl: 300,
        purpose: 'routing'
      })
      
      // Also suggest www subdomain
      records.push({
        type: 'CNAME',
        name: 'www',
        value: 'cname.vercel-dns.com',
        ttl: 300,
        purpose: 'routing'
      })
    } else {
      // For subdomain (www.example.com, app.example.com, etc.)
      const subdomain = domain.split('.')[0]
      records.push({
        type: 'CNAME',
        name: subdomain === 'www' ? 'www' : subdomain,
        value: 'cname.vercel-dns.com',
        ttl: 300,
        purpose: 'routing'
      })
    }

    return records
  }

  /**
   * Get all domains for the project
   */
  async listDomains(): Promise<{
    success: boolean
    domains?: VercelDomainResponse[]
    error?: string
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v9/projects/${this.projectId}/domains${this.getTeamQuery()}`,
        {
          headers: this.getHeaders()
        }
      )

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          error: error.error?.message || 'Failed to list domains'
        }
      }

      const data = await response.json()
      return {
        success: true,
        domains: data.domains || []
      }
    } catch (error) {
      console.error('Error listing domains:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Export singleton instance
export const vercelDomains = new VercelDomainsService()