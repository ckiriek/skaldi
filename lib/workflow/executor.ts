/**
 * Workflow Executor
 * 
 * Executes workflow steps by calling appropriate agents.
 * Handles agent invocation, result processing, and error handling.
 * 
 * @module lib/workflow/executor
 */

import { workflowEngine } from './engine'
import type {
  WorkflowExecution,
  WorkflowStep,
  AgentName,
  AgentResult,
} from '@/lib/types/workflow'
import { createAgentError, ErrorCodes, toAgentError } from '@/lib/types/errors'

// ============================================================================
// AGENT REGISTRY
// ============================================================================

/**
 * Agent function signature
 */
type AgentFunction = (input: any) => Promise<AgentResult>

/**
 * Registry of all available agents
 */
const agentRegistry: Partial<Record<AgentName, AgentFunction>> = {}

/**
 * Register an agent
 */
export function registerAgent(name: AgentName, fn: AgentFunction): void {
  agentRegistry[name] = fn
}

/**
 * Get agent function
 */
function getAgent(name: AgentName): AgentFunction {
  const agent = agentRegistry[name]
  if (!agent) {
    throw createAgentError(
      'WorkflowExecutor',
      'get_agent',
      ErrorCodes.CONFIGURATION_ERROR,
      `Agent not registered: ${name}`,
      {
        severity: 'critical',
        category: 'configuration',
        details: { agent_name: name },
      }
    )
  }
  return agent
}

// ============================================================================
// WORKFLOW EXECUTOR
// ============================================================================

export class WorkflowExecutor {
  /**
   * Execute a workflow
   */
  async executeWorkflow(executionId: string): Promise<void> {
    try {
      // Get execution
      const execution = await workflowEngine.getExecution(executionId)
      if (!execution) {
        throw new Error(`Workflow execution not found: ${executionId}`)
      }

      // Get all steps
      const steps = await workflowEngine.getSteps(executionId)

      // Execute steps in order
      for (const step of steps) {
        if (step.status === 'completed' || step.status === 'skipped') {
          continue
        }

        await this.executeStep(execution, step)
      }

      // Mark execution as completed
      await workflowEngine.completeExecution(executionId)
    } catch (error) {
      console.error('Workflow execution failed:', error)
      
      // Mark execution as failed
      const agentError = error instanceof Error
        ? toAgentError(error, 'WorkflowExecutor', 'execute_workflow')
        : createAgentError(
            'WorkflowExecutor',
            'execute_workflow',
            ErrorCodes.UNKNOWN_ERROR,
            'Unknown error occurred',
            { severity: 'critical', category: 'unknown' }
          )
      
      await workflowEngine.failExecution(
        executionId,
        agentError.error_code,
        agentError.message
      )
      
      throw error
    }
  }

  /**
   * Execute a single step
   */
  async executeStep(
    execution: WorkflowExecution,
    step: WorkflowStep
  ): Promise<void> {
    try {
      // Start step
      await workflowEngine.startStep(step.id)

      // Get agent
      const agent = getAgent(step.agent_name)

      // Prepare input
      const input = this.prepareAgentInput(execution, step)

      // Execute agent
      const result = await this.executeAgent(
        step.agent_name,
        agent,
        input,
        step.metadata?.timeout_minutes
      )

      // Complete step
      await workflowEngine.completeStep(step.id, result)

      // If step failed and should retry
      if (!result.success && step.metadata?.retry_on_failure) {
        if (workflowEngine.shouldRetryStep(step)) {
          await workflowEngine.retryStep(step.id)
          // Retry will be picked up in next execution cycle
        }
      }

      // Transition to next state
      if (result.success) {
        const nextState = this.getNextState(execution.current_state, step.step_name)
        if (nextState !== execution.current_state) {
          await workflowEngine.transitionState(execution.id, nextState)
        }
      }
    } catch (error) {
      console.error(`Step execution failed: ${step.step_name}`, error)

      // Convert to AgentResult
      const agentError = error instanceof Error
        ? toAgentError(error, step.agent_name, step.step_name)
        : createAgentError(
            step.agent_name,
            step.step_name,
            ErrorCodes.UNKNOWN_ERROR,
            'Unknown error occurred',
            { severity: 'error', category: 'unknown' }
          )

      const result: AgentResult = {
        success: false,
        error: {
          type: agentError.category === 'network' || agentError.category === 'timeout'
            ? 'transient'
            : agentError.category === 'validation'
            ? 'validation'
            : 'fatal',
          message: agentError.message,
          code: agentError.error_code,
        },
      }

      // Complete step with error
      await workflowEngine.completeStep(step.id, result)

      // Check if should retry
      if (step.metadata?.retry_on_failure && workflowEngine.shouldRetryStep(step)) {
        await workflowEngine.retryStep(step.id)
      } else {
        // Fail execution if step is required
        if (step.metadata?.required !== false) {
          await workflowEngine.failExecution(
            execution.id,
            agentError.error_code,
            agentError.message
          )
          throw error
        }
      }
    }
  }

  /**
   * Execute agent with timeout
   */
  private async executeAgent(
    agentName: AgentName,
    agent: AgentFunction,
    input: any,
    timeoutMinutes?: number
  ): Promise<AgentResult> {
    const timeout = (timeoutMinutes || 30) * 60 * 1000 // Convert to ms

    return Promise.race([
      agent(input),
      new Promise<AgentResult>((_, reject) =>
        setTimeout(
          () =>
            reject(
              createAgentError(
                agentName,
                'execute',
                ErrorCodes.TIMEOUT,
                `Agent execution timed out after ${timeoutMinutes} minutes`,
                {
                  severity: 'error',
                  category: 'timeout',
                  details: { timeout_minutes: timeoutMinutes },
                }
              )
            ),
          timeout
        )
      ),
    ])
  }

