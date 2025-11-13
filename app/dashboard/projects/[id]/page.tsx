import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Database } from 'lucide-react'
import { FetchExternalDataButton } from '@/components/fetch-external-data-button'
import { EvidenceDisplay } from '@/components/evidence-display'
import { GenerateDocumentButton } from '@/components/generate-document-button'

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
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
          <p className="text-gray-600">
            Phase: {project.phase || 'N/A'} • Indication: {project.indication || 'N/A'}
          </p>
        </div>
        {!hasExternalData && (
          <FetchExternalDataButton projectId={project.id} />
        )}
      </div>

      {/* Alert for no data */}
      {!hasExternalData && (
        <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Fetch External Data</h3>
              <p className="text-sm text-blue-700 mt-1">
                Retrieve evidence from ClinicalTrials.gov, PubMed, and openFDA to enrich your project with safety data and clinical context.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <p className="text-sm">{project.enrichment_status || 'pending'}</p>
          </CardContent>
        </Card>
      </div>

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
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{doc.type} - Version {doc.version}</p>
                      <p className="text-sm text-gray-600">
                        Created {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 mb-4">
                No documents yet. {hasExternalData ? 'Generate your first document.' : 'Fetch external data first, then generate documents.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
            <p className="text-sm text-gray-500 text-center py-8">
              No evidence yet. Click "Fetch External Data" above to retrieve evidence.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
