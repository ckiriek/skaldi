/**
 * Batch Document Generation API
 * 
 * POST /api/documents/batch-generate
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BatchGenerator } from '@/lib/services/batch-generator'
import type { BatchGenerationRequest } from '@/lib/services/batch-generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as BatchGenerationRequest

    // Validate input
    if (!body.project_id || !body.document_types || body.document_types.length === 0) {
      return NextResponse.json(
        { error: 'Missing project_id or document_types' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createClient()

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', body.project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Create batch generator
    const generator = new BatchGenerator(supabase)

    // Get recommended order
    const orderedTypes = generator.getRecommendedOrder(body.document_types)

    // Estimate duration
    const estimatedDuration = generator.estimateDuration(
      orderedTypes.length,
      body.options?.parallel,
      body.options?.max_concurrent
    )

    console.log(`📦 Starting batch generation:`)
    console.log(`   Project: ${body.project_id}`)
    console.log(`   Documents: ${orderedTypes.join(', ')}`)
    console.log(`   Mode: ${body.options?.parallel ? 'Parallel' : 'Sequential'}`)
    console.log(`   Estimated: ${Math.round(estimatedDuration / 1000)}s`)

    // Generate documents
    const result = await generator.generateBatch({
      ...body,
      document_types: orderedTypes
    })

    return NextResponse.json({
      success: true,
      result,
      estimated_duration_ms: estimatedDuration
    })

  } catch (error) {
    console.error('Batch generation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
