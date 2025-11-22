'use client'

/**
 * Cross-Document Issue List
 * Display list of cross-document validation issues
 */

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react'
import { CrossDocIssueDetails } from './CrossDocIssueDetails'
import type { CrossDocIssue } from '@/lib/engine/crossdoc/types'

interface CrossDocIssueListProps {
  issues: CrossDocIssue[]
  selectedIssues: Set<string>
  onToggleIssue: (issueCode: string) => void
}

export function CrossDocIssueList({ issues, selectedIssues, onToggleIssue }: CrossDocIssueListProps) {
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set())
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Toggle issue expansion
  const handleToggleExpand = (issueCode: string) => {
    const newExpanded = new Set(expandedIssues)
    if (newExpanded.has(issueCode)) {
      newExpanded.delete(issueCode)
    } else {
      newExpanded.add(issueCode)
    }
    setExpandedIssues(newExpanded)
  }

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    if (filterSeverity !== 'all' && issue.severity !== filterSeverity) {
      return false
    }
    if (filterCategory !== 'all' && issue.category !== filterCategory) {
      return false
    }
    return true
  })

  // Group by category
  const issuesByCategory = filteredIssues.reduce((acc, issue) => {
    const category = issue.category || 'OTHER'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(issue)
    return acc
  }, {} as Record<string, CrossDocIssue[]>)

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, any> = {
      critical: 'destructive',
      error: 'destructive',
      warning: 'default',
      info: 'secondary',
    }

    return (
      <Badge variant={variants[severity] || 'default'} className="text-xs">
        {severity.toUpperCase()}
      </Badge>
    )
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      IB_PROTOCOL: 'IB ↔ Protocol',
      PROTOCOL_ICF: 'Protocol ↔ ICF',
      PROTOCOL_SAP: 'Protocol ↔ SAP',
      PROTOCOL_CSR: 'Protocol ↔ CSR',
      SAP_CSR: 'SAP ↔ CSR',
      GLOBAL: 'Global',
    }
    return labels[category] || category
  }

  const isAutoFixable = (issue: CrossDocIssue) => {
    return issue.suggestions?.some(s => s.autoFixable) || false
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Severity:</label>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Category:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="IB_PROTOCOL">IB ↔ Protocol</option>
            <option value="PROTOCOL_SAP">Protocol ↔ SAP</option>
            <option value="PROTOCOL_ICF">Protocol ↔ ICF</option>
            <option value="PROTOCOL_CSR">Protocol ↔ CSR</option>
            <option value="GLOBAL">Global</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-muted-foreground">
          {filteredIssues.length} issue(s)
        </div>
      </div>

      {/* Issues by Category */}
      {Object.entries(issuesByCategory).map(([category, categoryIssues]) => (
        <div key={category} className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">
            {getCategoryLabel(category)} ({categoryIssues.length})
          </h3>

          <div className="space-y-2">
            {categoryIssues.map((issue) => {
              const isExpanded = expandedIssues.has(issue.code)
              const isSelected = selectedIssues.has(issue.code)
              const canAutoFix = isAutoFixable(issue)

              return (
                <div
                  key={issue.code}
                  className={`border rounded-lg p-4 ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  {/* Issue Header */}
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    {canAutoFix && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleIssue(issue.code)}
                        className="mt-1"
                      />
                    )}

                    {/* Severity Icon */}
                    <div className="mt-1">{getSeverityIcon(issue.severity)}</div>

                    {/* Issue Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{issue.message}</span>
                        {getSeverityBadge(issue.severity)}
                        {canAutoFix && (
                          <Badge variant="outline" className="text-xs">
                            Auto-fixable
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground mb-2">
                        Code: {issue.code}
                      </div>

                      {/* Locations */}
                      {issue.locations && issue.locations.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {issue.locations.map((loc, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {loc.documentType}
                              {loc.sectionId && ` / ${loc.sectionId}`}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Expand Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleExpand(issue.code)}
                        className="h-6 px-2 text-xs"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-3 w-3 mr-1" />
                            Show Details
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pl-10">
                      <CrossDocIssueDetails issue={issue} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {filteredIssues.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No issues match the current filters.
        </div>
      )}
    </div>
  )
}
