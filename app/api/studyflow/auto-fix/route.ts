/**
 * Study Flow Auto-fix API
 * POST /api/studyflow/auto-fix
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applyAutoFixes, estimateAutoFixImpact, validateAutoFixChanges } from '@/lib/engine/studyflow/autofix'
import type { StudyFlow, AutoFixRequest } from '@/lib/engine/studyflow/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Parse request body
    const autoFixRequest = await request.json() as {
      studyFlowId: string
      issueIds: string[]
      strategy?: 'conservative' | 'aggressive' | 'balanced'
    }

    const { studyFlowId, issueIds, strategy = 'balanced' } = autoFixRequest

    // Validate required parameters
    if (!studyFlowId) {
      return NextResponse.json(
        { error: 'Study flow ID is required' },
        { status: 400 }
      )
    }

    if (!issueIds || issueIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one issue ID is required' },
        { status: 400 }
      )
    }

    // Fetch study flow
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

    const studyFlow: StudyFlow = {
      id: data.id,
      studyId: data.study_id,
      protocolId: data.protocol_id,
      visits: data.visits,
      procedures: data.procedures,
      topMatrix: data.top_matrix,
      totalDuration: data.total_duration,
      metadata: data.metadata,
    }

    // Prepare auto-fix request
    const fixRequest: AutoFixRequest = {
      issueIds,
      strategy,
    }

    // Estimate impact before applying
    const impact = estimateAutoFixImpact(
      issueIds.map(id => ({
        type: 'add_visit' as const,
        targetId: id,
        newValue: {},
        reason: 'Auto-fix',
      }))
    )

    // Validate changes
    const validation = validateAutoFixChanges(studyFlow, [])

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Auto-fix validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      )
    }

    // Apply auto-fixes
    const result = await applyAutoFixes(studyFlow, fixRequest)

    // Save updated study flow
    const { error: saveError } = await supabase
      .from('study_flows')
      .update({
        visits: result.updatedFlow.visits,
        procedures: result.updatedFlow.procedures,
        top_matrix: result.updatedFlow.topMatrix,
        total_duration: result.updatedFlow.totalDuration,
        metadata: {
          ...result.updatedFlow.metadata,
          lastAutoFix: new Date().toISOString(),
          autoFixCount: (result.updatedFlow.metadata as any).autoFixCount || 0 + 1,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', studyFlowId)

    if (saveError) {
      console.error('Failed to save updated study flow:', saveError)
      return NextResponse.json(
        { error: 'Failed to save auto-fix results' },
        { status: 500 }
      )
    }

    // Log auto-fix action
    await supabase.from('studyflow_autofix_log').insert({
      study_flow_id: studyFlowId,
      issue_ids: issueIds,
      strategy,
      changes_applied: result.appliedChanges,
      summary: result.summary,
      impact,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        impact,
        validation,
      },
    })
  } catch (error) {
    console.error('Study flow auto-fix error:', error)
    return NextResponse.json(
      {
        error: 'Failed to apply auto-fixes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
