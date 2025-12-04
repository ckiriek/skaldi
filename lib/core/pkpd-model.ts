/**
 * Universal PK/PD Model
 * 
 * Pharmacokinetics and Pharmacodynamics data structure.
 * Used in IB Section 7.2 (Effects in Humans - PK/PD).
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Data source for PK/PD information
 */
export type PKPDDataSource = 
  | 'label'          // FDA label clinical pharmacology section
  | 'trials'         // Clinical trial data
  | 'class_based'    // Class-level fallback (deprecated - avoid using)
  | 'sponsor_data'   // Sponsor-provided
  | 'literature'     // Published literature
  | 'not_available'  // No data found from any source

// ============================================================================
// PK INTERFACE
// ============================================================================

/**
 * Distribution parameters
 */
export interface DistributionParams {
  /**
   * Volume of distribution
   * Example: "12-43 L/kg" for small molecules, "3-8 L" for biologics
   */
  vd?: string
  
  /**
   * Protein binding
   * Example: "94-99%"
   */
  protein_binding?: string
  
  /**
   * Tissue distribution description
   */
  tissue_distribution?: string
  
  /**
   * Blood-brain barrier penetration
   */
  cns_penetration?: string
  
  /**
   * Placental transfer
   */
  placental_transfer?: string
  
  /**
   * Breast milk excretion
   */
  breast_milk?: string
}

/**
 * Metabolism parameters
 */
export interface MetabolismParams {
  /**
   * Primary metabolic pathway
   */
  primary_pathway?: string
  
  /**
   * CYP enzymes involved
   */
  enzymes?: string[]
  
  /**
   * Active metabolites
   */
  metabolites?: string[]
  
  /**
   * Metabolite activity
   */
  metabolite_activity?: string
  
  /**
   * First-pass metabolism
   */
  first_pass?: string
}

/**
 * Elimination parameters
 */
export interface EliminationParams {
  /**
   * Primary route of elimination
   */
  route?: string
  
  /**
   * Clearance
   */
  clearance?: string
  
  /**
   * Renal clearance
   */
  renal_clearance?: string
  
  /**
   * Hepatic clearance
   */
  hepatic_clearance?: string
  
  /**
   * Fraction excreted unchanged in urine
   */
  fe_urine?: string
}

/**
 * Special populations PK
 */
export interface SpecialPopulationsPK {
  /**
   * Renal impairment effect
   */
  renal_impairment?: string
  
  /**
   * Hepatic impairment effect
   */
  hepatic_impairment?: string
  
  /**
   * Elderly population
   */
  elderly?: string
  
  /**
   * Pediatric population
   */
  pediatric?: string
  
  /**
   * Gender differences
   */
  gender?: string
  
  /**
   * Race/ethnicity differences
   */
  race?: string
  
  /**
   * Body weight effect
   */
  body_weight?: string
}

/**
 * Universal PK Model
 */
export interface UniversalPK {
  // -------------------------------------------------------------------------
  // BASIC PK PARAMETERS
  // -------------------------------------------------------------------------
  
  /**
   * Elimination half-life
   * Example: "1-6 days" for SSRIs, "14-21 days" for mAbs
   */
  t_half?: string
  
  /**
   * Time to maximum concentration
   */
  tmax?: string
  
  /**
   * Maximum concentration
   */
  cmax?: string
  
  /**
   * Area under the curve
   */
  auc?: string
  
  /**
   * Bioavailability
   */
  bioavailability?: string
  
  // -------------------------------------------------------------------------
  // ADME
  // -------------------------------------------------------------------------
  
  /**
   * Absorption description
   */
  absorption?: string
  
  /**
   * Distribution parameters
   */
  distribution?: DistributionParams
  
  /**
   * Metabolism parameters
   */
  metabolism?: MetabolismParams
  
  /**
   * Elimination parameters
   */
  elimination?: EliminationParams
  
  // -------------------------------------------------------------------------
  // STEADY STATE & ACCUMULATION
  // -------------------------------------------------------------------------
  
  /**
   * Time to steady state
   */
  steady_state?: string
  
  /**
   * Accumulation ratio
   */
  accumulation?: string
  
  /**
   * Dose proportionality
   */
  dose_proportionality?: string
  
  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------
  
  /**
   * Food effect on PK
   */
  food_effect?: string
  
  /**
   * Drug-drug interactions (PK)
   */
  drug_interactions?: string
  
  // -------------------------------------------------------------------------
  // SPECIAL POPULATIONS
  // -------------------------------------------------------------------------
  
  /**
   * Special populations PK
   */
  special_populations?: SpecialPopulationsPK
  
  // -------------------------------------------------------------------------
  // BIOLOGIC-SPECIFIC
  // -------------------------------------------------------------------------
  
  /**
   * Target-mediated drug disposition (for biologics)
   */
  tmdd?: string
  