  /**
   * Prepare input for agent
   */
  private prepareAgentInput(
    execution: WorkflowExecution,
    step: WorkflowStep
  ): any {
    // Base input
    const input: any = {
      execution_id: execution.id,
      project_id: execution.project_id,
      document_type: execution.document_type,
      document_id: execution.document_id,
      metadata: execution.metadata,
    }

    // Add step-specific input
    if (step.input_data) {
      Object.assign(input, step.input_data)
    }

    // Add checkpoint data if available
    if (execution.checkpoint_data) {
      input.checkpoint = execution.checkpoint_data
    }

    return input
  }

  /**
   * Get next workflow state based on completed step
   */
  private getNextState(
    currentState: string,
    stepName: string
  ): any {
    const stateTransitions: Record<string, string> = {
      enrich: 'enriched',
      compose: 'composed',
      write: 'written',
      validate: 'validated',
      assemble: 'assembled',
      export: 'completed',
    }

    return stateTransitions[stepName] || currentState
  }

  /**
   * Execute next pending step for a workflow
   */
  async executeNextStep(executionId: string): Promise<boolean> {
    const execution = await workflowEngine.getExecution(executionId)
    if (!execution) {
      throw new Error(`Workflow execution not found: ${executionId}`)
    }

    // Check if execution is in terminal state
    if (execution.current_state === 'completed' || execution.current_state === 'failed') {
      return false
    }

    // Get next pending step
    const nextStep = await workflowEngine.getNextStep(executionId)
    if (!nextStep) {
      // No more steps, complete execution
      await workflowEngine.completeExecution(executionId)
      return false
    }

    // Execute the step
    await this.executeStep(execution, nextStep)
    return true
  }
}

// ============================================================================
// AGENT IMPLEMENTATIONS
// ============================================================================

/**
 * RegData Agent - Enriches project with regulatory data
 */
async function regdataAgent(input: any): Promise<AgentResult> {
  try {
    // Call enrichment API
    const response = await fetch('/api/v1/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: input.project_id,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: {
          type: 'fatal',
          message: error.error || 'Enrichment failed',
          code: ErrorCodes.EXTERNAL_API_ERROR,
        },
      }
    }

    const data = await response.json()

    return {
      success: true,
      data,
      metadata: {
        duration_ms: data.duration_ms,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'transient',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCodes.NETWORK_ERROR,
      },
    }
  }
}

/**
 * Composer Agent - Generates document structure
 */
async function composerAgent(input: any): Promise<AgentResult> {
  try {
    // Call composer API
    const response = await fetch('/api/v1/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: input.project_id,
        document_type: input.document_type,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: {
          type: 'fatal',
          message: error.error || 'Composition failed',
          code: ErrorCodes.GENERATION_FAILED,
        },
      }
    }

    const data = await response.json()

    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'transient',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCodes.NETWORK_ERROR,
      },
    }
  }
}

/**
 * Writer Agent - Generates content
 */
async function writerAgent(input: any): Promise<AgentResult> {
  try {
    // Call writer API
    const response = await fetch('/api/v1/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: input.document_id,
        refinement_type: input.refinement_type || 'enhance',
        context: input.context,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: {
          type: 'fatal',
          message: error.error || 'Content generation failed',
          code: ErrorCodes.GENERATION_FAILED,
        },
      }
    }

    const data = await response.json()

    return {
      success: true,
      data: data.data,
      metadata: {
        duration_ms: data.data.duration_ms,
        word_count_before: data.data.word_count_before,
        word_count_after: data.data.word_count_after,
        changes_made: data.data.changes_made,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'transient',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCodes.NETWORK_ERROR,
      },
    }
  }
}

/**
 * Validator Agent - Validates document
 */
async function validatorAgent(input: any): Promise<AgentResult> {
  try {
    // Call validator API
    const response = await fetch('/api/v1/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: input.document_id,
        document_type: input.document_type,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: {
          type: 'validation',
          message: error.error || 'Validation failed',
          code: ErrorCodes.VALIDATION_FAILED,
        },
      }
    }

    const data = await response.json()

    return {
      success: data.success,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'transient',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCodes.NETWORK_ERROR,
      },
    }
  }
}

/**
 * Assembler Agent - Assembles final document
 */
async function assemblerAgent(input: any): Promise<AgentResult> {
  try {
    // Call assembler API
    const response = await fetch('/api/v1/assemble', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: input.document_id,
        document_type: input.document_type,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: {
          type: 'fatal',
          message: error.error || 'Assembly failed',
          code: ErrorCodes.PROCESSING_FAILED,
        },
      }
    }

    const data = await response.json()

    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'transient',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCodes.NETWORK_ERROR,
      },
    }
  }
}

/**
 * Export Agent - Exports document to PDF/DOCX
 */
async function exportAgent(input: any): Promise<AgentResult> {
  try {
    // Call export API
    const response = await fetch('/api/v1/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: input.document_id,
        format: input.format || 'pdf',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: {
          type: 'fatal',
          message: error.error || 'Export failed',
          code: ErrorCodes.PROCESSING_FAILED,
        },
      }
    }

    const data = await response.json()

    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'transient',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCodes.NETWORK_ERROR,
      },
    }
  }
}

// ============================================================================
// REGISTER AGENTS
// ============================================================================

registerAgent('regdata', regdataAgent)
registerAgent('composer', composerAgent)
registerAgent('writer', writerAgent)
registerAgent('validator', validatorAgent)
registerAgent('assembler', assemblerAgent)
registerAgent('export', exportAgent)

// Export singleton instance
export const workflowExecutor = new WorkflowExecutor()
