/**
 * Synopsis Parameters Enricher
 * 
 * Enriches standard study design parameters for Synopsis generation.
 * Works for ANY compound/INN - no hardcoded drug-specific values.
 * 
 * Sources:
 * 1. Project design_json - sponsor-provided study design
 * 2. Published trials - from evidence_sources (ClinicalTrials.gov)
 * 3. Industry standards - based on phase and therapeutic area
 * 
 * @version 1.0.0
 * @date 2025-12-03
 */

import { createClient } from '@/lib/supabase/server'

// ============================================================================
// TYPES
// ============================================================================

export interface SynopsisParameters {
  // Timing parameters
  screening_duration_weeks: number | null
  screening_duration_text: string
  treatment_duration_weeks: number | null
  treatment_duration_text: string
  followup_duration_weeks: number | null
  followup_duration_text: string
  total_duration_weeks: number | null
  total_duration_text: string
  
  // Visit schedule
  visit_frequency: string
  visit_windows: string
  
  // Statistical parameters
  power_percent: number
  alpha_level: number
  dropout_rate_percent: number
  effect_size_description: string
  
  // Population parameters
  age_min: number | null
  age_max: number | null
  bmi_min: number | null
  bmi_max: number | null
  
  // Dosing
  dosing_frequency: string
  
  // Washout
  washout_duration_weeks: number | null
  washout_duration_text: string
  
  // Contraception
  contraception_duration_days: number
  
  // Prior study participation
  prior_study_washout_days: number
  
  // Data sources used
  sources: string[]
  confidence: 'high' | 'medium' | 'low'
}

// ============================================================================
// INDUSTRY STANDARDS BY THERAPEUTIC AREA
// ============================================================================

interface TherapeuticAreaDefaults {
  screening_weeks: number
  followup_weeks: number
  visit_frequency: string
  power: number
  dropout_rate: number
  age_min: number
  age_max: number
  bmi_min: number
  bmi_max: number
  contraception_days: number
  prior_study_days: number
}

