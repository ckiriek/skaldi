/**
 * Document Validation API Endpoint
 * 
 * POST /api/documents/:id/validate - Run consistency validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ConsistencyValidator } from '@/lib/services/consistency-validator'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id

    // Create Supabase client
    const supabase = await createClient()

    // Check if document exists
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, type')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Run validation
    const validator = new ConsistencyValidator(supabase)
    const report = await validator.validate(documentId)

    // Store results
    await validator.storeReport(report)

    return NextResponse.json({
      success: true,
      report
    })

  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate document' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id

    // Create Supabase client
    const supabase = await createClient()

    // Fetch validation results
    const { data: checks, error } = await supabase
      .from('consistency_validations')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Calculate summary
    const passed = checks?.filter(c => c.status === 'pass').length || 0
    const failed = checks?.filter(c => c.status === 'fail').length || 0
    const warnings = checks?.filter(c => c.status === 'warning').length || 0

    return NextResponse.json({
      success: true,
      checks: checks || [],
      summary: {
        total: checks?.length || 0,
        passed,
        failed,
        warnings
      }
    })

  } catch (error) {
    console.error('Failed to fetch validations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch validations' },
      { status: 500 }
    )
  }
}
