'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowRight, RefreshCw, Loader2, CheckCircle, AlertTriangle, Info } from 'lucide-react'

interface PropagateChangesProps {
  projectId: string
  sourceDocument: {
    id: string
    type: string
    field: string
    oldValue: string
    newValue: string
  }
  onComplete?: () => void
}

interface TargetDocument {
  id: string
  type: string
  field: string
  currentValue: string
  willUpdate: boolean
  selected: boolean
}

export function PropagateChanges({ projectId, sourceDocument, onComplete }: PropagateChangesProps) {
  const [targets, setTargets] = useState<TargetDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [propagating, setPropagating] = useState(false)
  const [result, setResult] = useState<{ success: boolean; updated: number } | null>(null)

  const findAffectedDocuments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/crossdoc/find-affected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sourceDocumentId: sourceDocument.id,
          field: sourceDocument.field,
          newValue: sourceDocument.newValue,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTargets(data.affectedDocuments.map((doc: any) => ({
          ...doc,
          selected: true,
        })))
      }
    } catch (error) {
      console.error('Failed to find affected documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const propagateChanges = async () => {
    const selectedTargets = targets.filter(t => t.selected)
    if (selectedTargets.length === 0) return

    setPropagating(true)
    try {
      const response = await fetch('/api/crossdoc/propagate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sourceDocumentId: sourceDocument.id,
          field: sourceDocument.field,
          newValue: sourceDocument.newValue,
          targetDocuments: selectedTargets.map(t => ({
            id: t.id,
            type: t.type,
            field: t.field,
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResult({ success: true, updated: data.updatedCount })
        onComplete?.()
      } else {
        setResult({ success: false, updated: 0 })
      }
    } catch (error) {
      console.error('Failed to propagate changes:', error)
      setResult({ success: false, updated: 0 })
    } finally {
      setPropagating(false)
    }
  }

  const toggleTarget = (index: number) => {
    setTargets(prev => prev.map((t, i) => 
      i === index ? { ...t, selected: !t.selected } : t
    ))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Propagate Changes
        </CardTitle>
        <CardDescription>
          Update related documents to maintain consistency
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source Change */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
            <Badge variant="outline" className="bg-blue-100">{sourceDocument.type}</Badge>
            <span>{sourceDocument.field}</span>
          </div>
          <div className="mt-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-red-600 line-through">{sourceDocument.oldValue}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-green-600 font-medium">{sourceDocument.newValue}</span>
            </div>
          </div>
        </div>

        {/* Find Affected Button */}
        {targets.length === 0 && !result && (
          <Button
            onClick={findAffectedDocuments}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Find Affected Documents
          </Button>
        )}

        {/* Target Documents */}
        {targets.length > 0 && !result && (
          <div className="space-y-3">
            <div className="text-sm font-medium">
              Found {targets.length} document(s) that may need updating:
            </div>
            
            {targets.map((target, index) => (
              <div
                key={target.id}
                className={`p-3 rounded-lg border ${
                  target.selected ? 'border-primary bg-primary/5' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={target.selected}
                    onCheckedChange={() => toggleTarget(index)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{target.type}</Badge>
                      <span className="text-sm font-medium">{target.field}</span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Current: <span className="text-foreground">{target.currentValue}</span>
                    </div>
                    {target.willUpdate && (
                      <div className="mt-1 text-sm text-green-600">
                        Will update to: {sourceDocument.newValue}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setTargets([])}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={propagateChanges}
                disabled={propagating || targets.filter(t => t.selected).length === 0}
                className="flex-1"
              >
                {propagating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Update {targets.filter(t => t.selected).length} Document(s)
              </Button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            {result.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>
              {result.success
                ? `Successfully updated ${result.updated} document(s)`
                : 'Failed to propagate changes. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            Propagating changes will update the selected documents to match the source.
            All changes are tracked in the audit log.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
