/**
 * Knowledge Graph Button Component
 * 
 * Fetches and displays Knowledge Graph data
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface KnowledgeGraphData {
  indications: Array<{
    indication: string
    confidence: number
    icd10Code?: string
  }>
  formulations: Array<{
    routes: string[]
    dosageForms: string[]
    strengths: string[]
    confidence: number
  }>
  endpoints: Array<{
    normalized: {
      cleanedTitle: string
      type: string
    }
    confidence: number
  }>
  sourcesUsed: string[]
}

interface Props {
  inn: string
  onDataFetched?: (data: KnowledgeGraphData) => void
}

export function KnowledgeGraphButton({ inn, onDataFetched }: Props) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<KnowledgeGraphData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const fetchKnowledgeGraph = async () => {
    if (!inn || inn.length < 3) {
      setError('INN too short')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/knowledge/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inn })
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error?.message || 'Failed to fetch')
        return
      }

      const kgData: KnowledgeGraphData = {
        indications: result.data.indications || [],
        formulations: result.data.formulations || [],
        endpoints: result.data.endpoints || [],
        sourcesUsed: result.data.sourcesUsed || []
      }

      setData(kgData)
      setExpanded(true)
      onDataFetched?.(kgData)

    } catch (err) {
      console.error('Knowledge Graph error:', err)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={fetchKnowledgeGraph}
        disabled={loading || !inn || inn.length < 3}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Fetching Knowledge Graph...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Fetch from Knowledge Graph
          </>
        )}
      </Button>

      {error && (
        <div className="text-xs text-destructive">
          {error}
        </div>
      )}

      {data && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Knowledge Graph Data</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {expanded && (
            <div className="space-y-3 text-sm">
              {/* Indications */}
              {data.indications.length > 0 && (
                <div>
                  <div className="font-medium text-xs text-muted-foreground mb-1.5">
                    Indications ({data.indications.length})
                  </div>
                  <div className="space-y-1">
                    {data.indications.slice(0, 3).map((ind, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span>{ind.indication}</span>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(ind.confidence * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulations */}
              {data.formulations.length > 0 && (
                <div>
                  <div className="font-medium text-xs text-muted-foreground mb-1.5">
                    Formulations ({data.formulations.length})
                  </div>
                  <div className="space-y-1">
                    {data.formulations.slice(0, 2).map((form, i) => (
                      <div key={i} className="text-xs">
                        {form.dosageForms.join(', ')} · {form.routes.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Endpoints */}
              {data.endpoints.length > 0 && (
                <div>
                  <div className="font-medium text-xs text-muted-foreground mb-1.5">
                    Endpoints ({data.endpoints.length})
                  </div>
                  <div className="space-y-1">
                    {data.endpoints.slice(0, 2).map((ep, i) => (
                      <div key={i} className="text-xs">
                        {ep.normalized.cleanedTitle}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Sources: {data.sourcesUsed.length}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
