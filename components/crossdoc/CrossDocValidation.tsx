'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  AlertCircle,
  RefreshCw, 
  Loader2,
  FileText,
  ArrowRight,
  Lightbulb,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface CrossDocValidationProps {
  projectId: string
}

interface ValidationIssue {
  code: string
  severity: 'critical' | 'error' | 'warning' | 'info'
  message: string
  details?: string
  locations: Array<{
    documentType: string
    sectionId?: string
  }>
  category?: string
  suggestions?: Array<{
    action: string
    targetDocument: string
    targetSection?: string
    description: string
    autoFixable?: boolean
  }>
}

// Recommendations based on issue codes
const ISSUE_RECOMMENDATIONS: Record<string, {
  action: string
  steps: string[]
  priority: 'high' | 'medium' | 'low'
}> = {
  'IB_SAFETY_PROFILE_MISSING': {
    action: 'Add Safety Profile to IB',
    steps: [
      'Open the IB document',
      'Navigate to Section 5 (Safety)',
      'Add known risks, adverse events, and safety signals',
      'Include preclinical and clinical safety data'
    ],
    priority: 'high'
  },
  'GLOBAL_POPULATION_INCOHERENT': {
    action: 'Align Target Population',
    steps: [
      'Review inclusion/exclusion criteria in Protocol',
      'Ensure IB describes the same target population',
      'Update ICF patient description to match',
      'Verify age, gender, disease stage criteria are consistent'
    ],
    priority: 'high'
  },
  'PRIMARY_ENDPOINT_DRIFT': {
    action: 'Synchronize Primary Endpoints',
    steps: [
      'Check Protocol primary endpoint definition',
      'Update IB efficacy section to match',
      'Ensure SAP analysis matches the endpoint',
      'Verify CSR reports the same endpoint'
    ],
    priority: 'high'
  },
  'DOSING_INCONSISTENCY': {
    action: 'Align Dosing Information',
    steps: [
      'Verify dose, route, frequency in Protocol',
      'Update IB dosing section',
      'Ensure ICF describes dosing correctly for patients',
      'Check CRF captures correct dosing fields'
    ],
    priority: 'medium'
  },
  'VISIT_SCHEDULE_MISMATCH': {
    action: 'Synchronize Visit Schedule',
    steps: [
      'Review Protocol Schedule of Assessments',
      'Update ICF visit descriptions',
      'Ensure CRF has forms for each visit',
      'Verify SAP timepoints match visits'
    ],
    priority: 'medium'
  },
  'OBJECTIVE_MISMATCH': {
    action: 'Align Study Objectives',
    steps: [
      'Define objectives clearly in Protocol',
      'Mirror objectives in IB rationale',
      'Ensure Synopsis reflects same objectives'
    ],
    priority: 'medium'
  }
}

interface ValidationResult {
  issues: ValidationIssue[]
  summary: {
    total: number
    critical: number
    error: number
    warning: number
    info: number
  }
  metadata?: {
    documentsValidated: number
    timestamp: string
  }
}

