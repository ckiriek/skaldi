/**
 * Project Types for Asetria Writer
 * Includes Product Type (Innovator/Generic/Hybrid) and RLD information
 */

export type ProductType = 'innovator' | 'generic' | 'hybrid'

export type EnrichmentStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

export interface Project {
  id: string
  org_id: string
  title: string
  
  // Product Type & Compound
  product_type: ProductType
  compound_name?: string
  
  // Study Information
  phase?: string
  indication?: string
  drug_class?: string
  countries?: string[]
  design_json?: StudyDesign
  
  // RLD Information (for Generic products)
  rld_brand_name?: string
  rld_application_number?: string // e.g., NDA020357
  te_code?: string // Therapeutic Equivalence code (e.g., AB)
  
  // Compound Identification
  inchikey?: string // Canonical chemical identifier from PubChem
  
  // Enrichment Status
  enrichment_status: EnrichmentStatus
  enrichment_completed_at?: string
  enrichment_metadata?: EnrichmentMetadata
  
  // Audit
  created_by: string
  created_at: string
  updated_at?: string
}

export interface StudyDesign {
  design_type: 'randomized' | 'non-randomized' | 'observational'
  blinding: 'open-label' | 'single-blind' | 'double-blind'
  arms: number
  duration_weeks: number
  primary_endpoint?: string
}

export interface EnrichmentMetadata {
  // Sources used
  sources_used: string[] // ['openFDA', 'PubChem', 'ClinicalTrials.gov']
  
  // Coverage scores (0-1)
  coverage: {
    compound_identity: number // InChIKey resolved?
    labels: number // FDA/EMA labels found?
    nonclinical: number // Nonclinical data completeness
    clinical: number // Clinical data completeness
    literature: number // References found
  }
  
  // Errors encountered
  errors?: Array<{
    code: string // E101_ENRICH_TIMEOUT, E301_IDENTITY_UNRESOLVED
    message: string
    source: string
    severity: 'error' | 'warning'
  }>
  
  // Timing
  started_at: string
  completed_at: string
  duration_ms: number
  
  // Data counts
  records_fetched: {
    labels: number
    trials: number
    literature: number
    adverse_events: number
  }
}

/**
 * Product Type Descriptions
 */
export const PRODUCT_TYPE_INFO: Record<ProductType, {
  label: string
  description: string
  requiresRLD: boolean
  enrichmentMandatory: boolean
}> = {
  innovator: {
    label: 'Innovator / Original Compound',
    description: 'New drug with full nonclinical and clinical data from sponsor',
    requiresRLD: false,
    enrichmentMandatory: false,
  },
  generic: {
    label: 'Generic Drug',
    description: 'Based on existing approved product (RLD) — we\'ll auto-fetch data from FDA/EMA',
    requiresRLD: true,
    enrichmentMandatory: true,
  },
  hybrid: {
    label: 'Hybrid / Combination Product',
    description: 'Modified release, fixed-dose combination, or biosimilar',
    requiresRLD: false,
    enrichmentMandatory: true, // Partial enrichment
  },
}

/**
 * Validation helpers
 */
export function validateProjectForEnrichment(project: Partial<Project>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!project.product_type) {
    errors.push('Product type is required')
  }
  
  if (!project.compound_name) {
    errors.push('Compound name is required')
  }
  
  // Generic-specific validation
  if (project.product_type === 'generic') {
    if (!project.rld_brand_name) {
      errors.push('RLD brand name is required for generic products')
    }
    // Note: rld_application_number and te_code are auto-fetched from FDA Orange Book
    // based on rld_brand_name, so they are not required in the intake request
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check if enrichment should be triggered
 */
export function shouldTriggerEnrichment(project: Project): boolean {
  const info = PRODUCT_TYPE_INFO[project.product_type]
  
  // Skip if already completed
  if (project.enrichment_status === 'completed') {
    return false
  }
  
  // Skip if failed and not retrying
  if (project.enrichment_status === 'failed') {
    return false
  }
  
  // Mandatory for generic
  if (project.product_type === 'generic') {
    return true
  }
  
  // Mandatory for hybrid
  if (project.product_type === 'hybrid') {
    return true
  }
  
  // Optional for innovator (user can trigger manually)
  return false
}

/**
 * Get enabled agents based on product type
 */
export function getEnabledAgents(productType: ProductType): {
  intake: boolean
  regulatoryData: boolean
  composer: boolean
  writer: boolean
  validator: boolean
  assembler: boolean
  reviewer: boolean
} {
  const baseAgents = {
    intake: true,
    composer: true,
    writer: true,
    validator: true,
    assembler: true,
    reviewer: true,
  }
  
  return {
    ...baseAgents,
    regulatoryData: productType === 'generic' || productType === 'hybrid',
  }
}
