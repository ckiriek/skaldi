import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/projects/[id]
 * Deletes a project and all associated data
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: projectId } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project exists and belongs to user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, created_by, title')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log(`🗑️ Deleting project: ${project.title} (${projectId})`)

    // Delete in order to respect foreign key constraints
    // 1. Delete document_versions
    const { error: versionsError } = await supabase
      .from('document_versions')
      .delete()
      .eq('document_id', supabase.from('documents').select('id').eq('project_id', projectId))

    // 2. Delete documents
    const { error: docsError } = await supabase
      .from('documents')
      .delete()
      .eq('project_id', projectId)

    if (docsError) {
      console.error('Error deleting documents:', docsError)
    }

    // 3. Delete evidence_sources
    const { error: evidenceError } = await supabase
      .from('evidence_sources')
      .delete()
      .eq('project_id', projectId)

    if (evidenceError) {
      console.error('Error deleting evidence_sources:', evidenceError)
    }

    // 4. Delete audit_log
    const { error: auditError } = await supabase
      .from('audit_log')
      .delete()
      .eq('project_id', projectId)

    if (auditError) {
      console.error('Error deleting audit_log:', auditError)
    }

    // 5. Delete validation_results (if exists)
    await supabase
      .from('validation_results')
      .delete()
      .eq('project_id', projectId)

    // 6. Delete project itself
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) {
      console.error('Error deleting project:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      )
    }

    console.log(`✅ Project deleted: ${project.title}`)

    return NextResponse.json({ 
      success: true, 
      message: `Project "${project.title}" deleted successfully` 
    })

  } catch (error: any) {
    console.error('Error in DELETE /api/projects/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
