/**
 * Study Flow Generator Service
 * 
 * Generates Study Flow (visits, procedures, ToP matrix) from project data
 * Used by DocumentOrchestrator before generating Protocol, ICF, CSR
 */

import { createClient } from '@/lib/supabase/server'
import { normalizeVisits } from '@/lib/engine/studyflow/visit_model/visit_normalizer'
import { inferMissingVisits } from '@/lib/engine/studyflow/visit_model/visit_inference'
import { inferProceduresFromEndpoints } from '@/lib/engine/studyflow/procedures/procedure_inference'
import { buildTopMatrix } from '@/lib/engine/studyflow/top/top_builder'
import { createEndpointProcedureMaps } from '@/lib/engine/studyflow/alignment/endpoint_procedure_map'

export interface StudyFlowData {
  visits: Array<{
    id: string
    name: string
    day: number
    type: string
    procedures: string[]
    required: boolean
  }>
  procedures: Array<{
    id: string
    name: string
    category: string
    duration?: number
    frequency?: string
  }>
  topMatrix: Record<string, Record<string, boolean>>
  totalDuration: number
  metadata: {
    generatedAt: string
    source: string
  }
}

/**
 * Generate Study Flow for a project
 * Returns visits, procedures, and Table of Procedures matrix
 */
export async function generateStudyFlowForProject(
  projectId: string,
  supabaseClient?: any
): Promise<StudyFlowData | null> {
  console.log(`📅 Generating Study Flow for project ${projectId}`)
  
  try {
    const supabase = supabaseClient || await createClient()
    
    // Fetch project with design data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, knowledge_graph')
      .eq('id', projectId)
      .single()
    
    if (projectError || !project) {
      console.warn(`⚠️ Project not found for Study Flow: ${projectId}`)
      return null
    }
    
    // Extract design parameters
    const designJson = project.design_json || {}
    const durationWeeks = designJson.duration_weeks || 24
    const phase = project.phase || 'Phase 3'
    
    // Build visit schedule based on phase and duration
    const visitNames = buildVisitSchedule(phase, durationWeeks)
    
    // Normalize visits
    const normalizedVisits = normalizeVisits(visitNames)
    
    // Create visit objects
    let visits = normalizedVisits.map(nv => ({
      id: `visit_${nv.normalizedName.toLowerCase().replace(/\s+/g, '_')}`,
      name: nv.normalizedName,
      day: nv.day,
      type: nv.type,
      procedures: [] as string[],
      required: true,
    }))
    
    // Infer missing visits
    visits = inferMissingVisits(visits)
    
    // Get endpoints from Knowledge Graph or project
    const endpointStrings = extractEndpoints(project)
    
    // Convert to endpoint objects for the inference functions
    const endpointObjects = endpointStrings.map((name, i) => ({
      id: `ep_${i}`,
      name,
      type: i === 0 ? 'primary' as const : 'secondary' as const
    }))
    
    // Infer procedures from endpoints
    const inferredProcedures = inferProceduresFromEndpoints(endpointObjects)
    const procedures = inferredProcedures.map(p => ({
      id: p.id,
      name: p.name,
      category: String(p.category),
      duration: (p as any).duration,
      frequency: p.frequency ? String(p.frequency) : undefined
    }))
    
    // Create endpoint-procedure maps
    const endpointMaps = createEndpointProcedureMaps(endpointObjects)
    
    // Assign procedures to visits
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
      
      // Add standard procedures based on visit type
      addStandardProcedures(visit, phase)
    })
    
    // Build ToP matrix - cast through unknown to avoid type issues
    const topMatrix = buildTopMatrix(visits, inferredProcedures as any) as unknown as Record<string, Record<string, boolean>>
    
    // Calculate total duration
    const totalDuration = Math.max(...visits.map(v => v.day), durationWeeks * 7)
    
    const studyFlow: StudyFlowData = {
      visits,
      procedures,
      topMatrix,
      totalDuration,
      metadata: {
        generatedAt: new Date().toISOString(),
        source: 'auto-generated'
      }
    }
    
    // Save to database
    try {
      await supabase
        .from('study_flows')
        .upsert({
          id: `flow_${projectId}`,
          study_id: projectId,
          visits,
          procedures,
          top_matrix: topMatrix,
          total_duration: totalDuration,
          metadata: studyFlow.metadata,
          created_at: new Date().toISOString(),
        })
      
      console.log(`✅ Study Flow saved to database`)
    } catch (saveError) {
      console.warn(`⚠️ Could not save Study Flow:`, saveError)
    }
    
    console.log(`✅ Study Flow generated: ${visits.length} visits, ${procedures.length} procedures`)
    
    return studyFlow
    
  } catch (error) {
    console.error(`❌ Study Flow generation failed:`, error)
    return null
  }
}

