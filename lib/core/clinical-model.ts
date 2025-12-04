/**
 * Universal Clinical Trials Model
 * 
 * Clinical trials data structure for IB Section 7.
 * Supports Phase 2/3/4 trials ONLY (Phase 1 excluded).
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Clinical trial phase - Phase 1 is EXCLUDED
 */
export type ClinicalPhase = 2 | 3 | 4

/**
 * Trial status
 */
export type TrialStatus = 
  | 'not_yet_recruiting'
  | 'recruiting'
  | 'enrolling_by_invitation'
  | 'active_not_recruiting'
  | 'suspended'
  | 'terminated'
  | 'completed'
  | 'withdrawn'
  | 'unknown'

/**
 * Enrichment status for clinical trials
 */
export type ClinicalEnrichmentStatus = 
  | 'success'        // All trials fetched successfully
  | 'partial'        // Some trials fetched
  | 'fallback'       // Using fallback/class data
  | 'failed'         // Fetch failed

// ============================================================================
// TRIAL INTERFACE
// ============================================================================

/**
 * Individual clinical trial
 */
export interface ClinicalTrial {
  /**
   * NCT ID (ClinicalTrials.gov identifier)
   * Example: "NCT01234567"
   */
  nct_id: string
  
  /**
   * Official trial title
   */
  title: string
  
  /**
   * Brief summary
   */
  brief_summary?: string
  
  /**
   * Study phase (2, 3, or 4 only)
   */
  phase: ClinicalPhase
  
  /**
   * Current status
   */
  status: TrialStatus
  
  /**
   * Primary condition/indication
   */
  indication: string
  
  /**
   * Additional conditions studied
   */
  conditions?: string[]
  
  /**
   * Interventions (drug names, doses)
   */
  interventions?: string[]
  
  /**
   * Target enrollment
   */
  enrollment?: number
  
  /**
   * Actual enrollment (if completed)
   */
  actual_enrollment?: number
  
  /**
   * Study start date
   */
  start_date?: string
  
  /**
   * Primary completion date
   */
  primary_completion_date?: string
  
  /**
   * Study completion date
   */
  completion_date?: string
  
  /**
   * Whether results are available
   */
  has_results: boolean
  
  /**
   * Primary endpoint
   */
  primary_endpoint?: string
  
  /**
   * Secondary endpoints
   */
  secondary_endpoints?: string[]
  
  /**
   * Study design
   */
  study_design?: {
    allocation?: string
    intervention_model?: string
    masking?: string
    primary_purpose?: string
  }
  
  /**
   * Sponsor
   */
  sponsor?: string
  
  /**
   * Collaborators
   */
  collaborators?: string[]
  
  /**
   * Study locations (countries)
   */
  locations?: string[]
  
  /**
   * Age eligibility
   */
  eligibility?: {
    min_age?: string
    max_age?: string
    gender?: string
    healthy_volunteers?: boolean
  }
  
  /**
   * Results summary (if available)
   */
  results_summary?: {
    primary_outcome?: string
    secondary_outcomes?: string[]
    adverse_events_summary?: string
  }
  
  /**
   * ClinicalTrials.gov URL
   */
  url?: string
}

// ============================================================================
// FILTER CRITERIA
// ============================================================================

/**
 * Filter criteria used for trial selection
 */
export interface TrialFilterCriteria {
  /**
   * Compound name (INN) used for filtering
   */
  compound_name: string
  
  /**
   * Target indication
   */
  indication: string
  
  /**
   * Phases included in filter
   * ALWAYS [2, 3, 4] - Phase 1 is NEVER included
   */
  phases_included: ClinicalPhase[]
  
  /**
   * Minimum age for population match
   */
  age_min?: number
  
  /**
   * Maximum age for population match
   */
  age_max?: number
  
  /**
   * Population type
   */
  population_type?: string
  
  /**
   * Only include trials with results
   */
  results_only?: boolean
  
  /**
   * Only include completed trials
   */
  completed_only?: boolean
}

// ============================================================================
// MAIN INTERFACE
// ============================================================================

