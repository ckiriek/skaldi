import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

  // Fetch documents count
  const { count: documentsCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)

  // Fetch evidence count
  const { count: evidenceCount } = await supabase
    .from('evidence_sources')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
        <p className="text-gray-600">
          Phase: {project.phase || 'N/A'} • Indication: {project.indication || 'N/A'}
        </p>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{documentsCount || 0}</p>
            <p className="text-sm text-gray-600">Generated documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>External Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{evidenceCount || 0}</p>
            <p className="text-sm text-gray-600">Evidence sources</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
