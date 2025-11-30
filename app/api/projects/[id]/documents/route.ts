import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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

    // Fetch all documents for this project, ordered by type and version
    const { data: allDocuments, error } = await supabase
      .from('documents')
      .select(`
        id,
        type,
        status,
        version,
        validation_status,
        validation_summary,
        last_validated_at,
        created_at,
        updated_at
      `)
      .eq('project_id', id)
      .order('type', { ascending: true })
      .order('version', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    // Get only the latest version of each document type
    const latestByType = new Map<string, any>()
    for (const doc of allDocuments || []) {
      if (!latestByType.has(doc.type)) {
        latestByType.set(doc.type, doc)
      }
    }
    const documents = Array.from(latestByType.values())

    // Get latest cross-doc validation results
    const { data: crossdocResults } = await supabase
      .from('crossdoc_validations')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      documents: documents || [],
      crossdocValidation: crossdocResults || null,
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
