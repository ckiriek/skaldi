/**
 * Validation History
 * Shows chronological list of all validation runs
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ValidationHistoryItem {
  id: string
  created_at: string
  summary: {
    total: number
    critical: number
    error: number
    warning: number
    info: number
  }
  issues: any[]
}

interface ValidationHistoryProps {
  documentId: string
}

export function ValidationHistory({ documentId }: ValidationHistoryProps) {
  const [studyflowHistory, setStudyflowHistory] = useState<ValidationHistoryItem[]>([])
  const [crossdocHistory, setCrossdocHistory] = useState<ValidationHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [documentId])

  const loadHistory = async () => {
    setLoading(true)
    try {
      // Fetch validation history from API
      const response = await fetch(`/api/validation/history?documentId=${documentId}`)
      if (response.ok) {
        const data = await response.json()
        setStudyflowHistory(data.studyflow || [])
        setCrossdocHistory(data.crossdoc || [])
      }
    } catch (error) {
      console.error('Failed to load validation history:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const renderHistoryItem = (item: ValidationHistoryItem, type: 'studyflow' | 'crossdoc') => {
    const isExpanded = expandedId === item.id
    const { total, critical, error, warning, info } = item.summary

    return (
      <div key={item.id} className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={type === 'studyflow' ? 'default' : 'outline'}>
              {type === 'studyflow' ? 'Study Flow' : 'Cross-Doc'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toggleExpand(item.id)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          {critical > 0 && (
            <Badge variant="destructive" className="text-xs">
              {critical} Critical
            </Badge>
          )}
          {error > 0 && (
            <Badge variant="destructive" className="bg-orange-600 text-xs">
              {error} Errors
            </Badge>
          )}
          {warning > 0 && (
            <Badge variant="outline" className="border-yellow-600 text-yellow-700 text-xs">
              {warning} Warnings
            </Badge>
          )}
          {info > 0 && (
            <Badge variant="outline" className="text-xs">
              {info} Info
            </Badge>
          )}
          {total === 0 && (
            <Badge variant="outline" className="border-green-600 text-green-700 text-xs">
              Clean
            </Badge>
          )}
        </div>

        {/* Expanded details */}
        {isExpanded && item.issues.length > 0 && (
          <div className="mt-3 space-y-2 border-t pt-3">
            {item.issues.slice(0, 5).map((issue, idx) => (
              <div key={idx} className="text-sm">
                <p className="font-medium">{issue.message}</p>
                {issue.details && (
                  <p className="text-muted-foreground text-xs mt-1">{issue.details}</p>
                )}
              </div>
            ))}
            {item.issues.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{item.issues.length - 5} more issues
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const allHistory = [
    ...studyflowHistory.map((item) => ({ ...item, type: 'studyflow' as const })),
    ...crossdocHistory.map((item) => ({ ...item, type: 'crossdoc' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validation History</CardTitle>
        <CardDescription>
          Chronological log of all validation runs ({allHistory.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No validation history yet
          </div>
        ) : (
          <div className="space-y-3">
            {allHistory.map((item) => renderHistoryItem(item, item.type))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
