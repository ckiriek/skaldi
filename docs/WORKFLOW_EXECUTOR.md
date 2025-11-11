# Workflow Executor Guide

Complete guide for using the Workflow Executor system.

## Overview

The Workflow Executor orchestrates the execution of document generation workflows by:
- Managing workflow state
- Executing agents in sequence
- Handling errors and retries
- Tracking progress
- Providing real-time updates

## Architecture

```
[API] → [WorkflowEngine] → [WorkflowExecutor] → [Agents]
           ↓                      ↓                  ↓
    [workflow_executions]  [Agent Registry]   [API Calls]
    [workflow_steps]
    [workflow_events]
```

## Quick Start

### 1. Create and Start Workflow

**Single API Call:**
```typescript
POST /api/v1/workflow/start
{
  "project_id": "uuid",
  "document_type": "ib",
  "triggered_by": "user-uuid",
  "auto_execute": true  // Default: true
}

Response:
{
  "success": true,
  "data": {
    "execution": {
      "id": "exec-uuid",
      "current_state": "created",
      "percent_complete": 0,
      ...
    },
    "started": true
  }
}
```

### 2. Monitor Progress

```typescript
GET /api/v1/workflow?execution_id=exec-uuid&include_steps=true

Response:
{
  "success": true,
  "data": {
    "execution": {
      "current_state": "writing",
      "current_step": "write",
      "percent_complete": 60
    },
    "steps": [
      {
        "step_name": "enrich",
        "status": "completed",
        "duration_ms": 5000
      },
      {
        "step_name": "compose",
        "status": "completed",
        "duration_ms": 2000
      },
      {
        "step_name": "write",
        "status": "running",
        "started_at": "2025-11-11T18:00:00Z"
      }
    ]
  }
}
```

### 3. Control Execution

**Pause:**
```typescript
POST /api/v1/workflow/control
{
  "execution_id": "exec-uuid",
  "action": "pause",
  "actor_id": "user-uuid"
}
```

**Resume:**
```typescript
POST /api/v1/workflow/control
{
  "execution_id": "exec-uuid",
  "action": "resume",
  "actor_id": "user-uuid"
}
```

**Retry Failed Step:**
```typescript
POST /api/v1/workflow/control
{
  "execution_id": "exec-uuid",
  "action": "retry",
  "step_id": "step-uuid"
}
```

## Workflow States

```
created → enriching → enriched → composing → composed 
→ writing → written → validating → validated 
→ assembling → assembled → exporting → completed
```

**Terminal States:**
- `completed` - Workflow finished successfully
- `failed` - Workflow failed with error
- `paused` - User paused workflow

## Agents

### Available Agents

1. **RegData Agent** (`regdata`)
   - Enriches project with regulatory data
   - Calls: `/api/v1/enrich`
   - Timeout: 10 minutes
   - Retry: Yes

2. **Composer Agent** (`composer`)
   - Generates document structure
   - Calls: `/api/v1/compose`
   - Timeout: 5 minutes
   - Retry: Yes

3. **Writer Agent** (`writer`)
   - Generates narrative content
   - Calls: `/api/v1/write` (TODO)
   - Timeout: 30 minutes
   - Retry: Yes

4. **Validator Agent** (`validator`)
   - Validates document
   - Calls: `/api/v1/validate`
   - Timeout: 5 minutes
   - Retry: No

5. **Assembler Agent** (`assembler`)
   - Assembles final document
   - Calls: `/api/v1/assemble`
   - Timeout: 5 minutes
   - Retry: Yes

6. **Export Agent** (`export`)
   - Exports to PDF/DOCX
   - Calls: `/api/v1/export`
   - Timeout: 5 minutes
   - Retry: Yes

### Registering Custom Agents

```typescript
import { registerAgent } from '@/lib/workflow/executor'
import type { AgentResult } from '@/lib/types/workflow'

registerAgent('my_agent', async (input: any): Promise<AgentResult> => {
  try {
    // Your agent logic here
    const result = await processData(input)
    
    return {
      success: true,
      data: result,
      metadata: {
        duration_ms: 1000,
        model_used: 'gpt-4',
      }
    }
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'transient',  // or 'validation' or 'fatal'
        message: error.message,
        code: 'MY_ERROR_CODE',
      }
    }
  }
})
```

## Error Handling

### Error Types

1. **Transient Errors** - Automatically retried
   - Network errors
   - Timeouts
   - Rate limits
   - External API errors

2. **Validation Errors** - Require user fix
   - Missing data
   - Invalid format
   - Business rule violations

3. **Fatal Errors** - Stop execution
   - Configuration errors
   - Critical failures
   - Unrecoverable errors

### Retry Logic

- **Automatic Retry:** Up to 3 attempts with exponential backoff
- **Retry Delay:** 1s, 2s, 4s
- **Retry Conditions:**
  - Error type is `transient`
  - Step has `retry_on_failure: true`
  - Retry count < max_retries

### Example Error Handling

