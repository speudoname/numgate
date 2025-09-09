/**
 * Simple in-memory rate limiter for authentication endpoints
 * Prevents brute force attacks and abuse
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>()
  private readonly maxAttempts: number
  private readonly windowMs: number
  private lastCleanup = Date.now()
  private readonly cleanupInterval = 60000 // Clean up every minute

  constructor(maxAttempts = 5, windowMinutes = 15) {
    this.maxAttempts = maxAttempts
    this.windowMs = windowMinutes * 60 * 1000
  }

  /**
   * Check if request should be rate limited
   * @param identifier - IP address or user email
   * @returns true if request should be blocked
   */
  isRateLimited(identifier: string): boolean {
    this.cleanupExpired()
    
    const now = Date.now()
    const entry = this.limits.get(identifier)

    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired one
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      })
      return false
    }

    // Increment counter
    entry.count++
    
    // Check if limit exceeded
    return entry.count > this.maxAttempts
  }

  /**
   * Reset rate limit for identifier (e.g., after successful login)
   */
  reset(identifier: string): void {
    this.limits.delete(identifier)
  }

  /**
   * Clean up expired entries to prevent memory leak
   */
  private cleanupExpired(): void {
    const now = Date.now()
    
    // Only cleanup periodically
    if (now - this.lastCleanup < this.cleanupInterval) {
      return
    }
    
    this.lastCleanup = now
    
    // Remove expired entries
    for (const [key, entry] of this.limits.entries()) {
      if (entry.resetTime <= now) {
        this.limits.delete(key)
      }
    }
  }

  /**
   * Get remaining attempts for identifier
   */
  getRemainingAttempts(identifier: string): number {
    const entry = this.limits.get(identifier)
    if (!entry || entry.resetTime <= Date.now()) {
      return this.maxAttempts
    }
    return Math.max(0, this.maxAttempts - entry.count)
  }

  /**
   * Get time until reset in seconds
   */
  getResetTime(identifier: string): number {
    const entry = this.limits.get(identifier)
    if (!entry || entry.resetTime <= Date.now()) {
      return 0
    }
    return Math.ceil((entry.resetTime - Date.now()) / 1000)
  }
}

// Create instances for different endpoints
export const loginRateLimiter = new RateLimiter(5, 15) // 5 attempts per 15 minutes
export const registerRateLimiter = new RateLimiter(3, 60) // 3 registrations per hour
export const passwordResetRateLimiter = new RateLimiter(3, 30) // 3 attempts per 30 minutes

/**
 * Helper function to get client IP from request
 */
export function getClientIp(request: Request): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const real = request.headers.get('x-real-ip')
  if (real) {
    return real
  }
  
  // Fallback to a default
  return 'unknown'
}

/**
 * Rate limit response helper
 */
export function rateLimitResponse(remainingTime: number) {
  return Response.json(
    { 
      error: 'Too many attempts. Please try again later.',
      retryAfter: remainingTime 
    },
    { 
      status: 429,
      headers: {
        'Retry-After': remainingTime.toString()
      }
    }
  )
}