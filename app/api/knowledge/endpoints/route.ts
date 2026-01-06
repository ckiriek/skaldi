/**
 * Phase H.6: Knowledge Endpoints API
 * 
 * POST /api/knowledge/endpoints
 * Get clinical endpoints for a given INN or indication
 */

import { NextRequest, NextResponse } from 'next/server'
import { buildKnowledgeGraph } from '@/lib/engine/knowledge'

export const runtime = 'nodejs'
export const maxDuration = 60 // Knowledge Graph can take time with external APIs

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inn, indication } = body
    
    if (!inn && !indication) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Either INN or indication is required' } },
        { status: 400 }
      )
    }
    
    console.log(`🎯 Fetching endpoints for: ${inn || indication}`)
    
    // If INN provided, build Knowledge Graph
    let endpoints: any[] = []
    let sources: string[] = []
    
    if (inn) {
      const snapshot = await buildKnowledgeGraph(inn)
      endpoints = snapshot.endpoints
      sources = snapshot.sourcesUsed
      
      // Filter by indication if provided
      if (indication) {
        const indicationLower = indication.toLowerCase()
        endpoints = endpoints.filter(ep => 
          ep.indication?.toLowerCase().includes(indicationLower)
        )
      }
    }
    
    // Sort by confidence
    endpoints.sort((a, b) => b.confidence - a.confidence)
    
    return NextResponse.json({
      success: true,
      data: {
        inn,
        indication,
        endpoints,
        count: endpoints.length,
        sources
      }
    })
    
  } catch (error) {
    console.error('Endpoints fetch error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch endpoints',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    )
  }
}
