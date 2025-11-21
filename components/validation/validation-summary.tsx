'use client'

/**
 * Validation Summary Component
 * 
 * Shows summary statistics for validation results
 */

import { CheckCircle, XCircle, AlertTriangle, FileCheck } from 'lucide-react'

interface ValidationSummaryProps {
  total: number
  passed: number
  failed: number
  warnings: number
}

export function ValidationSummary({ total, passed, failed, warnings }: ValidationSummaryProps) {
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FileCheck className="h-5 w-5 text-gray-400 mr-2" />
          <h4 className="text-sm font-medium text-gray-900">Validation Summary</h4>
        </div>
        <div className="text-sm text-gray-500">
          Pass Rate: <span className="font-semibold">{passRate}%</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Total */}
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Checks</div>
        </div>

        {/* Passed */}
        <div className="text-center">
          <div className="flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-1" />
            <div className="text-2xl font-bold text-green-600">{passed}</div>
          </div>
          <div className="text-xs text-gray-500 mt-1">Passed</div>
        </div>

        {/* Failed */}
        <div className="text-center">
          <div className="flex items-center justify-center">
            <XCircle className="h-5 w-5 text-red-500 mr-1" />
            <div className="text-2xl font-bold text-red-600">{failed}</div>
          </div>
          <div className="text-xs text-gray-500 mt-1">Failed</div>
        </div>

        {/* Warnings */}
        <div className="text-center">
          <div className="flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-1" />
            <div className="text-2xl font-bold text-yellow-600">{warnings}</div>
          </div>
          <div className="text-xs text-gray-500 mt-1">Warnings</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
          {passed > 0 && (
            <div
              className="bg-green-500"
              style={{ width: `${(passed / total) * 100}%` }}
            />
          )}
          {warnings > 0 && (
            <div
              className="bg-yellow-500"
              style={{ width: `${(warnings / total) * 100}%` }}
            />
          )}
          {failed > 0 && (
            <div
              className="bg-red-500"
              style={{ width: `${(failed / total) * 100}%` }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
