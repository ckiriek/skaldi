import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Database, FileText, Pill, Syringe, Microscope, Dna, HeartPulse, Stethoscope, TestTube, Activity, Brain, Droplet, CheckCircle2 } from 'lucide-react'
import { FetchExternalDataButton } from '@/components/fetch-external-data-button'
import { EvidenceDisplay } from '@/components/evidence-display'
import { GenerationPipeline } from '@/components/projects/generation-pipeline'
import { CrossDocPanel } from '@/components/crossdoc'
import { StudyFlowPanel } from '@/components/study-flow/StudyFlowPanel'
import { ValidationHistory } from '@/components/integration/ValidationHistory'
import { ProjectHeader, ProjectTabs, ProjectOverview, PROJECT_TAB_IDS, PROJECT_TAB_ICONS } from '@/components/project'
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
  if (hasExternalData && ['in_progress', 'failed', 'pending', 'skipped'].includes(project.enrichment_status || '')) {
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

  // Build tabs configuration
  const tabs: ProjectTab[] = [
    {
      id: PROJECT_TAB_IDS.OVERVIEW,
      label: 'Overview',
      icon: PROJECT_TAB_ICONS[PROJECT_TAB_IDS.OVERVIEW],
      content: (
        <ProjectOverview
          project={project}
          documents={documents || []}
          evidenceSources={evidenceSources || []}
        />
      )
    },
    {
      id: PROJECT_TAB_IDS.DOCUMENTS,
      label: 'Pipeline',
      icon: PROJECT_TAB_ICONS[PROJECT_TAB_IDS.DOCUMENTS],
      content: (
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="px-0 pt-0 pb-6">
            <CardTitle className="text-lg">Documentation Pipeline</CardTitle>
            <CardDescription>Sequential generation of regulatory documents based on ICH E6 (R2)</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
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
          </CardContent>
        </Card>
      )
    },
    {
      id: PROJECT_TAB_IDS.FILES,
      label: 'Files',
      icon: PROJECT_TAB_ICONS[PROJECT_TAB_IDS.FILES],
      content: (
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
                  {hasExternalData ? 'Generate your first document in the Pipeline tab' : 'Fetch external data to get started'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/dashboard/documents/${doc.id}`}
                    className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
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
      )
    },
    {
      id: PROJECT_TAB_IDS.EVIDENCE,
      label: 'Evidence',
      icon: PROJECT_TAB_ICONS[PROJECT_TAB_IDS.EVIDENCE],
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
      id: PROJECT_TAB_IDS.STUDY_FLOW,
      label: 'Study Flow',
      icon: PROJECT_TAB_ICONS[PROJECT_TAB_IDS.STUDY_FLOW],
      content: (
        <StudyFlowPanel
          protocolId={documents?.find(d => d.type === 'Protocol')?.id || ''}
          studyFlowId={undefined}
        />
      )
    },
    {
      id: PROJECT_TAB_IDS.CROSS_DOC,
      label: 'Cross-Document',
      icon: PROJECT_TAB_ICONS[PROJECT_TAB_IDS.CROSS_DOC],
      content: (
        <CrossDocPanel
          projectId={project.id}
          documentIds={{
            ibId: documents?.find(d => d.type === 'IB')?.id,
            protocolId: documents?.find(d => d.type === 'Protocol')?.id,
            icfId: documents?.find(d => d.type === 'ICF')?.id,
            sapId: documents?.find(d => d.type === 'SAP')?.id,
            csrId: documents?.find(d => d.type === 'CSR')?.id,
          }}
        />
      )
    },
    {
      id: PROJECT_TAB_IDS.VALIDATION,
      label: 'Validation',
      icon: PROJECT_TAB_ICONS[PROJECT_TAB_IDS.VALIDATION],
      content: (
        documents && documents.length > 0 ? (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.id}>
                <h3 className="text-sm font-medium mb-3">{doc.type}</h3>
                <ValidationHistory documentId={doc.id} />
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No documents to validate</p>
              <p className="text-xs text-muted-foreground mt-1">Generate documents first</p>
            </CardContent>
          </Card>
        )
      )
    },
    {
      id: PROJECT_TAB_IDS.PROTOCOL_EDITOR,
      label: 'Protocol Editor',
      icon: PROJECT_TAB_ICONS[PROJECT_TAB_IDS.PROTOCOL_EDITOR],
      content: (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Protocol Editor Coming Soon</p>
            <p className="text-xs text-muted-foreground mt-1">AI-powered protocol editing with suggestions</p>
          </CardContent>
        </Card>
      )
    }
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <ProjectHeader
        project={project}
        IconComponent={IconComponent}
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
        defaultTab={PROJECT_TAB_IDS.OVERVIEW}
        tabs={tabs}
        className="space-y-6"
      />
    </div>
  )
}
