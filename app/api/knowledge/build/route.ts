/**
 * Phase H.6: Knowledge Graph API
 * 
 * POST /api/knowledge/build
 * Build Knowledge Graph for a given INN
 */

import { NextRequest, NextResponse } from 'next/server'
import { buildKnowledgeGraph } from '@/lib/engine/knowledge/graph'

export const runtime = 'nodejs'
export const maxDuration = 60 // Knowledge Graph can take time with external APIs

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { inn, forceRebuild = false } = body
    
    if (!inn || typeof inn !== 'string') {
      console.warn('⚠️ Invalid INN provided:', inn)
      
      return NextResponse.json(
        { error: { code: 'INVALID_INN', message: 'INN is required and must be a string' } },
        { status: 400 }
      )
    }
    
    console.log(`🧠 Building Knowledge Graph for ${inn}...`)
    
    // Build Knowledge Graph
    const snapshot = await buildKnowledgeGraph(inn)
    
    // Return snapshot with enhanced metadata
    return NextResponse.json({
      success: true,
      data: snapshot,
      meta: {
        inn,
        sourcesCount: snapshot.sourcesUsed.length,
        formulationsCount: snapshot.formulations.length,
        indicationsCount: snapshot.indications.length,
        endpointsCount: snapshot.endpoints.length,
        proceduresCount: snapshot.procedures.length,
        eligibilityPatternsCount: snapshot.eligibilityPatterns.length,
        // Add confidence scores
        avgIndicationConfidence: snapshot.indications.length > 0
          ? snapshot.indications.reduce((sum: number, i: any) => sum + i.confidence, 0) / snapshot.indications.length
          : 0,
        avgEndpointConfidence: snapshot.endpoints.length > 0
          ? snapshot.endpoints.reduce((sum: number, e: any) => sum + e.confidence, 0) / snapshot.endpoints.length
          : 0,
      }
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    
    console.error('❌ Knowledge Graph build failed:', error)
    console.error(`   Duration: ${duration}ms`)
    
    return NextResponse.json(
      {
        error: {
          code: 'BUILD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to build Knowledge Graph',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    )
  }
}
