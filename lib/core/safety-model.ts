/**
 * Universal Safety Model
 * 
 * Safety data structure for IB Section 7.4 and Section 8.
 * Includes adverse events, warnings, precautions, and special populations.
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Data source for safety information
 */
export type SafetyDataSource = 
  | 'label'          // FDA label
  | 'faers'          // FDA Adverse Event Reporting System
  | 'epar'           // EMA EPAR
  | 'trials'         // Clinical trial data
  | 'class_based'    // Class-level fallback (deprecated - avoid using)
  | 'sponsor_data'   // Sponsor-provided
  | 'not_available'  // No data found from any source

/**
 * Adverse event severity
 */
export type AESeverity = 'mild' | 'moderate' | 'severe' | 'life_threatening' | 'fatal'

/**
 * Drug interaction severity
 */
export type InteractionSeverity = 'major' | 'moderate' | 'minor'

// ============================================================================
// ADVERSE EVENT INTERFACES
// ============================================================================

/**
 * Individual adverse event
 */
export interface AdverseEvent {
  /**
   * Preferred term (MedDRA)
   */
  term: string
  
  /**
   * System Organ Class (MedDRA SOC)
   */
  soc?: string
  
  /**
   * Frequency/incidence (0-1)
   */
  frequency?: number
  
  /**
   * Frequency category
   */
  frequency_category?: 'very_common' | 'common' | 'uncommon' | 'rare' | 'very_rare' | 'unknown'
  
  /**
   * Typical severity
   */
  severity?: AESeverity
  
  /**
   * Is this a serious AE?
   */
  serious?: boolean
  
  /**
   * Description/notes
   */
  description?: string
}

/**
 * Drug interaction
 */
export interface DrugInteraction {
  /**
   * Interacting drug or class
   */
  drug: string
  
  /**
   * Mechanism of interaction
   */
  mechanism: string
  
  /**
   * Severity
   */
  severity: InteractionSeverity
  
  /**
   * Clinical recommendation
   */
  recommendation: string
  
  /**
   * Effect description
   */
  effect?: string
}

/**
 * Special population safety data
 */
export interface SpecialPopulationSafety {
  /**
   * Pregnancy considerations
   */
  pregnancy?: string
  
  /**
   * Pregnancy category (if applicable)
   */
  pregnancy_category?: string
  
  /**
   * Lactation considerations
   */
  lactation?: string
  
  /**
   * Pediatric use
   */
  pediatric?: string
  
  /**
   * Geriatric use
   */
  geriatric?: string
  
  /**
   * Renal impairment
   */
  renal_impairment?: string
  
  /**
   * Hepatic impairment
   */
  hepatic_impairment?: string
  
  /**
   * Females of reproductive potential
   */
  females_reproductive?: string
  
  /**
   * Males of reproductive potential
   */
  males_reproductive?: string
}

// ============================================================================
// MAIN INTERFACE
// ============================================================================

/**
 * Universal Safety Model
 * 
 * Comprehensive safety data structure for IB generation.
 */
export interface UniversalSafety {
  // -------------------------------------------------------------------------
  // ADVERSE EVENTS
  // -------------------------------------------------------------------------
  
  /**
   * Common adverse events (incidence >= 5%)
   */
  common_ae: AdverseEvent[]
  
  /**
   * Serious adverse events
   */
  serious_ae: AdverseEvent[]
  
  /**
   * Adverse events of special interest
   */
  aes_of_special_interest: AdverseEvent[]
  
  /**
   * All adverse events (full list)
   */
  all_ae?: AdverseEvent[]
  
  // -------------------------------------------------------------------------
  // WARNINGS & PRECAUTIONS
  // -------------------------------------------------------------------------
  
  /**
   * Boxed warning (if any)
   */
  boxed_warning?: string
  
  /**
   * Key warnings
   */
  warnings: string[]
  
  /**
   * Precautions
   */
  precautions: string[]
  
  /**
   * Contraindications
   */
  contraindications: string[]
  
  // -------------------------------------------------------------------------
  // INTERACTIONS
  // -------------------------------------------------------------------------
  
  /**
   * Drug-drug interactions
   */
  drug_interactions: DrugInteraction[]
  
  /**
   * Food interactions
   */
  food_interactions?: string[]
  
  /**
   * Lab test interactions
   */
  lab_interactions?: string[]
  
  // -------------------------------------------------------------------------
  // SPECIAL POPULATIONS
  // -------------------------------------------------------------------------
  
  /**
   * Special populations safety data
   */
  special_populations: SpecialPopulationSafety
  
  // -------------------------------------------------------------------------
  // OVERDOSE
  // -------------------------------------------------------------------------
  
