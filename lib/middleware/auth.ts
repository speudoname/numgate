import { NextRequest, NextResponse } from 'next/server'

/**
 * Authentication context extracted from request headers
 */
export interface AuthContext {
  tenantId: string
  userId?: string
  userEmail?: string
  userRole?: string
  isSuperAdmin?: boolean
}

/**
 * Options for authentication middleware
 */
export interface AuthOptions {
  requireUserId?: boolean
  requireSuperAdmin?: boolean
  allowPlatformMode?: boolean
}

/**
 * Authentication middleware factory
 * 
 * @param options - Authentication requirements
 * @returns Middleware function that validates auth and provides context
 */
export function withAuth(
  options: AuthOptions = {}
) {
  return function<T extends any[]>(
    handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      try {
        // Extract authentication headers
        const tenantId = request.headers.get('x-tenant-id')
        const userId = request.headers.get('x-user-id')
        const userEmail = request.headers.get('x-user-email')
        const userRole = request.headers.get('x-user-role')
        const isSuperAdmin = request.headers.get('x-is-super-admin') === 'true'
        const platformMode = request.headers.get('x-platform-mode') === 'true'

        // Validate tenant ID (always required)
        if (!tenantId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if platform mode is allowed
        if (!options.allowPlatformMode && platformMode) {
          return NextResponse.json({ error: 'Not available on platform domain' }, { status: 403 })
        }

        // Validate user ID if required
        if (options.requireUserId && !userId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 401 })
        }

        // Validate super admin if required
        if (options.requireSuperAdmin && !isSuperAdmin) {
          return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
        }

        // Create auth context
        const authContext: AuthContext = {
          tenantId,
          userId: userId || undefined,
          userEmail: userEmail || undefined,
          userRole: userRole || undefined,
          isSuperAdmin: isSuperAdmin || false
        }

        // Call the original handler with auth context
        return await handler(request, authContext, ...args)
      } catch (error) {
        console.error('Auth middleware error:', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Convenience function for routes that only need tenant ID
 */
export const withTenantAuth = withAuth({ requireUserId: false })

/**
 * Convenience function for routes that need both tenant and user ID
 */
export const withUserAuth = withAuth({ requireUserId: true })

/**
 * Convenience function for super admin routes
 */
export const withSuperAdminAuth = withAuth({ 
  requireUserId: true, 
  requireSuperAdmin: true 
})

/**
 * Convenience function for platform-only routes
 */
export const withPlatformAuth = withAuth({ 
  requireUserId: true,
  allowPlatformMode: true 
})
