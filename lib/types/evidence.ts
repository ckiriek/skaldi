/**
 * Evidence Locker Types
 * 
 * Type definitions for evidence tracking and source verification.
 * 
 * @module lib/types/evidence
 */

// ============================================================================
// EVIDENCE SOURCE
// ============================================================================

export type SourceType =
  | 'pubchem'
  | 'openfda'
  | 'orange_book'
  | 'dailymed'
  | 'clinicaltrials'
  | 'pubmed'
  | 'ema'
  | 'who'
  | 'manual'
  | 'literature'
  | 'internal'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type DataQuality = 'excellent' | 'good' | 'fair' | 'poor'

export type EvidenceCategory =
  | 'safety'
  | 'efficacy'
  | 'pharmacology'
  | 'regulatory'
  | 'quality'
  | 'nonclinical'
  | 'clinical'
  | 'manufacturing'
  | 'other'

export interface EvidenceSource {
  id: string
  
  // Evidence identifier
  ev_id: string  // Format: EV-001, EV-002, etc.
  
  // Project and document context
  project_id: string
  document_id?: string
  document_type?: string
  
  // Source information
  source_type: SourceType
  source_url?: string
  source_id?: string
  source_name?: string
  
  // Content
  title?: string
  snippet?: string
  full_content?: string
  
  // Reference in document
  ref_in_text?: string[]
  section_ids?: string[]
  
  // Metadata
  author?: string
  publication_date?: string
  access_date: string
  version?: string
  
  // Verification
  verified: boolean
  verified_by?: string
  verified_at?: string
  verification_notes?: string
  
  // Quality metrics
  relevance_score?: number
  confidence_level?: ConfidenceLevel
  data_quality?: DataQuality
  
  // Tags and categorization
  tags?: string[]
  category?: EvidenceCategory
  
  // Additional metadata
  metadata?: Record<string, any>
  
  // Audit
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateEvidenceSourceInput {
  project_id: string
  source_type: SourceType
  source_url?: string
  source_id?: string
  title?: string
  snippet?: string
  full_content?: string
  document_id?: string
  document_type?: string
  author?: string
  publication_date?: string
  confidence_level?: ConfidenceLevel
  data_quality?: DataQuality
  tags?: string[]
  category?: EvidenceCategory
  metadata?: Record<string, any>
}

export interface UpdateEvidenceSourceInput {
  title?: string
  snippet?: string
  full_content?: string
  source_name?: string
  author?: string
  publication_date?: string
  version?: string
  ref_in_text?: string[]
  section_ids?: string[]
  relevance_score?: number
  confidence_level?: ConfidenceLevel
  data_quality?: DataQuality
  tags?: string[]
  category?: EvidenceCategory
  metadata?: Record<string, any>
}

// ============================================================================
// EVIDENCE LINK
// ============================================================================

export type LinkType =
  | 'citation'
  | 'reference'
  | 'data_source'
  | 'supporting_evidence'
  | 'contradicting_evidence'

export interface EvidenceLink {
  id: string
  
  // Evidence reference
  evidence_id: string
  
  // Document reference
  document_id: string
  version_id?: string
  
  // Location in document
  section_id: string
  section_path?: string
  paragraph_index?: number
  sentence_index?: number
  
  // Link details
  link_type: LinkType
  claim_text?: string
  context?: string
  
  // Metadata
  metadata?: Record<string, any>
  