```typescript
// Agent returns error
{
  success: false,
  error: {
    type: 'transient',
    message: 'API timeout',
    code: 'TIMEOUT'
  }
}

// Executor automatically retries
// After 3 failed attempts, marks step as failed
// If step is required, fails entire workflow
```

## Workflow Definitions

### IB Generation Workflow

```json
{
  "name": "ib-generation",
  "steps": [
    {
      "name": "enrich",
      "agent": "regdata",
      "required": true,
      "timeout_minutes": 10,
      "retry_on_failure": true
    },
    {
      "name": "compose",
      "agent": "composer",
      "required": true,
      "timeout_minutes": 5,
      "retry_on_failure": true
    },
    {
      "name": "write",
      "agent": "writer",
      "required": true,
      "timeout_minutes": 30,
      "retry_on_failure": true
    },
    {
      "name": "validate",
      "agent": "validator",
      "required": true,
      "timeout_minutes": 5,
      "retry_on_failure": false
    },
    {
      "name": "assemble",
      "agent": "assembler",
      "required": true,
      "timeout_minutes": 5,
      "retry_on_failure": true
    }
  ]
}
```

## Advanced Usage

### Step-by-Step Execution

Execute one step at a time:

```typescript
// Execute next step only
POST /api/v1/workflow/execute
{
  "execution_id": "exec-uuid",
  "mode": "next_step"
}

// Check status
GET /api/v1/workflow?execution_id=exec-uuid

// Execute next step again
POST /api/v1/workflow/execute
{
  "execution_id": "exec-uuid",
  "mode": "next_step"
}
```

### Checkpoint and Resume

Workflow automatically saves checkpoint data:

```typescript
// Checkpoint data saved in execution.checkpoint_data
{
  "last_completed_step": "compose",
  "intermediate_results": {
    "sections": [...],
    "metadata": {...}
  }
}

// On resume, checkpoint data is passed to agents
```

### Custom Metadata

Pass custom metadata to workflow:

```typescript
POST /api/v1/workflow/start
{
  "project_id": "uuid",
  "document_type": "ib",
  "metadata": {
    "user_preferences": {
      "language": "en",
      "format": "pdf"
    },
    "custom_options": {
      "include_appendices": true
    }
  }
}

// Metadata is available to all agents in input.metadata
```

## Real-time Updates

### Using Supabase Realtime

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Subscribe to workflow updates
const channel = supabase
  .channel('workflow-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'workflow_executions',
      filter: `id=eq.${executionId}`
    },
    (payload) => {
      console.log('Workflow updated:', payload.new)
      // Update UI with new state
      updateProgress(payload.new.percent_complete)
      updateStatus(payload.new.current_state)
    }
  )
  .subscribe()

// Cleanup
channel.unsubscribe()
```

## Best Practices

1. **Always use `auto_execute: true`** for production workflows
2. **Monitor progress** using Realtime subscriptions
3. **Handle errors gracefully** - show user-friendly messages
4. **Implement retry UI** for failed steps
5. **Save checkpoint data** for long-running workflows
6. **Use metadata** for passing options to agents
7. **Test workflows** with different error scenarios
8. **Log all events** for debugging and audit

## Troubleshooting

### Workflow Stuck

```typescript
// Check current state
GET /api/v1/workflow?execution_id=exec-uuid

// If stuck, check step status
// If step is 'running' for too long, it may have timed out

// Retry the step
POST /api/v1/workflow/control
{
  "execution_id": "exec-uuid",
  "action": "retry",
  "step_id": "step-uuid"
}
```

### Agent Not Responding

```typescript
// Check agent logs
GET /api/v1/workflow?execution_id=exec-uuid&include_events=true

// Look for error events
// Check if agent API is accessible
// Verify agent is registered
```

### High Failure Rate

```typescript
// Check error patterns
GET /api/v1/workflow?execution_id=exec-uuid&include_steps=true

// Look at error_type and error_message
// If transient errors, check network/API status
// If validation errors, check input data
// If fatal errors, check agent implementation
```

## Examples

### Complete IB Generation

```typescript
// 1. Create and start workflow
const response = await fetch('/api/v1/workflow/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    project_id: 'my-project-uuid',
    document_type: 'ib',
    triggered_by: 'user-uuid',
  })
})

const { data } = await response.json()
const executionId = data.execution.id

// 2. Subscribe to updates
const channel = supabase
  .channel('workflow-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'workflow_executions',
    filter: `id=eq.${executionId}`
  }, (payload) => {
    console.log('Progress:', payload.new.percent_complete + '%')
    console.log('State:', payload.new.current_state)
    
    if (payload.new.current_state === 'completed') {
      console.log('✅ Workflow completed!')
      channel.unsubscribe()
    }
    
    if (payload.new.current_state === 'failed') {
      console.error('❌ Workflow failed:', payload.new.error_message)
      channel.unsubscribe()
    }
  })
  .subscribe()

// 3. Wait for completion
// Updates will arrive via Realtime subscription
```