/**
 * Universal Clinical Trials Model
 * 
 * Container for all clinical trial data used in IB generation.
 * Phase 1 trials are automatically excluded.
 */
export interface UniversalClinicalTrials {
  /**
   * All trials fetched (before filtering)
   * May include Phase 1 trials from API, but they are excluded in filtered_trials
   */
  all_trials_raw: ClinicalTrial[]
  
  /**
   * Filtered trials (Phase 2+ only, matching indication/population)
   * This is what gets used in IB generation
   */
  filtered_trials: ClinicalTrial[]
  
  /**
   * Filter criteria used
   */
  filter_criteria: TrialFilterCriteria
  
  /**
   * Enrichment status
   */
  enrichment_status: ClinicalEnrichmentStatus
  
  /**
   * Total count of filtered trials
   */
  trials_count: number
  
  /**
   * Count by phase
   */
  count_by_phase: {
    phase_2: number
    phase_3: number
    phase_4: number
  }
  
  /**
   * Count of trials with results
   */
  trials_with_results: number
  
  /**
   * Last updated timestamp
   */
  last_updated: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Filter trials to exclude Phase 1 and match criteria
 * 
 * CRITICAL: This function ALWAYS excludes Phase 1 trials
 */
export function filterTrials(
  trials: ClinicalTrial[],
  criteria: TrialFilterCriteria
): ClinicalTrial[] {
  return trials.filter(trial => {
    // CRITICAL: Always exclude Phase 1
    // Phase 1 is represented as any phase < 2 in raw data
    if (!trial.phase || trial.phase < 2) {
      return false
    }
    
    // Check if phase is in allowed phases
    if (!criteria.phases_included.includes(trial.phase as ClinicalPhase)) {
      return false
    }
    
    // Match indication (case-insensitive, partial match)
    if (criteria.indication) {
      const indicationLower = criteria.indication.toLowerCase()
      const trialIndicationLower = trial.indication?.toLowerCase() || ''
      const conditionsLower = (trial.conditions || []).map(c => c.toLowerCase())
      
      const indicationMatches = 
        trialIndicationLower.includes(indicationLower) ||
        indicationLower.includes(trialIndicationLower) ||
        conditionsLower.some(c => c.includes(indicationLower) || indicationLower.includes(c))
      
      if (!indicationMatches) {
        return false
      }
    }
    
    // Match population age if specified
    if (criteria.age_min !== undefined || criteria.age_max !== undefined) {
      // Parse trial eligibility
      const trialMinAge = parseAge(trial.eligibility?.min_age)
      const trialMaxAge = parseAge(trial.eligibility?.max_age)
      
      // Check for overlap
      if (criteria.age_min !== undefined && trialMaxAge !== null && trialMaxAge < criteria.age_min) {
        return false
      }
      if (criteria.age_max !== undefined && trialMinAge !== null && trialMinAge > criteria.age_max) {
        return false
      }
    }
    
    // Filter by results availability
    if (criteria.results_only && !trial.has_results) {
      return false
    }
    
    // Filter by completion status
    if (criteria.completed_only && trial.status !== 'completed') {
      return false
    }
    
    return true
  })
}

/**
 * Parse age string to number
 * Example: "18 Years" -> 18
 */
function parseAge(ageStr: string | undefined): number | null {
  if (!ageStr) return null
  const match = ageStr.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Sort trials by relevance
 * Priority: Phase 3 > Phase 2 > Phase 4, then by results availability, then by date
 */
export function sortTrialsByRelevance(trials: ClinicalTrial[]): ClinicalTrial[] {
  return [...trials].sort((a, b) => {
    // Phase priority: 3 > 2 > 4
    const phasePriority: Record<number, number> = { 3: 0, 2: 1, 4: 2 }
    const phaseA = phasePriority[a.phase] ?? 3
    const phaseB = phasePriority[b.phase] ?? 3
    if (phaseA !== phaseB) return phaseA - phaseB
    
    // Results availability
    if (a.has_results !== b.has_results) {
      return a.has_results ? -1 : 1
    }
    
    // Completion status
    const statusPriority: Record<string, number> = {
      'completed': 0,
      'active_not_recruiting': 1,
      'recruiting': 2
    }
    const statusA = statusPriority[a.status] ?? 3
    const statusB = statusPriority[b.status] ?? 3
    if (statusA !== statusB) return statusA - statusB
    
    // Date (newer first)
    const dateA = a.completion_date || a.start_date || ''
    const dateB = b.completion_date || b.start_date || ''
    return dateB.localeCompare(dateA)
  })
}

/**
 * Create default filter criteria
 * ALWAYS includes phases [2, 3, 4] - NEVER Phase 1
 */
export function createDefaultFilterCriteria(
  compoundName: string,
  indication: string
): TrialFilterCriteria {
  return {
    compound_name: compoundName,
    indication,
    phases_included: [2, 3, 4], // NEVER includes Phase 1
    results_only: false,
    completed_only: false
  }
}

/**
 * Calculate trial statistics
 */
export function calculateTrialStats(trials: ClinicalTrial[]): {
  total: number
  by_phase: { phase_2: number; phase_3: number; phase_4: number }
  with_results: number
  completed: number
  total_enrollment: number
} {
  const stats = {
    total: trials.length,
    by_phase: { phase_2: 0, phase_3: 0, phase_4: 0 },
    with_results: 0,
    completed: 0,
    total_enrollment: 0
  }
  
  for (const trial of trials) {
    if (trial.phase === 2) stats.by_phase.phase_2++
    else if (trial.phase === 3) stats.by_phase.phase_3++
    else if (trial.phase === 4) stats.by_phase.phase_4++
    
    if (trial.has_results) stats.with_results++
    if (trial.status === 'completed') stats.completed++
    if (trial.actual_enrollment || trial.enrollment) {
      stats.total_enrollment += trial.actual_enrollment || trial.enrollment || 0
    }
  }
  
  return stats
}

/**
 * Create empty clinical trials structure
 */
export function createEmptyClinicalTrials(
  compoundName: string,
  indication: string
): UniversalClinicalTrials {
  return {
    all_trials_raw: [],
    filtered_trials: [],
    filter_criteria: createDefaultFilterCriteria(compoundName, indication),
    enrichment_status: 'fallback',
    trials_count: 0,
    count_by_phase: { phase_2: 0, phase_3: 0, phase_4: 0 },
    trials_with_results: 0,
    last_updated: new Date().toISOString()
  }
}

/**
 * Build clinical trials structure from raw data
 */
export function buildClinicalTrials(
  rawTrials: ClinicalTrial[],
  compoundName: string,
  indication: string,
  additionalCriteria?: Partial<TrialFilterCriteria>
): UniversalClinicalTrials {
  const criteria: TrialFilterCriteria = {
    ...createDefaultFilterCriteria(compoundName, indication),
    ...additionalCriteria
  }
  
  // Filter and sort
  const filtered = filterTrials(rawTrials, criteria)
  const sorted = sortTrialsByRelevance(filtered)
  
  // Calculate stats
  const stats = calculateTrialStats(sorted)
  
  return {
    all_trials_raw: rawTrials,
    filtered_trials: sorted,
    filter_criteria: criteria,
    enrichment_status: sorted.length > 0 ? 'success' : 'fallback',
    trials_count: stats.total,
    count_by_phase: stats.by_phase,
    trials_with_results: stats.with_results,
    last_updated: new Date().toISOString()
  }
}

/**
 * Validate clinical trials data
 */
export function validateClinicalTrials(data: UniversalClinicalTrials): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check for Phase 1 trials in filtered (should never happen)
  const phase1Trials = data.filtered_trials.filter(t => t.phase < 2)
  if (phase1Trials.length > 0) {
    errors.push(`Phase 1 trials found in filtered data (${phase1Trials.length} trials) - this should not happen`)
  }
  
  // Check for trials
  if (data.filtered_trials.length === 0) {
    warnings.push('No clinical trials found matching criteria')
  }
  
  // Check for results
  if (data.trials_with_results === 0 && data.filtered_trials.length > 0) {
    warnings.push('No trials with published results found')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
