/**
 * Pre-Generation Alignment
 * Prepares data for SAP and ICF generation from Protocol + StudyFlow
 */

import { createClient } from '@/lib/supabase/server'
import type { StudyFlow } from '@/lib/engine/studyflow/types'

interface PreGenerationAlignmentParams {
  projectId: string
  protocolId: string
  targetDocumentType: 'sap' | 'icf'
}

interface SAPPreFillData {
  primaryEndpoints: Array<{
    id: string
    name: string
    type: string
    timing: string
  }>
  secondaryEndpoints: Array<{
    id: string
    name: string
    type: string
    timing: string
  }>
  visitSchedule: Array<{
    id: string
    name: string
    day: number
    type: string
    window?: { minus: number; plus: number }
  }>
  procedures: Array<{
    id: string
    name: string
    category: string
    timing: string
  }>
  topMatrix: any
  analysisPopulations: string[]
  statisticalMethods: string[]
}

interface ICFPreFillData {
  baselineProcedures: Array<{
    name: string
    description: string
    invasive: boolean
    duration?: number
  }>
  safetyProcedures: Array<{
    name: string
    description: string
    frequency: string
  }>
  visitSchedule: Array<{
    name: string
    day: number
    procedures: string[]
  }>
  studyDuration: number
  totalVisits: number
}

/**
 * Pre-fill data for SAP generation
 */
export async function prefillSAP({
  projectId,
  protocolId,
}: Omit<PreGenerationAlignmentParams, 'targetDocumentType'>): Promise<SAPPreFillData> {
  const supabase = await createClient()

  console.log('[PreGeneration] Preparing SAP pre-fill data...')

  // 1. Fetch Protocol data
  const { data: protocol } = await supabase
    .from('documents')
    .select('content, metadata')
    .eq('id', protocolId)
    .single()

  if (!protocol) {
    throw new Error('Protocol not found')
  }

  // 2. Fetch StudyFlow data
  const { data: studyFlowData } = await supabase
    .from('study_flows')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const studyFlow: StudyFlow | null = studyFlowData as any

  // 3. Extract endpoints from Protocol
  const endpoints = protocol.metadata?.endpoints || []
  const primaryEndpoints = endpoints.filter((e: any) => e.type === 'primary')
  const secondaryEndpoints = endpoints.filter((e: any) => e.type === 'secondary')

  // 4. Build pre-fill data
  const preFillData: SAPPreFillData = {
    primaryEndpoints: primaryEndpoints.map((e: any) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      timing: e.timing || 'baseline_to_eot',
    })),
    secondaryEndpoints: secondaryEndpoints.map((e: any) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      timing: e.timing || 'baseline_to_eot',
    })),
    visitSchedule: studyFlow?.visits || [],
    procedures: studyFlow?.procedures || [],
    topMatrix: studyFlow?.topMatrix || null,
    analysisPopulations: protocol.metadata?.analysisPopulations || [
      'Intent-to-Treat (ITT)',
      'Per-Protocol (PP)',
      'Safety',
    ],
    statisticalMethods: protocol.metadata?.statisticalMethods || [
      'Descriptive statistics',
      'Mixed-effects model for repeated measures (MMRM)',
      'Kaplan-Meier survival analysis',
    ],
  }

  console.log(`[PreGeneration] SAP pre-fill: ${preFillData.primaryEndpoints.length} primary endpoints, ${preFillData.visitSchedule.length} visits`)

  return preFillData
}

/**
 * Pre-fill data for ICF generation
 */
export async function prefillICF({
  projectId,
  protocolId,
}: Omit<PreGenerationAlignmentParams, 'targetDocumentType'>): Promise<ICFPreFillData> {
  const supabase = await createClient()

  console.log('[PreGeneration] Preparing ICF pre-fill data...')

  // 1. Fetch StudyFlow data
  const { data: studyFlowData } = await supabase
    .from('study_flows')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const studyFlow: StudyFlow | null = studyFlowData as any

  if (!studyFlow) {
    throw new Error('StudyFlow not found - generate Protocol first')
  }

  // 2. Extract baseline procedures
  const baselineVisit = studyFlow.visits.find((v) => v.type === 'baseline')
  const baselineProcedures = baselineVisit
    ? studyFlow.procedures.filter((p) => baselineVisit.procedures.includes(p.id))
    : []

  // 3. Extract safety procedures (required procedures across all visits)
  const safetyProcedures = studyFlow.procedures.filter((p) => p.required)

  // 4. Build visit schedule with procedures
  const visitSchedule = studyFlow.visits.map((visit) => ({
    name: visit.name,
    day: visit.day,
    procedures: visit.procedures
      .map((procId) => {
        const proc = studyFlow.procedures.find((p) => p.id === procId)
        return proc?.name || ''
      })
      .filter(Boolean),
  }))

  // 5. Calculate study duration
  const studyDuration = Math.max(...studyFlow.visits.map((v) => v.day))

  const preFillData: ICFPreFillData = {
    baselineProcedures: baselineProcedures.map((p) => ({
      name: p.name,
      description: p.description || `${p.name} assessment`,
      invasive: p.metadata?.invasive || false,
      duration: p.metadata?.duration,
    })),
    safetyProcedures: safetyProcedures.map((p) => ({
      name: p.name,
      description: p.description || `${p.name} monitoring`,
      frequency: 'At each visit',
    })),
    visitSchedule,
    studyDuration,
    totalVisits: studyFlow.visits.length,
  }

  console.log(`[PreGeneration] ICF pre-fill: ${preFillData.baselineProcedures.length} baseline procedures, ${preFillData.totalVisits} visits`)

  return preFillData
}

/**
 * Main pre-generation alignment function
 */
export async function runPreGenerationAlignment({
  projectId,
  protocolId,
  targetDocumentType,
}: PreGenerationAlignmentParams): Promise<SAPPreFillData | ICFPreFillData> {
  console.log(`[PreGeneration] Running alignment for ${targetDocumentType}...`)

  if (targetDocumentType === 'sap') {
    return prefillSAP({ projectId, protocolId })
  } else if (targetDocumentType === 'icf') {
    return prefillICF({ projectId, protocolId })
  }

  throw new Error(`Unsupported document type: ${targetDocumentType}`)
}
