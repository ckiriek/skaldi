import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Database, FileText } from 'lucide-react'
import { FetchExternalDataButton } from '@/components/fetch-external-data-button'
import { EvidenceDisplay } from '@/components/evidence-display'
import { GenerateDocumentButton } from '@/components/generate-document-button'
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

function getEnrichmentStatusMeta(status: string | null | undefined) {
  const normalized = (status || '').toLowerCase()

  if (normalized === 'completed') {
    return { variant: 'success' as const, label: 'Data Enriched' }
  }
  if (normalized === 'in_progress') {
    return { variant: 'info' as const, label: 'Enriching…' }
  }
  if (normalized === 'failed') {
    return { variant: 'error' as const, label: 'Enrichment Failed' }
  }
  if (normalized === 'skipped') {
    return { variant: 'warning' as const, label: 'Enrichment Skipped' }
  }

  return { variant: 'secondary' as const, label: 'Pending' }
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch project
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Fetch documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  // Fetch evidence sources
  const { data: evidenceSources } = await supabase
    .from('evidence_sources')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const hasExternalData = evidenceSources && evidenceSources.length > 0

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Project</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Phase: {project.phase || 'N/A'}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span>Indication: {project.indication || 'N/A'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasExternalData ? (
            <GenerateDocumentButton projectId={project.id} />
          ) : (
            <FetchExternalDataButton projectId={project.id} />
          )}
        </div>
      </div>

      {/* Alert for no data */}
      {!hasExternalData && (
        <div className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
          <Database className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900">Fetch External Data</h3>
            <p className="mt-1 text-xs text-blue-700">
              Retrieve evidence from ClinicalTrials.gov, PubMed, and openFDA to enrich your project with safety data and clinical context.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compound</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{project.compound_name || 'N/A'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">RLD Brand</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{project.rld_brand_name || 'N/A'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  size="sm"
                  variant={getEnrichmentStatusMeta(project.enrichment_status).variant}
                >
                  {getEnrichmentStatusMeta(project.enrichment_status).label}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          {/* Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Generated regulatory documents</CardDescription>
                </div>
                {hasExternalData && (
                  <GenerateDocumentButton projectId={project.id} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col">
                        <p className="text-sm font-medium">
                          {doc.type} 
                          <span className="text-xs text-muted-foreground"> · v{doc.version}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Created {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        size="sm"
                        variant={getDocumentStatusMeta(doc.status).variant}
                      >
                        {getDocumentStatusMeta(doc.status).label}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <h3 className="text-sm font-medium mb-1">No documents yet</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {hasExternalData
                      ? 'Generate your first regulatory document for this project.'
                      : 'Fetch external data first, then generate documents.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence">
          {/* External Evidence */}
          <Card>
            <CardHeader>
              <CardTitle>External Evidence</CardTitle>
              <CardDescription>
                Data from ClinicalTrials.gov, PubMed, and openFDA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {evidenceSources && evidenceSources.length > 0 ? (
                <EvidenceDisplay evidenceSources={evidenceSources} />
              ) : (
                <div className="text-center py-8">
                  <Database className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <h3 className="text-sm font-medium mb-1">No evidence yet</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Click "Fetch External Data" above to retrieve evidence for this project.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
