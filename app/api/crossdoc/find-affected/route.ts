import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Field mappings between document types
const FIELD_MAPPINGS: Record<string, Record<string, string[]>> = {
  // Protocol fields that affect other documents
  'Protocol': {
    'primary_endpoint': ['SAP', 'CSR', 'ICF'],
    'secondary_endpoints': ['SAP', 'CSR'],
    'inclusion_criteria': ['ICF'],
    'exclusion_criteria': ['ICF'],
    'study_duration': ['ICF', 'SAP'],
    'visit_schedule': ['ICF', 'SAP'],
    'treatment_arms': ['SAP', 'CSR', 'ICF'],
    'sample_size': ['SAP'],
    'objectives': ['IB', 'SAP', 'CSR'],
  },
  // IB fields that affect Protocol
  'IB': {
    'mechanism_of_action': ['Protocol'],
    'dosing_information': ['Protocol', 'ICF'],
    'safety_profile': ['Protocol', 'ICF'],
    'contraindications': ['Protocol', 'ICF'],
  },
  // SAP fields
  'SAP': {
    'analysis_populations': ['CSR'],
    'statistical_methods': ['CSR'],
  },
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, sourceDocumentId, field, newValue } = body

    if (!projectId || !sourceDocumentId || !field) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get source document type
    const { data: sourceDoc, error: sourceError } = await supabase
      .from('documents')
      .select('type')
      .eq('id', sourceDocumentId)
      .single()

    if (sourceError || !sourceDoc) {
      return NextResponse.json({ error: 'Source document not found' }, { status: 404 })
    }

    const sourceType = sourceDoc.type
    const fieldKey = field.toLowerCase().replace(/\s+/g, '_')
    
    // Find which document types might be affected
    const affectedTypes = FIELD_MAPPINGS[sourceType]?.[fieldKey] || []
    
    if (affectedTypes.length === 0) {
      return NextResponse.json({
        success: true,
        affectedDocuments: [],
        message: 'No related documents found for this field',
      })
    }

    // Get all documents of affected types for this project
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, type, content')
      .eq('project_id', projectId)
      .in('type', affectedTypes)

    if (docsError) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    const affectedDocuments: any[] = []

    // Check each document for the field
    for (const doc of documents || []) {
      let content = doc.content
      
      // Parse JSON content
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content)
        } catch {
          // Keep as string
        }
      }

      // Try to find the related field in this document
      let currentValue: string | null = null
      let relatedField = fieldKey

      // Map field names between document types
      const fieldMap: Record<string, Record<string, string>> = {
        'SAP': {
          'primary_endpoint': 'primary_analysis_endpoint',
          'secondary_endpoints': 'secondary_analysis_endpoints',
        },
        'CSR': {
          'primary_endpoint': 'primary_efficacy_endpoint',
          'secondary_endpoints': 'secondary_efficacy_endpoints',
        },
        'ICF': {
          'primary_endpoint': 'study_purpose',
          'inclusion_criteria': 'eligibility_requirements',
          'exclusion_criteria': 'eligibility_requirements',
        },
      }

      relatedField = fieldMap[doc.type]?.[fieldKey] || fieldKey

      // Extract current value
      if (typeof content === 'object' && content !== null) {
        if (content[relatedField]) {
          currentValue = typeof content[relatedField] === 'string' 
            ? content[relatedField] 
            : JSON.stringify(content[relatedField])
        } else if (content.sections?.[relatedField]) {
          currentValue = content.sections[relatedField]
        } else {
          // Search in all sections for similar content
          for (const [key, value] of Object.entries(content)) {
            if (typeof value === 'string' && value.length > 0) {
              // Check if this section might contain related content
              if (key.toLowerCase().includes(fieldKey.split('_')[0])) {
                currentValue = value.substring(0, 200) + (value.length > 200 ? '...' : '')
                relatedField = key
                break
              }
            }
          }
        }
      } else if (typeof content === 'string') {
        // For string content, just indicate it exists
        currentValue = content.substring(0, 200) + (content.length > 200 ? '...' : '')
      }

      if (currentValue) {
        affectedDocuments.push({
          id: doc.id,
          type: doc.type,
          field: relatedField,
          currentValue,
          willUpdate: true,
        })
      }
    }

    return NextResponse.json({
      success: true,
      affectedDocuments,
      sourceType,
      field: fieldKey,
    })

  } catch (error) {
    console.error('Find affected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