  /**
   * Immunogenicity effect on PK
   */
  immunogenicity_pk?: string
  
  // -------------------------------------------------------------------------
  // METADATA
  // -------------------------------------------------------------------------
  
  /**
   * Data source
   */
  source: PKPDDataSource
  
  /**
   * Additional sources
   */
  additional_sources?: PKPDDataSource[]
  
  /**
   * Completeness score (0-1)
   */
  completeness_score?: number
}

// ============================================================================
// PD INTERFACE
// ============================================================================

/**
 * Universal PD Model
 */
export interface UniversalPD {
  /**
   * Mechanism of action (detailed)
   */
  mechanism?: string
  
  /**
   * Target biomarker
   */
  target_biomarker?: string
  
  /**
   * Exposure-response relationship
   */
  exposure_response?: string
  
  /**
   * Receptor occupancy (for biologics)
   */
  receptor_occupancy?: string
  
  /**
   * Onset of action
   */
  onset_of_action?: string
  
  /**
   * Duration of effect
   */
  duration_of_effect?: string
  
  /**
   * Pharmacodynamic interactions
   */
  pd_interactions?: string
  
  /**
   * QT/QTc effect
   */
  qt_effect?: string
  
  /**
   * Data source
   */
  source: PKPDDataSource
  
  /**
   * Additional sources
   */
  additional_sources?: PKPDDataSource[]
}

// ============================================================================
// COMBINED INTERFACE
// ============================================================================

/**
 * Combined PK/PD data
 */
