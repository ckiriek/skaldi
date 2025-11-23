/**
 * Phase H.UI v3: Protocol Suggestions API
 * 
 * POST /api/protocol/suggest
 * Generates suggestions for protocol sections
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateSuggestions, type SuggestionContext } from '@/lib/engine/protocol-ui/suggestion_engine'
import { generateRegHints } from '@/lib/engine/protocol-ui/reg_hint_engine'
import type { ProtocolSectionId } from '@/lib/engine/protocol-ui/section_schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, sectionId, currentText, projectData } = body
    
    if (!projectId || !sectionId) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'projectId and sectionId are required' } },
        { status: 400 }
      )
    }
    
    console.log(`💡 Generating suggestions for ${sectionId}`)
    
    // Build context
    const context: SuggestionContext = {
      projectId,
      sectionId: sectionId as ProtocolSectionId,
      currentText: currentText || '',
      projectData: projectData || {}
    }
    
    // Generate suggestions
    const suggestions = await generateSuggestions(context)
    
    // Generate regulatory hints
    const regHints = generateRegHints(
      sectionId as ProtocolSectionId,
      currentText || '',
      projectData
    )
    
    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        regHints,
        count: suggestions.length
      }
    })
    
  } catch (error) {
    console.error('Suggestion generation error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'SUGGESTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate suggestions'
        }
      },
      { status: 500 }
    )
  }
}
