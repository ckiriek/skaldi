/**
 * Universal Enrichment API v2
 * 
 * Preview and run enrichment for any project.
 * Uses the new Universal Project Model.
 * 
 * POST /api/v2/enrichment - Run full enrichment
 * GET /api/v2/enrichment?projectId=xxx - Preview enrichment status
 * 
 * @version 2.0.0
 * @date 2025-12-02
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildIBInput, quickEnrichCompound } from '@/lib/enrichment'
import type { CompoundType, TherapeuticClass } from '@/lib/core'

export const maxDuration = 120 // 2 minutes timeout

/**
 * POST /api/v2/enrichment
 * 
 * Run full enrichment for a project
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { projectId, compoundName, indication, compoundType, therapeuticClass } = body
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    let ibInput
    
    if (projectId) {
      // Full project enrichment
      console.log(`[Enrichment API v2] Running enrichment for project ${projectId}`)
      
      ibInput = await buildIBInput(projectId)
      
      // Update project enrichment status
      await supabase
        .from('projects')
        .update({
          enrichment_status: 'completed',
          enrichment_completed_at: new Date().toISOString()
        })
        .eq('id', projectId)
      
    } else if (compoundName && indication) {
      // Quick compound enrichment (for preview/testing)
      console.log(`[Enrichment API v2] Quick enrichment for ${compoundName}`)
      
      ibInput = await quickEnrichCompound(
        compoundName,
        indication,
        (compoundType as CompoundType) || 'small_molecule',
        (therapeuticClass as TherapeuticClass) || 'OTHER'
      )
      
    } else {
      return NextResponse.json(
        { error: 'Either projectId or (compoundName + indication) required' },
        { status: 400 }
      )
    }
    
    // Return enrichment summary (not full data to reduce payload)
    return NextResponse.json({
      success: true,
      compound: {
        inn_name: ibInput.compound.inn_name,
        compound_type: ibInput.compound.compound_type,
        therapeutic_class: ibInput.compound.therapeutic_class
      },
      project: {
        study_phase: ibInput.project.study_phase,
        indication: ibInput.project.indication
      },
      completeness: ibInput.completeness,
      clinical_trials: {
        total: ibInput.clinical_trials.trials_count,
        by_phase: ibInput.clinical_trials.count_by_phase,
        with_results: ibInput.clinical_trials.trials_with_results
      },
      safety: {
        common_ae_count: ibInput.safety.common_ae.length,
        serious_ae_count: ibInput.safety.serious_ae.length,
        warnings_count: ibInput.safety.warnings.length,
        has_boxed_warning: !!ibInput.safety.boxed_warning
      },
      sources: {
        cmc: ibInput.cmc.source,
        nonclinical: ibInput.nonclinical.source,
        pk: ibInput.pk.source,
        pd: ibInput.pd.source,
        safety: ibInput.safety.source
      },
      enrichment_warnings: ibInput.enrichment_warnings,
      duration_ms: Date.now() - startTime
    })
    
  } catch (error) {
    console.error('[Enrichment API v2] Error:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime
    }, { status: 500 })
  }
}

/**
 * GET /api/v2/enrichment?projectId=xxx
 * 
 * Get enrichment status for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        compound_name,
        compound_type,
        drug_class,
        indication,
        phase,
        enrichment_status,
        enrichment_completed_at,
        ib_enrichment_data,
        knowledge_graph
      `)
      .eq('id', projectId)
      .single()
    
    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // Calculate completeness from stored data
    const enrichmentData = project.ib_enrichment_data as Record<string, unknown> | null
    
    return NextResponse.json({
      project_id: project.id,
      compound_name: project.compound_name,
      compound_type: project.compound_type || 'small_molecule',
      therapeutic_class: project.drug_class || 'OTHER',
      indication: project.indication,
      phase: project.phase,
      enrichment_status: project.enrichment_status || 'pending',
      enrichment_completed_at: project.enrichment_completed_at,
      has_enrichment_data: !!enrichmentData,
      has_knowledge_graph: !!project.knowledge_graph
    })
    
  } catch (error) {
    console.error('[Enrichment API v2] GET error:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
