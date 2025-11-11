/**
 * Workflow Execute API Route
 * 
 * Endpoint for executing workflows.
 * 
 * POST /api/v1/workflow/execute - Execute workflow
 * 
 * @module app/api/v1/workflow/execute/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { workflowExecutor } from '@/lib/workflow/executor'
import { handleApiError, validateRequiredFields } from '@/lib/middleware/error-handler'

/**
 * POST /api/v1/workflow/execute
 * 
 * Execute a workflow (async)
 * 
 * Request body:
 * {
 *   execution_id: string
 *   mode?: 'full' | 'next_step'  // 'full' executes all steps, 'next_step' executes one step
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    validateRequiredFields(
      body,
      ['execution_id'],
      'WorkflowExecutor',
      'execute'
    )

    const { execution_id, mode = 'full' } = body

    // Execute workflow asynchronously
    if (mode === 'next_step') {
      // Execute only next step
      workflowExecutor.executeNextStep(execution_id).catch(error => {
        console.error('Workflow step execution failed:', error)
      })

      return NextResponse.json({
        success: true,
        message: 'Workflow step execution started',
        execution_id,
      })
    } else {
      // Execute full workflow
      workflowExecutor.executeWorkflow(execution_id).catch(error => {
        console.error('Workflow execution failed:', error)
      })

      return NextResponse.json({
        success: true,
        message: 'Workflow execution started',
        execution_id,
      })
    }
  } catch (error) {
    return handleApiError(error, 'WorkflowExecutor', 'execute')
  }
}
