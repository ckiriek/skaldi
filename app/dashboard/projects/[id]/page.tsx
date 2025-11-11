import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { EmptyState } from '@/components/ui/empty-state'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { FileText, Plus, Calendar, MapPin, Database, CheckCircle, AlertCircle, FlaskConical, BookOpen, Shield, ExternalLink, ArrowLeft } from 'lucide-react'
import { GenerateDocumentButton } from '@/components/generate-document-button'
import { FetchExternalDataButton } from '@/components/fetch-external-data-button'
import { FileUpload } from '@/components/file-upload'
import { ProjectFilesList } from '@/components/project-files-list'
import { EntitiesDisplay } from '@/components/entities-display'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Fetch project
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Fetch documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false })

  // Fetch entities
  const { data: entities } = await supabase
    .from('entities_corpus')
    .select('*')
    .eq('project_id', params.id)

  // Fetch evidence sources
  const { data: evidenceSources } = await supabase
    .from('evidence_sources')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false })

  // Fetch uploaded files
  const { data: projectFiles } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', params.id)
    .order('uploaded_at', { ascending: false })

  const designJson = project.design_json as any
  
  // Check workflow status
  const hasExternalData = evidenceSources && evidenceSources.length > 0
  const clinicalTrialsCount = evidenceSources?.filter(e => e.source === 'ClinicalTrials.gov').length || 0
  const publicationsCount = evidenceSources?.filter(e => e.source === 'PubMed').length || 0
  const safetyReportsCount = evidenceSources?.filter(e => e.source === 'openFDA').length || 0

  return (
    <div className="space-y-8 fade-in">
      {/* Back Button & Header */}
      <div>
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">{project.title}</h1>
            <div className="flex items-center gap-3 mt-3">
              <Badge size="lg">{project.phase}</Badge>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-muted-foreground">{project.indication}</span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Smart Workflow Banner */}
      {!hasExternalData ? (
        <Alert variant="warning">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>📊 Next Step: Fetch External Data</AlertTitle>
          <AlertDescription>
            Before generating documents, fetch external evidence from ClinicalTrials.gov, PubMed, and openFDA. 
            This ensures your documents contain accurate safety data, clinical context, and published research.
          </AlertDescription>
          <div className="mt-4">
            <FetchExternalDataButton projectId={project.id} />
          </div>
        </Alert>
      ) : (
        <Alert variant="success">
          <CheckCircle className="h-5 w-5" />
          <AlertTitle>✅ External Data Ready</AlertTitle>
          <AlertDescription>
            {evidenceSources.length} evidence sources fetched: {clinicalTrialsCount} clinical trials, {publicationsCount} publications, {safetyReportsCount} safety reports.
            You can now generate documents with complete data.
          </AlertDescription>
          <div className="mt-4">
            <GenerateDocumentButton projectId={project.id} />
          </div>
        </Alert>
      )}

      {/* Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Study Design
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{designJson?.design_type || 'N/A'}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Blinding:</span>
              <span className="font-medium">{designJson?.blinding || 'N/A'}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Arms:</span>
              <span className="font-medium">{designJson?.arms || 'N/A'}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{designJson?.duration_weeks || 'N/A'} weeks</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.countries && project.countries.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {project.countries.map((country: string) => (
                  <Badge key={country} variant="secondary" size="sm">
                    {country}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No countries specified</p>
            )}
          </CardContent>
        </Card>

        <Card className="hover-lift">
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
                {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Primary Endpoint:</span>
              <span className="font-medium">{designJson?.primary_endpoint || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entities */}
      {entities && entities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Entities</CardTitle>
            <CardDescription>
              Data extracted from uploaded documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entities.map((entity) => (
                <div key={entity.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {entity.entity_type}
                      </Badge>
                      <p className="font-medium">{entity.entity_key}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Source: {entity.source_document || 'Manual entry'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      <Card className="hover-lift">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Documents</CardTitle>
              <CardDescription>Generated regulatory documents</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc, index) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/documents/${doc.id}`}
                  className="block p-4 border rounded-lg hover:bg-accent hover:border-primary transition-smooth slide-in-from-left"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{doc.type} - Version {doc.version}</p>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        doc.status === 'approved'
                          ? 'success'
                          : doc.status === 'review'
                          ? 'info'
                          : 'secondary'
                      }
                      size="sm"
                    >
                      {doc.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No documents yet"
              description="Generate your first document to get started"
            />
          )}
        </CardContent>
      </Card>

      {/* Evidence Sources - Grouped by Type */}
      <Card>
        <CardHeader>
          <CardTitle>External Evidence</CardTitle>
          <CardDescription>
            Data from ClinicalTrials.gov, PubMed, and openFDA
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evidenceSources && evidenceSources.length > 0 ? (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  All ({evidenceSources.length})
                </TabsTrigger>
                <TabsTrigger value="clinical-trials">
                  <FlaskConical className="w-4 h-4 mr-2" />
                  Trials ({evidenceSources.filter(e => e.source === 'ClinicalTrials.gov').length})
                </TabsTrigger>
                <TabsTrigger value="publications">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Publications ({evidenceSources.filter(e => e.source === 'PubMed').length})
                </TabsTrigger>
                <TabsTrigger value="safety">
                  <Shield className="w-4 h-4 mr-2" />
                  Safety ({evidenceSources.filter(e => e.source === 'openFDA').length})
                </TabsTrigger>
              </TabsList>

              {/* All Tab */}
              <TabsContent value="all" className="space-y-3 mt-4">
                {evidenceSources.map((evidence) => {
                  const payload = evidence.payload_json as any
                  const title = payload?.title || payload?.drugName || 'No title'
                  const preview = payload?.abstract || payload?.description || 
                                 (payload?.reactions ? payload.reactions.join(', ') : '')
                  
                  return (
                    <div
                      key={evidence.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{evidence.source}</Badge>
                            {evidence.external_id && (
                              <span className="text-xs text-gray-500">{evidence.external_id}</span>
                            )}
                          </div>
                          <p className="font-medium text-sm mb-1">{title}</p>
                          {preview && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {preview.substring(0, 200)}{preview.length > 200 ? '...' : ''}
                            </p>
                          )}
                          {payload?.phase && (
                            <span className="text-xs text-gray-500 mr-2">Phase: {payload.phase}</span>
                          )}
                          {payload?.status && (
                            <span className="text-xs text-gray-500 mr-2">Status: {payload.status}</span>
                          )}
                          {payload?.journal && (
                            <span className="text-xs text-gray-500 mr-2">Journal: {payload.journal}</span>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Added {new Date(evidence.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </TabsContent>

              {/* Clinical Trials Tab */}
              <TabsContent value="clinical-trials" className="space-y-3 mt-4">
                {evidenceSources.filter(e => e.source === 'ClinicalTrials.gov').map((evidence) => {
                  const payload = evidence.payload_json as any
                  const ctUrl = `https://clinicaltrials.gov/study/${evidence.external_id}`
                  return (
                    <div key={evidence.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{evidence.external_id}</Badge>
                          {payload?.phase && <Badge>{payload.phase}</Badge>}
                        </div>
                        <a 
                          href={ctUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                        >
                          View on ClinicalTrials.gov
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="font-medium text-sm mb-1">{payload?.title || 'No title'}</p>
                      {payload?.status && (
                        <span className="text-xs text-gray-500 mr-2">Status: {payload.status}</span>
                      )}
                      {payload?.enrollment && (
                        <span className="text-xs text-gray-500 mr-2">Enrollment: {payload.enrollment}</span>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Added {new Date(evidence.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  )
                })}
              </TabsContent>

              {/* Publications Tab */}
              <TabsContent value="publications" className="space-y-3 mt-4">
                {evidenceSources.filter(e => e.source === 'PubMed').map((evidence) => {
                  const payload = evidence.payload_json as any
                  const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/${evidence.external_id}/`
                  return (
                    <div key={evidence.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">PMID: {evidence.external_id}</Badge>
                        <a 
                          href={pubmedUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                        >
                          View on PubMed
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="font-medium text-sm mb-1">{payload?.title || 'No title'}</p>
                      {payload?.abstract && (
                        <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                          {payload.abstract.substring(0, 200)}{payload.abstract.length > 200 ? '...' : ''}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2 text-xs text-gray-500">
                        {payload?.journal && <span>Journal: {payload.journal}</span>}
                        {payload?.year && <span>• {payload.year}</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Added {new Date(evidence.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  )
                })}
              </TabsContent>

              {/* Safety Data Tab */}
              <TabsContent value="safety" className="space-y-3 mt-4">
                {evidenceSources.filter(e => e.source === 'openFDA').map((evidence) => {
                  const payload = evidence.payload_json as any
                  const fdaUrl = `https://open.fda.gov/apis/drug/event/`
                  return (
                    <div key={evidence.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">openFDA</Badge>
                          {payload?.seriousness && <Badge variant="destructive">Serious</Badge>}
                        </div>
                        <a 
                          href={fdaUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                        >
                          View on openFDA
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="font-medium text-sm mb-1">{payload?.drugName || 'No drug name'}</p>
                      {payload?.reactions && (
                        <p className="text-sm text-gray-600 mt-2">
                          Reactions: {payload.reactions.join(', ')}
                        </p>
                      )}
                      {payload?.receiptDate && (
                        <span className="text-xs text-gray-500 mr-2">Report Date: {payload.receiptDate}</span>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Added {new Date(evidence.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  )
                })}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-12">
              <Database className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No external evidence</h3>
              <p className="mt-1 text-sm text-gray-500 mb-4">
                Click "Fetch External Data" to retrieve evidence from external sources
              </p>
              <FetchExternalDataButton projectId={project.id} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Upload */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
        <FileUpload projectId={project.id} />
      </div>

      {/* Uploaded Files List */}
      {projectFiles && projectFiles.length > 0 && (
        <ProjectFilesList projectId={project.id} files={projectFiles} />
      )}

      {/* Extracted Entities */}
      {entities && entities.length > 0 && (
        <EntitiesDisplay entities={entities} />
      )}
    </div>
  )
}
