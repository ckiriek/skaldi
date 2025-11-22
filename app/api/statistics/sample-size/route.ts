import { NextRequest, NextResponse } from 'next/server'
import {
  calculateSampleSize,
  validateSampleSizeParameters,
  type SampleSizeParameters,
} from '@/lib/engine/statistics'

export async function POST(request: NextRequest) {
  try {
    const params: SampleSizeParameters = await request.json()

    // Validate parameters
    const validation = validateSampleSizeParameters(params)
    
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid parameters',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      )
    }

    // Calculate sample size
    const result = calculateSampleSize(params)

    return NextResponse.json({
      success: true,
      result,
      warnings: validation.warnings,
    })
  } catch (error) {
    console.error('Sample size calculation error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
