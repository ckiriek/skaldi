/**
 * Error Handler Middleware
 * 
 * Centralized error handling for API routes.
 * Converts errors to standardized format and logs them.
 * 
 * @module lib/middleware/error-handler
 */

import { NextResponse } from 'next/server'
import type {
  AgentError,
  ApiErrorResponse,
  ErrorCategory,
} from '@/lib/types/errors'
import {
  createApiError,
  getHttpStatusCode,
  formatErrorForLogging,
  ErrorCodes,
} from '@/lib/types/errors'

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Handle errors in API routes
 * 
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   try {
 *     // ... your code
 *   } catch (error) {
 *     return handleApiError(error, 'MyAgent', 'process')
 *   }
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  agent?: string,
  stage?: string,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  // Log error
  console.error('API Error:', error)

  // Convert to AgentError if it's an AgentError
  if (isAgentError(error)) {
    const agentError = error as AgentError
    console.error(formatErrorForLogging(agentError))
    
    return NextResponse.json(
      createApiError(
        agentError.error_code,
        agentError.message,
        {
          details: agentError.details,
          category: agentError.category,
          severity: agentError.severity,
          request_id: requestId || agentError.request_id,
        }
      ),
      { status: getHttpStatusCode(agentError.category) }
    )
  }

  // Convert Error to ApiError
  if (error instanceof Error) {
    const category = inferErrorCategory(error)
    const errorCode = inferErrorCode(error, category)
    
    return NextResponse.json(
      createApiError(
        errorCode,
        error.message,
        {
          category,
          severity: 'error',
          request_id: requestId,
          details: {
            agent,
            stage,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          },
        }
      ),
      { status: getHttpStatusCode(category) }
    )
  }

  // Unknown error type
  return NextResponse.json(
    createApiError(
      ErrorCodes.UNKNOWN_ERROR,
      'An unexpected error occurred',
      {
        category: 'unknown',
        severity: 'error',
        request_id: requestId,
        details: {
          agent,
          stage,
          error: String(error),
        },
      }
    ),
    { status: 500 }
  )
}

// ============================================================================
// ERROR TYPE GUARDS
// ============================================================================

/**
 * Check if error is an AgentError
 */
function isAgentError(error: unknown): error is AgentError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'agent' in error &&
    'stage' in error &&
    'error_code' in error &&
    'message' in error
  )
}

// ============================================================================
// ERROR INFERENCE
// ============================================================================

/**
 * Infer error category from Error object
 */
function inferErrorCategory(error: Error): ErrorCategory {
  const message = error.message.toLowerCase()
  
  // Database errors
  if (
    message.includes('database') ||
    message.includes('postgres') ||
    message.includes('supabase') ||
    message.includes('connection')
  ) {
    return 'database'
  }
  
  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  ) {
    return 'network'
  }
  
  // Timeout errors
  if (
    message.includes('timeout') ||
    message.includes('timed out')
  ) {
    return 'timeout'
  }
  
  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    message.includes('missing')
  ) {
    return 'validation'
  }
  
  // Authentication errors
  if (
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('token')
  ) {
    return 'authentication'
  }
  
  // Authorization errors
  if (
    message.includes('forbidden') ||
    message.includes('permission') ||
    message.includes('access denied')
  ) {
    return 'authorization'
  }
  
  // Not found errors
  if (
    message.includes('not found') ||
    message.includes('does not exist')
  ) {
    return 'not_found'
  }
  
  // Rate limit errors
  if (
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return 'rate_limit'
  }
  
  // External API errors
  if (
    message.includes('api') ||
    message.includes('external')
  ) {
    return 'external_api'
  }
  
  return 'unknown'
}

/**
 * Infer error code from Error object and category
 */
function inferErrorCode(error: Error, category: ErrorCategory): string {
  const message = error.message.toLowerCase()
  
  switch (category) {
    case 'validation':
      if (message.includes('required')) return ErrorCodes.MISSING_REQUIRED_FIELD
      if (message.includes('invalid')) return ErrorCodes.INVALID_VALUE
      return ErrorCodes.VALIDATION_FAILED
      
    case 'authentication':
      if (message.includes('token')) return ErrorCodes.TOKEN_EXPIRED
      return ErrorCodes.UNAUTHORIZED
      
    case 'authorization':
      return ErrorCodes.FORBIDDEN
      
    case 'not_found':
      return ErrorCodes.NOT_FOUND
      
    case 'conflict':
      if (message.includes('exists')) return ErrorCodes.ALREADY_EXISTS
      return ErrorCodes.CONFLICT
      
    case 'rate_limit':
      return ErrorCodes.EXTERNAL_API_RATE_LIMIT
      
    case 'external_api':
      if (message.includes('timeout')) return ErrorCodes.EXTERNAL_API_TIMEOUT
      return ErrorCodes.EXTERNAL_API_ERROR
      
    case 'database':
      return ErrorCodes.DATABASE_ERROR
      
    case 'network':
      return ErrorCodes.NETWORK_ERROR
      
    case 'timeout':
      return ErrorCodes.TIMEOUT
      
    case 'configuration':
      return ErrorCodes.CONFIGURATION_ERROR
      
    default:
      return ErrorCodes.UNKNOWN_ERROR
  }
}

// ============================================================================
// ERROR WRAPPER
// ============================================================================

/**
 * Wrap async API handler with error handling
 * 
 * Usage:
 * ```typescript
 * export const POST = withErrorHandler(async (request: NextRequest) => {
 *   // ... your code
 *   return NextResponse.json({ success: true, data })
 * }, 'MyAgent', 'process')
 * ```
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  agent?: string,
  stage?: string
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      // Generate request ID
      const requestId = generateRequestId()
      
      return handleApiError(error, agent, stage, requestId)
    }
  }) as T
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Assert that a value is defined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  fieldName: string,
  agent?: string,
  stage?: string
): asserts value is T {
  if (value === null || value === undefined) {
    const error: AgentError = {
      agent: agent || 'Unknown',
      stage: stage || 'validation',
      error_code: ErrorCodes.MISSING_REQUIRED_FIELD,
      message: `Missing required field: ${fieldName}`,
      severity: 'error',
      category: 'validation',
      timestamp: new Date().toISOString(),
      details: { field: fieldName },
    }
    throw error
  }
}

/**
 * Assert that a condition is true
 */
export function assert(
  condition: boolean,
  errorCode: string,
  message: string,
  agent?: string,
  stage?: string,
  details?: Record<string, any>
): asserts condition {
  if (!condition) {
    const error: AgentError = {
      agent: agent || 'Unknown',
      stage: stage || 'validation',
      error_code: errorCode,
      message,
      severity: 'error',
      category: 'validation',
      timestamp: new Date().toISOString(),
      details,
    }
    throw error
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[],
  agent?: string,
  stage?: string
): void {
  const missingFields = requiredFields.filter(field => !body[field])
  
  if (missingFields.length > 0) {
    const error: AgentError = {
      agent: agent || 'Unknown',
      stage: stage || 'validation',
      error_code: ErrorCodes.MISSING_REQUIRED_FIELD,
      message: `Missing required fields: ${missingFields.join(', ')}`,
      severity: 'error',
      category: 'validation',
      timestamp: new Date().toISOString(),
      details: { missing_fields: missingFields },
    }
    throw error
  }
}
