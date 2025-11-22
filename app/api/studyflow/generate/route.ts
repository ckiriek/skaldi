/**
 * Study Flow Generation API
 * POST /api/studyflow/generate
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StudyFlowEngine } from '@/lib/engine/studyflow'
import { normalizeVisits } from '@/lib/engine/studyflow/visit_model/visit_normalizer'
import { inferMissingVisits } from '@/lib/engine/studyflow/visit_model/visit_inference'
import { inferProceduresFromEndpoints } from '@/lib/engine/studyflow/procedures/procedure_inference'
import { buildTopMatrix } from '@/lib/engine/studyflow/top/top_builder'
import { createEndpointProcedureMaps } from '@/lib/engine/studyflow/alignment/endpoint_procedure_map'
import type { StudyFlow } from '@/lib/engine/studyflow/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Parse request body
    const body = await request.json()
    const { protocolId, endpoints, visitSchedule } = body

    // Validate required parameters
    if (!protocolId) {
      return NextResponse.json(
        { error: 'Protocol ID is required' },
        { status: 400 }
      )
    }

    // Fetch protocol data
    const { data: protocol, error: protocolError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', protocolId)
      .single()

    if (protocolError || !protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      )
    }

    // Step 1: Normalize visits
    const visitNames = visitSchedule || [
      'Screening',
      'Baseline',
      'Week 4',
      'Week 8',
      'Week 12',
      'End of Treatment',
      'Follow-up',
    ]

    const normalizedVisits = normalizeVisits(visitNames)
    
    // Step 2: Infer missing visits
    const visits = inferMissingVisits(
      normalizedVisits.map(nv => ({
        id: `visit_${nv.normalizedName.toLowerCase().replace(/\s+/g, '_')}`,
        name: nv.normalizedName,
        day: nv.day,
        type: nv.type,
        procedures: [],
        required: true,
      }))
    )

    // Step 3: Infer procedures from endpoints
    const endpointList = endpoints || []
    const procedures = inferProceduresFromEndpoints(endpointList)

    // Step 4: Create endpoint-procedure maps
    const endpointMaps = createEndpointProcedureMaps(endpointList)

    // Step 5: Assign procedures to visits based on endpoint timing
    visits.forEach(visit => {
      endpointMaps.forEach(map => {
        if (
          (visit.type === 'baseline' && map.timing.baseline) ||
          (visit.type === 'treatment' && map.timing.treatment) ||
          ((visit.type === 'follow_up' || visit.type === 'end_of_treatment') && map.timing.followUp)
        ) {
          map.requiredProcedures.forEach(procId => {
            if (!visit.procedures.includes(procId)) {
              visit.procedures.push(procId)
            }
          })
        }
      })
    })

    // Step 6: Build ToP matrix
    const topMatrix = buildTopMatrix(visits, procedures)

    // Step 7: Create study flow
    const studyFlow: StudyFlow = {
      id: `flow_${protocolId}`,
      studyId: protocol.project_id,
      protocolId,
      visits,
      procedures,
      topMatrix,
      totalDuration: Math.max(...visits.map(v => v.day)),
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
        source: 'generated',
      },
    }

    // Step 8: Save to database (optional)
    const { error: saveError } = await supabase
      .from('study_flows')
      .upsert({
        id: studyFlow.id,
        protocol_id: protocolId,
        study_id: protocol.project_id,
        visits: visits,
        procedures: procedures,
        top_matrix: topMatrix,
        total_duration: studyFlow.totalDuration,
        metadata: studyFlow.metadata,
        created_at: new Date().toISOString(),
      })

    if (saveError) {
      console.error('Failed to save study flow:', saveError)
      // Continue anyway - return the generated flow
    }

    return NextResponse.json({
      success: true,
      studyFlow,
      summary: {
        totalVisits: visits.length,
        totalProcedures: procedures.length,
        totalDuration: studyFlow.totalDuration,
        endpointsCovered: endpointMaps.length,
      },
    })
  } catch (error) {
    console.error('Study flow generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate study flow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