const THERAPEUTIC_AREA_DEFAULTS: Record<string, TherapeuticAreaDefaults> = {
  // Metabolic / Endocrine
  'diabetes': {
    screening_weeks: 2,
    followup_weeks: 2,
    visit_frequency: 'every 4 weeks',
    power: 90,
    dropout_rate: 15,
    age_min: 18,
    age_max: 75,
    bmi_min: 18.5,
    bmi_max: 40,
    contraception_days: 30,
    prior_study_days: 30,
  },
  'obesity': {
    screening_weeks: 2,
    followup_weeks: 4,
    visit_frequency: 'every 4 weeks',
    power: 90,
    dropout_rate: 20,
    age_min: 18,
    age_max: 65,
    bmi_min: 30,
    bmi_max: 50,
    contraception_days: 30,
    prior_study_days: 30,
  },
  
  // Cardiovascular
  'cardiovascular': {
    screening_weeks: 2,
    followup_weeks: 4,
    visit_frequency: 'every 4 weeks',
    power: 90,
    dropout_rate: 10,
    age_min: 18,
    age_max: 80,
    bmi_min: 18.5,
    bmi_max: 40,
    contraception_days: 30,
    prior_study_days: 30,
  },
  'hypertension': {
    screening_weeks: 2,
    followup_weeks: 2,
    visit_frequency: 'every 2-4 weeks',
    power: 90,
    dropout_rate: 10,
    age_min: 18,
    age_max: 80,
    bmi_min: 18.5,
    bmi_max: 40,
    contraception_days: 30,
    prior_study_days: 30,
  },
  
  // Oncology
  'oncology': {
    screening_weeks: 4,
    followup_weeks: 12,
    visit_frequency: 'every 3 weeks (per cycle)',
    power: 80,
    dropout_rate: 25,
    age_min: 18,
    age_max: 99,
    bmi_min: 16,
    bmi_max: 45,
    contraception_days: 90,
    prior_study_days: 28,
  },
  
  // CNS / Psychiatry
  'psychiatry': {
    screening_weeks: 2,
    followup_weeks: 2,
    visit_frequency: 'weekly for first 4 weeks, then every 2 weeks',
    power: 80,
    dropout_rate: 25,
    age_min: 18,
    age_max: 65,
    bmi_min: 18.5,
    bmi_max: 40,
    contraception_days: 30,
    prior_study_days: 30,
  },
  'neurology': {
    screening_weeks: 4,
    followup_weeks: 4,
    visit_frequency: 'every 4 weeks',
    power: 80,
    dropout_rate: 20,
    age_min: 18,
    age_max: 80,
    bmi_min: 18.5,
    bmi_max: 40,
    contraception_days: 30,
    prior_study_days: 30,
  },
  
  // Immunology / Rheumatology
  'rheumatology': {
    screening_weeks: 4,
    followup_weeks: 4,
    visit_frequency: 'every 4 weeks',
    power: 90,
    dropout_rate: 15,
    age_min: 18,
    age_max: 75,
    bmi_min: 18.5,
    bmi_max: 40,
    contraception_days: 30,
    prior_study_days: 30,
  },
  'dermatology': {
    screening_weeks: 2,
    followup_weeks: 4,
    visit_frequency: 'every 2-4 weeks',
    power: 90,
    dropout_rate: 15,
    age_min: 18,
    age_max: 75,
    bmi_min: 18.5,
    bmi_max: 45,
    contraception_days: 30,
    prior_study_days: 30,
  },
  
  // Infectious Disease
  'infectious': {
    screening_weeks: 1,
    followup_weeks: 4,
    visit_frequency: 'daily to weekly depending on acute/chronic',
    power: 90,
    dropout_rate: 10,
    age_min: 18,
    age_max: 80,
    bmi_min: 18.5,
    bmi_max: 40,
    contraception_days: 30,
    prior_study_days: 14,
  },
  
  // Respiratory
  'respiratory': {
    screening_weeks: 2,
    followup_weeks: 2,
    visit_frequency: 'every 4 weeks',
    power: 90,
    dropout_rate: 15,
    age_min: 18,
    age_max: 75,
    bmi_min: 18.5,
    bmi_max: 40,
    contraception_days: 30,
    prior_study_days: 30,
  },
  
  // GI
  'gastroenterology': {
    screening_weeks: 2,
    followup_weeks: 4,
    visit_frequency: 'every 4 weeks',
    power: 90,
    dropout_rate: 15,
    age_min: 18,
    age_max: 75,
    bmi_min: 18.5,
    bmi_max: 40,
    contraception_days: 30,
    prior_study_days: 30,
  },
  
  // Default for unknown
  'default': {
    screening_weeks: 2,
    followup_weeks: 2,
    visit_frequency: 'every 4 weeks',
    power: 80,
    dropout_rate: 15,
    age_min: 18,
    age_max: 75,
    bmi_min: 18.5,
    bmi_max: 40,
    contraception_days: 30,
    prior_study_days: 30,
  },
}

// ============================================================================
// PHASE-BASED ADJUSTMENTS
// ============================================================================

interface PhaseAdjustments {
  power_adjustment: number // Add to base power
  dropout_adjustment: number // Add to base dropout
  followup_multiplier: number // Multiply base followup
}

const PHASE_ADJUSTMENTS: Record<number, PhaseAdjustments> = {
  2: {
    power_adjustment: 0,
    dropout_adjustment: 5,
    followup_multiplier: 1.0,
  },
  3: {
    power_adjustment: 10, // Phase 3 typically needs 90% power
    dropout_adjustment: 0,
    followup_multiplier: 1.5,
  },
  4: {
    power_adjustment: 0,
    dropout_adjustment: -5, // Lower dropout in post-marketing
    followup_multiplier: 2.0, // Longer safety follow-up
  },
}

