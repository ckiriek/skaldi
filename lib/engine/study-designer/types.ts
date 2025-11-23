/**
 * Sprint 2, Task 1.1: Study Designer Types
 * 
 * Type definitions for AI Study Designer
 */

export interface StudyDesignerInput {
  // Step 1: Drug & Indication
  compound: string
  indication: string
  phase: 'Phase 1' | 'Phase 2' | 'Phase 3' | 'Phase 4'
  populationNotes?: string
  
  // Step 2: Strategy
  objectiveType: 'superiority' | 'non-inferiority' | 'equivalence' | 'safety' | 'pk'
  comparator: 'placebo' | 'active' | 'add-on' | 'single-arm'
  blinding: 'open' | 'single' | 'double'
  randomization: boolean
  
  // Step 3: Constraints
  durationWeeks: number
  targetSampleSize?: number
  budgetLevel: 'low' | 'medium' | 'high'
  regulatoryFocus: 'fda' | 'ema' | 'both' | 'generic'
  
  // Step 4: Outputs
  generateProtocol: boolean
  generateIB: boolean
  generateSAP: boolean
  generateICF: boolean
  detailLevel: 'skeleton' | 'full-draft'
}

export interface StudyDesignerOutput {
  projectId: string
  documents: {
    protocolId?: string
    ibId?: string
    sapId?: string
    icfId?: string
  }
  studyFlowId: string
  statsSummary: {
    totalSampleSize: number
    perArm: number
    alpha: number
    power: number
    assumptions: Record<string, any>
  }
  visitSchedule: {
    visits: Array<{
      name: string
      week: number
      window?: string
      procedures: string[]
    }>
    totalDuration: number
  }
  endpoints: {
    primary: {
      text: string
      type: string
      timepoint: string
    }
    secondary: Array<{
      text: string
      type: string
    }>
  }
  warnings: Array<{
    code: string
    message: string
    severity: 'info' | 'warning' | 'error'
  }>
  metadata: {
    inn: string
    kgSources: number
    buildTime: number
  }
}

export interface FormulationResult {
  apiName: string
  salt?: string
  dosageForm?: string
  route?: string
  strength?: string
  confidence: number
}

export interface KGSnapshot {
  indications: Array<{
    text: string
    confidence: number
    sources: string[]
  }>
  endpoints: Array<{
    text: string
    type: string
    confidence: number
    sources: string[]
  }>
  formulations: Array<{
    routes: string[]
    dosageForms: string[]
    strengths: string[]
  }>
  sourcesUsed: string[]
}

export interface SampleSizeResult {
  totalSampleSize: number
  perArm: number
  alpha: number
  power: number
  dropout: number
  assumptions: {
    effectSize?: number
    variance?: number
    [key: string]: any
  }
}

export interface StudyFlowResult {
  id: string
  visits: Array<{
    id: string
    name: string
    week: number
    window?: string
    procedures: Array<{
      name: string
      category: string
    }>
  }>
  totalDuration: number
  totalProcedures: number
}

export interface DocumentGenerationResult {
  documentId: string
  documentType: string
  status: 'generated' | 'failed'
  quality: 'skeleton' | 'full-draft'
  sectionCount: number
}
