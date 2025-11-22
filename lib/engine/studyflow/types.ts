/**
 * Study Flow Engine Types
 * Core types for visit schedules, procedures, and Table of Procedures
 */

export type VisitId = string
export type ProcedureId = string
export type EndpointId = string
export type CycleId = string

/**
 * Visit Definition
 */
export interface Visit {
  id: VisitId
  name: string // "Visit 1", "Day 1", "Screening", "Week 4"
  day: number // numeric timepoint (Day 0 = baseline)
  cycle?: number // for cyclic studies
  type: 'screening' | 'baseline' | 'treatment' | 'follow_up' | 'end_of_treatment' | 'unscheduled'
  window?: VisitWindow
  procedures: ProcedureId[]
  required: boolean
  metadata?: {
    originalName?: string
    source?: string
    notes?: string
  }
}

/**
 * Visit Window (± days)
 */
export interface VisitWindow {
  minus: number // days before
  plus: number // days after
  unit: 'days' | 'weeks' // for display
}

/**
 * Procedure Definition
 */
export interface Procedure {
  id: ProcedureId
  name: string
  category: ProcedureCategory
  linkedEndpoints?: EndpointId[]
  frequency?: ProcedureFrequency
  timing?: ProcedureTiming
  required: boolean
  metadata?: {
    code?: string // LOINC, SNOMED, etc.
    description?: string
    duration?: number // minutes
    fasting?: boolean
    notes?: string
  }
}

export type ProcedureCategory =
  | 'efficacy'
  | 'safety'
  | 'labs'
  | 'pk'
  | 'pd'
  | 'questionnaire'
  | 'device'
  | 'vital_signs'
  | 'physical_exam'
  | 'imaging'
  | 'ecg'
  | 'adverse_events'
  | 'concomitant_meds'
  | 'other'

export interface ProcedureFrequency {
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'as_needed'
  count?: number
}

export interface ProcedureTiming {
  relativeTo?: 'dosing' | 'visit_start' | 'previous_procedure'
  offset?: number // minutes
  constraints?: string[]
}

/**
 * Treatment Cycle
 */
export interface TreatmentCycle {
  id: CycleId
  cycleNumber: number
  lengthDays: number
  visitsInCycle: VisitId[]
  startDay: number
  endDay: number
}

/**
 * Table of Procedures Matrix
 */
export interface TopMatrix {
  visits: Visit[]
  procedures: Procedure[]
  matrix: boolean[][] // matrix[visitIndex][procedureIndex]
  metadata: {
    generatedAt: string
    version: string
    studyId?: string
    protocolId?: string
  }
}

/**
 * Study Flow
 */
export interface StudyFlow {
  id: string
  studyId: string
  protocolId?: string
  visits: Visit[]
  procedures: Procedure[]
  cycles?: TreatmentCycle[]
  topMatrix: TopMatrix
  totalDuration: number // days
  metadata: {
    generatedAt: string
    version: string
    source: 'manual' | 'generated' | 'imported'
  }
}

/**
 * Flow Validation Issue
 */
export interface FlowIssue {
  id: string
  code: string
  severity: 'critical' | 'error' | 'warning' | 'info'
  category: 'visit' | 'procedure' | 'timing' | 'alignment' | 'cycle' | 'global'
  message: string
  details: string
  affectedVisits?: VisitId[]
  affectedProcedures?: ProcedureId[]
  suggestions?: FlowSuggestion[]
}

/**
 * Flow Suggestion
 */
export interface FlowSuggestion {
  id: string
  label: string
  autoFixable: boolean
  changes: FlowChange[]
}

/**
 * Flow Change
 */
export interface FlowChange {
  type: 'add_visit' | 'remove_visit' | 'modify_visit' | 'add_procedure' | 'remove_procedure' | 'modify_procedure' | 'adjust_timing'
  targetId: string
  field?: string
  oldValue?: any
  newValue: any
  reason: string
}

/**
 * Flow Validation Result
 */
export interface FlowValidationResult {
  issues: FlowIssue[]
  summary: {
    total: number
    critical: number
    error: number
    warning: number
    info: number
  }
  byCategory: Record<string, FlowIssue[]>
  metadata: {
    validatedAt: string
    duration: number
  }
}

/**
 * Endpoint-Procedure Mapping
 */
export interface EndpointProcedureMap {
  endpointId: EndpointId
  endpointName: string
  endpointType: 'primary' | 'secondary' | 'exploratory'
  requiredProcedures: ProcedureId[]
  recommendedProcedures: ProcedureId[]
  timing: {
    baseline: boolean
    treatment: boolean
    followUp: boolean
    specificVisits?: VisitId[]
  }
}

/**
 * Visit-Endpoint Alignment
 */
export interface VisitEndpointAlignment {
  visitId: VisitId
  endpointId: EndpointId
  hasProcedures: boolean
  missingProcedures: ProcedureId[]
  timingCorrect: boolean
  aligned: boolean
}

/**
 * Auto-Fix Request
 */
export interface AutoFixRequest {
  issueIds: string[]
  strategy: 'conservative' | 'aggressive' | 'balanced'
}

/**
 * Auto-Fix Result
 */
export interface AutoFixResult {
  appliedChanges: FlowChange[]
  updatedFlow: StudyFlow
  remainingIssues: FlowIssue[]
  summary: {
    changesApplied: number
    issuesFixed: number
    issuesRemaining: number
  }
}

/**
 * Procedure Catalog Entry
 */
export interface ProcedureCatalogEntry {
  id: ProcedureId
  name: string
  nameRu?: string
  category: ProcedureCategory
  synonyms: string[]
  standardCode?: {
    system: 'LOINC' | 'SNOMED' | 'MedDRA'
    code: string
  }
  defaultTiming?: ProcedureTiming
  linkedEndpointTypes?: string[]
  metadata?: {
    description?: string
    duration?: number
    fasting?: boolean
    invasive?: boolean
  }
}

/**
 * Visit Normalization Result
 */
export interface VisitNormalizationResult {
  originalName: string
  normalizedName: string
  day: number
  type: Visit['type']
  confidence: number
}

/**
 * Procedure Mapping Result
 */
export interface ProcedureMappingResult {
  originalText: string
  matchedProcedure: ProcedureCatalogEntry | null
  confidence: number
  alternatives: Array<{
    procedure: ProcedureCatalogEntry
    confidence: number
  }>
}