/**
 * Build visit schedule based on phase and duration
 */
function buildVisitSchedule(phase: string, durationWeeks: number): string[] {
  const visits: string[] = ['Screening', 'Baseline']
  
  // Add treatment visits based on duration
  if (durationWeeks <= 4) {
    visits.push('Week 2', 'Week 4')
  } else if (durationWeeks <= 12) {
    visits.push('Week 4', 'Week 8', 'Week 12')
  } else if (durationWeeks <= 24) {
    visits.push('Week 4', 'Week 8', 'Week 12', 'Week 16', 'Week 20', 'Week 24')
  } else {
    // Longer studies - monthly visits
    for (let week = 4; week <= durationWeeks; week += 4) {
      visits.push(`Week ${week}`)
    }
  }
  
  visits.push('End of Treatment', 'Follow-up')
  
  return visits
}

/**
 * Extract endpoints from project/KG
 */
function extractEndpoints(project: any): string[] {
  const endpoints: string[] = []
  
  // From design_json
  if (project.design_json?.primary_endpoint) {
    endpoints.push(project.design_json.primary_endpoint)
  }
  
  // From Knowledge Graph
  if (project.knowledge_graph?.endpoints) {
    project.knowledge_graph.endpoints.forEach((ep: any) => {
      const name = ep.normalized || ep.name
      if (name && !endpoints.includes(name)) {
        endpoints.push(name)
      }
    })
  }
  
  // Default endpoints if none found
  if (endpoints.length === 0) {
    endpoints.push(
      'Primary efficacy endpoint',
      'Safety assessment',
      'Vital signs',
      'Laboratory parameters'
    )
  }
  
  return endpoints.slice(0, 10) // Limit to 10 endpoints
}

/**
 * Add standard procedures based on visit type and phase
 */
function addStandardProcedures(visit: any, phase: string): void {
  const standardProcedures: Record<string, string[]> = {
    screening: [
      'proc_informed_consent',
      'proc_medical_history',
      'proc_physical_exam',
      'proc_vital_signs',
      'proc_lab_tests',
      'proc_eligibility_assessment'
    ],
    baseline: [
      'proc_physical_exam',
      'proc_vital_signs',
      'proc_lab_tests',
      'proc_ecg',
      'proc_randomization'
    ],
    treatment: [
      'proc_vital_signs',
      'proc_adverse_events',
      'proc_concomitant_meds',
      'proc_study_drug_dispensing'
    ],
    end_of_treatment: [
      'proc_physical_exam',
      'proc_vital_signs',
      'proc_lab_tests',
      'proc_ecg',
      'proc_adverse_events',
      'proc_study_drug_return'
    ],
    follow_up: [
      'proc_vital_signs',
      'proc_adverse_events',
      'proc_concomitant_meds'
    ]
  }
  
  const procs = standardProcedures[visit.type] || []
  procs.forEach(proc => {
    if (!visit.procedures.includes(proc)) {
      visit.procedures.push(proc)
    }
  })
}

/**
 * Format Study Flow for injection into document context
 */
export function formatStudyFlowForContext(studyFlow: StudyFlowData): string {
  if (!studyFlow) return ''
  
  let text = '\n\n## STUDY FLOW DATA\n\n'
  
  // Visit Schedule
  text += '### Visit Schedule\n'
  text += '| Visit | Day | Type | Key Procedures |\n'
  text += '|-------|-----|------|----------------|\n'
  
  studyFlow.visits.forEach(visit => {
    const keyProcs = visit.procedures.slice(0, 3).map(p => 
      p.replace('proc_', '').replace(/_/g, ' ')
    ).join(', ')
    text += `| ${visit.name} | ${visit.day} | ${visit.type} | ${keyProcs} |\n`
  })
  
  // Procedures Summary
  text += '\n### Procedures Summary\n'
  studyFlow.procedures.forEach(proc => {
    text += `- **${proc.name}** (${proc.category})\n`
  })
  
  // Duration
  text += `\n### Study Duration\n`
  text += `Total duration: ${studyFlow.totalDuration} days (${Math.round(studyFlow.totalDuration / 7)} weeks)\n`
  
  return text
}
