'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, RefreshCw, Loader2 } from 'lucide-react'

interface CrossDocMatrixProps {
  projectId: string
}

interface DocumentPair {
  source: string
  target: string
  status: 'clean' | 'warning' | 'error' | 'pending' | 'na'
  issues: number
  lastChecked?: string
}

// Document types that can be cross-validated
const DOCUMENT_TYPES = ['Protocol', 'IB', 'ICF', 'SAP', 'CSR', 'CRF']

// Valid document pairs for cross-validation
const VALID_PAIRS: Record<string, string[]> = {
  'Protocol': ['IB', 'ICF', 'SAP', 'CSR', 'CRF'],
  'IB': ['Protocol'],
  'ICF': ['Protocol'],
  'SAP': ['Protocol', 'CSR'],
  'CSR': ['Protocol', 'SAP'],
  'CRF': ['Protocol'],
}

export function CrossDocMatrix({ projectId }: CrossDocMatrixProps) {
  const [matrix, setMatrix] = useState<DocumentPair[]>([])
  const [documents, setDocuments] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [projectId])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/documents`)
      if (response.ok) {
        const data = await response.json()
        console.log('[CrossDocMatrix] Loaded documents:', data.documents)
        const docMap: Record<string, any> = {}
        data.documents?.forEach((doc: any) => {
          console.log(`[CrossDocMatrix] Document type=${doc.type}, id=${doc.id}`)
          docMap[doc.type] = doc
        })
        console.log('[CrossDocMatrix] Document map:', Object.keys(docMap))
        setDocuments(docMap)
        buildMatrix(docMap)
      } else {
        console.error('[CrossDocMatrix] Failed to load documents:', response.status, await response.text())
      }
    } catch (error) {
      console.error('[CrossDocMatrix] Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const buildMatrix = (docMap: Record<string, any>) => {
    const pairs: DocumentPair[] = []
    
    Object.entries(VALID_PAIRS).forEach(([source, targets]) => {
      targets.forEach(target => {
        const sourceDoc = docMap[source]
        const targetDoc = docMap[target]
        
        if (sourceDoc && targetDoc) {
          // Both documents exist - can validate
          pairs.push({
            source,
            target,
            status: sourceDoc.crossdoc_status || 'pending',
            issues: sourceDoc.crossdoc_issues || 0,
            lastChecked: sourceDoc.last_crossdoc_check,
          })
        } else if (sourceDoc || targetDoc) {
          // Only one exists
          pairs.push({
            source,
            target,
            status: 'pending',
            issues: 0,
          })
        } else {
          // Neither exists
          pairs.push({
            source,
            target,
            status: 'na',
            issues: 0,
          })
        }
      })
    })
    
    setMatrix(pairs)
  }

  const runValidation = async () => {
    setValidating(true)
    try {
      // Build document IDs from loaded documents
      const payload: Record<string, string> = {}
      if (documents['IB']?.id) payload.ibId = documents['IB'].id
      if (documents['Protocol']?.id) payload.protocolId = documents['Protocol'].id
      if (documents['ICF']?.id) payload.icfId = documents['ICF'].id
      if (documents['SAP']?.id) payload.sapId = documents['SAP'].id
      if (documents['CSR']?.id) payload.csrId = documents['CSR'].id
      if (documents['CRF']?.id) payload.crfId = documents['CRF'].id
      
      // Check if we have at least 2 documents
      const docCount = Object.keys(payload).length
      console.log('[CrossDocMatrix] Validation payload:', payload, 'docCount:', docCount)
      if (docCount < 2) {
        console.warn('[CrossDocMatrix] Need at least 2 documents for cross-validation')
        return
      }
      
      const response = await fetch('/api/crossdoc/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (response.ok) {
        const result = await response.json()
        // Update matrix with validation results
        updateMatrixFromResults(result)
        // Don't reload documents - it will reset the matrix
      } else {
        const error = await response.json()
        console.error('Validation error:', error)
      }
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setValidating(false)
    }
  }
  
  const updateMatrixFromResults = (result: any) => {
    console.log('[CrossDocMatrix] Validation result:', result)
    
    // Map document type names (API uses uppercase, UI uses mixed case)
    const typeMap: Record<string, string> = {
      'IB': 'IB',
      'PROTOCOL': 'Protocol',
      'Protocol': 'Protocol',
      'ICF': 'ICF',
      'SAP': 'SAP',
      'CSR': 'CSR',
      'CRF': 'CRF',
    }
    
    // Group issues by document type
    const docIssues: Record<string, { count: number; hasError: boolean; hasWarning: boolean; hasCritical: boolean }> = {}
    
    if (result.issues && Array.isArray(result.issues)) {
      result.issues.forEach((issue: any) => {
        // Get document types from locations
        const locations = issue.locations || []
        locations.forEach((loc: any) => {
          const docType = typeMap[loc.documentType] || loc.documentType
          if (!docIssues[docType]) {
            docIssues[docType] = { count: 0, hasError: false, hasWarning: false, hasCritical: false }
          }
          docIssues[docType].count++
          if (issue.severity === 'critical') docIssues[docType].hasCritical = true
          if (issue.severity === 'error') docIssues[docType].hasError = true
          if (issue.severity === 'warning') docIssues[docType].hasWarning = true
        })
      })
    }
    
    console.log('[CrossDocMatrix] Issues by document:', docIssues)
    
    // Update matrix state
    setMatrix(prev => prev.map(pair => {
      const sourceIssues = docIssues[pair.source]
      const targetIssues = docIssues[pair.target]
      
      // Combine issues from both documents in the pair
      const totalIssues = (sourceIssues?.count || 0) + (targetIssues?.count || 0)
      const hasCritical = sourceIssues?.hasCritical || targetIssues?.hasCritical
      const hasError = sourceIssues?.hasError || targetIssues?.hasError
      const hasWarning = sourceIssues?.hasWarning || targetIssues?.hasWarning
      
      // If both documents exist
      if (documents[pair.source] && documents[pair.target]) {
        let status: string = 'clean'
        if (hasCritical || hasError) status = 'error'
        else if (hasWarning) status = 'warning'
        else if (totalIssues > 0) status = 'warning'
        
        return {
          ...pair,
          status,
          issues: totalIssues,
          lastChecked: new Date().toISOString(),
        }
      }
      
      return pair
    }))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clean':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <HelpCircle className="h-4 w-4 text-gray-400" />
      default:
        return <span className="h-4 w-4 text-gray-300">—</span>
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'bg-green-100 border-green-200'
      case 'warning': return 'bg-amber-100 border-amber-200'
      case 'error': return 'bg-red-100 border-red-200'
      case 'pending': return 'bg-gray-50 border-gray-200'
      default: return 'bg-gray-50 border-gray-100'
    }
  }

  // Build matrix grid
  const matrixGrid: Record<string, Record<string, DocumentPair | null>> = {}
  DOCUMENT_TYPES.forEach(source => {
    matrixGrid[source] = {}
    DOCUMENT_TYPES.forEach(target => {
      const pair = matrix.find(p => p.source === source && p.target === target)
      matrixGrid[source][target] = pair || null
    })
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading cross-document matrix...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Cross-Document Consistency Matrix</CardTitle>
            <CardDescription>
              Validation status between document pairs
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runValidation}
            disabled={validating}
            className="gap-2"
          >
            {validating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Validate All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                    Source ↓ / Target →
                  </th>
                  {DOCUMENT_TYPES.map(type => (
                    <th key={type} className="p-2 text-center text-xs font-medium">
                      {type}
                      {documents[type] && (
                        <Badge variant="secondary" className="ml-1 text-[10px]">✓</Badge>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOCUMENT_TYPES.map(source => (
                  <tr key={source}>
                    <td className="p-2 text-sm font-medium">
                      {source}
                      {documents[source] && (
                        <Badge variant="secondary" className="ml-1 text-[10px]">✓</Badge>
                      )}
                    </td>
                    {DOCUMENT_TYPES.map(target => {
                      const pair = matrixGrid[source][target]
                      const isValid = VALID_PAIRS[source]?.includes(target)
                      const isSelf = source === target
                      
                      if (isSelf) {
                        return (
                          <td key={target} className="p-2 text-center">
                            <div className="w-10 h-10 mx-auto bg-gray-100 rounded flex items-center justify-center">
                              <span className="text-gray-400">—</span>
                            </div>
                          </td>
                        )
                      }
                      
                      if (!isValid) {
                        return (
                          <td key={target} className="p-2 text-center">
                            <div className="w-10 h-10 mx-auto bg-gray-50 rounded flex items-center justify-center">
                              <span className="text-gray-300 text-xs">N/A</span>
                            </div>
                          </td>
                        )
                      }
                      
                      return (
                        <td key={target} className="p-2 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className={`w-10 h-10 mx-auto rounded border flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${
                                  pair ? getStatusColor(pair.status) : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                {pair ? getStatusIcon(pair.status) : <HelpCircle className="h-4 w-4 text-gray-400" />}
                                {pair && pair.issues > 0 && (
                                  <span className="text-[10px] font-medium mt-0.5">
                                    {pair.issues}
                                  </span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <p className="font-medium">{source} → {target}</p>
                                <p>Status: {pair?.status || 'Not validated'}</p>
                                {pair?.issues ? <p>Issues: {pair.issues}</p> : null}
                                {pair?.lastChecked && (
                                  <p className="text-muted-foreground">
                                    Last checked: {new Date(pair.lastChecked).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <span>Clean</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span>Warnings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            <span>Errors</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">✓</Badge>
            <span>Document exists</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
