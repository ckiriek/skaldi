/**
 * Phase H.2-H.6: Clinical Knowledge Graph Types
 * 
 * Core type definitions for Knowledge Graph entities
 */

// ============================================================================
// Data Ingestion Types
// ============================================================================

export interface FdaLabelRecord {
  innCandidates: string[]
  brandNames: string[]
  routes: string[]
  dosageForms: string[]
  indicationsText?: string
  dosageAndAdministrationText?: string
  warningsText?: string
  precautionsText?: string
  adverseReactionsText?: string
  rawJson: any
}

export interface FdaNdcRecord {
  inn: string
  brandNames: string[]
  routes: string[]
  dosageForms: string[]
  strengths: string[]
  pharmClasses: string[]
  rawJson: any
}

export interface DailyMedRecord {
  setId: string
  innCandidates: string[]
  routes: string[]
  dosageForms: string[]
  indicationsText?: string
  dosageAndAdministrationText?: string
  clinicalPharmacologyText?: string
  warningsText?: string
  adverseReactionsText?: string
  rawJson: any
}

export interface CtGovEndpoint {
  title: string
  description?: string
  timeFrame?: string
  type: 'primary' | 'secondary' | 'other'
}

export interface CtGovStudyDesign {
  allocation?: string
  masking?: string
}

export interface CtGovEligibility {
  inclusionText?: string
  exclusionText?: string
}

export interface CtGovRecord {
  nctId: string
  title: string
  indicationCandidates: string[]
  endpoints: CtGovEndpoint[]
  design?: CtGovStudyDesign
  eligibility?: CtGovEligibility
  rawJson: any
}

export interface EmaEparRecord {
  sourcePath: string
  innCandidates: string[]
  indicationsText?: string
  posologyText?: string
  contraindicationsText?: string
  warningsText?: string
  pharmacodynamicText?: string
  pharmacokineticText?: string
}

// ============================================================================
// Normalizer Types
// ============================================================================

export interface NormalizedIndication {
  original: string
  cleaned: string
  icd10Code?: string
  tags: string[]
}

export type EndpointType = 'continuous' | 'binary' | 'time_to_event' | 'ordinal' | 'count'

export interface NormalizedEndpoint {
  originalTitle: string
  cleanedTitle: string
  type: EndpointType
  timepoint?: string
  variableName?: string
}

export interface NormalizedEligibility {
  inclusionCriteria: string[]
  exclusionCriteria: string[]
}

export interface NormalizedProcedure {
  name: string
  category: string
  loincCode?: string
  synonyms: string[]
}

// ============================================================================
// Knowledge Graph Types
// ============================================================================

export interface KgFormulation {
  id: string
  inn: string
  routes: string[]
  dosageForms: string[]
  strengths: string[]
  sources: string[]
  confidence: number
}

export interface KgIndication {
  id: string
  inn?: string
  indication: string
  icd10Code?: string
  sources: string[]
  confidence: number
}

export interface KgEndpoint {
  id: string
  indication?: string
  inn?: string
  normalized: NormalizedEndpoint
  sources: string[]
  confidence: number
}

export interface KgProcedure {
  id: string
  name: string
  category: string
  loincCode?: string
  synonyms: string[]
  sources: string[]
  confidence: number
}

export interface KgEligibilityPattern {
  id: string
  inn?: string
  indication?: string
  inclusionText?: string
  exclusionText?: string
  sources: string[]
}

export interface KgSafetySignal {
  term: string
  count: number
  serious?: boolean
  source: string
}

export interface KnowledgeGraphSnapshot {
  inn: string
  formulations: KgFormulation[]
  indications: KgIndication[]
  endpoints: KgEndpoint[]
  procedures: KgProcedure[]
  eligibilityPatterns: KgEligibilityPattern[]
  safetySignals: KgSafetySignal[]
  sourcesUsed: string[]
  createdAt: Date
}

// ============================================================================
// RAG Types
// ============================================================================

export type SourceType = 'fda_label' | 'dailymed' | 'ctgov' | 'ema' | 'reference_protocol'

export interface TextChunk {
  id: string
  sourceId: string
  sourceType: SourceType
  text: string
  order: number
}

export interface EmbeddedChunk extends TextChunk {
  embedding: number[]
}

// ============================================================================
// API Types
// ============================================================================

export interface KnowledgeRequestByInn {
  inn: string
  indicationHint?: string
}

export interface KnowledgeFormulationResponse {
  inn: string
  normalizedFormulation: {
    inn: string
    dosageForm?: string
    route?: string
    strength?: string
  }
  kgFormulation?: KgFormulation
}

export interface KnowledgeEndpointsResponse {
  inn?: string
  indication?: string
  endpoints: KgEndpoint[]
}

export interface KnowledgeIndicationsResponse {
  inn: string
  indications: KgIndication[]
}

// ============================================================================
// Ingestion Log Types
// ============================================================================

export type IngestionStatus = 'success' | 'error' | 'timeout' | 'partial'

export interface IngestionLogEntry {
  sourceType: string
  inn?: string
  status: IngestionStatus
  recordsFetched?: number
  errorMessage?: string
  durationMs?: number
  createdAt: Date
}

// ============================================================================
// Error Types
// ============================================================================

export interface KnowledgeError {
  code: string
  message: string
  details?: Record<string, any>
}
