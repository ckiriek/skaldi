/**
 * Search API Route
 * 
 * Unified search across compounds, indications, projects, and documents.
 * 
 * GET /api/v1/search - Search with autocomplete
 * 
 * @module app/api/v1/search/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, validateRequiredFields } from '@/lib/middleware/error-handler'

/**
 * GET /api/v1/search
 * 
 * Search with autocomplete support
 * 
 * Query parameters:
 * - q: string (search query)
 * - type?: 'compound' | 'indication' | 'project' | 'document' | 'evidence' | 'all'
 * - limit?: number (default: 10)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     compounds?: Array,
 *     indications?: Array,
 *     projects?: Array,
 *     documents?: Array,
 *     evidence?: Array
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '10')

    validateRequiredFields(
      { q: query },
      ['q'],
      'SearchEngine',
      'search'
    )

    const results: any = {}

    // Search compounds
    if (type === 'compound' || type === 'all') {
      const { data: compounds } = await supabase
        .from('compounds')
        .select('inchikey, name, molecular_formula, molecular_weight')
        .or(`name.ilike.%${query}%,inchikey.ilike.%${query}%`)
        .limit(limit)

      results.compounds = compounds || []
    }

    // Search indications (from projects)
    if (type === 'indication' || type === 'all') {
      const { data: projects } = await supabase
        .from('projects')
        .select('indication')
        .ilike('indication', `%${query}%`)
        .limit(limit)

      // Get unique indications
      const indications = [...new Set(projects?.map(p => p.indication).filter(Boolean))]
      results.indications = indications
    }

    // Search projects
    if (type === 'project' || type === 'all') {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title, phase, indication, product_type, created_at')
        .or(`title.ilike.%${query}%,indication.ilike.%${query}%`)
        .limit(limit)

      results.projects = projects || []
    }

    // Search documents
    if (type === 'document' || type === 'all') {
      const { data: documents } = await supabase
        .from('documents')
        .select('id, type, status, created_at, projects(title)')
        .limit(limit)

      results.documents = documents || []
    }

    // Search evidence
    if (type === 'evidence' || type === 'all') {
      const { data: evidence } = await supabase
        .from('evidence_sources_v2')
        .select('ev_id, title, source_type, snippet')
        .textSearch('title,snippet', query!, {
          type: 'websearch',
          config: 'english',
        })
        .limit(limit)

      results.evidence = evidence || []
    }

    return NextResponse.json({
      success: true,
      data: results,
      query,
      total: Object.values(results).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0),
    })
  } catch (error) {
    return handleApiError(error, 'SearchEngine', 'search')
  }
}
