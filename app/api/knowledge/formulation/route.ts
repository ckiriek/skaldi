/**
 * Phase H.6: Knowledge Formulation API
 * 
 * POST /api/knowledge/formulation
 * Get formulation data for a given INN
 */

import { NextRequest, NextResponse } from 'next/server'
import { buildKnowledgeGraph } from '@/lib/engine/knowledge'
import { normalizeFormulation } from '@/lib/engine/formulation'

export const runtime = 'nodejs'
export const maxDuration = 60 // Knowledge Graph can take time with external APIs

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inn, rawInput } = body
    
    if (!inn || typeof inn !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_INN', message: 'INN is required and must be a string' } },
        { status: 400 }
      )
    }
    
    console.log(`💊 Fetching formulation for: ${inn}`)
    
    // Normalize formulation using Phase H.1
    const normalized = rawInput ? normalizeFormulation(rawInput) : normalizeFormulation(inn)
    
    // Build Knowledge Graph for additional data
    const snapshot = await buildKnowledgeGraph(inn)
    
    // Get best formulation from Knowledge Graph
    const kgFormulation = snapshot.formulations.length > 0 
      ? snapshot.formulations[0] // Highest confidence
      : null
    
    return NextResponse.json({
      success: true,
      data: {
        inn,
        normalizedFormulation: {
          inn: normalized.apiName,
          dosageForm: normalized.dosageForm,
          route: normalized.route,
          strength: normalized.strength?.normalized
        },
        kgFormulation,
        confidence: normalized.confidence.overall,
        sources: snapshot.sourcesUsed
      }
    })
    
  } catch (error) {
    console.error('Formulation fetch error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch formulation',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    )
  }
}
