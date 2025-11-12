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

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{project.title}</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
        {JSON.stringify(project, null, 2)}
      </pre>
    </div>
  )
}
