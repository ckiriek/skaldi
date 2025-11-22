'use client'

/**
 * Cross-Document Issue Details
 * Display detailed information about a specific issue
 */

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench, FileText, MapPin } from 'lucide-react'
import type { CrossDocIssue } from '@/lib/engine/crossdoc/types'

interface CrossDocIssueDetailsProps {
  issue: CrossDocIssue
}

export function CrossDocIssueDetails({ issue }: CrossDocIssueDetailsProps) {
  return (
    <div className="space-y-4">
      {/* Details */}
      {issue.details && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{issue.details}</p>
          </CardContent>
        </Card>
      )}

      {/* Locations */}
      {issue.locations && issue.locations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Affected Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {issue.locations.map((location, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded"
                >
                  <Badge variant="outline" className="text-xs">
                    {location.documentType}
                  </Badge>
                  {location.sectionId && (
                    <>
                      <span className="text-muted-foreground">/</span>
                      <span className="font-mono text-xs">{location.sectionId}</span>
                    </>
                  )}
                  {location.blockId && (
                    <>
                      <span className="text-muted-foreground">/</span>
                      <span className="font-mono text-xs">{location.blockId}</span>
                    </>
                  )}
                  {location.field && (
                    <>
                      <span className="text-muted-foreground">/</span>
                      <span className="font-mono text-xs text-blue-600">
                        {location.field}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {issue.suggestions && issue.suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Suggested Fixes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {issue.suggestions.map((suggestion, idx) => (
                <div key={suggestion.id} className="border-l-2 border-blue-500 pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{suggestion.label}</span>
                    {suggestion.autoFixable && (
                      <Badge variant="outline" className="text-xs">
                        Auto-fixable
                      </Badge>
                    )}
                  </div>

                  {/* Patches */}
                  {suggestion.patches && suggestion.patches.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs text-muted-foreground">
                        {suggestion.patches.length} change(s):
                      </div>
                      {suggestion.patches.map((patch, patchIdx) => (
                        <div
                          key={patchIdx}
                          className="text-xs font-mono bg-gray-50 p-2 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {patch.documentType}
                            </Badge>
                            {patch.field && (
                              <span className="text-blue-600">{patch.field}</span>
                            )}
                          </div>
                          {patch.oldValue && (
                            <div className="mt-1 text-red-600">
                              - {truncate(patch.oldValue, 60)}
                            </div>
                          )}
                          <div className="mt-1 text-green-600">
                            + {truncate(patch.newValue, 60)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regulatory Impact */}
      {issue.severity === 'critical' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <div className="text-red-600 font-semibold text-sm">
                ⚠️ Critical Regulatory Issue
              </div>
            </div>
            <p className="text-xs text-red-700 mt-2">
              This issue must be resolved before study start or regulatory submission.
              Failure to address may result in regulatory rejection or study delays.
            </p>
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
