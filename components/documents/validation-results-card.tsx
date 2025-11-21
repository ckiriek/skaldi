'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'
import { ValidationIssueItem } from './validation-issue-item'

export interface ValidationIssue {
  section_id?: string
  rule_id: string
  severity: 'error' | 'warning' | 'info'
  message: string
}

export interface ValidationResults {
  passed: boolean
  issues: ValidationIssue[]
}

interface ValidationResultsCardProps {
  validation: ValidationResults
  documentType: string
  onSectionClick?: (sectionId: string) => void
}

export function ValidationResultsCard({
  validation,
  documentType,
  onSectionClick
}: ValidationResultsCardProps) {
  const { passed, issues = [] } = validation

  // Count issues by severity
  const errorCount = issues.filter(i => i.severity === 'error').length
  const warningCount = issues.filter(i => i.severity === 'warning').length
  const infoCount = issues.filter(i => i.severity === 'info').length

  // Calculate score (simple: 100% - (errors * 10% + warnings * 5%))
  const totalChecks = 20 // Assume 20 total checks for now
  const score = Math.max(0, 100 - (errorCount * 10 + warningCount * 5))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {passed ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Validation Passed
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Validation Failed
                </>
              )}
            </CardTitle>
            <CardDescription>
              Quality control validation for {documentType} document
            </CardDescription>
          </div>
          <Badge
            variant={passed ? 'default' : 'destructive'}
            className={passed ? 'bg-green-600' : ''}
          >
            Score: {score}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <XCircle className="h-4 w-4 text-red-600" />
            <div>
              <div className="text-2xl font-bold">{errorCount}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <div>
              <div className="text-2xl font-bold">{warningCount}</div>
              <div className="text-xs text-muted-foreground">Warnings</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Info className="h-4 w-4 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{infoCount}</div>
              <div className="text-xs text-muted-foreground">Info</div>
            </div>
          </div>
        </div>

        {/* Issues List */}
        {issues.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Issues Found</h4>
            <div className="space-y-2">
              {issues.map((issue, index) => (
                <ValidationIssueItem
                  key={`${issue.rule_id}-${index}`}
                  issue={issue}
                  onSectionClick={onSectionClick}
                />
              ))}
            </div>
          </div>
        ) : (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              No issues found. Document meets all quality standards.
            </AlertDescription>
          </Alert>
        )}

        {/* Consistency Checks Notice */}
        {issues.length === 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Note:</strong> Consistency checks between sections are planned for the next release.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
