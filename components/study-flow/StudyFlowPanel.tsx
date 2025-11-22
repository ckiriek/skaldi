/**
 * Study Flow Panel
 * Main UI component for Study Flow Engine
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, Play, FileDown } from 'lucide-react'
import type { StudyFlow, FlowValidationResult } from '@/lib/engine/studyflow/types'

interface StudyFlowPanelProps {
  protocolId: string
  studyFlowId?: string
}

export function StudyFlowPanel({ protocolId, studyFlowId }: StudyFlowPanelProps) {
  const [studyFlow, setStudyFlow] = useState<StudyFlow | null>(null)
  const [validation, setValidation] = useState<FlowValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing study flow
  useEffect(() => {
    if (studyFlowId) {
      loadStudyFlow()
    }
  }, [studyFlowId])

  const loadStudyFlow = async () => {
    setLoading(true)
    try {
      // Fetch from database or API
      // For now, placeholder
      setError('Study flow loading not implemented yet')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load study flow')
    } finally {
      setLoading(false)
    }
  }

  const generateStudyFlow = async () => {
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch('/api/studyflow/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolId }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate study flow')
      }

      const data = await response.json()
      setStudyFlow(data.studyFlow)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate study flow')
    } finally {
      setGenerating(false)
    }
  }

  const validateStudyFlow = async () => {
    if (!studyFlow) return

    setValidating(true)
    setError(null)
    try {
      const response = await fetch('/api/studyflow/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyFlowId: studyFlow.id, protocolId }),
      })

      if (!response.ok) {
        throw new Error('Failed to validate study flow')
      }

      const data = await response.json()
      setValidation(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate study flow')
    } finally {
      setValidating(false)
    }
  }

  const exportToP = async (format: string) => {
    if (!studyFlow) return

    try {
      // Export logic
      alert(`Export to ${format} - Coming soon!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export')
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Study Flow Engine</CardTitle>
              <CardDescription>
                Generate visit schedules, procedures, and Table of Procedures
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={generateStudyFlow}
                disabled={generating}
                variant="default"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Generate Flow
                  </>
                )}
              </Button>
              {studyFlow && (
                <Button
                  onClick={validateStudyFlow}
                  disabled={validating}
                  variant="outline"
                >
                  {validating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Validate'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Study Flow Content */}
      {studyFlow && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="visits">Visits</TabsTrigger>
            <TabsTrigger value="procedures">Procedures</TabsTrigger>
            <TabsTrigger value="top">Table of Procedures</TabsTrigger>
            {validation && <TabsTrigger value="validation">Validation</TabsTrigger>}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Study Flow Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Visits</p>
                    <p className="text-2xl font-bold">{studyFlow.visits.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Procedures</p>
                    <p className="text-2xl font-bold">{studyFlow.procedures.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-2xl font-bold">{studyFlow.totalDuration} days</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="default">Generated</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Visits Tab */}
          <TabsContent value="visits">
            <Card>
              <CardHeader>
                <CardTitle>Visit Schedule</CardTitle>
                <CardDescription>
                  {studyFlow.visits.length} visits over {studyFlow.totalDuration} days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {studyFlow.visits.map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{visit.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Day {visit.day} • {visit.type}
                          {visit.window && ` • Window: ±${visit.window.minus}/${visit.window.plus} days`}
                        </p>
                      </div>
                      <Badge variant={visit.required ? 'default' : 'secondary'}>
                        {visit.procedures.length} procedures
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Procedures Tab */}
          <TabsContent value="procedures">
            <Card>
              <CardHeader>
                <CardTitle>Procedures</CardTitle>
                <CardDescription>
                  {studyFlow.procedures.length} procedures across all visits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {studyFlow.procedures.map((proc) => (
                    <div
                      key={proc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{proc.name}</p>
                        <p className="text-sm text-muted-foreground">{proc.category}</p>
                      </div>
                      <Badge variant={proc.required ? 'default' : 'outline'}>
                        {proc.required ? 'Required' : 'Optional'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Table of Procedures Tab */}
          <TabsContent value="top">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Table of Procedures</CardTitle>
                    <CardDescription>
                      Visit × Procedure matrix
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportToP('excel')}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportToP('pdf')}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium">Visit</th>
                        <th className="p-2 text-left font-medium">Day</th>
                        {studyFlow.procedures.slice(0, 10).map((proc) => (
                          <th key={proc.id} className="p-2 text-center font-medium text-xs">
                            {proc.name}
                          </th>
                        ))}
                        {studyFlow.procedures.length > 10 && (
                          <th className="p-2 text-center font-medium text-xs">
                            +{studyFlow.procedures.length - 10} more
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {studyFlow.visits.map((visit, visitIndex) => (
                        <tr key={visit.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{visit.name}</td>
                          <td className="p-2 text-muted-foreground">{visit.day}</td>
                          {studyFlow.procedures.slice(0, 10).map((proc) => (
                            <td key={proc.id} className="p-2 text-center">
                              {studyFlow.topMatrix?.matrix[visitIndex]?.[
                                studyFlow.procedures.findIndex((p) => p.id === proc.id)
                              ] ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Validation Tab */}
          {validation && (
            <TabsContent value="validation">
              <Card>
                <CardHeader>
                  <CardTitle>Validation Results</CardTitle>
                  <CardDescription>
                    {validation.summary.total} issues found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Critical</p>
                        <p className="text-2xl font-bold text-red-600">
                          {validation.summary.critical}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Errors</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {validation.summary.error}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Warnings</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {validation.summary.warning}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Info</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {validation.summary.info}
                        </p>
                      </div>
                    </div>

                    {/* Issues List */}
                    <div className="space-y-2">
                      {validation.issues.map((issue) => (
                        <Alert
                          key={issue.id}
                          variant={
                            issue.severity === 'critical' || issue.severity === 'error'
                              ? 'destructive'
                              : 'default'
                          }
                        >
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{issue.message}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {issue.details}
                                </p>
                              </div>
                              <Badge variant="outline">{issue.severity}</Badge>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Empty State */}
      {!studyFlow && !generating && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No study flow generated yet</p>
            <Button onClick={generateStudyFlow}>
              <Play className="mr-2 h-4 w-4" />
              Generate Study Flow
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
