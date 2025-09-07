/**
 * Centralized error handling system for NumGate API
 * Provides consistent error responses and logging
 */

export interface ApiError {
  code: string
  message: string
  statusCode: number
  details?: any
  timestamp: string
  path?: string
}

export interface ErrorLog {
  level: 'error' | 'warn' | 'info'
  message: string
  error?: Error
  context?: Record<string, any>
  timestamp: string
  path?: string
}

/**
 * Standard error codes used across the application
 */
export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Business logic errors
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  DOMAIN_NOT_FOUND: 'DOMAIN_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS'
} as const

/**
 * Error status code mapping
 */
const ERROR_STATUS_MAP: Record<string, number> = {
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.INVALID_TOKEN]: 401,
  [ERROR_CODES.TOKEN_EXPIRED]: 401,
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.INVALID_INPUT]: 400,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.CONFLICT]: 409,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [ERROR_CODES.DATABASE_ERROR]: 500,
  [ERROR_CODES.TENANT_NOT_FOUND]: 404,
  [ERROR_CODES.USER_NOT_FOUND]: 404,
  [ERROR_CODES.DOMAIN_NOT_FOUND]: 404,
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 403
}

/**
 * Create a standardized API error
 */
export function createApiError(
  code: string,
  message: string,
  details?: any,
  path?: string
): ApiError {
  return {
    code,
    message,
    statusCode: ERROR_STATUS_MAP[code] || 500,
    details,
    timestamp: new Date().toISOString(),
    path
  }
}

/**
 * Log error with context
 */
export function logError(
  level: ErrorLog['level'],
  message: string,
  error?: Error,
  context?: Record<string, any>,
  path?: string
): void {
  const logEntry: ErrorLog = {
    level,
    message,
    error,
    context,
    timestamp: new Date().toISOString(),
    path
  }

  // Log to console in development, structured logging in production
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${level.toUpperCase()}] ${message}`, {
      error: error?.stack,
      context,
      path
    })
  } else {
    // In production, you might want to send to a logging service
    console.error(JSON.stringify(logEntry))
  }
}

/**
 * Handle and format errors for API responses
 */
export function handleApiError(
  error: Error | ApiError,
  path?: string
): { error: ApiError; statusCode: number } {
  let apiError: ApiError

  if ('code' in error && 'statusCode' in error) {
    // Already an ApiError
    apiError = error as ApiError
  } else {
    // Convert Error to ApiError
    const err = error as Error
    apiError = createApiError(
      ERROR_CODES.INTERNAL_ERROR,
      err.message || 'Internal server error',
      undefined,
      path
    )
  }

  // Log the error
  logError('error', apiError.message, error as Error, {
    code: apiError.code,
    statusCode: apiError.statusCode,
    details: apiError.details
  }, path)

  return {
    error: apiError,
    statusCode: apiError.statusCode
  }
}

/**
 * Convenience functions for common errors
 */
export const ApiErrors = {
  unauthorized: (message = 'Unauthorized') => 
    createApiError(ERROR_CODES.UNAUTHORIZED, message),
  
  forbidden: (message = 'Forbidden') => 
    createApiError(ERROR_CODES.FORBIDDEN, message),
  
  notFound: (message = 'Resource not found') => 
    createApiError(ERROR_CODES.NOT_FOUND, message),
  
  validationError: (message = 'Validation failed', details?: any) => 
    createApiError(ERROR_CODES.VALIDATION_ERROR, message, details),
  
  internalError: (message = 'Internal server error') => 
    createApiError(ERROR_CODES.INTERNAL_ERROR, message),
  
  tenantNotFound: (tenantId?: string) => 
    createApiError(ERROR_CODES.TENANT_NOT_FOUND, 'Tenant not found', { tenantId }),
  
  userNotFound: (userId?: string) => 
    createApiError(ERROR_CODES.USER_NOT_FOUND, 'User not found', { userId }),
  
  domainNotFound: (domain?: string) => 
    createApiError(ERROR_CODES.DOMAIN_NOT_FOUND, 'Domain not found', { domain }),
  
  insufficientPermissions: (action?: string) => 
    createApiError(ERROR_CODES.INSUFFICIENT_PERMISSIONS, 'Insufficient permissions', { action })
}
