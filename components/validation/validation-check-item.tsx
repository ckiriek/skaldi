'use client'

/**
 * Validation Check Item Component
 * 
 * Displays a single validation check result
 */

import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { ValidationBadge } from './validation-badge'

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

interface ValidationCheckItemProps {
  check: ValidationCheck
}

export function ValidationCheckItem({ check }: ValidationCheckItemProps) {
  const [expanded, setExpanded] = useState(false)

  const statusIcon = {
    pass: <CheckCircle className="h-5 w-5 text-green-500" />,
    fail: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />
  }[check.status]

  const statusBg = {
    pass: 'bg-green-50 border-green-200',
    fail: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200'
  }[check.status]

  const typeLabel = {
    dosing: 'Dosing',
    design: 'Study Design',
    sample_size: 'Sample Size',
    population: 'Population',
    endpoint: 'Endpoints'
  }[check.validation_type] || check.validation_type

  return (
    <div className={`border rounded-lg ${statusBg}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {statusIcon}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{typeLabel}</span>
              <ValidationBadge severity={check.severity} />
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{check.message}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Details */}
      {expanded && (
        <div className="px-4 pb-3 space-y-3 border-t border-gray-200">
          {/* Sections */}
          {check.sections.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Sections Checked:</div>
              <div className="flex flex-wrap gap-1">
                {check.sections.map((section, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Expected vs Actual */}
          {(check.expected_value || check.actual_value) && (
            <div className="grid grid-cols-2 gap-3">
              {check.expected_value && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Expected:</div>
                  <div className="text-sm text-gray-900 bg-white rounded px-2 py-1 border border-gray-200">
                    {check.expected_value}
                  </div>
                </div>
              )}
              {check.actual_value && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Actual:</div>
                  <div className="text-sm text-gray-900 bg-white rounded px-2 py-1 border border-gray-200">
                    {check.actual_value}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          {check.metadata && Object.keys(check.metadata).length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Additional Details:</div>
              <div className="text-xs text-gray-600 bg-white rounded px-2 py-1 border border-gray-200">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(check.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-xs text-gray-500">
            Checked: {new Date(check.created_at).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  )
}
