/**
 * Error Handling Types
 * 
 * Standardized error format for all agents and API endpoints.
 * Provides consistent error reporting across the system.
 * 
 * @module lib/types/errors
 */

// ============================================================================
// ERROR TYPES
// ============================================================================

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

export type ErrorCategory =
  | 'validation'      // Data validation errors
  | 'authentication'  // Auth errors
  | 'authorization'   // Permission errors
  | 'not_found'       // Resource not found
  | 'conflict'        // Data conflict (e.g., duplicate)
  | 'rate_limit'      // Rate limiting
  | 'external_api'    // External API errors
  | 'database'        // Database errors
  | 'generation'      // AI generation errors
  | 'processing'      // Data processing errors
  | 'network'         // Network errors
  | 'timeout'         // Timeout errors
  | 'configuration'   // Configuration errors
  | 'unknown'         // Unknown errors

// ============================================================================
// AGENT ERROR
// ============================================================================

/**
 * Standardized error format for agents
 * 
 * Example:
 * {
 *   agent: "Writer_CSR",
 *   stage: "validate",
 *   error_code: "missing_endpoint",
 *   message: "Primary endpoint not linked to SAP",
 *   details: { endpoint: "HbA1c Week 12", sap_id: null },
 *   severity: "error",
 *   category: "validation",
 *   timestamp: "2025-11-11T18:00:00Z"
 * }
 */
export interface AgentError {
  // Agent identification
  agent: string              // Agent name (e.g., "Writer_CSR", "Validator_IB")
  stage: string              // Processing stage (e.g., "validate", "generate", "assemble")
  
  // Error details
  error_code: string         // Machine-readable error code
  message: string            // Human-readable error message
  details?: Record<string, any>  // Additional error context
  
  // Classification
  severity: ErrorSeverity    // Error severity level
  category: ErrorCategory    // Error category
  
  // Context
  document_id?: string       // Related document ID
  section_id?: string        // Related section ID
  execution_id?: string      // Related workflow execution ID
  step_id?: string           // Related workflow step ID
  
  // Debugging
  stack?: string             // Stack trace (for critical errors)
  request_id?: string        // Request ID for tracing
  
  // Metadata
  timestamp: string          // ISO 8601 timestamp
  metadata?: Record<string, any>  // Additional metadata
}

// ============================================================================
// API ERROR RESPONSE
// ============================================================================

/**
 * Standardized API error response
 */
export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, any>
    category?: ErrorCategory
    severity?: ErrorSeverity
    timestamp: string
    request_id?: string
  }
}

// ============================================================================
// VALIDATION ERROR
// ============================================================================

/**
 * Validation error with field-level details
 */
export interface ValidationError {
  field: string
  message: string
  value?: any
  constraint?: string
}

export interface ValidationErrorResponse extends ApiErrorResponse {
  error: ApiErrorResponse['error'] & {
    validation_errors: ValidationError[]
  }
}

// ============================================================================
// ERROR BUILDER
// ============================================================================

/**
 * Builder for creating standardized agent errors
 */
export class AgentErrorBuilder {
  private error: Partial<AgentError>

  constructor(agent: string, stage: string) {
    this.error = {
      agent,
      stage,
      timestamp: new Date().toISOString(),
      severity: 'error',
      category: 'unknown',
    }
  }

  code(error_code: string): this {
    this.error.error_code = error_code
    return this
  }

  message(message: string): this {
    this.error.message = message
    return this
  }

  details(details: Record<string, any>): this {
    this.error.details = details
    return this
  }

  severity(severity: ErrorSeverity): this {
    this.error.severity = severity
    return this
  }

  category(category: ErrorCategory): this {
    this.error.category = category
    return this
  }

  documentId(document_id: string): this {
    this.error.document_id = document_id
    return this
  }

  sectionId(section_id: string): this {
    this.error.section_id = section_id
    return this
  }

  executionId(execution_id: string): this {
    this.error.execution_id = execution_id
    return this
  }

  stepId(step_id: string): this {
    this.error.step_id = step_id
    return this
  }

  stack(stack: string): this {
    this.error.stack = stack
    return this
  }

  requestId(request_id: string): this {
    this.error.request_id = request_id
    return this
  }

  metadata(metadata: Record<string, any>): this {
    this.error.metadata = metadata
    return this
  }

