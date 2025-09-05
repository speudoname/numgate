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
        if (error.error?.code === 'domain_already_exists') {
          return await this.getDomainStatus(domain)
        }
        
        return {
          success: false,
          error: error.error?.message || 'Failed to add domain'
        }
      }

      const data: VercelDomainResponse = await response.json()
      
      // Get DNS records needed
      const dnsRecords = this.generateDNSRecords(domain, data)
      
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
        return {
          success: false,
          verified: false,
          error: 'Domain not found'
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

      // Generate DNS records if not verified
      const dnsRecords = !domainData.verified 
        ? this.generateDNSRecords(domain, domainData)
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
  }> {
    try {
      // Trigger verification by checking status
      const status = await this.getDomainStatus(domain)
      
      if (status.verified) {
        return {
          success: true,
          verified: true,
          message: 'Domain is verified and active!'
        }
      }

      // Re-add domain to trigger fresh verification
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

      // Check verification array for specific issues
      const verificationIssues = data.verification || []
      const txtRecord = verificationIssues.find((v: any) => v.type === 'TXT')
      
      return {
        success: false,
        verified: false,
        message: txtRecord 
          ? `Please add TXT record: ${txtRecord.domain} = ${txtRecord.value}`
          : 'Domain verification pending. Please check your DNS settings.'
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
  async removeDomain(domain: string): Promise<{
    success: boolean
    error?: string
  }> {
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
   * Generate DNS records for domain setup
   */
  private generateDNSRecords(domain: string, vercelData?: VercelDomainResponse): DNSRecord[] {
    const records: DNSRecord[] = []
    const apexDomain = domain.replace(/^www\./, '')
    const isApex = domain === apexDomain

    if (isApex) {
      // For apex domain (example.com)
      records.push({
        type: 'A',
        name: '@',
        value: '76.76.21.21',
        ttl: 300
      })
      
      // Also add www subdomain
      records.push({
        type: 'CNAME',
        name: 'www',
        value: 'cname.vercel-dns.com',
        ttl: 300
      })
    } else {
      // For subdomain (www.example.com, app.example.com, etc.)
      records.push({
        type: 'CNAME',
        name: domain.split('.')[0], // Get subdomain part
        value: 'cname.vercel-dns.com',
        ttl: 300
      })
    }

    // Add verification TXT if needed
    if (vercelData?.verification) {
      const txtVerification = vercelData.verification.find(v => v.type === 'TXT')
      if (txtVerification) {
        records.push({
          type: 'TXT',
          name: '_vercel',
          value: txtVerification.value,
          ttl: 300
        })
      }
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