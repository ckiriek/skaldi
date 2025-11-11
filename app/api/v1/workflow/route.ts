/**
 * Workflow API Route
 * 
 * Endpoints for managing workflow executions.
 * 
 * POST /api/v1/workflow - Create new workflow execution
 * GET /api/v1/workflow?execution_id=xxx - Get workflow status
 * 
 * @module app/api/v1/workflow/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { workflowEngine } from '@/lib/workflow/engine'
import type { CreateWorkflowExecutionInput } from '@/lib/types/workflow'
import { handleApiError, validateRequiredFields } from '@/lib/middleware/error-handler'
import { createApiError, ErrorCodes } from '@/lib/types/errors'

/**
 * POST /api/v1/workflow
 * 
 * Create a new workflow execution
 * 
 * Request body:
 * {
 *   project_id: string
 *   document_type: 'ib' | 'protocol' | 'icf' | 'csr' | 'sap'
 *   workflow_name?: string (defaults to '{document_type}-generation')
 *   document_id?: string
 *   triggered_by?: string
 *   metadata?: Record<string, any>
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: WorkflowExecution
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields using standardized validation
    validateRequiredFields(
      body,
      ['project_id', 'document_type'],
      'WorkflowOrchestrator',
      'create_execution'
    )

    // Default workflow name based on document type
    const workflowName = body.workflow_name || `${body.document_type}-generation`

    const input: CreateWorkflowExecutionInput = {
      project_id: body.project_id,
      document_type: body.document_type,
      document_id: body.document_id,
      workflow_name: workflowName,
      triggered_by: body.triggered_by,
      metadata: body.metadata,
    }

    // Create workflow execution
    const execution = await workflowEngine.createExecution(input)

    return NextResponse.json({
      success: true,
      data: execution,
    })
  } catch (error) {
    return handleApiError(error, 'WorkflowOrchestrator', 'create_execution')
  }
}

/**
 * GET /api/v1/workflow?execution_id=xxx
 * 
 * Get workflow execution status with steps and events
 * 
 * Query parameters:
 * - execution_id: string (required)
 * - include_steps: boolean (default: true)
 * - include_events: boolean (default: false)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     execution: WorkflowExecution,
 *     steps?: WorkflowStep[],
 *     events?: WorkflowEvent[]
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const executionId = searchParams.get('execution_id')
    const includeSteps = searchParams.get('include_steps') !== 'false'
    const includeEvents = searchParams.get('include_events') === 'true'

    // Validate required parameter
    validateRequiredFields(
      { execution_id: executionId },
      ['execution_id'],
      'WorkflowOrchestrator',
      'get_execution'
    )

    // Get execution
    const execution = await workflowEngine.getExecution(executionId!)

    if (!execution) {
      return NextResponse.json(
        createApiError(
          ErrorCodes.NOT_FOUND,
          'Workflow execution not found',
          {
            category: 'not_found',
            severity: 'error',
            details: { execution_id: executionId },
          }
        ),
        { status: 404 }
      )
    }

    // Get steps if requested
    let steps
    if (includeSteps) {
      steps = await workflowEngine.getSteps(executionId!)
    }

    // Get events if requested
    let events
    if (includeEvents) {
      events = await workflowEngine.getEvents(executionId!)
    }

    return NextResponse.json({
      success: true,
      data: {
        execution,
        steps,
        events,
      },
    })
  } catch (error) {
    return handleApiError(error, 'WorkflowOrchestrator', 'get_execution')
  }
}