export function CrossDocValidation({ projectId }: CrossDocValidationProps) {
  const [documents, setDocuments] = useState<Record<string, any>>({})
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set())

  const toggleIssue = (index: number) => {
    setExpandedIssues(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  useEffect(() => {
    loadDocumentsAndValidation()
  }, [projectId])

  const loadDocumentsAndValidation = async () => {
    setLoading(true)
    try {
      // Load documents and last validation result in parallel
      const [docsResponse, validationResponse] = await Promise.all([
        fetch(`/api/projects/${projectId}/documents`),
        fetch(`/api/crossdoc/history?projectId=${projectId}`)
      ])

      if (docsResponse.ok) {
        const data = await docsResponse.json()
        const docMap: Record<string, any> = {}
        data.documents?.forEach((doc: any) => {
          docMap[doc.type] = doc
        })
        setDocuments(docMap)
      }

      if (validationResponse.ok) {
        const data = await validationResponse.json()
        console.log('[CrossDocValidation] History response:', data)
        if (data.latestValidation) {
          setResult({
            issues: data.latestValidation.issues || [],
            summary: data.latestValidation.summary || { total: 0, critical: 0, error: 0, warning: 0, info: 0 },
            metadata: {
              documentsValidated: Object.keys(data.latestValidation.document_ids || {}).length,
              timestamp: data.latestValidation.created_at
            }
          })
        }
      } else {
        console.log('[CrossDocValidation] History failed:', validationResponse.status)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const runValidation = async () => {
    setValidating(true)
    try {
      const payload: Record<string, string> = {}
      if (documents['IB']?.id) payload.ibId = documents['IB'].id
      if (documents['Protocol']?.id) payload.protocolId = documents['Protocol'].id
      if (documents['ICF']?.id) payload.icfId = documents['ICF'].id
      if (documents['SAP']?.id) payload.sapId = documents['SAP'].id
      if (documents['CSR']?.id) payload.csrId = documents['CSR'].id
      if (documents['CRF']?.id) payload.crfId = documents['CRF'].id

      const docCount = Object.keys(payload).length
      if (docCount < 2) {
        console.warn('Need at least 2 documents for cross-validation')
        return
      }

      const response = await fetch('/api/crossdoc/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, projectId }),
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
      }
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setValidating(false)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      error: 'bg-orange-100 text-orange-700 border-orange-200',
      warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      info: 'bg-blue-100 text-blue-700 border-blue-200',
    }
    return variants[severity] || variants.info
  }

  const formatDocumentType = (type: string) => {
    const map: Record<string, string> = {
      'PROTOCOL': 'Protocol',
      'IB': 'IB',
      'ICF': 'ICF',
      'SAP': 'SAP',
      'CSR': 'CSR',
      'CRF': 'CRF',
    }
    return map[type] || type
  }

  const documentCount = Object.keys(documents).length

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {/* Compact Header */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {documentCount} documents
          </span>
          {result && (
            <>
              <span className="text-muted-foreground">•</span>
              {result.summary.total === 0 ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Consistent
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  {result.summary.critical > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs py-0">
                      {result.summary.critical} critical
                    </Badge>
                  )}
                  {result.summary.error > 0 && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs py-0">
                      {result.summary.error} errors
                    </Badge>
                  )}
                  {result.summary.warning > 0 && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs py-0">
                      {result.summary.warning} warnings
                    </Badge>
                  )}
                </div>
              )}
              {result.metadata?.timestamp && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(result.metadata.timestamp).toLocaleString()}
                  </span>
                </>
              )}
            </>
          )}
        </div>
        <Button
          onClick={runValidation}
          disabled={validating || documentCount < 2}
          variant="outline"
          size="sm"
          className="h-7 text-xs"
        >
          {validating ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Validate
            </>
          )}
        </Button>
      </div>

      {/* Issues List */}
      {result && result.issues.length > 0 && (
        <div className="space-y-3">
          {result.issues.map((issue, index) => {
            const recommendation = ISSUE_RECOMMENDATIONS[issue.code]
            const isExpanded = expandedIssues.has(index)
            
            return (
              <Card key={index} className="overflow-hidden">
                <div className={`border-l-4 ${
                  issue.severity === 'critical' ? 'border-l-red-500' :
                  issue.severity === 'error' ? 'border-l-orange-500' :
                  issue.severity === 'warning' ? 'border-l-yellow-500' :
                  'border-l-blue-500'
                }`}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1 min-w-0">
                        {/* Issue header */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded border ${getSeverityBadge(issue.severity)}`}>
                            {issue.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {issue.code}
                          </span>
                        </div>
                        
                        {/* Message */}
                        <p className="font-medium text-sm mb-2">{issue.message}</p>
                        
                        {/* Details */}
                        {issue.details && (
                          <p className="text-sm text-muted-foreground mb-3">{issue.details}</p>
                        )}
                        
                        {/* Affected documents with links */}
                        <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                          <FileText className="h-3.5 w-3.5" />
                          <span>Affects:</span>
                          {issue.locations.map((loc, i) => {
                            const docType = formatDocumentType(loc.documentType)
                            const doc = documents[docType]
                            return (
                              <span key={i} className="flex items-center gap-1">
                                {i > 0 && <ArrowRight className="h-3 w-3" />}
                                {doc ? (
                                  <a 
                                    href={`/dashboard/documents/${doc.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 hover:underline"
                                  >
                                    <Badge variant="secondary" className="text-xs py-0 cursor-pointer hover:bg-secondary/80">
                                      {docType}
                                      {loc.sectionId && ` → ${loc.sectionId}`}
                                      <ExternalLink className="h-2.5 w-2.5 ml-1" />
                                    </Badge>
                                  </a>
                                ) : (
                                  <Badge variant="secondary" className="text-xs py-0">
                                    {docType}
                                    {loc.sectionId && ` → ${loc.sectionId}`}
                                  </Badge>
                                )}
                              </span>
                            )
                          })}
                        </div>

                        {/* Recommendation section */}
                        {recommendation && (
                          <div className="mt-3 pt-3 border-t">
                            <button
                              onClick={() => toggleIssue(index)}
                              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                              <Lightbulb className="h-4 w-4" />
                              <span>{recommendation.action}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            
                            {isExpanded && (
                              <div className="mt-3 pl-6">
                                <p className="text-xs text-muted-foreground mb-2">Steps to resolve:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                  {recommendation.steps.map((step, stepIndex) => (
                                    <li key={stepIndex} className="text-sm text-muted-foreground">
                                      {step}
                                    </li>
                                  ))}
                                </ol>
                                
                                {/* Quick action buttons */}
                                <div className="flex gap-2 mt-3">
                                  {issue.locations.map((loc, i) => {
                                    const docType = formatDocumentType(loc.documentType)
                                    const doc = documents[docType]
                                    if (!doc) return null
                                    return (
                                      <a key={i} href={`/dashboard/documents/${doc.id}`} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" variant="outline" className="text-xs h-7">
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          Open {docType}
                                        </Button>
                                      </a>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Minimal empty state - just a hint */}
      {!result && documentCount >= 2 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Click "Validate" to check document consistency
        </p>
      )}

      {/* Not enough documents - minimal */}
      {documentCount < 2 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Generate at least 2 documents to run validation
        </p>
      )}
    </div>
  )
}
