/**
 * Validation History API
 * GET /api/validation/history?documentId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { getValidationHistory } from '@/lib/integration/run_post_generation_checks'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'documentId is required' },
        { status: 400 }
      )
    }

    const history = await getValidationHistory(documentId)

    return NextResponse.json({
      success: true,
      studyflow: history.studyflow,
      crossdoc: history.crossdoc,
    })
  } catch (error) {
    console.error('[ValidationHistory] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch validation history',
      },
      { status: 500 }
    )
  }
}