// ============================================================================
// MAIN ENRICHER
// ============================================================================

/**
 * Enrich synopsis parameters for any compound
 * 
 * @param projectId - Project ID
 * @param compoundName - INN/compound name
 * @param indication - Target indication
 * @param phase - Study phase (2, 3, or 4)
 * @param designJson - Optional design_json from project
 */
export async function enrichSynopsisParameters(
  projectId: string,
  compoundName: string,
  indication: string,
  phase: number,
  designJson?: Record<string, any>
): Promise<SynopsisParameters> {
  console.log(`[Synopsis Enricher] Starting enrichment for ${compoundName}, ${indication}, Phase ${phase}`)
  
  const sources: string[] = []
  
  // 1. Determine therapeutic area from indication
  const therapeuticArea = detectTherapeuticArea(indication)
  const areaDefaults = THERAPEUTIC_AREA_DEFAULTS[therapeuticArea] || THERAPEUTIC_AREA_DEFAULTS['default']
  sources.push(`industry_standards_${therapeuticArea}`)
  
  // 2. Get phase adjustments
  const phaseAdj = PHASE_ADJUSTMENTS[phase] || PHASE_ADJUSTMENTS[2]
  
  // 3. Try to get data from published trials
  let trialBasedParams: Partial<SynopsisParameters> = {}
  try {
    trialBasedParams = await extractParametersFromTrials(projectId, compoundName, indication)
    if (Object.keys(trialBasedParams).length > 0) {
      sources.push('published_trials')
    }
  } catch (error) {
    console.warn(`[Synopsis Enricher] Failed to extract from trials:`, error)
  }
  
  // 4. Extract from design_json if provided
  let designParams: Partial<SynopsisParameters> = {}
  if (designJson) {
    designParams = extractFromDesignJson(designJson)
    if (Object.keys(designParams).length > 0) {
      sources.push('project_design')
    }
  }
  
  // 5. Calculate treatment duration from design_json or use indication-based default
  const treatmentWeeks = designJson?.duration_weeks || getTreatmentDurationByIndication(indication, phase)
  
  // 6. Build final parameters (priority: design_json > trials > industry standards)
  const screeningWeeks = designParams.screening_duration_weeks 
    || trialBasedParams.screening_duration_weeks 
    || areaDefaults.screening_weeks
    
  const followupWeeks = designParams.followup_duration_weeks 
    || trialBasedParams.followup_duration_weeks 
    || Math.round(areaDefaults.followup_weeks * phaseAdj.followup_multiplier)
  
  const power = Math.min(99, areaDefaults.power + phaseAdj.power_adjustment)
  const dropout = Math.max(5, areaDefaults.dropout_rate + phaseAdj.dropout_adjustment)
  
  // 7. Build dosing frequency from design_json
  const dosingFrequency = designJson?.dosing_frequency 
    || inferDosingFrequency(designJson?.dosage_form, designJson?.route)
  
  const result: SynopsisParameters = {
    // Timing
    screening_duration_weeks: screeningWeeks,
    screening_duration_text: formatDuration(screeningWeeks, 'weeks'),
    treatment_duration_weeks: treatmentWeeks,
    treatment_duration_text: formatDuration(treatmentWeeks, 'weeks'),
    followup_duration_weeks: followupWeeks,
    followup_duration_text: formatDuration(followupWeeks, 'weeks'),
    total_duration_weeks: screeningWeeks + treatmentWeeks + followupWeeks,
    total_duration_text: formatDuration(screeningWeeks + treatmentWeeks + followupWeeks, 'weeks'),
    
    // Visits
    visit_frequency: designParams.visit_frequency || trialBasedParams.visit_frequency || areaDefaults.visit_frequency,
    visit_windows: '±3 days for weekly visits, ±7 days for monthly visits',
    
    // Statistics
    power_percent: power,
    alpha_level: 0.05,
    dropout_rate_percent: dropout,
    effect_size_description: getEffectSizeDescription(indication, phase),
    
    // Population
    age_min: designParams.age_min || trialBasedParams.age_min || areaDefaults.age_min,
    age_max: designParams.age_max || trialBasedParams.age_max || areaDefaults.age_max,
    bmi_min: designParams.bmi_min || trialBasedParams.bmi_min || areaDefaults.bmi_min,
    bmi_max: designParams.bmi_max || trialBasedParams.bmi_max || areaDefaults.bmi_max,
    
    // Dosing
    dosing_frequency: dosingFrequency,
    
    // Washout
    washout_duration_weeks: getWashoutDuration(indication),
    washout_duration_text: formatDuration(getWashoutDuration(indication), 'weeks'),
    
    // Regulatory
    contraception_duration_days: areaDefaults.contraception_days,
    prior_study_washout_days: areaDefaults.prior_study_days,
    
    // Metadata
    sources,
    confidence: sources.includes('project_design') ? 'high' 
      : sources.includes('published_trials') ? 'medium' 
      : 'low',
  }
  
  console.log(`[Synopsis Enricher] Enrichment complete. Sources: ${sources.join(', ')}. Confidence: ${result.confidence}`)
  
  return result
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect therapeutic area from indication text
 */
function detectTherapeuticArea(indication: string): string {
  const lower = indication.toLowerCase()
  
  // Diabetes / Metabolic
  if (lower.includes('diabetes') || lower.includes('glycemic') || lower.includes('hba1c') || lower.includes('glucose')) {
    return 'diabetes'
  }
  if (lower.includes('obesity') || lower.includes('weight') || lower.includes('bmi')) {
    return 'obesity'
  }
  
  // Cardiovascular
  if (lower.includes('heart') || lower.includes('cardiac') || lower.includes('cardiovascular') || lower.includes('myocardial')) {
    return 'cardiovascular'
  }
  if (lower.includes('hypertension') || lower.includes('blood pressure')) {
    return 'hypertension'
  }
  
  // Oncology
  if (lower.includes('cancer') || lower.includes('tumor') || lower.includes('carcinoma') || lower.includes('lymphoma') || lower.includes('leukemia') || lower.includes('melanoma') || lower.includes('oncolog')) {
    return 'oncology'
  }
  
  // CNS
  if (lower.includes('depression') || lower.includes('anxiety') || lower.includes('schizophrenia') || lower.includes('bipolar') || lower.includes('psychiatric')) {
    return 'psychiatry'
  }
  if (lower.includes('alzheimer') || lower.includes('parkinson') || lower.includes('multiple sclerosis') || lower.includes('epilepsy') || lower.includes('neurolog')) {
    return 'neurology'
  }
  
  // Immunology
  if (lower.includes('arthritis') || lower.includes('lupus') || lower.includes('rheumat')) {
    return 'rheumatology'
  }
  if (lower.includes('psoriasis') || lower.includes('eczema') || lower.includes('dermatitis') || lower.includes('skin')) {
    return 'dermatology'
  }
  
  // Infectious
  if (lower.includes('infection') || lower.includes('bacterial') || lower.includes('viral') || lower.includes('hiv') || lower.includes('hepatitis') || lower.includes('antibiotic')) {
    return 'infectious'
  }
  
  // Respiratory
  if (lower.includes('asthma') || lower.includes('copd') || lower.includes('respiratory') || lower.includes('pulmonary') || lower.includes('lung')) {
    return 'respiratory'
  }
  
  // GI
  if (lower.includes('crohn') || lower.includes('colitis') || lower.includes('ibd') || lower.includes('gastro') || lower.includes('liver') || lower.includes('hepat')) {
    return 'gastroenterology'
  }
  
  return 'default'
}

/**
 * Get treatment duration based on indication and phase
 */
function getTreatmentDurationByIndication(indication: string, phase: number): number {
  const area = detectTherapeuticArea(indication)
  
  // Base durations by therapeutic area
  const baseDurations: Record<string, number> = {
    'diabetes': 24,
    'obesity': 52,
    'cardiovascular': 24,
    'hypertension': 12,
    'oncology': 24, // Often cycle-based
    'psychiatry': 8,
    'neurology': 24,
    'rheumatology': 24,
    'dermatology': 16,
    'infectious': 2, // Highly variable
    'respiratory': 12,
    'gastroenterology': 12,
    'default': 12,
  }
  
  const base = baseDurations[area] || 12
  
  // Phase adjustments
  if (phase === 2) return base
  if (phase === 3) return Math.round(base * 1.5) // Longer for Phase 3
  if (phase === 4) return Math.round(base * 2) // Even longer for Phase 4
  
  return base
}

/**
 * Get washout duration based on indication
 */
function getWashoutDuration(indication: string): number {
  const area = detectTherapeuticArea(indication)
  
  const washouts: Record<string, number> = {
    'diabetes': 8, // 8 weeks for oral antidiabetics
    'obesity': 4,
    'cardiovascular': 2,
    'hypertension': 2,
    'oncology': 4,
    'psychiatry': 2, // 2 weeks for most psych meds, 5 for MAOIs
    'neurology': 4,
    'rheumatology': 4,
    'dermatology': 2,
    'infectious': 1,
    'respiratory': 2,
    'gastroenterology': 2,
    'default': 4,
  }
  
  return washouts[area] || 4
}

/**
 * Infer dosing frequency from dosage form and route
 */
function inferDosingFrequency(dosageForm?: string, route?: string): string {
  if (!dosageForm && !route) return 'once daily'
  
  const form = (dosageForm || '').toLowerCase()
  const routeLower = (route || '').toLowerCase()
  
  // Injectable biologics
  if (routeLower.includes('subcutaneous') || routeLower.includes('intravenous')) {
    if (form.includes('prefilled') || form.includes('syringe')) {
      return 'once weekly or every 2 weeks'
    }
    return 'per infusion schedule'
  }
  
  // Extended release
  if (form.includes('extended') || form.includes('prolonged') || form.includes('xr') || form.includes('er')) {
    return 'once daily'
  }
  
  // Immediate release tablets
  if (form.includes('tablet') || form.includes('capsule')) {
    return 'once daily'
  }
  
  // Topical
  if (routeLower.includes('topical') || form.includes('cream') || form.includes('ointment')) {
    return 'once or twice daily'
  }
  
  // Inhaled
  if (routeLower.includes('inhalation') || form.includes('inhaler')) {
    return 'once or twice daily'
  }
  
  return 'once daily'
}

/**
 * Get effect size description based on indication and phase
 */
function getEffectSizeDescription(indication: string, phase: number): string {
  const area = detectTherapeuticArea(indication)
  
  const descriptions: Record<string, string> = {
    'diabetes': 'A clinically meaningful reduction in HbA1c of 0.3-0.5% (absolute) is expected based on published DPP-4 inhibitor trials',
    'obesity': 'A clinically meaningful weight reduction of 5-10% from baseline is expected',
    'cardiovascular': 'Effect size based on published cardiovascular outcome trials in the target population',
    'hypertension': 'A clinically meaningful reduction in systolic blood pressure of 5-10 mmHg is expected',
    'oncology': 'Effect size based on expected response rate or progression-free survival improvement',
    'psychiatry': 'Effect size based on expected improvement in validated symptom scales',
    'neurology': 'Effect size based on expected improvement in validated functional or cognitive scales',
    'rheumatology': 'Effect size based on expected ACR response rates or DAS28 improvement',
    'dermatology': 'Effect size based on expected improvement in validated severity scores (e.g., PASI, EASI)',
    'infectious': 'Effect size based on expected cure or response rates',
    'respiratory': 'Effect size based on expected improvement in FEV1 or symptom control',
    'gastroenterology': 'Effect size based on expected remission or response rates',
    'default': 'Effect size based on published trials in the target population and indication',
  }
  
  return descriptions[area] || descriptions['default']
}

/**
 * Format duration as text
 */
function formatDuration(weeks: number, unit: 'weeks' | 'days'): string {
  if (unit === 'weeks') {
    if (weeks === 1) return '1 week'
    if (weeks < 4) return `${weeks} weeks`
    if (weeks === 4) return '4 weeks (1 month)'
    if (weeks === 8) return '8 weeks (2 months)'
    if (weeks === 12) return '12 weeks (3 months)'
    if (weeks === 24) return '24 weeks (6 months)'
    if (weeks === 52) return '52 weeks (1 year)'
    return `${weeks} weeks (approximately ${Math.round(weeks / 4)} months)`
  }
  return `${weeks} ${unit}`
}

/**
 * Extract parameters from design_json
 */
function extractFromDesignJson(designJson: Record<string, any>): Partial<SynopsisParameters> {
  const result: Partial<SynopsisParameters> = {}
  
  if (designJson.screening_weeks || designJson.screening_duration) {
    result.screening_duration_weeks = designJson.screening_weeks || designJson.screening_duration
  }
  
  if (designJson.followup_weeks || designJson.followup_duration) {
    result.followup_duration_weeks = designJson.followup_weeks || designJson.followup_duration
  }
  
  if (designJson.visit_frequency) {
    result.visit_frequency = designJson.visit_frequency
  }
  
  if (designJson.age_min) result.age_min = designJson.age_min
  if (designJson.age_max) result.age_max = designJson.age_max
  if (designJson.bmi_min) result.bmi_min = designJson.bmi_min
  if (designJson.bmi_max) result.bmi_max = designJson.bmi_max
  
  return result
}

/**
 * Extract parameters from published trials in database
 */
async function extractParametersFromTrials(
  projectId: string,
  compoundName: string,
  indication: string
): Promise<Partial<SynopsisParameters>> {
  const supabase = await createClient()
  
  // Fetch trials from evidence_sources
  const { data: trials, error } = await supabase
    .from('evidence_sources')
    .select('payload_json')
    .eq('project_id', projectId)
    .eq('source', 'ClinicalTrials.gov')
    .limit(20)
  
  if (error || !trials || trials.length === 0) {
    return {}
  }
  
  // Extract eligibility criteria from trials
  const ages: number[] = []
  const visitFrequencies: string[] = []
  
  for (const trial of trials) {
    const payload = trial.payload_json as Record<string, any>
    
    // Extract age limits
    if (payload?.eligibilityMinAge) {
      const minAge = parseAge(payload.eligibilityMinAge)
      if (minAge) ages.push(minAge)
    }
    if (payload?.eligibilityMaxAge) {
      const maxAge = parseAge(payload.eligibilityMaxAge)
      if (maxAge) ages.push(maxAge)
    }
  }
  
  const result: Partial<SynopsisParameters> = {}
  
  // Calculate median age limits
  if (ages.length > 0) {
    const minAges = ages.filter(a => a < 30)
    const maxAges = ages.filter(a => a > 50)
    
    if (minAges.length > 0) {
      result.age_min = Math.round(minAges.reduce((a, b) => a + b, 0) / minAges.length)
    }
    if (maxAges.length > 0) {
      result.age_max = Math.round(maxAges.reduce((a, b) => a + b, 0) / maxAges.length)
    }
  }
  
  return result
}

/**
 * Parse age string like "18 Years" to number
 */
function parseAge(ageStr: string): number | null {
  if (!ageStr) return null
  const match = ageStr.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  detectTherapeuticArea,
  getTreatmentDurationByIndication,
  getWashoutDuration,
  inferDosingFrequency,
  getEffectSizeDescription,
  formatDuration,
  THERAPEUTIC_AREA_DEFAULTS,
  PHASE_ADJUSTMENTS,
}
