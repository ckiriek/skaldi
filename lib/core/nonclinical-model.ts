/**
 * Universal Nonclinical Model
 * 
 * Nonclinical (preclinical) data structure for IB Section 6.
 * Covers pharmacology and toxicology studies.
 * 
 * Supports Phase 2/3/4 requirements (not Phase 1 FIH studies).
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Data source for nonclinical information
 */
export type NonclinicalDataSource = 
  | 'label'          // FDA label nonclinical section
  | 'epar'           // EMA EPAR
  | 'class_based'    // Class-level fallback (deprecated - avoid using)
  | 'sponsor_data'   // Sponsor-provided data
  | 'literature'     // Published literature
  | 'not_available'  // No data found from any source

/**
 * NOAEL (No Observed Adverse Effect Level) data
 */
export interface NOAELData {
  /**
   * NOAEL value with units
   * Example: "10 mg/kg/day"
   */
  value: string
  
  /**
   * Species in which NOAEL was determined
   */
  species: string
  
  /**
   * Study duration
   * Example: "26 weeks"
   */
  duration: string
  
  /**
   * Route of administration in the study
   */
  route?: string
  
  /**
   * Safety margin relative to human dose
   */
  safety_margin?: string
}

/**
 * Toxicity study summary
 */
export interface ToxicityStudySummary {
  /**
   * Study type
   */
  study_type: string
  
  /**
   * Species used
   */
  species: string[]
  
  /**
   * Duration
   */
  duration: string
  
  /**
   * Key findings
   */
  findings: string
  
  /**
   * NOAEL if determined
   */
  noael?: string
  
  /**
   * Reversibility of findings
   */
  reversibility?: string
}

// ============================================================================
// MAIN INTERFACE
// ============================================================================

/**
 * Universal Nonclinical Model
 * 
 * Comprehensive nonclinical data structure for IB generation.
 * Aligned with ICH M3(R2) and CTD Module 2.4/2.6.
 */
export interface UniversalNonclinical {
  // -------------------------------------------------------------------------
  // PHARMACOLOGY
  // -------------------------------------------------------------------------
  
  /**
   * Primary pharmacodynamics
   * Mechanism of action studies, receptor binding, etc.
   */
  primary_pharmacodynamics?: string
  
  /**
   * Secondary pharmacodynamics
   * Off-target effects, selectivity studies
   */
  secondary_pharmacodynamics?: string
  
  /**
   * Safety pharmacology
   * Core battery: CV, CNS, respiratory
   */
  safety_pharmacology?: string
  
  /**
   * Pharmacodynamic drug interactions
   */
  pd_interactions?: string
  
  // -------------------------------------------------------------------------
  // PHARMACOKINETICS IN ANIMALS
  // -------------------------------------------------------------------------
  
  /**
   * PK in animals summary
   * ADME in relevant species
   */
  pk_in_animals?: string
  
  /**
   * Species comparison
   * Relevance of animal species to humans
   */
  species_comparison?: string
  
  /**
   * Absorption in animals
   */
  absorption_animals?: string
  
  /**
   * Distribution in animals
   */
  distribution_animals?: string
  
  /**
   * Metabolism in animals
   */
  metabolism_animals?: string
  
  /**
   * Excretion in animals
   */
  excretion_animals?: string
  
  // -------------------------------------------------------------------------
  // TOXICOLOGY
  // -------------------------------------------------------------------------
  
  /**
   * Single-dose toxicity
   * Acute toxicity studies
   */
  single_dose_toxicity?: string
  
  /**
   * Repeat-dose toxicity
   * Subacute, subchronic, chronic studies
   */
  repeat_dose_toxicity?: string
  
  /**
   * Genotoxicity
   * In vitro and in vivo genetic toxicology
   */
  genotoxicity?: string
  
  /**
   * Carcinogenicity
   * Long-term carcinogenicity studies
   */
  carcinogenicity?: string
  
  /**
   * Reproductive toxicity
   * Fertility and early embryonic development
   */
  reproductive_toxicity?: string
  
