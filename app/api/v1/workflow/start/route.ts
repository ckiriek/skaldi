/**
 * Workflow Start API Route
 * 
 * Convenience endpoint for creating and starting a workflow in one call.
 * 
 * POST /api/v1/workflow/start - Create and start workflow
 * 
 * @module app/api/v1/workflow/start/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { workflowEngine } from '@/lib/workflow/engine'
import { workflowExecutor } from '@/lib/workflow/executor'
import { handleApiError, validateRequiredFields } from '@/lib/middleware/error-handler'
import type { CreateWorkflowExecutionInput } from '@/lib/types/workflow'

/**
 * POST /api/v1/workflow/start
 * 
 * Create and start a workflow execution
 * 
 * Request body:
 * {
 *   project_id: string
 *   document_type: 'ib' | 'protocol' | 'icf' | 'csr' | 'sap'
 *   workflow_name?: string
 *   document_id?: string
 *   triggered_by?: string
 *   metadata?: Record<string, any>
 *   auto_execute?: boolean  // Default: true
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     execution: WorkflowExecution,
 *     started: boolean
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    validateRequiredFields(
      body,
      ['project_id', 'document_type'],
      'WorkflowStarter',
      'start'
    )

    // Default workflow name based on document type
    const workflowName = body.workflow_name || `${body.document_type}-generation`
    const autoExecute = body.auto_execute !== false

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

    // Start execution if auto_execute is true
    let started = false
    if (autoExecute) {
      // Execute workflow asynchronously
      workflowExecutor.executeWorkflow(execution.id).catch(error => {
        console.error('Workflow execution failed:', error)
      })
      started = true
    }

    return NextResponse.json({
      success: true,
      data: {
        execution,
        started,
      },
      message: started
        ? 'Workflow created and execution started'
        : 'Workflow created (not started)',
    })
  } catch (error) {
    return handleApiError(error, 'WorkflowStarter', 'start')
  }
}
