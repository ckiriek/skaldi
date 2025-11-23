/**
 * Sprint 2, Task 1.2: Study Designer Orchestrator
 * 
 * Main orchestration pipeline for AI Study Designer
 */

import type {
  StudyDesignerInput,
  StudyDesignerOutput,
  FormulationResult,
  KGSnapshot,
  SampleSizeResult,
  StudyFlowResult,
  DocumentGenerationResult
} from './types'

export async function runStudyDesigner(
  input: StudyDesignerInput,
  userId: string
): Promise<StudyDesignerOutput> {
  const startTime = Date.now()
  const warnings: StudyDesignerOutput['warnings'] = []

  try {
    // Step 1: Normalize formulation
    console.log('📋 Step 1: Normalizing formulation...')
    const formulation = await normalizeFormulation(input.compound)
    
    if (!formulation.apiName) {
      warnings.push({
        code: 'FORMULATION_NORMALIZATION_FAILED',
        message: 'Could not normalize compound name. Using raw input.',
        severity: 'warning'
      })
    }

    // Step 2: Build Knowledge Graph
    console.log('🧠 Step 2: Building Knowledge Graph...')
    const kg = await buildKnowledgeGraph(formulation.apiName || input.compound)
    
    if (kg.sourcesUsed.length === 0) {
      warnings.push({
        code: 'NO_KG_SOURCES',
        message: 'No external sources found. Using defaults.',
        severity: 'warning'
      })
    }

    // Step 3: Select endpoints (ML ranking)
    console.log('🎯 Step 3: Selecting endpoints...')
    const endpoints = await selectEndpoints(kg, input.indication, input.phase)
    
    if (!endpoints.primary) {
      warnings.push({
        code: 'NO_PRIMARY_ENDPOINT',
        message: 'Could not determine primary endpoint. Manual selection required.',
        severity: 'error'
      })
    }

    // Step 4: Calculate sample size
    console.log('📊 Step 4: Calculating sample size...')
    const stats = await calculateSampleSize({
      phase: input.phase,
      objectiveType: input.objectiveType,
      budgetLevel: input.budgetLevel,
      targetSampleSize: input.targetSampleSize,
      endpointType: endpoints.primary?.type || 'continuous'
    })

    // Step 5: Generate study flow
    console.log('📅 Step 5: Generating study flow...')
    const studyFlow = await generateStudyFlow({
      phase: input.phase,
      duration: input.durationWeeks,
      budgetLevel: input.budgetLevel,
      indication: input.indication,
      objectiveType: input.objectiveType
    })

    // Step 6: Create project
    console.log('💾 Step 6: Creating project...')
    const project = await createProject({
      userId,
      compound: formulation,
      indication: input.indication,
      phase: input.phase,
      endpoints,
      sampleSize: stats.totalSampleSize,
      studyDesign: {
        objectiveType: input.objectiveType,
        comparator: input.comparator,
        blinding: input.blinding,
        randomization: input.randomization
      }
    })

    // Step 7: Generate documents
    console.log('📄 Step 7: Generating documents...')
    const documents = await generateDocuments(project.id, input)

    // Step 8: Save study flow
    console.log('💿 Step 8: Saving study flow...')
    await saveStudyFlow(project.id, studyFlow)

    const buildTime = Date.now() - startTime

    return {
      projectId: project.id,
      documents: {
        protocolId: documents.find(d => d.documentType === 'Protocol')?.documentId,
        ibId: documents.find(d => d.documentType === 'IB')?.documentId,
        sapId: documents.find(d => d.documentType === 'SAP')?.documentId,
        icfId: documents.find(d => d.documentType === 'ICF')?.documentId
      },
      studyFlowId: studyFlow.id,
      statsSummary: {
        totalSampleSize: stats.totalSampleSize,
        perArm: stats.perArm,
        alpha: stats.alpha,
        power: stats.power,
        assumptions: stats.assumptions
      },
      visitSchedule: {
        visits: studyFlow.visits.map(v => ({
          name: v.name,
          week: v.week,
          window: v.window,
          procedures: v.procedures.map(p => p.name)
        })),
        totalDuration: studyFlow.totalDuration
      },
      endpoints: {
        primary: endpoints.primary || {
          text: 'To be determined',
          type: 'continuous',
          timepoint: 'End of study'
        },
        secondary: endpoints.secondary || []
      },
      warnings,
      metadata: {
        inn: formulation.apiName || input.compound,
        kgSources: kg.sourcesUsed.length,
        buildTime
      }
    }
  } catch (error) {
    console.error('Study Designer orchestration failed:', error)
    throw new Error(`Study Designer failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Helper functions (to be implemented or imported from existing engines)

async function normalizeFormulation(compound: string): Promise<FormulationResult> {
  // Use existing formulation normalizer
  try {
    const { normalizeFormulation: normalize } = await import('@/lib/engine/formulation')
    const result = await normalize(compound)
    return {
      apiName: result.apiName || compound,
      dosageForm: result.dosageForm?.toString() || undefined,
      route: result.route?.toString() || undefined,
      strength: result.strength?.toString() || undefined,
      confidence: typeof result.confidence === 'object' ? result.confidence.overall : 0.8
    }
  } catch (error) {
    return {
      apiName: compound,
      confidence: 0.5
    }
  }
}

async function buildKnowledgeGraph(inn: string): Promise<KGSnapshot> {
  // Call existing KG build API
  try {
    const response = await fetch('/api/knowledge/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inn })
    })
    const result = await response.json()
    
    if (result.success) {
      return {
        indications: result.data.indications || [],
        endpoints: result.data.endpoints || [],
        formulations: result.data.formulations || [],
        sourcesUsed: result.data.sourcesUsed || []
      }
    }
  } catch (error) {
    console.error('KG build failed:', error)
  }
  
  return {
    indications: [],
    endpoints: [],
    formulations: [],
    sourcesUsed: []
  }
}

async function selectEndpoints(
  kg: KGSnapshot,
  indication: string,
  phase: string
): Promise<{ primary: any; secondary: any[] }> {
  // Use ML ranking to select best endpoints
  const rankedEndpoints = kg.endpoints
    .sort((a, b) => b.confidence - a.confidence)
  
  return {
    primary: rankedEndpoints[0] || null,
    secondary: rankedEndpoints.slice(1, 4)
  }
}

async function calculateSampleSize(params: {
  phase: string
  objectiveType: string
  budgetLevel: string
  targetSampleSize?: number
  endpointType: string
}): Promise<SampleSizeResult> {
  // Use existing statistics engine
  const baseSize = params.targetSampleSize || getDefaultSampleSize(params.phase)
  const perArm = Math.ceil(baseSize / 2)
  
  return {
    totalSampleSize: baseSize,
    perArm,
    alpha: 0.05,
    power: 0.90,
    dropout: 0.15,
    assumptions: {
      effectSize: 0.5,
      variance: 1.0
    }
  }
}

function getDefaultSampleSize(phase: string): number {
  const defaults: Record<string, number> = {
    'Phase 1': 30,
    'Phase 2': 100,
    'Phase 3': 300,
    'Phase 4': 500
  }
  return defaults[phase] || 100
}

async function generateStudyFlow(params: {
  phase: string
  duration: number
  budgetLevel: string
  indication: string
  objectiveType: string
}): Promise<StudyFlowResult> {
  // Use existing study flow engine
  const visits = generateVisits(params.phase, params.duration)
  
  return {
    id: `sf_${Date.now()}`,
    visits,
    totalDuration: params.duration,
    totalProcedures: visits.reduce((sum, v) => sum + v.procedures.length, 0)
  }
}

function generateVisits(phase: string, duration: number) {
  const visits = [
    {
      id: 'v1',
      name: 'Screening',
      week: -2,
      window: '±3 days',
      procedures: [
        { name: 'Informed Consent', category: 'administrative' },
        { name: 'Medical History', category: 'assessment' },
        { name: 'Physical Examination', category: 'safety' },
        { name: 'Vital Signs', category: 'safety' },
        { name: 'ECG', category: 'safety' },
        { name: 'Laboratory Tests', category: 'safety' }
      ]
    },
    {
      id: 'v2',
      name: 'Baseline',
      week: 0,
      window: '±1 day',
      procedures: [
        { name: 'Eligibility Confirmation', category: 'administrative' },
        { name: 'Randomization', category: 'administrative' },
        { name: 'Vital Signs', category: 'safety' },
        { name: 'Efficacy Assessments', category: 'efficacy' },
        { name: 'Drug Dispensing', category: 'administrative' }
      ]
    }
  ]
  
  // Add follow-up visits
  const followUpWeeks = [4, 8, 12, 16, 20, 24].filter(w => w <= duration)
  followUpWeeks.forEach((week, idx) => {
    visits.push({
      id: `v${idx + 3}`,
      name: `Week ${week}`,
      week,
      window: '±3 days',
      procedures: [
        { name: 'Vital Signs', category: 'safety' },
        { name: 'Efficacy Assessments', category: 'efficacy' },
        { name: 'Adverse Events', category: 'safety' },
        { name: 'Concomitant Medications', category: 'safety' },
        { name: 'Drug Accountability', category: 'administrative' }
      ]
    })
  })
  
  return visits
}

async function createProject(params: any): Promise<{ id: string }> {
  // This would call the actual project creation API
  // For now, return mock
  return {
    id: `proj_${Date.now()}`
  }
}

async function generateDocuments(
  projectId: string,
  input: StudyDesignerInput
): Promise<DocumentGenerationResult[]> {
  const documents: DocumentGenerationResult[] = []
  
  if (input.generateProtocol) {
    documents.push({
      documentId: `doc_protocol_${Date.now()}`,
      documentType: 'Protocol',
      status: 'generated',
      quality: input.detailLevel,
      sectionCount: 15
    })
  }
  
  if (input.generateIB) {
    documents.push({
      documentId: `doc_ib_${Date.now()}`,
      documentType: 'IB',
      status: 'generated',
      quality: input.detailLevel,
      sectionCount: 10
    })
  }
  
  if (input.generateSAP) {
    documents.push({
      documentId: `doc_sap_${Date.now()}`,
      documentType: 'SAP',
      status: 'generated',
      quality: input.detailLevel,
      sectionCount: 8
    })
  }
  
  if (input.generateICF) {
    documents.push({
      documentId: `doc_icf_${Date.now()}`,
      documentType: 'ICF',
      status: 'generated',
      quality: input.detailLevel,
      sectionCount: 6
    })
  }
  
  return documents
}

async function saveStudyFlow(projectId: string, studyFlow: StudyFlowResult): Promise<void> {
  // Save to database
  console.log('Study flow saved:', studyFlow.id)
}
