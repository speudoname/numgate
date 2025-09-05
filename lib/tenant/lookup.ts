import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * Cache for tenant lookups to avoid hitting DB on every request
 * In production, use Redis or Vercel KV
 * 
 * LRU cache implementation to prevent memory leaks
 */
const MAX_CACHE_SIZE = 100 // Maximum number of cached tenants
const tenantCache = new Map<string, any>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Helper to add to cache with LRU eviction
function addToCache(domain: string, data: CachedTenant) {
  // Delete and re-add to move to end (most recent)
  if (tenantCache.has(domain)) {
    tenantCache.delete(domain)
  }
  
  // Evict oldest if at max size
  if (tenantCache.size >= MAX_CACHE_SIZE) {
    const firstKey = tenantCache.keys().next().value
    tenantCache.delete(firstKey)
  }
  
  tenantCache.set(domain, data)
}

interface CachedTenant {
  data: any
  timestamp: number
}

/**
 * Get tenant by domain
 * Checks custom_domains first, then falls back to slug-based subdomains
 */
export async function getTenantByDomain(hostname: string | null): Promise<any> {
  if (!hostname) return null

  // Clean hostname (remove port, www, etc.)
  const domain = hostname
    .toLowerCase()
    .replace(/:\d+$/, '') // Remove port
    .replace(/^www\./, '') // Remove www

  // Check cache first
  const cached = tenantCache.get(domain) as CachedTenant
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    // First, check if this is a custom domain
    const { data: customDomain } = await supabaseAdmin
      .from('custom_domains')
      .select(`
        tenant_id,
        verified,
        tenants!inner (
          id,
          name,
          slug,
          email,
          subscription_plan,
          settings
        )
      `)
      .eq('domain', domain)
      .eq('verified', true)
      .single()

    if (customDomain?.tenants) {
      const tenant = customDomain.tenants
      // Cache the result with LRU eviction
      addToCache(domain, {
        data: tenant,
        timestamp: Date.now()
      })
      return tenant
    }

    // If not a custom domain, check if it's a subdomain
    // e.g., acme.komunate.com -> slug = acme
    // Also support localhost subdomains for development
    const isSubdomain = domain.includes('.komunate.com') || 
                       domain.includes('.localhost') ||
                       domain.includes('.vercel.app')
    
    if (isSubdomain) {
      const slug = domain.split('.')[0]
      
      // Don't treat www as a tenant slug
      if (slug === 'www') return null
      
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single()

      if (tenant) {
        // Cache the result
        tenantCache.set(domain, {
          data: tenant,
          timestamp: Date.now()
        })
        return tenant
      }
    }

    // No tenant found for this domain
    return null
  } catch (error) {
    console.error('Error looking up tenant:', error)
    return null
  }
}

/**
 * Check if a domain is the platform domain (komunate.com)
 */
export function isPlatformDomain(hostname: string | null): boolean {
  if (!hostname) return false
  
  const domain = hostname.toLowerCase()
  
  // Platform domains (exact matches only, not subdomains)
  const platformDomains = [
    'komunate.com',
    'www.komunate.com',
    'localhost',
    'localhost:3000',
    'numgate.vercel.app'
  ]
  
  // Check for exact match, not just includes
  // This prevents slug.komunate.com from being treated as platform
  return platformDomains.some(pd => {
    // Remove port for comparison if needed
    const domainWithoutPort = domain.replace(/:\d+$/, '')
    const pdWithoutPort = pd.replace(/:\d+$/, '')
    return domainWithoutPort === pdWithoutPort
  })
}

/**
 * Clear tenant cache (useful after domain changes)
 */
export function clearTenantCache(domain?: string) {
  if (domain) {
    tenantCache.delete(domain)
  } else {
    tenantCache.clear()
  }
}