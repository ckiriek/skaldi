'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ExternalLink, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  category: string
  message: string
  location?: string
  suggestion?: string
  guideline_reference?: string
}

interface ValidationResults {
  completeness_score: number
  status: string
  total_rules: number
  passed: number
  failed: number
  validation_date: string
  issues?: ValidationIssue[]
  summary?: {
    errors: number
    warnings: number
    info: number
  }
}

interface ValidationResultsDetailedProps {
  results: ValidationResults
  documentType: string
}

const REGULATORY_LINKS: Record<string, string> = {
  'ICH E6 (R2)': 'https://database.ich.org/sites/default/files/E6_R2_Addendum.pdf',
  'ICH E6 (R2) Section 7': 'https://database.ich.org/sites/default/files/E6_R2_Addendum.pdf#page=23',
  'FDA Guidelines': 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents',
  'FDA 21 CFR Part 50': 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-50',
  'FDA Bioequivalence Guidance': 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/bioavailability-and-bioequivalence-studies-orally-administered-drug-products-general-considerations',
}

export function ValidationResultsDetailed({ results, documentType }: ValidationResultsDetailedProps) {
  const getStatusColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusVariant = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 90) return 'success'
    if (score >= 70) return 'warning'
    return 'error'
  }

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getIssueVariant = (type: string): 'error' | 'warning' | 'info' => {
    return type as 'error' | 'warning' | 'info'
  }

  // Group issues by category
  const issuesByCategory = (results.issues || []).reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = []
    }
    acc[issue.category].push(issue)
    return acc
  }, {} as Record<string, ValidationIssue[]>)

  const categories = Object.keys(issuesByCategory)

  // Calculate category scores
  const categoryScores = categories.map(category => {
    const categoryIssues = issuesByCategory[category]
    const errors = categoryIssues.filter(i => i.type === 'error').length
    const warnings = categoryIssues.filter(i => i.type === 'warning').length
    const total = categoryIssues.length
    
    // Score: 100 - (errors * 15 + warnings * 5)
    const score = Math.max(0, 100 - (errors * 15 + warnings * 5))
    
    return {
      category,
      score,
      issues: categoryIssues,
      errors,
      warnings,
    }
  })

  const handleExportReport = async () => {
    // TODO: Implement PDF export
    console.log('Export validation report')
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getStatusColor(results.completeness_score)}`}>
              {results.completeness_score}%
            </div>
            <Progress 
              value={results.completeness_score} 
              variant={getStatusVariant(results.completeness_score)}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Checks Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{results.passed}/{results.total_rules}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((results.passed / results.total_rules) * 100)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Issues Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-semibold">{results.summary?.errors || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-semibold">{results.summary?.warnings || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold">{results.summary?.info || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleExportReport} 
              variant="outline" 
              size="sm"
              className="w-full"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validation by Category</CardTitle>
            <CardDescription>Compliance scores across different regulatory areas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryScores.map(({ category, score, errors, warnings }) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{category}</span>
                      {REGULATORY_LINKS[category] && (
                        <a 
                          href={REGULATORY_LINKS[category]} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {errors > 0 && (
                        <Badge variant="error" size="sm">{errors} errors</Badge>
                      )}
                      {warnings > 0 && (
                        <Badge variant="warning" size="sm">{warnings} warnings</Badge>
                      )}
                      <span className={`text-sm font-semibold ${getStatusColor(score)}`}>
                        {score}%
                      </span>
                    </div>
                  </div>
                  <Progress value={score} variant={getStatusVariant(score)} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Issues */}
      {results.issues && results.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detailed Issues</CardTitle>
            <CardDescription>Review and address validation findings</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  All ({results.issues.length})
                </TabsTrigger>
                <TabsTrigger value="error">
                  Errors ({results.summary?.errors || 0})
                </TabsTrigger>
                <TabsTrigger value="warning">
                  Warnings ({results.summary?.warnings || 0})
                </TabsTrigger>
                <TabsTrigger value="info">
                  Info ({results.summary?.info || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3 mt-4">
                {results.issues.map((issue, index) => (
                  <IssueCard key={index} issue={issue} />
                ))}
              </TabsContent>

              <TabsContent value="error" className="space-y-3 mt-4">
                {results.issues.filter(i => i.type === 'error').map((issue, index) => (
                  <IssueCard key={index} issue={issue} />
                ))}
              </TabsContent>

              <TabsContent value="warning" className="space-y-3 mt-4">
                {results.issues.filter(i => i.type === 'warning').map((issue, index) => (
                  <IssueCard key={index} issue={issue} />
                ))}
              </TabsContent>

              <TabsContent value="info" className="space-y-3 mt-4">
                {results.issues.filter(i => i.type === 'info').map((issue, index) => (
                  <IssueCard key={index} issue={issue} />
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Last validated: {new Date(results.validation_date).toLocaleString()}
      </p>
    </div>
  )
}

function IssueCard({ issue }: { issue: ValidationIssue }) {
  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50/50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50/50'
      case 'info':
        return 'border-blue-200 bg-blue-50/50'
      default:
        return 'border-gray-200'
    }
  }

  return (
    <div className={`p-4 rounded-lg border ${getBorderColor(issue.type)}`}>
      <div className="flex items-start gap-3">
        {getIssueIcon(issue.type)}
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{issue.message}</p>
              {issue.location && (
                <p className="text-xs text-muted-foreground mt-1">
                  Location: {issue.location}
                </p>
              )}
            </div>
            <Badge variant={issue.type as 'error' | 'warning' | 'info'} size="sm">
              {issue.type}
            </Badge>
          </div>

          {issue.suggestion && (
            <div className="bg-white/50 rounded p-2 border border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-1">💡 Suggestion:</p>
              <p className="text-xs text-gray-600">{issue.suggestion}</p>
            </div>
          )}

          {issue.guideline_reference && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Reference:</span>
              {REGULATORY_LINKS[issue.guideline_reference] ? (
                <a
                  href={REGULATORY_LINKS[issue.guideline_reference]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {issue.guideline_reference}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-xs font-medium">{issue.guideline_reference}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
