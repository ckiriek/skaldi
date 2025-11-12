import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FlaskConical, MapPin, Database, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FetchExternalDataButton } from '@/components/fetch-external-data-button'

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
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/projects" className="hover:opacity-70 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <FlaskConical className="h-4 w-4" />
              Phase: {project.phase || 'N/A'}
            </span>
            <span>•</span>
            <span>Indication: {project.indication || 'N/A'}</span>
            <span>•</span>
            <Badge variant="outline">{project.product_type}</Badge>
          </div>
        </div>
        <Badge 
          variant={
            project.enrichment_status === 'completed' ? 'success' :
            project.enrichment_status === 'in_progress' ? 'info' :
            project.enrichment_status === 'failed' ? 'destructive' :
            'secondary'
          }
        >
          {project.enrichment_status || 'pending'}
        </Badge>
      </div>

      {/* Fetch Data Alert */}
      {!hasExternalData && (
        <Alert>
          <Database className="h-5 w-5" />
          <AlertTitle>📊 Fetch External Data</AlertTitle>
          <AlertDescription>
            Retrieve evidence from ClinicalTrials.gov, PubMed, and openFDA to enrich your project with safety data and clinical context.
          </AlertDescription>
          <div className="mt-4">
            <FetchExternalDataButton projectId={project.id} />
          </div>
        </Alert>
      )}

      {/* Project Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compound</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{project.compound_name || 'N/A'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">RLD Brand</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{project.rld_brand_name || 'N/A'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {project.countries && project.countries.length > 0 
                ? project.countries.join(', ') 
                : 'No countries specified'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <CardDescription>Generated regulatory documents</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="block p-4 border rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{doc.type} - Version {doc.version}</p>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={doc.status === 'approved' ? 'success' : 'secondary'}>
                      {doc.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No documents yet. Fetch external data first, then generate documents.
            </p>
          )}
        </CardContent>
      </Card>

      {/* External Evidence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            External Evidence
          </CardTitle>
          <CardDescription>
            Data from ClinicalTrials.gov, PubMed, and openFDA
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evidenceSources && evidenceSources.length > 0 ? (
            <div>
              <p className="text-sm font-medium mb-4">
                {evidenceSources.length} evidence sources retrieved
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-gray-500">Clinical Trials</p>
                  <p className="text-2xl font-bold">
                    {evidenceSources.filter(e => e.source === 'ClinicalTrials.gov').length}
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-gray-500">Publications</p>
                  <p className="text-2xl font-bold">
                    {evidenceSources.filter(e => e.source === 'PubMed').length}
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-gray-500">Safety Reports</p>
                  <p className="text-2xl font-bold">
                    {evidenceSources.filter(e => e.source === 'openFDA').length}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No evidence yet. Click "Fetch External Data" above to retrieve evidence.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
