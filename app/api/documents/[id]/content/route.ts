import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Get current document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, version, project_id')
      .eq('id', id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get current version
    const { data: currentVersion } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', id)
      .eq('is_current', true)
      .single()

    // Create new version
    const newVersionNumber = (document.version || 1) + 1

    // Mark old version as not current
    if (currentVersion) {
      await supabase
        .from('document_versions')
        .update({ is_current: false })
        .eq('id', currentVersion.id)
    }

    // Insert new version
    const { data: newVersion, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: id,
        version_number: newVersionNumber,
        content: content,
        is_current: true,
        created_by: user.id,
        change_summary: 'Manual edit via inline editor'
      })
      .select()
      .single()

    if (versionError) {
      console.error('Failed to create version:', versionError)
      return NextResponse.json(
        { error: 'Failed to save document version' },
        { status: 500 }
      )
    }

    // Update document version number and status
    await supabase
      .from('documents')
      .update({ 
        version: newVersionNumber,
        status: 'review', // Mark as needing review after edit
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    // Log to audit
    await supabase
      .from('audit_log')
      .insert({
        project_id: document.project_id,
        action: 'document_edited',
        entity_type: 'document',
        entity_id: id,
        user_id: user.id,
        details: {
          version: newVersionNumber,
          content_length: content.length,
          editor: 'inline'
        }
      })

    return NextResponse.json({
      success: true,
      version: newVersionNumber,
      versionId: newVersion.id
    })

  } catch (error) {
    console.error('Error saving document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
