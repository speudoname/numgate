import { NextRequest, NextResponse } from 'next/server'
import { 
  SharedApiResponse, 
  withErrorHandling as sharedWithErrorHandling,
  createErrorResponse as sharedCreateErrorResponse,
  handleValidationError as sharedHandleValidationError,
  handleDatabaseError as sharedHandleDatabaseError,
  ApiError
} from './shared-error-handler'

// Re-export shared error handler for backward compatibility
export { SharedApiResponse, ERROR_CODES } from './shared-error-handler'

/**
 * Higher-order function to wrap API route handlers with error handling
 * Now uses the shared error handling system
 */
export function withErrorHandling<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return sharedWithErrorHandling(handler)
}

/**
 * Create a standardized error response
 * Now uses the shared error handling system
 */
export function createErrorResponse(
  error: ApiError,
  request?: NextRequest
): NextResponse {
  return SharedApiResponse.error(
    error.code,
    error.message,
    error.statusCode,
    error.details,
    request?.nextUrl.pathname
  )
}

/**
 * Handle validation errors from Zod or other validators
 * Now uses the shared error handling system
 */
export function handleValidationError(
  validationError: any,
  path?: string
): NextResponse {
  return SharedApiResponse.validationError('Validation failed', validationError.flatten ? validationError.flatten() : validationError)
}

/**
 * Handle database errors
 * Now uses the shared error handling system
 */
export function handleDatabaseError(
  error: any,
  path?: string
): NextResponse {
  return SharedApiResponse.internalError('Database operation failed', process.env.NODE_ENV === 'development' ? error : undefined)
}
