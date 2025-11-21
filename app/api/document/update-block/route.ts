/**
 * Update Block API
 * 
 * POST /api/document/update-block
 * Updates a specific block in a structured document
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentStore } from '@/engine/document_store'
import type { BlockUpdate } from '@/engine/document_store/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as BlockUpdate

    // Validate input
    if (!body.document_id || !body.block_id || !body.new_text) {
      return NextResponse.json(
        { error: 'Missing required fields: document_id, block_id, new_text' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createClient()

    // Create document store
    const store = new DocumentStore(supabase)

    // Update block
    const result = await store.updateBlock(body)

    // Log to audit
    await supabase.from('audit_log').insert({
      document_id: body.document_id,
      action: 'BLOCK_UPDATED',
      diff_json: {
        block_id: body.block_id,
        new_text: body.new_text
      },
      created_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error) {
    console.error('Update block error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update block',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
