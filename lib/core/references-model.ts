/**
 * Universal References Model
 * 
 * Auto-generated references for IB and other clinical documents.
 * Includes regulatory labels, clinical trial IDs, and publications.
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Reference source type
 */
export type ReferenceSource = 
  | 'FDA'            // US FDA
  | 'EMA'            // European Medicines Agency
  | 'MHRA'           // UK MHRA
  | 'PMDA'           // Japan PMDA
  | 'TGA'            // Australia TGA
  | 'Health_Canada'  // Health Canada
  | 'ClinicalTrials' // ClinicalTrials.gov
  | 'PubMed'         // PubMed/MEDLINE
  | 'PubChem'        // PubChem
  | 'Other'          // Other sources

/**
 * Reference type
 */
export type ReferenceType = 
  | 'label'          // Regulatory label/prescribing information
  | 'epar'           // European Public Assessment Report
  | 'clinical_trial' // Clinical trial registration
  | 'publication'    // Scientific publication
  | 'guideline'      // Regulatory guideline
  | 'class_review'   // Class review/meta-analysis
  | 'database'       // Database entry

// ============================================================================
// REFERENCE INTERFACES
// ============================================================================

/**
 * Regulatory label reference
 */
export interface LabelReference {
  /**
   * Regulatory source
   */
  source: 'FDA' | 'EMA' | 'MHRA' | 'PMDA' | 'TGA' | 'Health_Canada'
  
  /**
   * Product name
   */
  product_name: string
  
  /**
   * Application number (e.g., NDA, BLA)
   */
  application_number?: string
  
  /**
   * Approval date
   */
  approval_date?: string
  
  /**
   * Label revision date
   */
  revision_date?: string
  
  /**
   * URL to label
   */
  url?: string
  
  /**
   * SetID (for DailyMed)
   */
  setid?: string
}

/**
 * EPAR reference
 */
export interface EparReference {
  /**
   * Product name
   */
  product_name: string
  
  /**
   * INN
   */
  inn?: string
  
  /**
   * Procedure number
   */
  procedure_number?: string
  
  /**
   * Authorization date
   */
  authorization_date?: string
  
  /**
   * URL to EPAR
   */
  url?: string
  
  /**
   * Document type (initial, variation, etc.)
   */
  document_type?: string
}

/**
 * Clinical trial reference
 */
export interface ClinicalTrialReference {
  /**
   * NCT ID
   */
  nct_id: string
  
  /**
   * Trial title
   */
  title: string
  
  /**
   * Phase
   */
  phase?: number
  
  /**
   * Status
   */
  status?: string
  
  /**
   * Has results
   */
  has_results?: boolean
  
  /**
   * URL
   */
  url?: string
}

/**
 * Publication reference
 */
export interface Publication {
  /**
   * PubMed ID
   */
  pmid?: string
  
  /**
   * DOI
   */
  doi?: string
  
  /**
   * Title
   */
  title: string
  
  /**
   * Authors (formatted string)
   */
  authors: string
  
  /**
   * Journal name
   */
  journal: string
  
  /**
   * Publication year
   */
  year: number
  
  /**
   * Volume
   */
  volume?: string
  
  /**
   * Issue
   */
  issue?: string
  
  /**
   * Pages
   */
  pages?: string
  
  /**
   * Abstract
   */
  abstract?: string
  
  /**
   * URL
   */
  url?: string
  
  /**
   * Publication type
   */
  publication_type?: 'original' | 'review' | 'meta_analysis' | 'case_report' | 'guideline' | 'other'
}

/**
 * Class review reference
 */
export interface ClassReview {
  /**
   * Title
   */
  title: string
  
  /**
   * Therapeutic class
   */
  therapeutic_class: string
  
  /**
   * Source
   */
  source: string
  
  /**
   * Year
   */
  year?: number
  
  /**
   * URL
   */
  url?: string
  
  /**
   * Key findings summary
   */
  summary?: string
}

