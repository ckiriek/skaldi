'use client'

/**
 * Batch Operations Panel
 * 
 * UI for batch document generation, validation, and export
 */

import { useState } from 'react'
import { FileText, CheckCircle, Download, Loader2 } from 'lucide-react'

interface BatchOperationsPanelProps {
  projectId: string
}

type DocumentType = 'Protocol' | 'IB' | 'ICF' | 'Synopsis' | 'CSR' | 'SAP'

export function BatchOperationsPanel({ projectId }: BatchOperationsPanelProps) {
  const [selectedTypes, setSelectedTypes] = useState<DocumentType[]>([])
  const [generating, setGenerating] = useState(false)
  const [validating, setValidating] = useState(false)
  const [exporting, setExporting] = useState(false)

  const documentTypes: DocumentType[] = ['Protocol', 'IB', 'ICF', 'Synopsis', 'CSR', 'SAP']

  const toggleType = (type: DocumentType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const selectAll = () => {
    setSelectedTypes(documentTypes)
  }

  const clearAll = () => {
    setSelectedTypes([])
  }

  const handleBatchGenerate = async () => {
    if (selectedTypes.length === 0) return

    setGenerating(true)
    try {
      const response = await fetch('/api/documents/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          document_types: selectedTypes,
          options: {
            parallel: true,
            max_concurrent: 3
          }
        })
      })

      if (!response.ok) {
        throw new Error('Batch generation failed')
      }

      const data = await response.json()
      console.log('Batch generation result:', data)
      
      // Refresh page or show success message
      window.location.reload()

    } catch (error) {
      console.error('Batch generation error:', error)
      alert('Failed to generate documents')
    } finally {
      setGenerating(false)
    }
  }

  const handleBulkValidate = async () => {
    // Would need document IDs - simplified for demo
    setValidating(true)
    try {
      // Fetch document IDs for this project
      const response = await fetch(`/api/projects/${projectId}/documents`)
      const documents = await response.json()
      
      const documentIds = documents.map((d: any) => d.id)

      // Run bulk validation
      const validationResponse = await fetch('/api/validation/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_ids: documentIds })
      })

      if (!validationResponse.ok) {
        throw new Error('Bulk validation failed')
      }

      const result = await validationResponse.json()
      console.log('Bulk validation result:', result)

      alert(`Validation complete: ${result.summary.total_errors} errors, ${result.summary.total_warnings} warnings`)

    } catch (error) {
      console.error('Bulk validation error:', error)
      alert('Failed to validate documents')
    } finally {
      setValidating(false)
    }
  }

  const handleBatchExport = async () => {
    setExporting(true)
    try {
      // Fetch document IDs
      const response = await fetch(`/api/projects/${projectId}/documents`)
      const documents = await response.json()
      
      const documentIds = documents.map((d: any) => d.id)

      // Export as ZIP
      const exportResponse = await fetch('/api/documents/batch-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_ids: documentIds,
          format: 'both'
        })
      })

      if (!exportResponse.ok) {
        throw new Error('Batch export failed')
      }

      // Download ZIP file
      const blob = await exportResponse.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `documents_${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error) {
      console.error('Batch export error:', error)
      alert('Failed to export documents')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Batch Operations</h3>

      {/* Document Type Selection */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">
            Select Document Types
          </label>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="text-xs text-gray-600 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {documentTypes.map(type => (
            <label
              key={type}
              className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${
                selectedTypes.includes(type)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes(type)}
                onChange={() => toggleType(type)}
                className="mr-2"
              />
              <span className="text-sm font-medium">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {/* Batch Generate */}
        <button
          onClick={handleBatchGenerate}
          disabled={selectedTypes.length === 0 || generating}
          className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating {selectedTypes.length} documents...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Generate Selected ({selectedTypes.length})
            </>
          )}
        </button>

        {/* Bulk Validate */}
        <button
          onClick={handleBulkValidate}
          disabled={validating}
          className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {validating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Validate All Documents
            </>
          )}
        </button>

        {/* Batch Export */}
        <button
          onClick={handleBatchExport}
          disabled={exporting}
          className="w-full inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export All as ZIP
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-700">
        <strong>Tip:</strong> Batch generation processes documents in recommended order
        (Protocol → IB → ICF → SAP → Synopsis → CSR) for best results.
      </div>
    </div>
  )
}
