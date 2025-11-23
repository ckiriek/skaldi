/**
 * Phase H.UI v2: Ranking API
 * 
 * POST /api/knowledge/rank
 * Ranks candidates using ML scoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { buildKnowledgeGraph } from '@/lib/engine/knowledge'
import { rankCandidates, type Candidate } from '@/lib/engine/knowledge-ui/ranking/ml_ranker'
import { getUserMemory, getSessionMemory } from '@/lib/engine/knowledge-ui/memory/memory_store'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, type, userContext, userId, sessionId } = body
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_QUERY', message: 'Query is required' } },
        { status: 400 }
      )
    }
    
    console.log(`🎯 Ranking ${type} for query: ${query}`)
    
    // Get candidates from Knowledge Graph
    let candidates: Candidate[] = []
    
    if (type === 'indication') {
      const snapshot = await buildKnowledgeGraph(userContext?.compound || query)
      candidates = snapshot.indications.map(ind => ({
        id: ind.id,
        text: ind.indication,
        type: 'indication',
        confidence: ind.confidence,
        sources: ind.sources,
        metadata: { icd10Code: ind.icd10Code }
      }))
    } else if (type === 'endpoint') {
      const snapshot = await buildKnowledgeGraph(userContext?.compound || query)
      candidates = snapshot.endpoints.map(ep => ({
        id: ep.id,
        text: ep.normalized.cleanedTitle,
        type: 'endpoint',
        confidence: ep.confidence,
        sources: ep.sources,
        metadata: { 
          endpointType: ep.normalized.type,
          timepoint: ep.normalized.timepoint
        }
      }))
    } else if (type === 'formulation') {
      const snapshot = await buildKnowledgeGraph(query)
      candidates = snapshot.formulations.map(form => ({
        id: form.id,
        text: `${form.dosageForms.join(', ')} (${form.routes.join(', ')})`,
        type: 'formulation',
        confidence: form.confidence,
        sources: form.sources,
        metadata: {
          routes: form.routes,
          dosageForms: form.dosageForms,
          strengths: form.strengths
        }
      }))
    }
    
    // Get memory context
    let memoryContext = userContext || {}
    if (userId) {
      const userMemory = getUserMemory(userId)
      memoryContext = {
        ...memoryContext,
        recentSelections: userMemory[`recent${type.charAt(0).toUpperCase() + type.slice(1)}s` as keyof typeof userMemory]
      }
    }
    
    // Rank candidates
    const ranked = rankCandidates(
      candidates,
      query,
      memoryContext
    )
    
    return NextResponse.json({
      success: true,
      data: {
        query,
        type,
        ranked: ranked.slice(0, 10), // Top 10
        total: ranked.length
      }
    })
    
  } catch (error) {
    console.error('Ranking error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'RANKING_FAILED',
          message: error instanceof Error ? error.message : 'Failed to rank candidates'
        }
      },
      { status: 500 }
    )
  }
}
