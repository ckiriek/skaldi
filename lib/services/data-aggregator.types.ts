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
  
  studyDesign?: any
  
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
