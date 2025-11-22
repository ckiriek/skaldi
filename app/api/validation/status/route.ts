/**
 * Validation Status API
 * GET /api/validation/status?documentId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { getLatestValidationStatus } from '@/lib/integration/run_post_generation_checks'

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

    const status = await getLatestValidationStatus(documentId)

    return NextResponse.json({
      success: true,
      status,
    })
  } catch (error) {
    console.error('[ValidationStatus] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch validation status',
      },
      { status: 500 }
    )
  }
}