  /**
   * Overdose information
   */
  overdose?: {
    /**
     * Signs and symptoms
     */
    signs_symptoms?: string
    
    /**
     * Treatment/management
     */
    treatment?: string
    
    /**
     * Antidote (if any)
     */
    antidote?: string
  }
  
  // -------------------------------------------------------------------------
  // ABUSE & DEPENDENCE
  // -------------------------------------------------------------------------
  
  /**
   * Abuse potential
   */
  abuse_potential?: string
  
  /**
   * Dependence information
   */
  dependence?: string
  
  /**
   * Controlled substance schedule
   */
  controlled_schedule?: string
  
  // -------------------------------------------------------------------------
  // BIOLOGIC-SPECIFIC
  // -------------------------------------------------------------------------
  
  /**
   * Immunogenicity (for biologics)
   */
  immunogenicity?: string
  
  /**
   * Infusion/injection reactions
   */
  infusion_reactions?: string
  
  // -------------------------------------------------------------------------
  // METADATA
  // -------------------------------------------------------------------------
  
  /**
   * Primary data source
   */
  source: SafetyDataSource
  
  /**
   * Additional sources
   */
  additional_sources?: SafetyDataSource[]
  
  /**
   * FAERS report count (if from FAERS)
   */
  faers_report_count?: number
  
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
 * Get frequency category from numeric frequency
 */
export function getFrequencyCategory(frequency: number): AdverseEvent['frequency_category'] {
  if (frequency >= 0.1) return 'very_common'      // >= 10%
  if (frequency >= 0.01) return 'common'          // >= 1% to < 10%
  if (frequency >= 0.001) return 'uncommon'       // >= 0.1% to < 1%
  if (frequency >= 0.0001) return 'rare'          // >= 0.01% to < 0.1%
  return 'very_rare'                               // < 0.01%
}

/**
 * Sort adverse events by frequency (descending)
 */
export function sortAEByFrequency(events: AdverseEvent[]): AdverseEvent[] {
  return [...events].sort((a, b) => {
    const freqA = a.frequency ?? 0
    const freqB = b.frequency ?? 0
    return freqB - freqA
  })
}

/**
 * Filter common AEs (>= 5% incidence)
 */
export function filterCommonAE(events: AdverseEvent[]): AdverseEvent[] {
  return events.filter(ae => (ae.frequency ?? 0) >= 0.05)
}

/**
 * Filter serious AEs
 */
export function filterSeriousAE(events: AdverseEvent[]): AdverseEvent[] {
  return events.filter(ae => ae.serious === true)
}

/**
 * Group AEs by System Organ Class
 */
export function groupAEBySOC(events: AdverseEvent[]): Record<string, AdverseEvent[]> {
  const grouped: Record<string, AdverseEvent[]> = {}
  
  for (const ae of events) {
    const soc = ae.soc || 'Other'
    if (!grouped[soc]) {
      grouped[soc] = []
    }
    grouped[soc].push(ae)
  }
  
  // Sort each group by frequency
  for (const soc of Object.keys(grouped)) {
    grouped[soc] = sortAEByFrequency(grouped[soc])
  }
  
  return grouped
}

/**
 * Calculate safety data completeness
 */
export function calculateSafetyCompleteness(safety: UniversalSafety): number {
  let score = 0
  const maxScore = 12
  
  // AEs (3 points)
  if (safety.common_ae.length > 0) score++
  if (safety.serious_ae.length > 0) score++
  if (safety.aes_of_special_interest.length > 0) score++
  
  // Warnings (3 points)
  if (safety.warnings.length > 0) score++
  if (safety.precautions.length > 0) score++
  if (safety.contraindications.length > 0) score++
  
  // Interactions (2 points)
  if (safety.drug_interactions.length > 0) score++
  if (safety.food_interactions?.length) score++
  
  // Special populations (3 points)
  if (safety.special_populations.pregnancy) score++
  if (safety.special_populations.pediatric) score++
  if (safety.special_populations.geriatric) score++
  
  // Overdose (1 point)
  if (safety.overdose?.treatment) score++
  
  return score / maxScore
}

/**
 * Merge safety data from multiple sources
 */
export function mergeSafetyData(
  primary: Partial<UniversalSafety>,
  fallback: Partial<UniversalSafety>
): UniversalSafety {
  const firstValue = <T>(a: T | undefined, b: T | undefined): T | undefined => a ?? b
  
  // Merge AE arrays (deduplicate by term)
  const mergeAEArrays = (a: AdverseEvent[] | undefined, b: AdverseEvent[] | undefined): AdverseEvent[] => {
    const combined = [...(a || []), ...(b || [])]
    const seen = new Set<string>()
    return combined.filter(ae => {
      if (seen.has(ae.term.toLowerCase())) return false
      seen.add(ae.term.toLowerCase())
      return true
    })
  }
  
  // Merge string arrays (deduplicate)
  const mergeStringArrays = (a: string[] | undefined, b: string[] | undefined): string[] => {
    const combined = [...(a || []), ...(b || [])]
    return Array.from(new Set(combined))
  }
  
  // Merge interaction arrays (deduplicate by drug)
  const mergeInteractions = (a: DrugInteraction[] | undefined, b: DrugInteraction[] | undefined): DrugInteraction[] => {
    const combined = [...(a || []), ...(b || [])]
    const seen = new Set<string>()
    return combined.filter(int => {
      if (seen.has(int.drug.toLowerCase())) return false
      seen.add(int.drug.toLowerCase())
      return true
    })
  }
  
  return {
    // AEs
    common_ae: mergeAEArrays(primary.common_ae, fallback.common_ae),
    serious_ae: mergeAEArrays(primary.serious_ae, fallback.serious_ae),
    aes_of_special_interest: mergeAEArrays(primary.aes_of_special_interest, fallback.aes_of_special_interest),
    all_ae: mergeAEArrays(primary.all_ae, fallback.all_ae),
    
    // Warnings
    boxed_warning: firstValue(primary.boxed_warning, fallback.boxed_warning),
    warnings: mergeStringArrays(primary.warnings, fallback.warnings),
    precautions: mergeStringArrays(primary.precautions, fallback.precautions),
    contraindications: mergeStringArrays(primary.contraindications, fallback.contraindications),
    
    // Interactions
    drug_interactions: mergeInteractions(primary.drug_interactions, fallback.drug_interactions),
    food_interactions: mergeStringArrays(primary.food_interactions, fallback.food_interactions),
    lab_interactions: mergeStringArrays(primary.lab_interactions, fallback.lab_interactions),
    
    // Special populations
    special_populations: {
      pregnancy: firstValue(primary.special_populations?.pregnancy, fallback.special_populations?.pregnancy),
      pregnancy_category: firstValue(primary.special_populations?.pregnancy_category, fallback.special_populations?.pregnancy_category),
      lactation: firstValue(primary.special_populations?.lactation, fallback.special_populations?.lactation),
      pediatric: firstValue(primary.special_populations?.pediatric, fallback.special_populations?.pediatric),
      geriatric: firstValue(primary.special_populations?.geriatric, fallback.special_populations?.geriatric),
      renal_impairment: firstValue(primary.special_populations?.renal_impairment, fallback.special_populations?.renal_impairment),
      hepatic_impairment: firstValue(primary.special_populations?.hepatic_impairment, fallback.special_populations?.hepatic_impairment),
      females_reproductive: firstValue(primary.special_populations?.females_reproductive, fallback.special_populations?.females_reproductive),
      males_reproductive: firstValue(primary.special_populations?.males_reproductive, fallback.special_populations?.males_reproductive)
    },
    
    // Overdose
    overdose: {
      signs_symptoms: firstValue(primary.overdose?.signs_symptoms, fallback.overdose?.signs_symptoms),
      treatment: firstValue(primary.overdose?.treatment, fallback.overdose?.treatment),
      antidote: firstValue(primary.overdose?.antidote, fallback.overdose?.antidote)
    },
    
    // Abuse
    abuse_potential: firstValue(primary.abuse_potential, fallback.abuse_potential),
    dependence: firstValue(primary.dependence, fallback.dependence),
    controlled_schedule: firstValue(primary.controlled_schedule, fallback.controlled_schedule),
    
    // Biologic-specific
    immunogenicity: firstValue(primary.immunogenicity, fallback.immunogenicity),
    infusion_reactions: firstValue(primary.infusion_reactions, fallback.infusion_reactions),
    
    // Metadata
    source: primary.source || fallback.source || 'class_based',
    additional_sources: [
      ...(primary.additional_sources || []),
      ...(fallback.additional_sources || [])
    ].filter((v, i, a) => a.indexOf(v) === i),
    faers_report_count: firstValue(primary.faers_report_count, fallback.faers_report_count),
    last_updated: new Date().toISOString()
  }
}

/**
 * Create empty safety structure
 */
export function createEmptySafety(): UniversalSafety {
  return {
    common_ae: [],
    serious_ae: [],
    aes_of_special_interest: [],
    warnings: [],
    precautions: [],
    contraindications: [],
    drug_interactions: [],
    special_populations: {},
    source: 'class_based',
    last_updated: new Date().toISOString()
  }
}

/**
 * Validate safety data
 */
export function validateSafety(safety: UniversalSafety): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (safety.common_ae.length === 0) {
    warnings.push('No common adverse events listed')
  }
  
  if (safety.warnings.length === 0) {
    warnings.push('No warnings listed')
  }
  
  if (safety.contraindications.length === 0) {
    warnings.push('No contraindications listed')
  }
  
  if (!safety.special_populations.pregnancy) {
    warnings.push('Pregnancy information not available')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
