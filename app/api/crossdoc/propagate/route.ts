import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, sourceDocumentId, field, newValue, targetDocuments } = body

    if (!projectId || !sourceDocumentId || !field || !newValue || !targetDocuments) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const updatedDocs: string[] = []
    const errors: string[] = []

    // Update each target document
    for (const target of targetDocuments) {
      try {
        // Get current document content
        const { data: doc, error: fetchError } = await supabase
          .from('documents')
          .select('id, type, content, version')
          .eq('id', target.id)
          .single()

        if (fetchError || !doc) {
          errors.push(`Document ${target.id} not found`)
          continue
        }

        // Parse content if it's JSON
        let content = doc.content
        if (typeof content === 'string') {
          try {
            content = JSON.parse(content)
          } catch {
            // Keep as string
          }
        }

        // Update the field in content
        // This is a simplified implementation - in production, you'd need
        // more sophisticated field mapping based on document type
        let updated = false
        
        if (typeof content === 'object' && content !== null) {
          // Try to find and update the field
          const fieldKey = target.field.toLowerCase().replace(/\s+/g, '_')
          
          // Check common field locations
          if (content[fieldKey] !== undefined) {
            content[fieldKey] = newValue
            updated = true
          } else if (content.sections && content.sections[fieldKey]) {
            content.sections[fieldKey] = newValue
            updated = true
          } else {
            // Search in all sections
            for (const key of Object.keys(content)) {
              if (typeof content[key] === 'string' && content[key].includes(target.currentValue)) {
                content[key] = content[key].replace(target.currentValue, newValue)
                updated = true
              }
            }
          }
        } else if (typeof content === 'string') {
          // Simple string replacement
          if (content.includes(target.currentValue)) {
            content = content.replace(new RegExp(target.currentValue, 'g'), newValue)
            updated = true
          }
        }

        if (updated) {
          // Save updated content
          const newVersion = (doc.version || 1) + 1
          
          // Create new version
          await supabase
            .from('document_versions')
            .insert({
              document_id: target.id,
              version_number: newVersion,
              content: typeof content === 'object' ? JSON.stringify(content) : content,
              is_current: true,
              created_by: user.id,
              change_summary: `Propagated change from ${sourceDocumentId}: ${field}`,
            })

          // Mark old version as not current
          await supabase
            .from('document_versions')
            .update({ is_current: false })
            .eq('document_id', target.id)
            .neq('version_number', newVersion)

          // Update document
          await supabase
            .from('documents')
            .update({
              version: newVersion,
              status: 'review',
              updated_at: new Date().toISOString(),
            })
            .eq('id', target.id)

          // Log to audit
          await supabase
            .from('audit_log')
            .insert({
              project_id: projectId,
              document_id: target.id,
              action: 'content_propagated',
              entity_type: 'document',
              entity_id: target.id,
              user_id: user.id,
              details: {
                source_document_id: sourceDocumentId,
                field,
                old_value: target.currentValue,
                new_value: newValue,
                version: newVersion,
              },
            })

          updatedDocs.push(target.id)
        } else {
          errors.push(`Could not find field "${field}" in document ${target.type}`)
        }
      } catch (error) {
        console.error(`Error updating document ${target.id}:`, error)
        errors.push(`Failed to update ${target.type}: ${error}`)
      }
    }

    return NextResponse.json({
      success: updatedDocs.length > 0,
      updatedCount: updatedDocs.length,
      updatedDocuments: updatedDocs,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error) {
    console.error('Propagate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
