/**
 * Workflow Control API Route
 * 
 * Endpoints for controlling workflow execution (pause, resume, retry).
 * 
 * POST /api/v1/workflow/control - Control workflow execution
 * 
 * @module app/api/v1/workflow/control/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { workflowEngine } from '@/lib/workflow/engine'
import { handleApiError, validateRequiredFields } from '@/lib/middleware/error-handler'

/**
 * POST /api/v1/workflow/control
 * 
 * Control workflow execution
 * 
 * Request body:
 * {
 *   execution_id: string
 *   action: 'pause' | 'resume' | 'retry' | 'fail'
 *   actor_id?: string
 *   step_id?: string (required for 'retry')
 *   error_code?: string (required for 'fail')
 *   error_message?: string (required for 'fail')
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: WorkflowExecution | WorkflowStep
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    validateRequiredFields(
      body,
      ['execution_id', 'action'],
      'WorkflowOrchestrator',
      'control_execution'
    )

    const { execution_id, action, actor_id, step_id, error_code, error_message } = body

    let result

    switch (action) {
      case 'pause':
        result = await workflowEngine.pauseExecution(execution_id, actor_id)
        break

      case 'resume':
        result = await workflowEngine.resumeExecution(execution_id, actor_id)
        break

      case 'retry':
        validateRequiredFields(
          body,
          ['step_id'],
          'WorkflowOrchestrator',
          'retry_step'
        )
        result = await workflowEngine.retryStep(step_id)
        break

      case 'fail':
        validateRequiredFields(
          body,
          ['error_code', 'error_message'],
          'WorkflowOrchestrator',
          'fail_execution'
        )
        result = await workflowEngine.failExecution(execution_id, error_code, error_message)
        break

      default:
        throw new Error(`Invalid action: ${action}`)
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return handleApiError(error, 'WorkflowOrchestrator', 'control_execution')
  }
}
