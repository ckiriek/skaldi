# Error Handling Guide

Standardized error handling system for Asetria Writer.

## Overview

All errors in the system follow a consistent format, making them easy to handle, log, and display to users.

## Error Format

### AgentError

```typescript
interface AgentError {
  agent: string              // Agent name (e.g., "Writer_CSR")
  stage: string              // Processing stage (e.g., "validate")
  error_code: string         // Machine-readable code
  message: string            // Human-readable message
  details?: Record<string, any>  // Additional context
  severity: 'info' | 'warning' | 'error' | 'critical'
  category: ErrorCategory    // Error category
  timestamp: string          // ISO 8601 timestamp
}
```

### Example

```json
{
  "agent": "Writer_CSR",
  "stage": "validate",
  "error_code": "missing_endpoint",
  "message": "Primary endpoint not linked to SAP",
  "details": {
    "endpoint": "HbA1c Week 12",
    "sap_id": null
  },
  "severity": "error",
  "category": "validation",
  "timestamp": "2025-11-11T18:00:00Z"
}
```

## Usage in Agents

### Creating Errors

```typescript
import { createAgentError, ErrorCodes } from '@/lib/types/errors'

// Simple error
const error = createAgentError(
  'Writer_CSR',
  'validate',
  ErrorCodes.MISSING_ENDPOINT,
  'Primary endpoint not linked to SAP',
  {
    details: { endpoint: 'HbA1c Week 12', sap_id: null },
    severity: 'error',
    category: 'validation',
  }
)

// Using builder pattern
import { AgentErrorBuilder } from '@/lib/types/errors'

const error = new AgentErrorBuilder('Writer_CSR', 'validate')
  .code(ErrorCodes.MISSING_ENDPOINT)
  .message('Primary endpoint not linked to SAP')
  .details({ endpoint: 'HbA1c Week 12', sap_id: null })
  .severity('error')
  .category('validation')
  .documentId('doc-123')
  .sectionId('section-5')
  .build()

// Throw the error
throw error
```

### Handling Errors in API Routes

```typescript
import { handleApiError, validateRequiredFields } from '@/lib/middleware/error-handler'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    validateRequiredFields(
      body,
      ['project_id', 'document_type'],
      'MyAgent',
      'process'
    )
    
    // Your logic here
    const result = await processDocument(body)
    
    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    // Automatically converts to standardized format
    return handleApiError(error, 'MyAgent', 'process')
  }
}
```

### Using Error Wrapper

```typescript
import { withErrorHandler } from '@/lib/middleware/error-handler'

export const POST = withErrorHandler(
  async (request: NextRequest) => {
    const body = await request.json()
    const result = await processDocument(body)
    
    return NextResponse.json({
      success: true,
      data: result,
    })
  },
  'MyAgent',
  'process'
)
```

## Error Categories

| Category | Description | HTTP Status |
|----------|-------------|-------------|
| `validation` | Data validation errors | 400 |
| `authentication` | Auth errors | 401 |
| `authorization` | Permission errors | 403 |
| `not_found` | Resource not found | 404 |
| `conflict` | Data conflict | 409 |
| `rate_limit` | Rate limiting | 429 |
| `external_api` | External API errors | 502 |
| `database` | Database errors | 500 |
| `generation` | AI generation errors | 500 |
| `processing` | Data processing errors | 500 |
| `network` | Network errors | 503 |
| `timeout` | Timeout errors | 504 |
| `configuration` | Configuration errors | 500 |
| `unknown` | Unknown errors | 500 |

## Error Codes

Standard error codes are defined in `ErrorCodes`:

