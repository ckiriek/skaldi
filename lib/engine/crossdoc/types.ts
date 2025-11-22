/**
 * Cross-Document Intelligence Types
 * Types for cross-document validation and alignment
 */

// ============================================================================
// Document Types
// ============================================================================

export type CrossDocDocumentType = 'IB' | 'PROTOCOL' | 'ICF' | 'SAP' | 'CSR'

export interface CrossDocDocumentRef {
  id: string
  type: CrossDocDocumentType
  version?: string
  title?: string
}

// ============================================================================
// Structured Document Models
// ============================================================================

export interface StructuredIbDocument {
  id: string
  version?: string
  objectives: IbObjective[]
  mechanismOfAction?: string
  targetPopulation?: string
  keyRiskProfile?: string[]
  dosingInformation?: DosingInfo[]
  metadata?: Record<string, any>
}

export interface IbObjective {
  id: string
  type: 'primary' | 'secondary' | 'exploratory'
  text: string
}

export interface DosingInfo {
  id: string
  dose: string
  route: string
  frequency: string
  duration?: string
}

export interface StructuredProtocolDocument {
  id: string
  version?: string
  objectives: ProtocolObjective[]
  endpoints: ProtocolEndpoint[]
  arms: TreatmentArm[]
  visitSchedule?: Visit[]
  inclusionCriteria?: string[]
  exclusionCriteria?: string[]
  analysisPopulations?: AnalysisPopulation[]
  metadata?: Record<string, any>
}

export interface ProtocolObjective {
  id: string
  type: 'primary' | 'secondary' | 'exploratory'
  text: string
}

export interface ProtocolEndpoint {
  id: string
  type: 'primary' | 'secondary' | 'exploratory'
  name: string
  description: string
  dataType?: 'continuous' | 'binary' | 'time_to_event' | 'ordinal' | 'count'
  variable?: string
}

export interface TreatmentArm {
  id: string
  name: string
  dose?: string
  route?: string
  frequency?: string
  description?: string
}

export interface Visit {
  id: string
  name: string
  day?: number
  week?: number
  procedures?: string[]
}

export interface AnalysisPopulation {
  id: string
  name: string
  abbreviation: string
  description: string
}

export interface StructuredIcfDocument {
  id: string
  version?: string
  procedureDescriptions?: ProcedureDescription[]
  visitBurden?: string
  risks?: string[]
  benefits?: string[]
  treatmentDescriptions?: string[]
  metadata?: Record<string, any>
}

export interface ProcedureDescription {
  id: string
  name: string
  description: string
  invasive?: boolean
}

export interface StructuredSapDocument {
  id: string
  version?: string
  primaryEndpoints: SapEndpoint[]
  secondaryEndpoints: SapEndpoint[]
  statisticalTests: StatisticalTestSpec[]
  sampleSizeDriverEndpoint?: string
  analysisPopulations: AnalysisPopulation[]
  missingDataStrategy?: string
  multiplicityStrategy?: string
  metadata?: Record<string, any>
}

export interface SapEndpoint {
  id: string
  name: string
  description: string
  variable?: string
}

export interface StatisticalTestSpec {
  endpointId: string
  test: string
  description?: string
}

export interface StructuredCsrDocument {
  id: string
  version?: string
  actualMethods?: string[]
  analysisSets?: AnalysisPopulation[]
  reportedPrimaryEndpoints?: CsrEndpoint[]
  reportedSecondaryEndpoints?: CsrEndpoint[]
  deviationsOverview?: string[]
  metadata?: Record<string, any>
}

export interface CsrEndpoint {
  id: string
  name: string
  result?: string
}

// ============================================================================
// Cross-Document Bundle
// ============================================================================

export interface CrossDocBundle {
  ib?: StructuredIbDocument
  protocol?: StructuredProtocolDocument
  icf?: StructuredIcfDocument
  sap?: StructuredSapDocument
  csr?: StructuredCsrDocument
}

// ============================================================================
// Issue Location and Severity
// ============================================================================

export interface CrossDocIssueLocation {
  documentType: CrossDocDocumentType
  sectionId?: string
  blockId?: string
  field?: string
  lineNumber?: number
}

export type CrossDocSeverity = 'info' | 'warning' | 'error' | 'critical'

// ============================================================================
// Issues and Suggestions
// ============================================================================

export interface CrossDocIssue {
  code: string // e.g., PRIMARY_ENDPOINT_DRIFT
  severity: CrossDocSeverity
  message: string
  details?: string
  locations: CrossDocIssueLocation[]
  suggestions?: CrossDocSuggestion[]
  category?: CrossDocCategory
}

export type CrossDocCategory = 
  | 'IB_PROTOCOL'
  | 'PROTOCOL_ICF'
  | 'PROTOCOL_SAP'
  | 'PROTOCOL_CSR'
  | 'SAP_CSR'
  | 'GLOBAL'

export interface CrossDocSuggestion {
  id: string
  label: string
  autoFixable: boolean
  patches: CrossDocPatch[]
}

export interface CrossDocPatch {
  documentType: CrossDocDocumentType
  documentId: string
  blockId?: string
  field?: string
  oldValue?: string
  newValue: string
}

// ============================================================================
// Alignment Results
// ============================================================================

export interface ObjectiveLink {
  ibObjectiveId?: string
  protocolObjectiveId?: string
  type: 'primary' | 'secondary' | 'exploratory'
  similarityScore: number // 0-1
  aligned: boolean
}

export interface EndpointLink {
  protocolEndpointId?: string
  sapEndpointId?: string
  csrEndpointId?: string
  type: 'primary' | 'secondary' | 'exploratory'
  similarityScore: number
  aligned: boolean
}

export interface DoseLink {
  ibDoseId?: string
  protocolArmId?: string
  sapDoseId?: string
  similarityScore: number
  aligned: boolean
}

export interface PopulationLink {
  ibPopulationId?: string
  protocolPopulationId?: string
  sapPopulationId?: string
  csrPopulationId?: string
  similarityScore: number
  aligned: boolean
}

export interface VisitLink {
  protocolVisitId?: string
  icfProcedureId?: string
  similarityScore: number
  aligned: boolean
}

export interface CrossDocAlignments {
  objectives: ObjectiveLink[]
  endpoints: EndpointLink[]
  doses: DoseLink[]
  populations: PopulationLink[]
  visits: VisitLink[]
}

// ============================================================================
// Rule Context
// ============================================================================

export interface CrossDocRuleContext {
  bundle: CrossDocBundle
  alignments: CrossDocAlignments
}

export type CrossDocRule = (ctx: CrossDocRuleContext) => Promise<CrossDocIssue[]>

// ============================================================================
// Validation Result
// ============================================================================

export interface CrossDocValidationResult {
  issues: CrossDocIssue[]
  summary: {
    total: number
    critical: number
    error: number
    warning: number
    info: number
  }
  byCategory: Record<CrossDocCategory, CrossDocIssue[]>
}

// ============================================================================
// Auto-fix
// ============================================================================

export interface AutoFixRequest {
  issueIds: string[]
  strategy: 'align_to_protocol' | 'align_to_sap' | 'align_to_ib' | 'custom'
}

export interface AutoFixResult {
  appliedPatches: CrossDocPatch[]
  updatedDocuments: CrossDocDocumentRef[]
  remainingIssues: CrossDocIssue[]
  changelog: ChangeLogEntry[]
}

export interface ChangeLogEntry {
  timestamp: string
  documentType: CrossDocDocumentType
  documentId: string
  field: string
  oldValue: string
  newValue: string
  reason: string
}