  // Audit
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateEvidenceLinkInput {
  evidence_id: string
  document_id: string
  version_id?: string
  section_id: string
  section_path?: string
  paragraph_index?: number
  sentence_index?: number
  link_type?: LinkType
  claim_text?: string
  context?: string
  metadata?: Record<string, any>
}

// ============================================================================
// EVIDENCE SEARCH
// ============================================================================

export interface SearchEvidenceParams {
  project_id: string
  search_query?: string
  source_type?: SourceType
  category?: EvidenceCategory
  verified_only?: boolean
  tags?: string[]
  limit?: number
  offset?: number
}

export interface EvidenceSearchResult {
  evidence: EvidenceSource[]
  total: number
  has_more: boolean
}

// ============================================================================
// EVIDENCE VERIFICATION
// ============================================================================

export interface VerifyEvidenceInput {
  evidence_id: string
  verified_by: string
  verification_notes?: string
}

// ============================================================================
// EVIDENCE STATISTICS
// ============================================================================

export interface EvidenceStatistics {
  total_evidence: number
  verified_count: number
  unverified_count: number
  by_source_type: Record<SourceType, number>
  by_category: Record<EvidenceCategory, number>
  by_confidence: Record<ConfidenceLevel, number>
  by_quality: Record<DataQuality, number>
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get source type display name
 */
export function getSourceTypeDisplay(sourceType: SourceType): string {
  const displays: Record<SourceType, string> = {
    pubchem: 'PubChem',
    openfda: 'openFDA',
    orange_book: 'Orange Book',
    dailymed: 'DailyMed',
    clinicaltrials: 'ClinicalTrials.gov',
    pubmed: 'PubMed',
    ema: 'EMA',
    who: 'WHO',
    manual: 'Manual Entry',
    literature: 'Literature',
    internal: 'Internal',
  }
  return displays[sourceType]
}

/**
 * Get confidence level color
 */
export function getConfidenceLevelColor(level?: ConfidenceLevel): string {
  if (!level) return 'gray'
  
  const colors: Record<ConfidenceLevel, string> = {
    high: 'green',
    medium: 'yellow',
    low: 'red',
  }
  return colors[level]
}

/**
 * Get data quality color
 */
export function getDataQualityColor(quality?: DataQuality): string {
  if (!quality) return 'gray'
  
  const colors: Record<DataQuality, string> = {
    excellent: 'green',
    good: 'blue',
    fair: 'yellow',
    poor: 'red',
  }
  return colors[quality]
}

/**
 * Format EV-ID for display
 */
export function formatEvId(evId: string): string {
  return `[${evId}]`
}

/**
 * Parse EV-ID from text
 */
export function parseEvIds(text: string): string[] {
  const regex = /\[EV-\d{3}\]/g
  const matches = text.match(regex)
  return matches ? matches.map(m => m.slice(1, -1)) : []
}

/**
 * Insert EV-ID reference into text
 */
export function insertEvIdReference(
  text: string,
  position: number,
  evId: string
): string {
  const reference = ` ${formatEvId(evId)}`
  return text.slice(0, position) + reference + text.slice(position)
}

/**
 * Get evidence URL
 */
export function getEvidenceUrl(evidence: EvidenceSource): string | undefined {
  if (evidence.source_url) {
    return evidence.source_url
  }
  
  // Generate URL from source_type and source_id
  if (!evidence.source_id) return undefined
  
  const urlTemplates: Partial<Record<SourceType, string>> = {
    pubchem: `https://pubchem.ncbi.nlm.nih.gov/compound/${evidence.source_id}`,
    pubmed: `https://pubmed.ncbi.nlm.nih.gov/${evidence.source_id}`,
    clinicaltrials: `https://clinicaltrials.gov/study/${evidence.source_id}`,
    dailymed: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${evidence.source_id}`,
  }
  
  const template = urlTemplates[evidence.source_type]
  return template
}

/**
 * Format evidence citation
 */
export function formatEvidenceCitation(evidence: EvidenceSource): string {
  const parts: string[] = []
  
  if (evidence.author) {
    parts.push(evidence.author)
  }
  
  if (evidence.title) {
    parts.push(`"${evidence.title}"`)
  }
  
  parts.push(getSourceTypeDisplay(evidence.source_type))
  
  if (evidence.publication_date) {
    parts.push(new Date(evidence.publication_date).getFullYear().toString())
  }
  
  if (evidence.source_id) {
    parts.push(`(${evidence.source_id})`)
  }
  
  return parts.join(', ')
}

/**
 * Check if evidence needs verification
 */
export function needsVerification(evidence: EvidenceSource): boolean {
  return !evidence.verified && evidence.confidence_level !== 'high'
}

/**
 * Get verification status display
 */
export function getVerificationStatusDisplay(evidence: EvidenceSource): {
  text: string
  color: string
  icon: string
} {
  if (evidence.verified) {
    return {
      text: 'Verified',
      color: 'green',
      icon: '✓',
    }
  }
  
  if (needsVerification(evidence)) {
    return {
      text: 'Needs Verification',
      color: 'yellow',
      icon: '⚠',
    }
  }
  
  return {
    text: 'Unverified',
    color: 'gray',
    icon: '○',
  }
}