// ============================================================================
// MAIN INTERFACE
// ============================================================================

/**
 * Universal References Model
 * 
 * Container for all references used in document generation.
 */
export interface UniversalReferences {
  /**
   * Regulatory labels
   */
  labels: LabelReference[]
  
  /**
   * EPAR documents
   */
  epar_documents: EparReference[]
  
  /**
   * Clinical trial IDs referenced
   */
  clinical_trial_ids: string[]
  
  /**
   * Detailed clinical trial references
   */
  clinical_trials: ClinicalTrialReference[]
  
  /**
   * Publications
   */
  publications: Publication[]
  
  /**
   * Class reviews
   */
  class_reviews: ClassReview[]
  
  /**
   * Formatted reference list (for document output)
   */
  formatted_list?: string[]
  
  /**
   * Last updated timestamp
   */
  last_updated: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format a label reference for citation
 */
export function formatLabelCitation(label: LabelReference): string {
  const parts: string[] = []
  
  parts.push(label.product_name)
  
  if (label.application_number) {
    parts.push(`(${label.application_number})`)
  }
  
  parts.push('Prescribing Information.')
  parts.push(label.source + '.')
  
  if (label.revision_date) {
    parts.push(`Revised ${label.revision_date}.`)
  }
  
  if (label.url) {
    parts.push(`Available at: ${label.url}`)
  }
  
  return parts.join(' ')
}

/**
 * Format a publication reference for citation
 */
export function formatPublicationCitation(pub: Publication): string {
  const parts: string[] = []
  
  // Authors
  parts.push(pub.authors + '.')
  
  // Title
  parts.push(pub.title + '.')
  
  // Journal
  parts.push(pub.journal + '.')
  
  // Year
  parts.push(pub.year.toString())
  
  // Volume/Issue/Pages
  if (pub.volume) {
    let volPart = `;${pub.volume}`
    if (pub.issue) volPart += `(${pub.issue})`
    if (pub.pages) volPart += `:${pub.pages}`
    parts.push(volPart + '.')
  }
  
  // DOI or PMID
  if (pub.doi) {
    parts.push(`doi:${pub.doi}`)
  } else if (pub.pmid) {
    parts.push(`PMID:${pub.pmid}`)
  }
  
  return parts.join(' ')
}

/**
 * Format a clinical trial reference for citation
 */
export function formatTrialCitation(trial: ClinicalTrialReference): string {
  const parts: string[] = []
  
  parts.push(trial.nct_id + '.')
  parts.push(trial.title + '.')
  parts.push('ClinicalTrials.gov.')
  
  if (trial.url) {
    parts.push(`Available at: ${trial.url}`)
  } else {
    parts.push(`Available at: https://clinicaltrials.gov/study/${trial.nct_id}`)
  }
  
  return parts.join(' ')
}

/**
 * Generate formatted reference list
 */
export function generateFormattedReferenceList(refs: UniversalReferences): string[] {
  const formatted: string[] = []
  let refNum = 1
  
  // Labels first
  for (const label of refs.labels) {
    formatted.push(`${refNum}. ${formatLabelCitation(label)}`)
    refNum++
  }
  
  // EPARs
  for (const epar of refs.epar_documents) {
    formatted.push(`${refNum}. ${epar.product_name}. European Public Assessment Report. EMA. ${epar.url || ''}`)
    refNum++
  }
  
  // Clinical trials
  for (const trial of refs.clinical_trials) {
    formatted.push(`${refNum}. ${formatTrialCitation(trial)}`)
    refNum++
  }
  
  // Publications
  for (const pub of refs.publications) {
    formatted.push(`${refNum}. ${formatPublicationCitation(pub)}`)
    refNum++
  }
  
  // Class reviews
  for (const review of refs.class_reviews) {
    formatted.push(`${refNum}. ${review.title}. ${review.source}. ${review.year || ''}`)
    refNum++
  }
  
  return formatted
}

/**
 * Create empty references structure
 */
export function createEmptyReferences(): UniversalReferences {
  return {
    labels: [],
    epar_documents: [],
    clinical_trial_ids: [],
    clinical_trials: [],
    publications: [],
    class_reviews: [],
    last_updated: new Date().toISOString()
  }
}

/**
 * Merge references from multiple sources
 */
export function mergeReferences(
  primary: Partial<UniversalReferences>,
  secondary: Partial<UniversalReferences>
): UniversalReferences {
  // Helper to merge arrays and deduplicate
  const mergeArrays = <T>(a: T[] | undefined, b: T[] | undefined, keyFn: (item: T) => string): T[] => {
    const combined = [...(a || []), ...(b || [])]
    const seen = new Set<string>()
    return combined.filter(item => {
      const key = keyFn(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  
  return {
    labels: mergeArrays(
      primary.labels,
      secondary.labels,
      (l) => `${l.source}-${l.product_name}`
    ),
    epar_documents: mergeArrays(
      primary.epar_documents,
      secondary.epar_documents,
      (e) => e.product_name
    ),
    clinical_trial_ids: Array.from(new Set([
      ...(primary.clinical_trial_ids || []),
      ...(secondary.clinical_trial_ids || [])
    ])),
    clinical_trials: mergeArrays(
      primary.clinical_trials,
      secondary.clinical_trials,
      (t) => t.nct_id
    ),
    publications: mergeArrays(
      primary.publications,
      secondary.publications,
      (p) => p.pmid || p.doi || p.title
    ),
    class_reviews: mergeArrays(
      primary.class_reviews,
      secondary.class_reviews,
      (r) => r.title
    ),
    last_updated: new Date().toISOString()
  }
}

/**
 * Build references from enrichment data
 */
export function buildReferencesFromEnrichment(
  compoundName: string,
  labelData: { source?: string; setid?: string; product_name?: string } | null,
  trials: Array<{ nct_id?: string; external_id?: string; title?: string; phase?: number; status?: string; has_results?: boolean }>,
  publications: Array<{ pmid?: string; doi?: string; title?: string; authors?: string; journal?: string; year?: number }>
): UniversalReferences {
  const refs = createEmptyReferences()
  
  // Add label reference
  if (labelData?.setid) {
    refs.labels.push({
      source: 'FDA',
      product_name: labelData.product_name || compoundName,
      setid: labelData.setid,
      url: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${labelData.setid}`
    })
  }
  
  // Add clinical trial references
  for (const trial of trials) {
    const nctId = trial.nct_id || trial.external_id
    if (nctId) {
      refs.clinical_trial_ids.push(nctId)
      refs.clinical_trials.push({
        nct_id: nctId,
        title: trial.title || 'Unknown',
        phase: trial.phase,
        status: trial.status,
        has_results: trial.has_results,
        url: `https://clinicaltrials.gov/study/${nctId}`
      })
    }
  }
  
  // Add publications
  for (const pub of publications) {
    if (pub.title) {
      refs.publications.push({
        pmid: pub.pmid,
        doi: pub.doi,
        title: pub.title,
        authors: pub.authors || 'Unknown',
        journal: pub.journal || 'Unknown',
        year: pub.year || new Date().getFullYear()
      })
    }
  }
  
  // Generate formatted list
  refs.formatted_list = generateFormattedReferenceList(refs)
  
  return refs
}

/**
 * Validate references
 */
export function validateReferences(refs: UniversalReferences): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (refs.labels.length === 0) {
    warnings.push('No regulatory labels referenced')
  }
  
  if (refs.clinical_trials.length === 0) {
    warnings.push('No clinical trials referenced')
  }
  
  // Check for duplicate NCT IDs
  const nctIds = refs.clinical_trial_ids
  const uniqueNctIds = new Set(nctIds)
  if (nctIds.length !== uniqueNctIds.size) {
    warnings.push('Duplicate clinical trial IDs found')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
