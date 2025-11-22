import { NextRequest, NextResponse } from 'next/server'
import {
  mapEndpointToTest,
  mapMultipleEndpoints,
  validateEndpointConsistency,
  type Endpoint,
} from '@/lib/engine/statistics'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Single endpoint or multiple?
    if (Array.isArray(body)) {
      // Multiple endpoints
      const endpoints: Endpoint[] = body
      const mappings = mapMultipleEndpoints(endpoints)
      const consistency = validateEndpointConsistency(mappings)

      return NextResponse.json({
        success: true,
        mappings,
        consistency,
      })
    } else {
      // Single endpoint
      const endpoint: Endpoint = body
      const mapping = mapEndpointToTest(endpoint)

      return NextResponse.json({
        success: true,
        mapping,
      })
    }
  } catch (error) {
    console.error('Endpoint mapping error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
