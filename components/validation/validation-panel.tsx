'use client'

/**
 * Validation Panel Component
 * 
 * Displays consistency validation results for a document
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { ValidationSummary } from './validation-summary'
import { ValidationCheckItem } from './validation-check-item'

interface ValidationCheck {
  id: string
  validation_type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'pass' | 'fail' | 'warning'
  message: string
  sections: string[]
  expected_value?: string
  actual_value?: string
  metadata?: Record<string, any>
  created_at: string
}

interface ValidationPanelProps {
  documentId: string
}

export function ValidationPanel({ documentId }: ValidationPanelProps) {
  const [checks, setChecks] = useState<ValidationCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'failed' | 'warning' | 'passed'>('all')
  const supabase = createClient()

  useEffect(() => {
    loadValidations()
  }, [documentId])

  async function loadValidations() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('consistency_validations')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setChecks(data || [])
    } catch (error) {
      console.error('Failed to load validations:', error)
    } finally {
      setLoading(false)
    }
  }

  async function runValidation() {
    setValidating(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/validate`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Validation failed')
      }

      // Reload validations
      await loadValidations()
    } catch (error) {
      console.error('Failed to run validation:', error)
    } finally {
      setValidating(false)
    }
  }

  const filteredChecks = checks.filter(check => {
    if (filter === 'all') return true
    if (filter === 'failed') return check.status === 'fail'
    if (filter === 'warning') return check.status === 'warning'
    if (filter === 'passed') return check.status === 'pass'
    return true
  })

  const passed = checks.filter(c => c.status === 'pass').length
  const failed = checks.filter(c => c.status === 'fail').length
  const warnings = checks.filter(c => c.status === 'warning').length

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading validations...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Consistency Validation</h3>
        <button
          onClick={runValidation}
          disabled={validating}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {validating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Validation
            </>
          )}
        </button>
      </div>

      {/* Summary */}
      {checks.length > 0 && (
        <ValidationSummary
          total={checks.length}
          passed={passed}
          failed={failed}
          warnings={warnings}
        />
      )}

      {/* Filters */}
      {checks.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-md ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({checks.length})
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-3 py-1 text-sm rounded-md ${
              filter === 'failed'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Failed ({failed})
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`px-3 py-1 text-sm rounded-md ${
              filter === 'warning'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Warnings ({warnings})
          </button>
          <button
            onClick={() => setFilter('passed')}
            className={`px-3 py-1 text-sm rounded-md ${
              filter === 'passed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Passed ({passed})
          </button>
        </div>
      )}

      {/* Checks List */}
      {filteredChecks.length > 0 ? (
        <div className="space-y-2">
          {filteredChecks.map((check) => (
            <ValidationCheckItem key={check.id} check={check} />
          ))}
        </div>
      ) : checks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No validations yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Click "Run Validation" to check document consistency
          </p>
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-gray-500">
          No {filter} checks found
        </div>
      )}
    </div>
  )
}
