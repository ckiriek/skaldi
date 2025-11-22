import { NextRequest, NextResponse } from 'next/server'
import { generateCompleteSAP, type Endpoint, type SampleSizeResult } from '@/lib/engine/statistics'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { studyTitle, endpoints, sampleSize } = body as {
      studyTitle: string
      endpoints: Endpoint[]
      sampleSize: SampleSizeResult
    }

    const sap = generateCompleteSAP({
      studyTitle,
      endpoints,
      sampleSize,
    })

    return NextResponse.json({
      success: true,
      sap,
    })
  } catch (error) {
    console.error('SAP generation error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