export interface UniversalPKPD {
  pk: UniversalPK
  pd: UniversalPD
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if PK data is complete enough for IB
 */
export function hasSufficientPKData(pk: UniversalPK): boolean {
  // Minimum required: t_half OR (tmax AND cmax) OR bioavailability
  return !!(
    pk.t_half ||
    (pk.tmax && pk.cmax) ||
    pk.bioavailability ||
    pk.absorption
  )
}

/**
 * Check if PD data is complete enough for IB
 */
export function hasSufficientPDData(pd: UniversalPD): boolean {
  return !!(pd.mechanism || pd.target_biomarker || pd.exposure_response)
}

/**
 * Calculate PK completeness score
 */
export function calculatePKCompleteness(pk: UniversalPK): number {
  let score = 0
  const maxScore = 15
  
  // Basic parameters (5 points)
  if (pk.t_half) score++
  if (pk.tmax) score++
  if (pk.cmax) score++
  if (pk.auc) score++
  if (pk.bioavailability) score++
  
  // ADME (4 points)
  if (pk.absorption) score++
  if (pk.distribution?.vd || pk.distribution?.protein_binding) score++
  if (pk.metabolism?.primary_pathway || pk.metabolism?.enzymes?.length) score++
  if (pk.elimination?.route || pk.elimination?.clearance) score++
  
  // Additional (4 points)
  if (pk.steady_state) score++
  if (pk.food_effect) score++
  if (pk.special_populations?.renal_impairment) score++
  if (pk.special_populations?.hepatic_impairment) score++
  
  // Dose proportionality and interactions (2 points)
  if (pk.dose_proportionality) score++
  if (pk.drug_interactions) score++
  
  return score / maxScore
}

/**
 * Calculate PD completeness score
 */
export function calculatePDCompleteness(pd: UniversalPD): number {
  let score = 0
  const maxScore = 6
  
  if (pd.mechanism) score++
  if (pd.target_biomarker) score++
  if (pd.exposure_response) score++
  if (pd.onset_of_action) score++
  if (pd.duration_of_effect) score++
  if (pd.qt_effect) score++
  
  return score / maxScore
}

/**
 * Merge PK data from multiple sources
 */
export function mergePKData(
  primary: Partial<UniversalPK>,
  fallback: Partial<UniversalPK>
): UniversalPK {
  const firstValue = <T>(a: T | undefined, b: T | undefined): T | undefined => a ?? b
  
  return {
    // Basic
    t_half: firstValue(primary.t_half, fallback.t_half),
    tmax: firstValue(primary.tmax, fallback.tmax),
    cmax: firstValue(primary.cmax, fallback.cmax),
    auc: firstValue(primary.auc, fallback.auc),
    bioavailability: firstValue(primary.bioavailability, fallback.bioavailability),
    
    // ADME
    absorption: firstValue(primary.absorption, fallback.absorption),
    distribution: {
      vd: firstValue(primary.distribution?.vd, fallback.distribution?.vd),
      protein_binding: firstValue(primary.distribution?.protein_binding, fallback.distribution?.protein_binding),
      tissue_distribution: firstValue(primary.distribution?.tissue_distribution, fallback.distribution?.tissue_distribution),
      cns_penetration: firstValue(primary.distribution?.cns_penetration, fallback.distribution?.cns_penetration),
      placental_transfer: firstValue(primary.distribution?.placental_transfer, fallback.distribution?.placental_transfer),
      breast_milk: firstValue(primary.distribution?.breast_milk, fallback.distribution?.breast_milk)
    },
    metabolism: {
      primary_pathway: firstValue(primary.metabolism?.primary_pathway, fallback.metabolism?.primary_pathway),
      enzymes: firstValue(primary.metabolism?.enzymes, fallback.metabolism?.enzymes),
      metabolites: firstValue(primary.metabolism?.metabolites, fallback.metabolism?.metabolites),
      metabolite_activity: firstValue(primary.metabolism?.metabolite_activity, fallback.metabolism?.metabolite_activity),
      first_pass: firstValue(primary.metabolism?.first_pass, fallback.metabolism?.first_pass)
    },
    elimination: {
      route: firstValue(primary.elimination?.route, fallback.elimination?.route),
      clearance: firstValue(primary.elimination?.clearance, fallback.elimination?.clearance),
      renal_clearance: firstValue(primary.elimination?.renal_clearance, fallback.elimination?.renal_clearance),
      hepatic_clearance: firstValue(primary.elimination?.hepatic_clearance, fallback.elimination?.hepatic_clearance),
      fe_urine: firstValue(primary.elimination?.fe_urine, fallback.elimination?.fe_urine)
    },
    
    // Steady state
    steady_state: firstValue(primary.steady_state, fallback.steady_state),
    accumulation: firstValue(primary.accumulation, fallback.accumulation),
    dose_proportionality: firstValue(primary.dose_proportionality, fallback.dose_proportionality),
    
    // Effects
    food_effect: firstValue(primary.food_effect, fallback.food_effect),
    drug_interactions: firstValue(primary.drug_interactions, fallback.drug_interactions),
    
    // Special populations
    special_populations: {
      renal_impairment: firstValue(primary.special_populations?.renal_impairment, fallback.special_populations?.renal_impairment),
      hepatic_impairment: firstValue(primary.special_populations?.hepatic_impairment, fallback.special_populations?.hepatic_impairment),
      elderly: firstValue(primary.special_populations?.elderly, fallback.special_populations?.elderly),
      pediatric: firstValue(primary.special_populations?.pediatric, fallback.special_populations?.pediatric),
      gender: firstValue(primary.special_populations?.gender, fallback.special_populations?.gender),
      race: firstValue(primary.special_populations?.race, fallback.special_populations?.race),
      body_weight: firstValue(primary.special_populations?.body_weight, fallback.special_populations?.body_weight)
    },
    
    // Biologic-specific
    tmdd: firstValue(primary.tmdd, fallback.tmdd),
    immunogenicity_pk: firstValue(primary.immunogenicity_pk, fallback.immunogenicity_pk),
    
    // Metadata
    source: primary.source || fallback.source || 'class_based',
    additional_sources: [
      ...(primary.additional_sources || []),
      ...(fallback.additional_sources || [])
    ].filter((v, i, a) => a.indexOf(v) === i)
  }
}

/**
 * Merge PD data from multiple sources
 */
export function mergePDData(
  primary: Partial<UniversalPD>,
  fallback: Partial<UniversalPD>
): UniversalPD {
  const firstValue = <T>(a: T | undefined, b: T | undefined): T | undefined => a ?? b
  
  return {
    mechanism: firstValue(primary.mechanism, fallback.mechanism),
    target_biomarker: firstValue(primary.target_biomarker, fallback.target_biomarker),
    exposure_response: firstValue(primary.exposure_response, fallback.exposure_response),
    receptor_occupancy: firstValue(primary.receptor_occupancy, fallback.receptor_occupancy),
    onset_of_action: firstValue(primary.onset_of_action, fallback.onset_of_action),
    duration_of_effect: firstValue(primary.duration_of_effect, fallback.duration_of_effect),
    pd_interactions: firstValue(primary.pd_interactions, fallback.pd_interactions),
    qt_effect: firstValue(primary.qt_effect, fallback.qt_effect),
    source: primary.source || fallback.source || 'class_based',
    additional_sources: [
      ...(primary.additional_sources || []),
      ...(fallback.additional_sources || [])
    ].filter((v, i, a) => a.indexOf(v) === i)
  }
}

/**
 * Create empty PK structure
 */
export function createEmptyPK(): UniversalPK {
  return {
    source: 'class_based'
  }
}

/**
 * Create empty PD structure
 */
export function createEmptyPD(): UniversalPD {
  return {
    source: 'class_based'
  }
}

/**
 * Validate PK/PD data
 */
export function validatePKPD(pkpd: UniversalPKPD): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!hasSufficientPKData(pkpd.pk)) {
    warnings.push('Insufficient PK data - using class-level fallback')
  }
  
  if (!hasSufficientPDData(pkpd.pd)) {
    warnings.push('Insufficient PD data - using class-level fallback')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
