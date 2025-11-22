'use client'

/**
 * Cross-Document Intelligence Panel
 * Main UI for cross-document validation and auto-fix
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react'
import { CrossDocIssueList } from './CrossDocIssueList'
import type { CrossDocValidationResult, CrossDocIssue } from '@/lib/engine/crossdoc/types'

interface CrossDocPanelProps {
  projectId: string
  documentIds: {
    ibId?: string
    protocolId?: string
    icfId?: string
    sapId?: string
    csrId?: string
  }
}

export function CrossDocPanel({ projectId, documentIds }: CrossDocPanelProps) {
  const [validationResult, setValidationResult] = useState<CrossDocValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set())

  // Run cross-document validation
  const handleValidate = async () => {
    setIsValidating(true)
    setError(null)

    try {
      const response = await fetch('/api/crossdoc/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentIds),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Validation failed')
      }

      const result = await response.json()
      setValidationResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsValidating(false)
    }
  }

  // Apply auto-fixes
  const handleAutoFix = async () => {
    if (selectedIssues.size === 0) {
      setError('Please select issues to fix')
      return
    }

    setIsFixing(true)
    setError(null)

    try {
      const response = await fetch('/api/crossdoc/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueIds: Array.from(selectedIssues),
          strategy: 'align_to_protocol',
          documentIds,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Auto-fix failed')
      }

      const result = await response.json()

      // Show success and re-validate
      alert(`Fixed ${result.summary.issuesFixed} issue(s). ${result.summary.patchesApplied} patches applied.`)
      
      // Clear selection and re-validate
      setSelectedIssues(new Set())
      await handleValidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsFixing(false)
    }
  }

  // Toggle issue selection
  const handleToggleIssue = (issueCode: string) => {
    const newSelection = new Set(selectedIssues)
    if (newSelection.has(issueCode)) {
      newSelection.delete(issueCode)
    } else {
      newSelection.add(issueCode)
    }
    setSelectedIssues(newSelection)
  }

  // Select all auto-fixable issues
  const handleSelectAllAutoFixable = () => {
    if (!validationResult) return

    const autoFixableIssues = validationResult.issues.filter(
      issue => issue.suggestions?.some(s => s.autoFixable)
    )

    setSelectedIssues(new Set(autoFixableIssues.map(i => i.code)))
  }

  const documentCount = Object.values(documentIds).filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Cross-Document Intelligence
          </CardTitle>
          <CardDescription>
            Validate consistency across {documentCount} document(s): IB, Protocol, ICF, SAP, CSR
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Validation Button */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleValidate}
              disabled={isValidating || documentCount < 2}
              className="w-48"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                'Run Validation'
              )}
            </Button>

            {documentCount < 2 && (
              <span className="text-sm text-muted-foreground">
                At least 2 documents required
              </span>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          {validationResult && (
            <div className="grid grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{validationResult.summary.total}</div>
                  <div className="text-xs text-muted-foreground">Total Issues</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">
                    {validationResult.summary.critical}
                  </div>
                  <div className="text-xs text-muted-foreground">Critical</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-600">
                    {validationResult.summary.error}
                  </div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-yellow-600">
                    {validationResult.summary.warning}
                  </div>
                  <div className="text-xs text-muted-foreground">Warnings</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {validationResult.summary.info}
                  </div>
                  <div className="text-xs text-muted-foreground">Info</div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issues List */}
      {validationResult && validationResult.issues.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Issues Found</CardTitle>
                <CardDescription>
                  {selectedIssues.size} issue(s) selected for auto-fix
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllAutoFixable}
                  disabled={isFixing}
                >
                  Select All Auto-fixable
                </Button>
                <Button
                  onClick={handleAutoFix}
                  disabled={isFixing || selectedIssues.size === 0}
                  variant="default"
                >
                  {isFixing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying Fixes...
                    </>
                  ) : (
                    `Apply ${selectedIssues.size} Fix(es)`
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CrossDocIssueList
              issues={validationResult.issues}
              selectedIssues={selectedIssues}
              onToggleIssue={handleToggleIssue}
            />
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {validationResult && validationResult.issues.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
              <p className="text-muted-foreground">
                No cross-document consistency issues found.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
