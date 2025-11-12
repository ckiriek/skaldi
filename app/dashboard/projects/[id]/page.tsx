import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function ProjectPageMinimal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch project
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !project) {
    return <div className="p-8">Project not found. Error: {JSON.stringify(error)}</div>
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

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
        <div className="flex gap-3 text-sm text-gray-600">
          <span>Phase: {project.phase || 'N/A'}</span>
          <span>•</span>
          <span>Indication: {project.indication || 'N/A'}</span>
          <span>•</span>
          <span>Product Type: {project.product_type}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Compound</h3>
          <p className="text-sm text-gray-600">{project.compound_name || 'N/A'}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">RLD Brand</h3>
          <p className="text-sm text-gray-600">{project.rld_brand_name || 'N/A'}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Status</h3>
          <p className="text-sm text-gray-600">{project.enrichment_status || 'pending'}</p>
        </div>
      </div>

      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Countries</h3>
        <p className="text-sm text-gray-600">
          {project.countries && project.countries.length > 0 
            ? project.countries.join(', ') 
            : 'No countries specified'}
        </p>
      </div>

      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Documents</h3>
        <p className="text-sm text-gray-600">
          {documents && documents.length > 0 
            ? `${documents.length} documents generated` 
            : 'No documents yet'}
        </p>
      </div>

      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">External Evidence</h3>
        <p className="text-sm text-gray-600">
          {evidenceSources && evidenceSources.length > 0 
            ? `${evidenceSources.length} evidence sources` 
            : 'No evidence yet'}
        </p>
      </div>
    </div>
  )
}
