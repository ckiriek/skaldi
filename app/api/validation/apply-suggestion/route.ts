/**
 * Apply Suggestion API
 * 
 * POST /api/validation/apply-suggestion
 * Applies an AI-generated suggestion to a document block
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentStore } from '@/engine/document_store'
import { AuditLogger } from '@/engine/audit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      document_id, 
      suggestion_id,
      block_id,
      suggested_text 
    } = body

    if (!document_id || !suggestion_id || !block_id || !suggested_text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createClient()

    // Update block
    const store = new DocumentStore(supabase)
    const result = await store.updateBlock({
      document_id,
      block_id,
      new_text: suggested_text
    })

    // Log to audit
    const audit = new AuditLogger(supabase)
    await audit.logSuggestionApplied(
      document_id,
      suggestion_id,
      block_id
    )

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error) {
    console.error('Apply suggestion error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to apply suggestion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
