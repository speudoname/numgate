import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, ApiError } from './api-error'

/**
 * Higher-order function to wrap API route handlers with error handling
 * Provides consistent error responses and logging
 */
export function withErrorHandling<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      return await handler(request, ...args)
    } catch (error) {
      const { error: apiError, statusCode } = handleApiError(
        error as Error,
        request.nextUrl.pathname
      )

      return NextResponse.json(
        { error: apiError.message, code: apiError.code, details: apiError.details },
        { status: statusCode }
      )
    }
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: ApiError,
  request?: NextRequest
): NextResponse {
  const path = request?.nextUrl.pathname
  const errorWithPath = { ...error, path }

  return NextResponse.json(
    { 
      error: error.message, 
      code: error.code, 
      details: error.details,
      timestamp: error.timestamp,
      path: errorWithPath.path
    },
    { status: error.statusCode }
  )
}

/**
 * Handle validation errors from Zod or other validators
 */
export function handleValidationError(
  validationError: any,
  path?: string
): NextResponse {
  const apiError = {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    statusCode: 400,
    details: validationError.flatten ? validationError.flatten() : validationError,
    timestamp: new Date().toISOString(),
    path
  }

  return createErrorResponse(apiError)
}

/**
 * Handle database errors
 */
export function handleDatabaseError(
  error: any,
  path?: string
): NextResponse {
  const apiError = {
    code: 'DATABASE_ERROR',
    message: 'Database operation failed',
    statusCode: 500,
    details: process.env.NODE_ENV === 'development' ? error : undefined,
    timestamp: new Date().toISOString(),
    path
  }

  return createErrorResponse(apiError)
}
