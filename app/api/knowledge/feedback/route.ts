/**
 * Phase H.UI v2: Feedback API
 * 
 * POST /api/knowledge/feedback
 * Records user feedback signals
 */

import { NextRequest, NextResponse } from 'next/server'
import { recordFeedback, type FeedbackSignal } from '@/lib/engine/knowledge-ui/feedback/feedback_collector'
import { recordSelection, recordRejection, addToRecent } from '@/lib/engine/knowledge-ui/memory/memory_store'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId = 'anonymous',
      sessionId = 'default',
      field,
      candidateId,
      candidateText,
      signal,
      rank,
      score
    } = body
    
    if (!field || !candidateId || !candidateText || !signal) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Missing required fields' } },
        { status: 400 }
      )
    }
    
    // Record feedback
    recordFeedback({
      userId,
      sessionId,
      field,
      candidateId,
      candidateText,
      signal: signal as FeedbackSignal,
      rank: rank || 0,
      score: score || 0
    })
    
    // Update memory based on signal
    if (signal === 'accept') {
      recordSelection(sessionId, field, candidateText)
      
      // Add to user's recent list
      if (userId !== 'anonymous') {
        const fieldType = field === 'indication' ? 'indications' 
          : field === 'endpoint' ? 'endpoints'
          : field === 'formulation' ? 'formulations'
          : null
        
        if (fieldType) {
          addToRecent(userId, fieldType as any, candidateText)
        }
      }
    } else if (signal === 'reject' || signal === 'delete') {
      recordRejection(sessionId, field, candidateText)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Feedback recorded'
    })
    
  } catch (error) {
    console.error('Feedback error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'FEEDBACK_FAILED',
          message: error instanceof Error ? error.message : 'Failed to record feedback'
        }
      },
      { status: 500 }
    )
  }
}
