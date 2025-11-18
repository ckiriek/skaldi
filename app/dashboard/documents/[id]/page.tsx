import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, FileText, Calendar, Info } from 'lucide-react'
import { ValidateDocumentButton } from '@/components/validate-document-button'
import { DocumentViewer } from '@/components/document-viewer'
import { ValidationResultsDetailed } from '@/components/validation-results-detailed'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

function getDocumentStatusMeta(status: string | null | undefined) {
  const normalized = (status || '').toLowerCase()

  if (normalized === 'approved') {
    return { variant: 'success' as const, label: 'Approved' }
  }
  if (normalized === 'review' || normalized === 'in_review') {
    return { variant: 'info' as const, label: 'In Review' }
  }
  if (normalized === 'draft') {
    return { variant: 'secondary' as const, label: 'Draft' }
  }
  if (normalized === 'outdated' || normalized === 'archived') {
    return { variant: 'warning' as const, label: 'Outdated' }
  }

  return { variant: 'secondary' as const, label: 'Unknown' }
}

function getValidationStatusMeta(status: string | null | undefined) {
  const normalized = (status || '').toLowerCase()

  if (normalized === 'approved') {
    return { variant: 'success' as const, label: 'Approved' }
  }
  if (normalized === 'review') {
    return { variant: 'info' as const, label: 'In Review' }
  }
  if (normalized === 'needs_revision') {
    return { variant: 'error' as const, label: 'Needs Revision' }
  }

  return { variant: 'secondary' as const, label: 'Unknown' }
}

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch document with content
  const { data: document, error } = await supabase
    .from('documents')
    .select(`
      *,
      projects (
        id,
        title,
        phase,
        indication
      )
    `)
    .eq('id', id)
    .single()

  if (error || !document) {
    notFound()
  }

  // Try to fetch current version content from document_versions
  const { data: currentVersion } = await supabase
    .from('document_versions')
    .select('content')
    .eq('document_id', id)
    .eq('is_current', true)
    .single()

  // Use content from document_versions if available, otherwise keep document.content
  if (currentVersion?.content) {
    (document as any).content = currentVersion.content
  }
  // If document.content already exists (from older schema), it will be used

  // Fetch latest validation results
  const { data: validationResultsArray } = await supabase
    .from('validation_results')
    .select('*')
    .eq('document_id', id)
    .order('validation_date', { ascending: false })
    .limit(1)
  
  const rawValidationResults = validationResultsArray?.[0] || null
  
  // Transform validation results to match expected format
  const validationResults = rawValidationResults ? {
    ...rawValidationResults,
    issues: (rawValidationResults.results as any)?.issues || [],
    summary: (rawValidationResults.results as any)?.summary || { errors: 0, warnings: 0, info: 0 },
  } : null

  const project = Array.isArray(document.projects) ? document.projects[0] : document.projects

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <Link href={`/dashboard/projects/${(document as any).projects?.id}`}>
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {document.type}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <Badge size="lg">Version {document.version}</Badge>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-muted-foreground">{(document as any).projects?.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ValidateDocumentButton 
              documentId={document.id}
              documentType={document.type}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Document Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Document Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{document.type}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version:</span>
              <span className="font-medium">{document.version}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status:</span>
              <Badge 
                variant={getDocumentStatusMeta(document.status).variant}
                size="sm"
              >
                {getDocumentStatusMeta(document.status).label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Project Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phase:</span>
              <span className="font-medium">{project?.phase}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Indication:</span>
              <span className="font-medium">{project?.indication}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">
                {new Date(document.created_at).toLocaleDateString()}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated:</span>
              <span className="font-medium">
                {new Date(document.updated_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList className="w-full h-9">
          <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
          <TabsTrigger value="validation" className="flex-1">Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          {/* Document Content */}
          {(document as any).content ? (
            <DocumentViewer 
              content={(document as any).content} 
              documentType={document.type}
              documentId={document.id}
              documentTitle={document.type}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-base font-medium mb-1">No content generated yet</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Click 'Generate Document' on the project page to create content using AI.
                </p>
                <Link href={`/dashboard/projects/${(document as any).project_id}`}>
                  <Button>Go to Project</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="validation">
          {/* Validation Results */}
          {validationResults ? (
            <ValidationResultsDetailed 
              results={validationResults}
              documentType={document.type}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No validation results yet</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Click 'Validate' to check document compliance with ICH E6 (R2), FDA guidelines, and regulatory standards
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
