/**
 * Sprint 1, Task 3.1: KnowledgeGraphPanel Component
 * 
 * Full Knowledge Graph viewer with tabs for different entity types
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Database, AlertCircle, ExternalLink } from 'lucide-react'
import { KGSourceBadge } from '@/components/knowledge-ui/KGSourceBadge'

interface KnowledgeGraphPanelProps {
  inn: string
  autoFetch?: boolean
}

interface Indication {
  text: string
  confidence: number
  icd10?: string
  sources: string[]
  tags?: string[]
}

interface Endpoint {
  text: string
  type: string
  confidence: number
  sources: string[]
  timepoint?: string
  unit?: string
}

interface Formulation {
  routes: string[]
  dosageForms: string[]
  strengths: string[]
  confidence: number
  sources: string[]
}

interface Source {
  name: string
  type: string
  recordsCount: number
  reliability: number
}

interface KGData {
  indications: Indication[]
  endpoints: Endpoint[]
  formulations: Formulation[]
  sources: Source[]
  metadata: {
    inn: string
    buildTime: number
    totalEntities: number
  }
}

export function KnowledgeGraphPanel({ inn, autoFetch = false }: KnowledgeGraphPanelProps) {
  const [data, setData] = useState<KGData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchKG = async () => {
    if (!inn || inn.length < 2) {
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
        setError(result.error?.message || 'Failed to fetch Knowledge Graph')
        return
      }

      // Transform API response to component format
      const kgData: KGData = {
        indications: (result.data.indications || []).map((ind: any) => ({
          text: ind.indication || ind.text,
          confidence: ind.confidence || 0,
          icd10: ind.icd10Code,
          sources: ind.sources || [],
          tags: ind.tags || []
        })),
        endpoints: (result.data.endpoints || []).map((ep: any) => ({
          text: ep.normalized?.cleanedTitle || ep.text,
          type: ep.normalized?.type || 'unknown',
          confidence: ep.confidence || 0,
          sources: ep.sources || [],
          timepoint: ep.timepoint,
          unit: ep.unit
        })),
        formulations: (result.data.formulations || []).map((form: any) => ({
          routes: form.routes || [],
          dosageForms: form.dosageForms || [],
          strengths: form.strengths || [],
          confidence: form.confidence || 0,
          sources: form.sources || []
        })),
        sources: result.data.sourcesUsed?.map((source: string) => ({
          name: source,
          type: getSourceType(source),
          recordsCount: 0,
          reliability: getSourceReliability(source)
        })) || [],
        metadata: {
          inn: result.data.inn || inn,
          buildTime: result.data.buildTimeMs || 0,
          totalEntities: (result.data.indications?.length || 0) + 
                        (result.data.endpoints?.length || 0) + 
                        (result.data.formulations?.length || 0)
        }
      }

      setData(kgData)
    } catch (err) {
      console.error('KG fetch error:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoFetch && inn) {
      fetchKG()
    }
  }, [inn, autoFetch])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Building Knowledge Graph...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Fetching from FDA, EMA, ClinicalTrials.gov, DailyMed
          </p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-destructive mb-3" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchKG}
            className="mt-4"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Database className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No Knowledge Graph data</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchKG}
            className="mt-4"
          >
            Fetch Knowledge Graph
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Knowledge Graph Summary</CardTitle>
          <CardDescription>
            Built from {data.sources.length} sources in {Math.round(data.metadata.buildTime / 1000)}s
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{data.indications.length}</div>
              <div className="text-xs text-muted-foreground">Indications</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{data.endpoints.length}</div>
              <div className="text-xs text-muted-foreground">Endpoints</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{data.formulations.length}</div>
              <div className="text-xs text-muted-foreground">Formulations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="indications">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="indications">Indications</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="formulations">Formulations</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>

        {/* Indications Tab */}
        <TabsContent value="indications" className="space-y-2">
          {data.indications.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No indications found
              </CardContent>
            </Card>
          ) : (
            data.indications.map((indication, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium">{indication.text}</p>
                      {indication.icd10 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ICD-10: {indication.icd10}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {indication.sources.map(source => (
                          <KGSourceBadge key={source} source={source} />
                        ))}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {Math.round(indication.confidence * 100)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints" className="space-y-2">
          {data.endpoints.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No endpoints found
              </CardContent>
            </Card>
          ) : (
            data.endpoints.map((endpoint, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium">{endpoint.text}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="capitalize text-xs">
                          {endpoint.type.replace(/-/g, ' ')}
                        </Badge>
                        {endpoint.timepoint && (
                          <Badge variant="outline" className="text-xs">
                            {endpoint.timepoint}
                          </Badge>
                        )}
                        {endpoint.unit && (
                          <Badge variant="outline" className="text-xs">
                            {endpoint.unit}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {endpoint.sources.map(source => (
                          <KGSourceBadge key={source} source={source} />
                        ))}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {Math.round(endpoint.confidence * 100)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Formulations Tab */}
        <TabsContent value="formulations" className="space-y-2">
          {data.formulations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No formulations found
              </CardContent>
            </Card>
          ) : (
            data.formulations.map((formulation, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Dosage Forms</p>
                        <p className="text-sm">{formulation.dosageForms.join(', ') || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Routes</p>
                        <p className="text-sm">{formulation.routes.join(', ') || 'N/A'}</p>
                      </div>
                      {formulation.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Strengths</p>
                          <p className="text-sm">{formulation.strengths.join(', ')}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formulation.sources.map(source => (
                          <KGSourceBadge key={source} source={source} />
                        ))}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {Math.round(formulation.confidence * 100)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-2">
          {data.sources.map((source, idx) => (
            <Card key={idx}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <KGSourceBadge source={source.name} />
                    <div>
                      <p className="font-medium text-sm">{source.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{source.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {Math.round(source.reliability * 100)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Reliability</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper functions
function getSourceType(source: string): string {
  if (source.includes('FDA') || source.includes('fda')) return 'regulatory'
  if (source.includes('EMA') || source.includes('ema')) return 'regulatory'
  if (source.includes('CT.gov') || source.includes('clinicaltrials')) return 'clinical'
  if (source.includes('DailyMed') || source.includes('dailymed')) return 'drug_label'
  return 'other'
}

function getSourceReliability(source: string): number {
  if (source.includes('FDA') || source.includes('fda')) return 0.95
  if (source.includes('EMA') || source.includes('ema')) return 0.90
  if (source.includes('CT.gov') || source.includes('clinicaltrials')) return 0.75
  if (source.includes('DailyMed') || source.includes('dailymed')) return 0.85
  return 0.70
}
