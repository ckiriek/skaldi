'use client'

/**
 * Cross-Document Fix Summary
 * Display summary of applied auto-fixes
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, FileEdit, History } from 'lucide-react'
import type { AutoFixResult } from '@/lib/engine/crossdoc/types'

interface CrossDocFixSummaryProps {
  result: AutoFixResult
}

export function CrossDocFixSummary({ result }: CrossDocFixSummaryProps) {
  const { appliedPatches, updatedDocuments, remainingIssues, changelog } = result

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{appliedPatches.length}</div>
                <div className="text-xs text-muted-foreground">Patches Applied</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{updatedDocuments.length}</div>
                <div className="text-xs text-muted-foreground">Documents Updated</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{remainingIssues.length}</div>
                <div className="text-xs text-muted-foreground">Remaining Issues</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applied Patches */}
      {appliedPatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Applied Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {appliedPatches.map((patch, idx) => (
                <div
                  key={idx}
                  className="border-l-2 border-green-500 pl-3 py-2 bg-green-50 rounded"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {patch.documentType}
                    </Badge>
                    {patch.field && (
                      <span className="text-xs font-mono text-blue-600">
                        {patch.field}
                      </span>
                    )}
                  </div>
                  {patch.oldValue && (
                    <div className="text-xs text-red-600 line-through">
                      {truncate(patch.oldValue, 80)}
                    </div>
                  )}
                  <div className="text-xs text-green-700 font-medium">
                    {truncate(patch.newValue, 80)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Changelog */}
      {changelog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Change Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {changelog.map((entry, idx) => (
                <div key={idx} className="text-xs border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {entry.documentType}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">{entry.reason}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Updated Documents */}
      {updatedDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Updated Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {updatedDocuments.map((doc, idx) => (
                <Badge key={idx} variant="secondary">
                  {doc.type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remaining Issues */}
      {remainingIssues.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-800">
              Remaining Issues ({remainingIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {remainingIssues.map((issue, idx) => (
                <div key={idx} className="text-xs text-yellow-700">
                  • {issue.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Truncate text for display
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
