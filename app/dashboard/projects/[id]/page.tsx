import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

// Disable caching for this page to always show fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Database, FileText } from 'lucide-react'
import { FetchExternalDataButton } from '@/components/fetch-external-data-button'
import { EvidenceDisplay } from '@/components/evidence-display'
import { GenerationPipeline } from '@/components/projects/generation-pipeline'
import { CrossDocValidation } from '@/components/crossdoc'
import { ProjectHeader, ProjectTabs, PROJECT_TAB_IDS } from '@/components/project'
import type { ProjectTab } from '@/components/project'

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
    return { variant: 'secondary' as const, label: 'Awaiting Enrichment' }
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

  // Auto-update enrichment status if we have evidence but status is not completed
  // This fixes projects stuck in "Awaiting Enrichment" or "Failed" despite having data
  // DISABLED: Allow manual re-enrichment even if data exists
  // if (hasExternalData && ['in_progress', 'failed', 'pending', 'skipped'].includes(project.enrichment_status || '')) {
  //   await supabase
  //     .from('projects')
  //     .update({ enrichment_status: 'completed' })
  //     .eq('id', id)
  //   
  //   // Update local project object
  //   project.enrichment_status = 'completed'
  // }

  const enrichmentStatus = getEnrichmentStatusMeta(project.enrichment_status)

  // Calculate stats for overview section
  // Count unique document types (not versions)
  const uniqueDocTypes = new Set(documents?.map(d => d.type) || [])
  const generatedDocuments = uniqueDocTypes.size
  const totalDocTypes = 6 // IB, Synopsis, Protocol, ICF, SAP, CRF
  const progress = Math.round((generatedDocuments / totalDocTypes) * 100)
  const totalEvidence = evidenceSources?.length || 0

  // Build tabs configuration
  const tabs: ProjectTab[] = [
    {
      id: PROJECT_TAB_IDS.DOCUMENTS,
      label: 'Pipeline',
      content: (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Generated</p>
                    <p className="text-2xl font-bold">
                      <span className={generatedDocuments === totalDocTypes ? "text-emerald-600" : ""}>
                        {generatedDocuments}
                      </span>
                      <span className="text-muted-foreground text-lg">/{totalDocTypes}</span>
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Progress</p>
                    <p className={`text-2xl font-bold ${progress === 100 ? 'text-emerald-600' : ''}`}>
                      {progress}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Evidence Sources</p>
                    <p className="text-2xl font-bold">{totalEvidence}</p>
                  </div>
                  <Database className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline */}
          {hasExternalData ? (
            <GenerationPipeline projectId={project.id} documents={documents || []} />
          ) : (
            <div className="text-center py-12 border rounded-xl bg-white">
              <Database className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-medium text-foreground">Enrichment Required</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Please fetch external data first to enable the document generation pipeline.
              </p>
            </div>
          )}
        </div>
      )
    },
    {
      id: PROJECT_TAB_IDS.EVIDENCE,
      label: 'Evidence',
      content: (
        <div className="space-y-4">
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
          {evidenceSources && evidenceSources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">External Evidence</CardTitle>
                <CardDescription>
                  Data from ClinicalTrials.gov, PubMed, and openFDA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EvidenceDisplay evidenceSources={evidenceSources} />
              </CardContent>
            </Card>
          )}
        </div>
      )
    },
    {
      id: PROJECT_TAB_IDS.CROSS_DOC,
      label: 'Validation',
      content: <CrossDocValidation projectId={project.id} />
    },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <ProjectHeader
        project={project}
        enrichmentStatus={enrichmentStatus}
        hasExternalData={!!hasExternalData}
      />

      {/* Alert for no data */}
      {!hasExternalData && (
        <div className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
          <Database className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900">Fetch External Data</h3>
            <p className="mt-1 text-xs text-blue-700">
              Retrieve evidence from ClinicalTrials.gov, PubMed, and openFDA to enrich your project with safety data and clinical context.
            </p>
            <div className="mt-2">
              <FetchExternalDataButton projectId={project.id} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <ProjectTabs
        defaultTab={PROJECT_TAB_IDS.DOCUMENTS}
        tabs={tabs}
        className="space-y-6"
      />
    </div>
  )
}
