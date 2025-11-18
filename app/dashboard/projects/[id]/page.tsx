import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Database, FileText, Pill, Syringe, Microscope, Dna, HeartPulse, Stethoscope, TestTube, Activity, Brain, Droplet, CheckCircle2 } from 'lucide-react'
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

  // Auto-update enrichment status if we have evidence but status is still in_progress
  if (hasExternalData && project.enrichment_status === 'in_progress') {
    await supabase
      .from('projects')
      .update({ enrichment_status: 'completed' })
      .eq('id', id)
    
    // Update local project object
    project.enrichment_status = 'completed'
  }

  // Get icon component
  const iconMap: Record<string, any> = {
    Pill, Syringe, Microscope, Dna, HeartPulse, Stethoscope, TestTube, Activity, Brain, Droplet
  }
  const IconComponent = iconMap[project.icon_name || 'Pill'] || Pill
  const enrichmentStatus = getEnrichmentStatusMeta(project.enrichment_status)

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Project</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Phase: {project.phase || 'N/A'}</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <span>Indication: {project.indication || 'N/A'}</span>
              {project.compound_name && (
                <>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                  <span>Compound: {project.compound_name}</span>
                </>
              )}
              {project.rld_brand_name && (
                <>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                  <span>RLD: {project.rld_brand_name}</span>
                </>
              )}
              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <span className="flex items-center gap-1">
                {enrichmentStatus.variant === 'success' && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                <Badge variant={enrichmentStatus.variant} size="sm">{enrichmentStatus.label}</Badge>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hasExternalData && <FetchExternalDataButton projectId={project.id} />}
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

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList className="w-full h-9">
          <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
          <TabsTrigger value="evidence" className="flex-1">Evidence</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <div className="space-y-4">
            {/* Document Generation Buttons - Compact, Single Column, Correct Order */}
            {hasExternalData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Generate Documents</CardTitle>
                  <CardDescription className="text-xs">Generate documents in the recommended order</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <GenerateDocumentButton projectId={project.id} documentType="IB" variant="outline" size="sm" />
                    <GenerateDocumentButton projectId={project.id} documentType="Synopsis" variant="outline" size="sm" />
                    <GenerateDocumentButton projectId={project.id} documentType="Protocol" variant="outline" size="sm" />
                    <GenerateDocumentButton projectId={project.id} documentType="ICF" variant="outline" size="sm" />
                    <GenerateDocumentButton projectId={project.id} documentType="SAP" variant="outline" size="sm" />
                    <GenerateDocumentButton projectId={project.id} documentType="CRF" variant="outline" size="sm" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generated Documents</CardTitle>
                <CardDescription className="text-xs">View and manage your project documents</CardDescription>
              </CardHeader>
              <CardContent>
                {!documents || documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-sm font-medium text-muted-foreground">No documents yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {hasExternalData ? 'Generate your first document above' : 'Fetch external data to get started'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/dashboard/documents/${doc.id}`}
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
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="evidence">
          <div className="space-y-4">

            {/* Enrichment Details */}
            {project.enrichment_status === 'completed' && project.enrichment_metadata && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Enrichment Data</CardTitle>
                  <CardDescription>
                    Data collected from external sources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Clinical Trials</p>
                      <p className="mt-1 font-semibold">
                        {project.enrichment_metadata.records_fetched?.trials || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Publications</p>
                      <p className="mt-1 font-semibold">
                        {project.enrichment_metadata.records_fetched?.literature || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Labels</p>
                      <p className="mt-1 font-semibold">
                        {project.enrichment_metadata.records_fetched?.labels || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="mt-1 font-semibold">
                        {project.enrichment_metadata.duration_ms 
                          ? `${Math.round(project.enrichment_metadata.duration_ms / 1000)}s`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {project.enrichment_metadata.sources_used && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground">Sources:</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {project.enrichment_metadata.sources_used.map((source: string) => (
                          <Badge key={source} variant="secondary" size="sm">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
                    <Link
                      key={doc.id}
                      href={`/dashboard/documents/${doc.id}`}
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
                    </Link>
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
