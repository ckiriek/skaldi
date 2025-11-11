/**
 * Workflow Status Component
 * 
 * Displays current workflow execution status with progress and steps.
 */

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WorkflowExecution, WorkflowStep } from '@/lib/types/workflow'
import { getWorkflowStateDisplay, getStepStatusDisplay, formatDuration } from '@/lib/types/workflow'

interface WorkflowStatusProps {
  executionId: string
  onComplete?: () => void
  onError?: (error: string) => void
}

export function WorkflowStatus({ executionId, onComplete, onError }: WorkflowStatusProps) {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null)
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch workflow status
  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/v1/workflow?execution_id=${executionId}&include_steps=true`)
      const data = await response.json()

      if (data.success) {
        setExecution(data.data.execution)
        setSteps(data.data.steps || [])

        // Check if completed or failed
        if (data.data.execution.current_state === 'completed') {
          onComplete?.()
        } else if (data.data.execution.current_state === 'failed') {
          onError?.(data.data.execution.error_message || 'Workflow failed')
        }
      }
    } catch (error) {
      console.error('Failed to fetch workflow status:', error)
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to real-time updates
  useEffect(() => {
    const supabase = createClient()

    // Initial fetch
    fetchStatus()

    // Subscribe to updates
    const channel = supabase
      .channel('workflow-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workflow_executions',
          filter: `id=eq.${executionId}`,
        },
        () => {
          fetchStatus()
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      channel.unsubscribe()
    }
  }, [executionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="text-center p-8 text-gray-500">
        Workflow not found
      </div>
    )
  }

  const stateDisplay = getWorkflowStateDisplay(execution.current_state)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{stateDisplay}</h3>
          <p className="text-sm text-gray-500">
            {execution.workflow_name} • v{execution.workflow_version}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {execution.percent_complete}%
          </div>
          <div className="text-xs text-gray-500">Complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${execution.percent_complete}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      {execution.current_step && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="animate-pulse h-2 w-2 bg-blue-600 rounded-full" />
            <span className="font-medium text-blue-900">
              Currently: {execution.current_step}
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {execution.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-red-600">❌</span>
            <div className="flex-1">
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{execution.error_message}</p>
              {execution.error_code && (
                <p className="text-xs text-red-600 mt-1">Code: {execution.error_code}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Steps</h4>
        <div className="space-y-2">
          {steps.map((step, index) => {
            const statusDisplay = getStepStatusDisplay(step.status)
            const isActive = step.status === 'running'
            const isCompleted = step.status === 'completed'
            const isFailed = step.status === 'failed'

            return (
              <div
                key={step.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border
                  ${isActive ? 'bg-blue-50 border-blue-200' : ''}
                  ${isCompleted ? 'bg-green-50 border-green-200' : ''}
                  ${isFailed ? 'bg-red-50 border-red-200' : ''}
                  ${!isActive && !isCompleted && !isFailed ? 'bg-gray-50 border-gray-200' : ''}
                `}
              >
                {/* Step Number */}
                <div
                  className={`
                    flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                    ${isActive ? 'bg-blue-600 text-white' : ''}
                    ${isCompleted ? 'bg-green-600 text-white' : ''}
                    ${isFailed ? 'bg-red-600 text-white' : ''}
                    ${!isActive && !isCompleted && !isFailed ? 'bg-gray-300 text-gray-600' : ''}
                  `}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>

                {/* Step Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{step.step_name}</span>
                    <span className="text-xs text-gray-500">({step.agent_name})</span>
                  </div>
                  {step.duration_ms && (
                    <span className="text-xs text-gray-500">
                      {formatDuration(step.duration_ms)}
                    </span>
                  )}
                  {step.error_message && (
                    <p className="text-xs text-red-600 mt-1">{step.error_message}</p>
                  )}
                </div>

                {/* Status Badge */}
                <div
                  className={`
                    px-2 py-1 rounded text-xs font-medium
                    ${isActive ? 'bg-blue-100 text-blue-700' : ''}
                    ${isCompleted ? 'bg-green-100 text-green-700' : ''}
                    ${isFailed ? 'bg-red-100 text-red-700' : ''}
                    ${!isActive && !isCompleted && !isFailed ? 'bg-gray-100 text-gray-600' : ''}
                  `}
                >
                  {statusDisplay}
                </div>

                {/* Retry Button */}
                {isFailed && step.retry_attempt < 3 && (
                  <button
                    onClick={async () => {
                      try {
                        await fetch('/api/v1/workflow/control', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            execution_id: executionId,
                            action: 'retry',
                            step_id: step.id,
                          }),
                        })
                        fetchStatus()
                      } catch (error) {
                        console.error('Failed to retry step:', error)
                      }
                    }}
                    className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Retry
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {execution.current_state !== 'completed' && execution.current_state !== 'failed' && (
          <button
            onClick={async () => {
              try {
                await fetch('/api/v1/workflow/control', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    execution_id: executionId,
                    action: 'pause',
                  }),
                })
                fetchStatus()
              } catch (error) {
                console.error('Failed to pause workflow:', error)
              }
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Pause
          </button>
        )}

        {execution.current_state === 'paused' && (
          <button
            onClick={async () => {
              try {
                await fetch('/api/v1/workflow/control', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    execution_id: executionId,
                    action: 'resume',
                  }),
                })
                fetchStatus()
              } catch (error) {
                console.error('Failed to resume workflow:', error)
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Resume
          </button>
        )}
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Started: {new Date(execution.started_at).toLocaleString()}</div>
        {execution.completed_at && (
          <div>Completed: {new Date(execution.completed_at).toLocaleString()}</div>
        )}
      </div>
    </div>
  )
}
