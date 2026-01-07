/**
 * Data Aggregator Types
 */

export interface ClinicalTrial {
  nctId: string
  title: string
  status: string
  phase: string
  enrollment: number
  startDate?: string
  completionDate?: string
  primaryEndpoint?: string
  secondaryEndpoints?: string[]
  results?: TrialResults
  sponsor?: string
}

export interface TrialResults {
  primaryOutcome?: {
    measure: string
    result: string
    pValue?: number
  }
  adverseEvents?: AdverseEvent[]
}

export interface AdverseEvent {
  term: string
  frequency: number
  count: number
  total: number
  severity: 'mild' | 'moderate' | 'severe'
  seriousness: 'serious' | 'non-serious'
}

export interface FAERSReport {
  reportId: string
  receiveDate: string
  seriousOutcome?: string[]
  reactions: string[]
  drugNames: string[]
}

export interface FDALabel {
  setId: string
  version: string
  effectiveDate: string
  fullText: string
  sections: Record<string, string>
  indications: string[]
}

export interface PubMedArticle {
  pmid: string
  title: string
  authors: string[]
  journal: string
  year: number
  abstract?: string
}

export interface Citation {
  authors: string
  year: number
  title: string
  journal: string
  pmid?: string
}

export interface ReferenceChunk {
  id: string
  content: string
  source: string
  section_id?: string
  document_type?: string
}

export interface KnowledgeGraphSnapshot {
  compound_name: string
  inchikey?: string
  chemistry?: any
  class?: string
  moa?: any
  indications?: any[]
  pharmacokinetics?: any
  safety?: any
  trials?: any
}

// Enriched Study Design with Engine v2.4 output
export interface EnrichedStudyDesign {
  // Core project fields
  compound: string
  indication: string
  phase: string
  sponsor: string
  title: string
  
  // Formulation details
  dosage_form?: string
  route?: string
  strength?: string
  
  // Design parameters
  design_type?: string
  blinding?: string
  arms?: string | number
  duration_weeks?: string | number
  primary_endpoint?: string
  secondary_endpoints?: string[]
  
  // Sample size and population
  sample_size?: number | string
  population?: string
  
  // Comparator details
  comparator_type?: string
  comparator_name?: string
  comparator?: string
  
  // Randomization
  randomization_ratio?: string
  number_of_arms?: string | number
  
  // Rescue therapy
  rescue_allowed?: boolean
  rescue_criteria?: string
  
  // Visit schedule and safety
  visit_schedule?: any
  safety_monitoring?: string[]
  analysis_populations?: string[]
  
  // ============================================================================
  // STUDY DESIGN ENGINE v2.4 OUTPUT (for document generation consistency)
  // ============================================================================
  
  // Regulatory classification
  _engine?: {
    version: string
    configHash: string
    regulatoryPathway: string      // innovator | generic | biosimilar | hybrid | post_marketing
    primaryObjective: string       // pk_equivalence | confirmatory_efficacy | etc.
    designPattern: string | null   // PK_CROSSOVER_BE | CONFIRMATORY_RCT_SUPERIORITY | etc.
    phaseLabel: string | null      // "BE Study" | "Phase 3" | etc.
    confidence: number
    isHumanDecisionRequired: boolean
  }
  
  // Structured rationale for document generation
  _rationale?: {
    what: string           // Layer 1: What was selected
    why: string            // Layer 2: Why it fits objective
    regulatory: string     // Layer 3: Regulatory alignment
    assumptions: string[]  // Key assumptions
    notes: string[]        // Drug characteristic notes (HVD, NTI, etc.)
    fallbackNote?: string  // If pattern was adjusted
  }
  
  // Acceptance criteria (for Protocol, SAP)
  _acceptanceCriteria?: {
    criterion: string
    margin: string
    description: string
  }
  
  // Sampling schedule (for PK studies)
  _sampling?: {
    schedule: string[]
    totalSamples: number
    rationale: string
  }
  
  // Warnings and constraints
  _warnings?: Array<{
    severity: 'HARD' | 'SOFT'
    message: string
    implication?: string
  }>
  
  // Decision trace for audit
  _decisionTrace?: Array<{
    step: string
    action?: string
    result: string
  }>
  
  // Regulatory basis references
  _regulatoryBasis?: string[]
  
  // Synopsis enrichment parameters (if applicable)
  _synopsisParams?: any
  
  // Allow additional fields from design_json
  [key: string]: any
}

export interface AggregatedData {
  knowledgeGraph: KnowledgeGraphSnapshot
  
  clinicalTrials: {
    studies: ClinicalTrial[]
    totalStudies: number
    byPhase: Record<string, ClinicalTrial[]>
    endpoints: string[]
    results: TrialResults[]
  }
  
  safetyData: {
    faersReports: FAERSReport[]
    commonAdverseEvents: AdverseEvent[]
    seriousAdverseEvents: AdverseEvent[]
    deaths: number
    labelWarnings: string[]
  }
  
  fdaLabels: {
    labels: FDALabel[]
    latestLabel?: FDALabel
    fullText: string
    sections: Record<string, string>
    approvalDate?: string
    indications: string[]
  }
  
  literature: {
    pubmedArticles: PubMedArticle[]
    keyFindings: string[]
    citations: Citation[]
  }
  
  ragReferences: {
    structuralExamples: ReferenceChunk[]
    similarSections: ReferenceChunk[]
  }
  
  studyDesign?: EnrichedStudyDesign
  
  studyFlow?: {
    visits: Array<{
      id: string
      name: string
      day: number
      type: string
      procedures: string[]
    }>
    procedures: Array<{
      id: string
      name: string
      category: string
    }>
    topMatrix?: Record<string, Record<string, boolean>>
    totalDuration: number
  }
  
  // Cross-reference with previously generated documents (Synopsis → Protocol consistency)
  relatedDocuments?: {
    synopsis?: string    // Full Synopsis content for Protocol cross-reference
    protocol?: string    // Full Protocol content for ICF/CSR cross-reference
    ib?: string          // IB content for Protocol cross-reference
  }
  
  metadata: {
    sources: string[]
    lastUpdated: string
    coverage: Record<string, number>
    dataQuality: {
      knowledgeGraph: number
      clinicalTrials: number
      safetyData: number
      fdaLabels: number
      literature: number
    }
  }
}