  /**
   * Developmental toxicity
   * Embryo-fetal development, pre/postnatal
   */
  developmental_toxicity?: string
  
  /**
   * Local tolerance
   * Injection site, dermal, ocular tolerance
   */
  local_tolerance?: string
  
  /**
   * Other toxicity studies
   * Immunotoxicity, phototoxicity, etc.
   */
  other_toxicity_studies?: string
  
  // -------------------------------------------------------------------------
  // BIOLOGIC-SPECIFIC
  // -------------------------------------------------------------------------
  
  /**
   * Immunotoxicity (especially for biologics)
   */
  immunotoxicity?: string
  
  /**
   * Tissue cross-reactivity (for biologics)
   */
  tissue_cross_reactivity?: string
  
  // -------------------------------------------------------------------------
  // KEY FINDINGS
  // -------------------------------------------------------------------------
  
  /**
   * Target organs identified in toxicity studies
   */
  target_organs?: string[]
  
  /**
   * NOAEL data
   */
  noael?: NOAELData
  
  /**
   * Detailed toxicity study summaries
   */
  toxicity_studies?: ToxicityStudySummary[]
  
  /**
   * Overall nonclinical assessment summary
   */
  overall_assessment?: string
  
  // -------------------------------------------------------------------------
  // METADATA
  // -------------------------------------------------------------------------
  
  /**
   * Primary data source
   */
  source: NonclinicalDataSource
  
  /**
   * Additional sources used
   */
  additional_sources?: NonclinicalDataSource[]
  
  /**
   * Data completeness score (0-1)
   */
  completeness_score?: number
  
