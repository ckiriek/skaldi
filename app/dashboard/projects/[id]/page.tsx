import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { FileText, Plus, Calendar, MapPin, Database, CheckCircle, AlertCircle } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge>{project.phase}</Badge>
              <span className="text-gray-600">{project.indication}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Workflow Banner */}
      {!hasExternalData ? (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-amber-900">
                  📊 Next Step: Fetch External Data
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  Before generating documents, fetch external evidence from ClinicalTrials.gov, PubMed, and openFDA. 
                  This ensures your documents contain accurate safety data, clinical context, and published research.
                </p>
                <div className="mt-3">
                  <FetchExternalDataButton projectId={project.id} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-green-900">
                  ✅ External Data Ready
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  {evidenceSources.length} evidence sources fetched: {clinicalTrialsCount} clinical trials, {publicationsCount} publications, {safetyReportsCount} safety reports.
                  You can now generate documents with complete data.
                </p>
                <div className="mt-3">
                  <GenerateDocumentButton projectId={project.id} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Study Design</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Type:</span>{' '}
              <span className="font-medium">{designJson?.design_type || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Blinding:</span>{' '}
              <span className="font-medium">{designJson?.blinding || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Arms:</span>{' '}
              <span className="font-medium">{designJson?.arms || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Duration:</span>{' '}
              <span className="font-medium">{designJson?.duration_weeks || 'N/A'} weeks</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              <MapPin className="w-4 h-4 inline mr-2" />
              Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.countries && project.countries.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {project.countries.map((country: string) => (
                  <Badge key={country} variant="outline">
                    {country}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No countries specified</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              <Calendar className="w-4 h-4 inline mr-2" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Created:</span>{' '}
              <span className="font-medium">
                {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Primary Endpoint:</span>{' '}
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Generated regulatory documents</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/documents/${doc.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{doc.type} - Version {doc.version}</p>
                        <p className="text-sm text-gray-600">
                          Created {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        doc.status === 'approved'
                          ? 'success'
                          : doc.status === 'review'
                          ? 'default'
                          : 'outline'
                      }
                    >
                      {doc.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
              <p className="mt-1 text-sm text-gray-500">
                Generate your first document to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidence Sources */}
      <Card>
        <CardHeader>
          <CardTitle>External Evidence</CardTitle>
          <CardDescription>
            Data from ClinicalTrials.gov, PubMed, and openFDA
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evidenceSources && evidenceSources.length > 0 ? (
            <div className="space-y-3">
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
            </div>
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
