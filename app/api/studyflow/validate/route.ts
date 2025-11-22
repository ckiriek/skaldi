/**
 * Study Flow Validation API
 * POST /api/studyflow/validate
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { allStudyFlowRules } from '@/lib/engine/studyflow/validation'
import { checkAllVisitEndpointAlignments } from '@/lib/engine/studyflow/alignment/visit_endpoint_alignment'
import { createEndpointProcedureMaps } from '@/lib/engine/studyflow/alignment/endpoint_procedure_map'
import type { FlowIssue, FlowValidationResult, StudyFlow } from '@/lib/engine/studyflow/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Parse request body
    const body = await request.json()
    const { studyFlowId, protocolId, sapId, icfId } = body

    // Validate required parameters
    if (!studyFlowId && !protocolId) {
      return NextResponse.json(
        { error: 'Study flow ID or Protocol ID is required' },
        { status: 400 }
      )
    }

    // Fetch study flow
    let studyFlow: StudyFlow | null = null

    if (studyFlowId) {
      const { data, error } = await supabase
        .from('study_flows')
        .select('*')
        .eq('id', studyFlowId)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: 'Study flow not found' },
          { status: 404 }
        )
      }

      studyFlow = {
        id: data.id,
        studyId: data.study_id,
        protocolId: data.protocol_id,
        visits: data.visits,
        procedures: data.procedures,
        topMatrix: data.top_matrix,
        totalDuration: data.total_duration,
        metadata: data.metadata,
      }
    }

    if (!studyFlow) {
      return NextResponse.json(
        { error: 'Study flow not found' },
        { status: 404 }
      )
    }

    const startTime = Date.now()
    const issues: FlowIssue[] = []

    // Run validation rules
    // Note: In real implementation, would need to fetch SAP and ICF data
    // For now, using placeholder data

    // Protocol-ICF rules
    if (icfId) {
      // Placeholder: would fetch ICF data and run rules
      // const icfProcedures = []
      // const icfRisks = []
      // const icfVisitMentions = []
      // issues.push(...checkProcedureNotInICF(studyFlow.procedures, icfProcedures))
    }

    // Protocol-SAP rules
    if (sapId) {
      // Placeholder: would fetch SAP data and run rules
      // const sapAssessmentSchedule = []
      // issues.push(...checkEndpointTimingDrift(endpointMaps, studyFlow.visits, sapAssessmentSchedule))
    }

    // Global rules
    const { checkMissingMandatoryVisits, checkUnsupportedVisitTiming } = await import(
      '@/lib/engine/studyflow/validation/global_flow_rules'
    )
    
    issues.push(...checkMissingMandatoryVisits(studyFlow.visits))
    issues.push(...checkUnsupportedVisitTiming(studyFlow.visits))

    // Check visit-endpoint alignment
    // Placeholder: would need endpoint data
    // const endpointMaps = createEndpointProcedureMaps([])
    // const alignments = checkAllVisitEndpointAlignments(studyFlow.visits, endpointMaps, studyFlow.procedures)

    // Categorize issues
    const byCategory: Record<string, FlowIssue[]> = {}
    issues.forEach(issue => {
      if (!byCategory[issue.category]) {
        byCategory[issue.category] = []
      }
      byCategory[issue.category].push(issue)
    })

    // Create summary
    const summary = {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      error: issues.filter(i => i.severity === 'error').length,
      warning: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
    }

    const result: FlowValidationResult = {
      issues,
      summary,
      byCategory,
      metadata: {
        validatedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
      },
    }

    // Save validation results
    const { error: saveError } = await supabase
      .from('studyflow_validations')
      .insert({
        study_flow_id: studyFlow.id,
        protocol_id: studyFlow.protocolId,
        issues: issues,
        summary: summary,
        metadata: result.metadata,
        created_at: new Date().toISOString(),
      })

    if (saveError) {
      console.error('Failed to save validation results:', saveError)
      // Continue anyway
    }

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('Study flow validation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to validate study flow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