  /**
   * Last updated timestamp
   */
  last_updated?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if nonclinical data has pharmacology section
 */
export function hasPharmacologyData(nonclinical: UniversalNonclinical): boolean {
  return !!(
    nonclinical.primary_pharmacodynamics ||
    nonclinical.secondary_pharmacodynamics ||
    nonclinical.safety_pharmacology
  )
}

/**
 * Check if nonclinical data has toxicology section
 */
export function hasToxicologyData(nonclinical: UniversalNonclinical): boolean {
  return !!(
    nonclinical.single_dose_toxicity ||
    nonclinical.repeat_dose_toxicity ||
    nonclinical.genotoxicity ||
    nonclinical.carcinogenicity ||
    nonclinical.reproductive_toxicity
  )
}

/**
 * Calculate nonclinical data completeness
 */
export function calculateNonclinicalCompleteness(nonclinical: UniversalNonclinical): number {
  let score = 0
  const maxScore = 15
  
  // Pharmacology (3 points)
  if (nonclinical.primary_pharmacodynamics) score++
  if (nonclinical.secondary_pharmacodynamics) score++
  if (nonclinical.safety_pharmacology) score++
  
  // PK in animals (2 points)
  if (nonclinical.pk_in_animals) score++
  if (nonclinical.species_comparison) score++
  
  // Toxicology (8 points)
  if (nonclinical.single_dose_toxicity) score++
  if (nonclinical.repeat_dose_toxicity) score++
  if (nonclinical.genotoxicity) score++
  if (nonclinical.carcinogenicity) score++
  if (nonclinical.reproductive_toxicity) score++
  if (nonclinical.developmental_toxicity) score++
  if (nonclinical.local_tolerance) score++
  if (nonclinical.other_toxicity_studies) score++
  
  // Key findings (2 points)
  if (nonclinical.target_organs?.length) score++
  if (nonclinical.noael) score++
  
  return score / maxScore
}

/**
 * Get required nonclinical sections based on compound type
 */
export function getRequiredNonclinicalSections(compoundType: string): string[] {
  const baseSections = [
    'primary_pharmacodynamics',
    'safety_pharmacology',
    'pk_in_animals',
    'single_dose_toxicity',
    'repeat_dose_toxicity',
    'genotoxicity',
    'reproductive_toxicity'
  ]
  
  if (compoundType === 'biologic' || compoundType === 'biosimilar') {
    return [
      ...baseSections,
      'immunotoxicity',
      'tissue_cross_reactivity'
    ]
  }
  
  return baseSections
}

/**
 * Merge nonclinical data from multiple sources
 */
export function mergeNonclinicalData(
  primary: Partial<UniversalNonclinical>,
  fallback: Partial<UniversalNonclinical>
): UniversalNonclinical {
  const firstValue = <T>(a: T | undefined, b: T | undefined): T | undefined => a ?? b
  
  return {
    // Pharmacology
    primary_pharmacodynamics: firstValue(primary.primary_pharmacodynamics, fallback.primary_pharmacodynamics),
    secondary_pharmacodynamics: firstValue(primary.secondary_pharmacodynamics, fallback.secondary_pharmacodynamics),
    safety_pharmacology: firstValue(primary.safety_pharmacology, fallback.safety_pharmacology),
    pd_interactions: firstValue(primary.pd_interactions, fallback.pd_interactions),
    
    // PK in animals
    pk_in_animals: firstValue(primary.pk_in_animals, fallback.pk_in_animals),
    species_comparison: firstValue(primary.species_comparison, fallback.species_comparison),
    absorption_animals: firstValue(primary.absorption_animals, fallback.absorption_animals),
    distribution_animals: firstValue(primary.distribution_animals, fallback.distribution_animals),
    metabolism_animals: firstValue(primary.metabolism_animals, fallback.metabolism_animals),
    excretion_animals: firstValue(primary.excretion_animals, fallback.excretion_animals),
    
    // Toxicology
    single_dose_toxicity: firstValue(primary.single_dose_toxicity, fallback.single_dose_toxicity),
    repeat_dose_toxicity: firstValue(primary.repeat_dose_toxicity, fallback.repeat_dose_toxicity),
    genotoxicity: firstValue(primary.genotoxicity, fallback.genotoxicity),
    carcinogenicity: firstValue(primary.carcinogenicity, fallback.carcinogenicity),
    reproductive_toxicity: firstValue(primary.reproductive_toxicity, fallback.reproductive_toxicity),
    developmental_toxicity: firstValue(primary.developmental_toxicity, fallback.developmental_toxicity),
    local_tolerance: firstValue(primary.local_tolerance, fallback.local_tolerance),
    other_toxicity_studies: firstValue(primary.other_toxicity_studies, fallback.other_toxicity_studies),
    
    // Biologic-specific
    immunotoxicity: firstValue(primary.immunotoxicity, fallback.immunotoxicity),
    tissue_cross_reactivity: firstValue(primary.tissue_cross_reactivity, fallback.tissue_cross_reactivity),
    
    // Key findings
    target_organs: firstValue(primary.target_organs, fallback.target_organs),
    noael: firstValue(primary.noael, fallback.noael),
    toxicity_studies: firstValue(primary.toxicity_studies, fallback.toxicity_studies),
    overall_assessment: firstValue(primary.overall_assessment, fallback.overall_assessment),
    
    // Metadata
    source: primary.source || fallback.source || 'class_based',
    additional_sources: [
      ...(primary.additional_sources || []),
      ...(fallback.additional_sources || [])
    ].filter((v, i, a) => a.indexOf(v) === i),
    last_updated: new Date().toISOString()
  }
}

/**
 * Validate nonclinical data
 */
export function validateNonclinical(nonclinical: UniversalNonclinical): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check for minimum required data
  if (!hasPharmacologyData(nonclinical)) {
    warnings.push('No pharmacology data available')
  }
  
  if (!hasToxicologyData(nonclinical)) {
    warnings.push('No toxicology data available')
  }
  
  if (!nonclinical.target_organs?.length) {
    warnings.push('Target organs not identified')
  }
  
  if (!nonclinical.genotoxicity) {
    warnings.push('Genotoxicity data not available')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Create empty nonclinical structure
 */
export function createEmptyNonclinical(): UniversalNonclinical {
  return {
    source: 'class_based',
    last_updated: new Date().toISOString()
  }
}
