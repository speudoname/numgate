import { verifyToken } from '@/lib/auth/jwt'

/**
 * Cached token data with expiration
 */
interface CachedToken {
  payload: any
  expires: number
}

/**
 * Token cache configuration
 */
const CACHE_CONFIG = {
  maxSize: 1000, // Maximum number of cached tokens
  ttl: 5 * 60 * 1000, // 5 minutes TTL
  cleanupInterval: 60 * 1000 // Cleanup every minute
}

/**
 * LRU Token Cache for JWT verification
 * Reduces middleware latency by caching verified tokens
 */
class TokenCache {
  private cache = new Map<string, CachedToken>()
  private lastCleanup = Date.now()

  /**
   * Get cached token or verify and cache it
   */
  async get(token: string): Promise<any> {
    // Cleanup expired tokens periodically
    this.cleanupIfNeeded()

    // Check cache first
    const cached = this.cache.get(token)
    if (cached && cached.expires > Date.now()) {
      // Move to end (most recent)
      this.cache.delete(token)
      this.cache.set(token, cached)
      return cached.payload
    }

    // Verify token and cache result
    try {
      const payload = await verifyToken(token)
      if (payload) {
        this.set(token, payload)
        return payload
      }
    } catch (error) {
      // Token verification failed, don't cache
      console.error('Token verification error:', error)
    }

    return null
  }

  /**
   * Set token in cache with TTL
   */
  private set(token: string, payload: any): void {
    // Remove if already exists
    this.cache.delete(token)

    // Evict oldest if at max size
    if (this.cache.size >= CACHE_CONFIG.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    // Add to cache
    this.cache.set(token, {
      payload,
      expires: Date.now() + CACHE_CONFIG.ttl
    })
  }

  /**
   * Clean up expired tokens
   */
  private cleanupIfNeeded(): void {
    const now = Date.now()
    if (now - this.lastCleanup < CACHE_CONFIG.cleanupInterval) {
      return
    }

    this.lastCleanup = now
    const expiredTokens: string[] = []

    for (const [token, cached] of this.cache.entries()) {
      if (cached.expires <= now) {
        expiredTokens.push(token)
      }
    }

    expiredTokens.forEach(token => this.cache.delete(token))
  }

  /**
   * Clear all cached tokens
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: CACHE_CONFIG.maxSize,
      ttl: CACHE_CONFIG.ttl
    }
  }
}

// Singleton instance
export const tokenCache = new TokenCache()

/**
 * Get cached token or verify and cache it
 * This is the main function to use in middleware
 */
export async function getCachedToken(token: string): Promise<any> {
  return await tokenCache.get(token)
}

/**
 * Clear token cache (useful for testing or manual invalidation)
 */
export function clearTokenCache(): void {
  tokenCache.clear()
}

/**
 * Get cache statistics (useful for monitoring)
 */
export function getTokenCacheStats() {
  return tokenCache.getStats()
}
