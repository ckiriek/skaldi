/**
 * Phase H.6: Knowledge Indications API
 * 
 * POST /api/knowledge/indications
 * Get indications for a given INN
 */

import { NextRequest, NextResponse } from 'next/server'
import { buildKnowledgeGraph } from '@/lib/engine/knowledge'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inn, indicationHint } = body
    
    if (!inn || typeof inn !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_INN', message: 'INN is required and must be a string' } },
        { status: 400 }
      )
    }
    
    console.log(`🔍 Fetching indications for: ${inn}`)
    
    // Build Knowledge Graph (or fetch from cache)
    const snapshot = await buildKnowledgeGraph(inn)
    
    // Filter indications by hint if provided
    let indications = snapshot.indications
    
    if (indicationHint) {
      const hint = indicationHint.toLowerCase()
      indications = indications.filter(ind => 
        ind.indication.toLowerCase().includes(hint)
      )
    }
    
    // Sort by confidence
    indications.sort((a, b) => b.confidence - a.confidence)
    
    return NextResponse.json({
      success: true,
      data: {
        inn,
        indications,
        count: indications.length,
        sources: snapshot.sourcesUsed
      }
    })
    
  } catch (error) {
    console.error('Indications fetch error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch indications',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    )
  }
}
