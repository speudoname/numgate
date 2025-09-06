import { promises as dns } from 'dns'

/**
 * DNS Verification Utility
 * Handles TXT record verification for domain ownership
 */

export interface DNSVerificationResult {
  success: boolean
  found: boolean
  value?: string
  error?: string
}

/**
 * Check if a TXT record exists and contains the expected value
 */
export async function verifyTXTRecord(
  domain: string, 
  expectedValue: string
): Promise<DNSVerificationResult> {
  try {
    // DNS lookup for TXT records
    const txtRecords = await dns.resolveTxt(domain)
    
    // Flatten the array of arrays and join each record
    const allRecords = txtRecords.map(record => record.join(''))
    
    // Check if any record matches our expected value
    const found = allRecords.some(record => record.includes(expectedValue))
    
    if (found) {
      return {
        success: true,
        found: true,
        value: expectedValue
      }
    }
    
    return {
      success: true,
      found: false,
      error: `TXT record not found. Expected: ${expectedValue}, Found: ${allRecords.join(', ')}`
    }
  } catch (error) {
    // Handle DNS resolution errors
    if (error instanceof Error) {
      // Common DNS errors
      if (error.message.includes('ENOTFOUND')) {
        return {
          success: false,
          found: false,
          error: 'Domain not found or DNS not configured'
        }
      }
      
      if (error.message.includes('ENODATA')) {
        return {
          success: true,
          found: false,
          error: 'No TXT records found for this domain'
        }
      }
      
      return {
        success: false,
        found: false,
        error: `DNS error: ${error.message}`
      }
    }
    
    return {
      success: false,
      found: false,
      error: 'Unknown DNS verification error'
    }
  }
}

/**
 * Generate a random verification token
 */
export function generateVerificationToken(): string {
  return `numgate-verify-${Math.random().toString(36).substring(2, 15)}${Date.now().toString(36)}`
}

/**
 * Generate the TXT record name for a domain
 */
export function getTXTRecordName(domain: string): string {
  return `_numgate-verification.${domain}`
}

/**
 * Clean and validate domain name
 */
export function cleanDomainName(domain: string): string {
  return domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/^www\./, '') // Normalize to apex domain for verification
}

/**
 * Check if domain is valid format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/
  return domainRegex.test(domain) && domain.length <= 253
}