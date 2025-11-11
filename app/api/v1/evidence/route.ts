/**
 * Evidence API Route
 * 
 * Endpoints for managing evidence sources and links.
 * 
 * POST /api/v1/evidence - Create evidence source
 * GET /api/v1/evidence - List/search evidence
 * 
 * @module app/api/v1/evidence/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, validateRequiredFields } from '@/lib/middleware/error-handler'
import type { CreateEvidenceSourceInput, SearchEvidenceParams } from '@/lib/types/evidence'

/**
 * POST /api/v1/evidence
 * 
 * Create a new evidence source
 * 
 * Request body:
 * {
 *   project_id: string
 *   source_type: SourceType
 *   source_url?: string
 *   source_id?: string
 *   title?: string
 *   snippet?: string
 *   ...
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: EvidenceSource
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json() as CreateEvidenceSourceInput

    // Validate required fields
    validateRequiredFields(
      body,
      ['project_id', 'source_type'],
      'EvidenceLocker',
      'create_evidence'
    )

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    // Call database function to add evidence
    const { data, error } = await supabase
      .rpc('add_evidence_source', {
        p_project_id: body.project_id,
        p_source_type: body.source_type,
        p_source_url: body.source_url || null,
        p_title: body.title || null,
        p_snippet: body.snippet || null,
        p_created_by: user.id,
        p_source_id: body.source_id || null,
        p_document_id: body.document_id || null,
        p_metadata: body.metadata || null,
      })
      .single()

    if (error || !data) {
      throw error || new Error('Failed to create evidence source')
    }

    // Update additional fields if provided
    if (body.author || body.publication_date || body.confidence_level || body.data_quality || body.tags || body.category) {
      const { data: updated, error: updateError } = await supabase
        .from('evidence_sources_v2')
        .update({
          author: body.author,
          publication_date: body.publication_date,
          confidence_level: body.confidence_level,
          data_quality: body.data_quality,
          tags: body.tags,
          category: body.category,
          full_content: body.full_content,
        })
        .eq('id', (data as any).id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        data: updated,
      })
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    return handleApiError(error, 'EvidenceLocker', 'create_evidence')
  }
}

/**
 * GET /api/v1/evidence
 * 
 * List or search evidence sources
 * 
 * Query parameters:
 * - project_id: string (required)
 * - search_query?: string
 * - source_type?: SourceType
 * - category?: EvidenceCategory
 * - verified_only?: boolean
 * - limit?: number
 * - offset?: number
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     evidence: EvidenceSource[],
 *     total: number,
 *     has_more: boolean
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    const params: SearchEvidenceParams = {
      project_id: searchParams.get('project_id') || '',
      search_query: searchParams.get('search_query') || undefined,
      source_type: searchParams.get('source_type') as any,
      category: searchParams.get('category') as any,
      verified_only: searchParams.get('verified_only') === 'true',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    }

    // Validate required parameters
    validateRequiredFields(
      params,
      ['project_id'],
      'EvidenceLocker',
      'list_evidence'
    )

    // Build query
    let query = supabase
      .from('evidence_sources_v2')
      .select('*', { count: 'exact' })
      .eq('project_id', params.project_id)

    // Apply filters
    if (params.source_type) {
      query = query.eq('source_type', params.source_type)
    }

    if (params.category) {
      query = query.eq('category', params.category)
    }

    if (params.verified_only) {
      query = query.eq('verified', true)
    }

    // Apply search if provided
    if (params.search_query) {
      // Use full-text search
      query = query.textSearch('title,snippet', params.search_query, {
        type: 'websearch',
        config: 'english',
      })
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(params.offset!, params.offset! + params.limit! - 1)

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        evidence: data || [],
        total: count || 0,
        has_more: (count || 0) > (params.offset! + params.limit!),
      },
    })
  } catch (error) {
    return handleApiError(error, 'EvidenceLocker', 'list_evidence')
  }
}