  build(): AgentError {
    if (!this.error.error_code) {
      throw new Error('error_code is required')
    }
    if (!this.error.message) {
      throw new Error('message is required')
    }
    return this.error as AgentError
  }
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Standard error codes for common scenarios
 */
export const ErrorCodes = {
  // Validation errors
  VALIDATION_FAILED: 'validation_failed',
  MISSING_REQUIRED_FIELD: 'missing_required_field',
  INVALID_FORMAT: 'invalid_format',
  INVALID_VALUE: 'invalid_value',
  
  // Data errors
  NOT_FOUND: 'not_found',
  ALREADY_EXISTS: 'already_exists',
  CONFLICT: 'conflict',
  
  // Authentication/Authorization
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  TOKEN_EXPIRED: 'token_expired',
  
  // External API errors
  EXTERNAL_API_ERROR: 'external_api_error',
  EXTERNAL_API_TIMEOUT: 'external_api_timeout',
  EXTERNAL_API_RATE_LIMIT: 'external_api_rate_limit',
  
  // Generation errors
  GENERATION_FAILED: 'generation_failed',
  GENERATION_TIMEOUT: 'generation_timeout',
  INSUFFICIENT_DATA: 'insufficient_data',
  
  // Processing errors
  PROCESSING_FAILED: 'processing_failed',
  PARSING_FAILED: 'parsing_failed',
  TRANSFORMATION_FAILED: 'transformation_failed',
  
  // Agent-specific errors
  MISSING_ENDPOINT: 'missing_endpoint',
  MISSING_SAP_LINK: 'missing_sap_link',
  MISSING_PROTOCOL_LINK: 'missing_protocol_link',
  INCOMPLETE_SECTION: 'incomplete_section',
  INVALID_REFERENCE: 'invalid_reference',
  
  // System errors
  DATABASE_ERROR: 'database_error',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  CONFIGURATION_ERROR: 'configuration_error',
  UNKNOWN_ERROR: 'unknown_error',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a standardized agent error
 */
export function createAgentError(
  agent: string,
  stage: string,
  error_code: string,
  message: string,
  options?: {
    details?: Record<string, any>
    severity?: ErrorSeverity
    category?: ErrorCategory
    document_id?: string
    section_id?: string
    execution_id?: string
    step_id?: string
    stack?: string
    request_id?: string
    metadata?: Record<string, any>
  }
): AgentError {
  return {
    agent,
    stage,
    error_code,
    message,
    severity: options?.severity || 'error',
    category: options?.category || 'unknown',
    timestamp: new Date().toISOString(),
    ...options,
  }
}

/**
 * Create a standardized API error response
 */
export function createApiError(
  code: string,
  message: string,
  options?: {
    details?: Record<string, any>
    category?: ErrorCategory
    severity?: ErrorSeverity
    request_id?: string
  }
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      ...options,
    },
  }
}

/**
 * Create a validation error response
 */
export function createValidationError(
  message: string,
  validation_errors: ValidationError[],
  options?: {
    request_id?: string
  }
): ValidationErrorResponse {
  return {
    success: false,
    error: {
      code: ErrorCodes.VALIDATION_FAILED,
      message,
      category: 'validation',
      severity: 'error',
      timestamp: new Date().toISOString(),
      validation_errors,
      ...options,
    },
  }
}

/**
 * Convert Error to AgentError
 */
export function toAgentError(
  error: Error,
  agent: string,
  stage: string,
  options?: {
    error_code?: string
    category?: ErrorCategory
    severity?: ErrorSeverity
    details?: Record<string, any>
  }
): AgentError {
  return createAgentError(
    agent,
    stage,
    options?.error_code || ErrorCodes.UNKNOWN_ERROR,
    error.message,
    {
      severity: options?.severity || 'error',
      category: options?.category || 'unknown',
      stack: error.stack,
      details: options?.details,
    }
  )
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AgentError): boolean {
  const retryableCategories: ErrorCategory[] = [
    'network',
    'timeout',
    'rate_limit',
    'external_api',
  ]
  
  return retryableCategories.includes(error.category)
}

/**
 * Get HTTP status code for error category
 */
export function getHttpStatusCode(category: ErrorCategory): number {
  const statusCodes: Record<ErrorCategory, number> = {
    validation: 400,
    authentication: 401,
    authorization: 403,
    not_found: 404,
    conflict: 409,
    rate_limit: 429,
    external_api: 502,
    database: 500,
    generation: 500,
    processing: 500,
    network: 503,
    timeout: 504,
    configuration: 500,
    unknown: 500,
  }
  
  return statusCodes[category] || 500
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: AgentError): string {
  const parts = [
    `[${error.severity.toUpperCase()}]`,
    `${error.agent}/${error.stage}`,
    `${error.error_code}:`,
    error.message,
  ]
  
  if (error.details) {
    parts.push(`| Details: ${JSON.stringify(error.details)}`)
  }
  
  return parts.join(' ')
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: AgentError): string {
  let message = error.message
  
  // Add section context if available
  if (error.section_id) {
    message += ` (Section: ${error.section_id})`
  }
  
  // Add severity indicator
  const severityEmoji = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    critical: '🚨',
  }
  
  return `${severityEmoji[error.severity]} ${message}`
}
