/**
 * Writer API Route
 * 
 * Endpoint for AI-powered content generation and refinement.
 * 
 * POST /api/v1/write - Generate/refine content
 * 
 * @module app/api/v1/write/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writerAgent } from '@/lib/agents/writer'
import { handleApiError, validateRequiredFields } from '@/lib/middleware/error-handler'
import type { WriterRequest } from '@/lib/agents/writer'

/**
 * POST /api/v1/write
 * 
 * Generate or refine document content
 * 
 * Request body:
 * {
 *   document_id: string
 *   section_id?: string
 *   content?: string
 *   refinement_type?: 'enhance' | 'simplify' | 'expand' | 'regulatory' | 'technical'
 *   context?: {
 *     product_type?: string
 *     therapeutic_area?: string
 *     target_audience?: string
 *   }
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     refined_content: string,
 *     changes_made: string[],
 *     word_count_before: number,
 *     word_count_after: number,
 *     duration_ms: number
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate required fields
    validateRequiredFields(
      body,
      ['document_id'],
      'WriterAgent',
      'write'
    )

    const { document_id, section_id, content, refinement_type = 'enhance', context } = body

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, projects(*)')
      .eq('id', document_id)
      .single()

    if (docError || !document) {
      throw new Error('Document not found')
    }

    // If content not provided, get from document
    let contentToRefine = content
    if (!contentToRefine) {
      // Get latest version content
      const { data: version } = await supabase
        .from('document_versions')
        .select('content')
        .eq('document_id', document_id)
        .eq('is_current', true)
        .single()

      contentToRefine = version?.content || document.content || ''
    }

    // Prepare writer request
    const writerRequest: WriterRequest = {
      content: contentToRefine,
      section_id: section_id || 'full_document',
      document_type: document.type,
      refinement_type,
      context: context || {
        product_type: document.projects?.product_type,
        therapeutic_area: document.projects?.indication,
      },
    }

    // Call writer agent
    const result = await writerAgent.refine(writerRequest)

    if (!result.success) {
      throw new Error('Writer agent failed')
    }

    // Create new version with refined content
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { error: versionError } = await supabase
        .rpc('create_document_version', {
          p_document_id: document_id,
          p_content: result.refined_content,
          p_created_by: user.id,
          p_generation_params: {
            refinement_type,
            changes_made: result.changes_made,
            word_count_before: result.word_count_before,
            word_count_after: result.word_count_after,
          },
          p_model_used: result.model_used || 'writer-agent',
        })

      if (versionError) {
        console.error('Failed to create version:', versionError)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        refined_content: result.refined_content,
        changes_made: result.changes_made,
        word_count_before: result.word_count_before,
        word_count_after: result.word_count_after,
        duration_ms: result.duration_ms,
        model_used: result.model_used,
      },
    })
  } catch (error) {
    return handleApiError(error, 'WriterAgent', 'write')
  }
}