```typescript
import { ErrorCodes } from '@/lib/types/errors'

// Validation
ErrorCodes.VALIDATION_FAILED
ErrorCodes.MISSING_REQUIRED_FIELD
ErrorCodes.INVALID_FORMAT
ErrorCodes.INVALID_VALUE

// Data
ErrorCodes.NOT_FOUND
ErrorCodes.ALREADY_EXISTS
ErrorCodes.CONFLICT

// Auth
ErrorCodes.UNAUTHORIZED
ErrorCodes.FORBIDDEN
ErrorCodes.TOKEN_EXPIRED

// External API
ErrorCodes.EXTERNAL_API_ERROR
ErrorCodes.EXTERNAL_API_TIMEOUT
ErrorCodes.EXTERNAL_API_RATE_LIMIT

// Generation
ErrorCodes.GENERATION_FAILED
ErrorCodes.GENERATION_TIMEOUT
ErrorCodes.INSUFFICIENT_DATA

// Agent-specific
ErrorCodes.MISSING_ENDPOINT
ErrorCodes.MISSING_SAP_LINK
ErrorCodes.MISSING_PROTOCOL_LINK
ErrorCodes.INCOMPLETE_SECTION
ErrorCodes.INVALID_REFERENCE

// System
ErrorCodes.DATABASE_ERROR
ErrorCodes.NETWORK_ERROR
ErrorCodes.TIMEOUT
ErrorCodes.CONFIGURATION_ERROR
ErrorCodes.UNKNOWN_ERROR
```

## Frontend Integration

### Displaying Errors

```typescript
import { formatErrorForUser } from '@/lib/types/errors'

// In your component
const handleError = (error: AgentError) => {
  const userMessage = formatErrorForUser(error)
  
  // Show toast notification
  toast.error(userMessage)
  
  // If section_id is present, scroll to section
  if (error.section_id) {
    scrollToSection(error.section_id)
  }
}
```

### Error Toast Component

```tsx
import { AgentError } from '@/lib/types/errors'

interface ErrorToastProps {
  error: AgentError
  onViewSection?: () => void
}

export function ErrorToast({ error, onViewSection }: ErrorToastProps) {
  const severityIcon = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    critical: '🚨',
  }
  
  return (
    <div className="flex items-start gap-3">
      <span className="text-2xl">{severityIcon[error.severity]}</span>
      <div className="flex-1">
        <p className="font-medium">{error.message}</p>
        {error.section_id && (
          <button
            onClick={onViewSection}
            className="text-sm text-blue-600 hover:underline"
          >
            View section →
          </button>
        )}
      </div>
    </div>
  )
}
```

## Logging

Errors are automatically logged with context:

```typescript
import { formatErrorForLogging } from '@/lib/types/errors'

const logMessage = formatErrorForLogging(error)
// Output: [ERROR] Writer_CSR/validate missing_endpoint: Primary endpoint not linked to SAP | Details: {"endpoint":"HbA1c Week 12","sap_id":null}
```

## Retry Logic

Check if an error is retryable:

```typescript
import { isRetryableError } from '@/lib/types/errors'

if (isRetryableError(error)) {
  // Retry the operation
  await retryOperation()
} else {
  // Show error to user
  showError(error)
}
```

## Best Practices

1. **Always use standardized error format** - Don't throw raw Error objects
2. **Provide context** - Include document_id, section_id when available
3. **Use appropriate severity** - info < warning < error < critical
4. **Include actionable details** - Help users understand what went wrong
5. **Log errors properly** - Use formatErrorForLogging for consistent logs
6. **Handle retryable errors** - Automatically retry network/timeout errors
7. **Show user-friendly messages** - Use formatErrorForUser for display

## Examples

### Validation Error

```typescript
throw createAgentError(
  'Validator_Protocol',
  'validate',
  ErrorCodes.MISSING_ENDPOINT,
  'Primary endpoint not found in SAP',
  {
    severity: 'error',
    category: 'validation',
    details: {
      endpoint: 'HbA1c Week 12',
      sap_id: 'sap-123',
      found_endpoints: ['HbA1c Week 24', 'FPG Week 12'],
    },
  }
)
```

### External API Error

```typescript
throw createAgentError(
  'RegData',
  'fetch',
  ErrorCodes.EXTERNAL_API_TIMEOUT,
  'PubChem API request timed out',
  {
    severity: 'warning',
    category: 'external_api',
    details: {
      api: 'PubChem',
      endpoint: '/compound/name/metformin',
      timeout_ms: 5000,
    },
  }
)
```

### Generation Error

```typescript
throw createAgentError(
  'Writer_IB',
  'generate',
  ErrorCodes.INSUFFICIENT_DATA,
  'Insufficient data to generate Section 5',
  {
    severity: 'error',
    category: 'generation',
    details: {
      section: 'section_5',
      required_fields: ['pharmacokinetics', 'pharmacodynamics'],
      missing_fields: ['pharmacodynamics'],
    },
  }
)
```
