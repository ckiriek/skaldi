/**
 * Universal Clinical Trials Enricher
 * 
 * Enriches clinical trials data for any compound.
 * CRITICAL: Phase 1 trials are ALWAYS excluded.
 * 
 * Sources:
 * 1. ClinicalTrials.gov API
 * 2. Cached trials in database
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import { createClient } from '@/lib/supabase/server'
import type { UniversalProject } from '@/lib/core/project-model'
import type { UniversalCompound } from '@/lib/core/compound-model'
import type { 
  UniversalClinicalTrials, 
  ClinicalTrial, 
  ClinicalPhase,
  TrialFilterCriteria 
} from '@/lib/core/clinical-model'
import { 
  filterTrials, 
  sortTrialsByRelevance, 
  calculateTrialStats
} from '@/lib/core/clinical-model'

// ============================================================================
// MAIN ENRICHER
// ============================================================================

/**
 * Enrich clinical trials data for a compound
 * 
 * CRITICAL: This function ALWAYS excludes Phase 1 trials.
 * Only Phase 2, 3, and 4 trials are included.
 * 
 * @param project - Project data
 * @param compound - Compound data
 * @returns Enriched clinical trials data
 */
export async function enrichClinicalTrials(
  project: UniversalProject,
  compound: UniversalCompound
): Promise<UniversalClinicalTrials> {
  console.log(`[Clinical Enricher] Starting enrichment for ${compound.inn_name}, indication: ${project.indication}`)
  
  // Build filter criteria - ALWAYS Phase 2+ only
  const filterCriteria: TrialFilterCriteria = {
    compound_name: compound.inn_name,
    indication: project.indication,
    phases_included: [2, 3, 4], // NEVER includes Phase 1
    age_min: project.population_age_min,
    age_max: project.population_age_max,
    population_type: project.population_type
  }
  
  // 1. Try to fetch from database cache
  let rawTrials: ClinicalTrial[] = []
  
  try {
    rawTrials = await fetchTrialsFromDatabase(compound.inn_name, project.project_id, compound.inchikey)
    console.log(`[Clinical Enricher] Found ${rawTrials.length} trials in database`)
  } catch (error) {
    console.warn(`[Clinical Enricher] Database fetch failed:`, error)
  }
  
  // 2. If no trials in DB, try live API (if available)
  if (rawTrials.length === 0) {
    try {
      rawTrials = await fetchTrialsFromAPI(compound.inn_name)
      console.log(`[Clinical Enricher] Found ${rawTrials.length} trials from API`)
    } catch (error) {
      console.warn(`[Clinical Enricher] API fetch failed:`, error)
    }
  }
  
  // 3. Apply strict filtering
  // CRITICAL: This filter ALWAYS excludes Phase 1
  const filteredTrials = filterTrials(rawTrials, filterCriteria)
  
  // Log Phase 1 exclusion
  const phase1Count = rawTrials.filter(t => !t.phase || t.phase < 2).length
  if (phase1Count > 0) {
    console.log(`[Clinical Enricher] Excluded ${phase1Count} Phase 1 trials`)
  }
  
  // 4. Sort by relevance (Phase 3 > Phase 2 > Phase 4, then by results)
  const sortedTrials = sortTrialsByRelevance(filteredTrials)
  
  // 5. Calculate statistics
  const stats = calculateTrialStats(sortedTrials)
  
  // 6. Build result
  const result: UniversalClinicalTrials = {
    all_trials_raw: rawTrials,
    filtered_trials: sortedTrials,
    filter_criteria: filterCriteria,
    enrichment_status: sortedTrials.length > 0 ? 'success' : 'fallback',
    trials_count: stats.total,
    count_by_phase: stats.by_phase,
    trials_with_results: stats.with_results,
    last_updated: new Date().toISOString()
  }
  
  console.log(`[Clinical Enricher] Enrichment complete. Filtered: ${sortedTrials.length} trials (Phase 2: ${stats.by_phase.phase_2}, Phase 3: ${stats.by_phase.phase_3}, Phase 4: ${stats.by_phase.phase_4}). With results: ${stats.with_results}`)
  
  return result
}

// ============================================================================
// DATA FETCHERS
// ============================================================================

/**
 * Fetch trials from database cache
 * Data is stored in evidence_sources table with source='ClinicalTrials.gov'
 */
async function fetchTrialsFromDatabase(
  drugName: string,
  projectId?: string,
  inchikey?: string
): Promise<ClinicalTrial[]> {
  const supabase = await createClient()
  
  // Build query - fetch from evidence_sources where fetch-all stores data
  let query = supabase
    .from('evidence_sources')
    .select('*')
    .eq('source', 'ClinicalTrials.gov')
  
  // Prefer project-specific data if projectId available
  if (projectId) {
    query = query.eq('project_id', projectId)
  } else {
    // Fallback to drug name search
    query = query.or(`title.ilike.%${drugName}%,payload_json->>'interventions'.ilike.%${drugName}%`)
  }
  
  const { data: trials, error } = await query.limit(100)
  
  if (error) {
    console.error(`[Clinical Enricher] Database query error:`, error)
    return []
  }
  
  // Map database records to ClinicalTrial interface
  return (trials || []).map(mapDatabaseTrialToClinicalTrial)
}

/**
 * Fetch trials from ClinicalTrials.gov API
 */
async function fetchTrialsFromAPI(drugName: string): Promise<ClinicalTrial[]> {
  // Use the existing ClinicalTrials.gov integration
  try {
    const response = await fetch(
      `https://clinicaltrials.gov/api/v2/studies?query.intr=${encodeURIComponent(drugName)}&pageSize=100&format=json`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.studies) {
      return []
    }
    
    return data.studies.map(mapAPIStudyToClinicalTrial)
  } catch (error) {
    console.error(`[Clinical Enricher] API fetch error:`, error)
    return []
  }
}

// ============================================================================
// MAPPERS
// ============================================================================

/**
 * Map database record (evidence_sources) to ClinicalTrial
 * Data is stored in payload_json from fetch-all API
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDatabaseTrialToClinicalTrial(record: Record<string, any>): ClinicalTrial {
  // Data is in payload_json for evidence_sources
  const payload = record.payload_json || record
  
  // Parse phase from string like "PHASE2" or ["PHASE2", "PHASE3"]
  const phaseRaw = Array.isArray(payload.phase) ? payload.phase[0] : payload.phase
  const phase = parsePhase(phaseRaw)
  
  return {
    nct_id: record.external_id || payload.nctId || '',
    title: record.title || payload.title || '',
    brief_summary: payload.briefSummary || payload.description,
    phase: phase,
    status: mapStatus(payload.status || payload.overallStatus),
    indication: payload.conditions?.[0] || '',
    conditions: payload.conditions || [],
    interventions: payload.interventions || [],
    enrollment: payload.enrollment || payload.enrollmentCount,
    actual_enrollment: payload.actualEnrollment,
    start_date: payload.startDate,
    primary_completion_date: payload.primaryCompletionDate,
    completion_date: payload.completionDate,
    has_results: payload.hasResults || false,
    primary_endpoint: payload.primaryOutcomes?.[0]?.measure,
    secondary_endpoints: payload.secondaryOutcomes?.map((o: any) => o.measure),
    study_design: {
      allocation: payload.designAllocation,
      intervention_model: payload.interventionModel,
      masking: payload.designMasking,
      primary_purpose: payload.designPrimaryPurpose
    },
    sponsor: payload.sponsor,
    eligibility: {
      min_age: payload.eligibilityMinAge,
      max_age: payload.eligibilityMaxAge,
      gender: payload.eligibilitySex
    },
    url: payload.resultsUrl || `https://clinicaltrials.gov/study/${record.external_id || payload.nctId}`
  }
}

/**
 * Map ClinicalTrials.gov API study to ClinicalTrial
 */
function mapAPIStudyToClinicalTrial(study: any): ClinicalTrial {
  const protocol = study.protocolSection || {}
  const identification = protocol.identificationModule || {}
  const status = protocol.statusModule || {}
  const design = protocol.designModule || {}
  const description = protocol.descriptionModule || {}
  const conditions = protocol.conditionsModule || {}
  const interventions = protocol.armsInterventionsModule || {}
  const outcomes = protocol.outcomesModule || {}
  const sponsors = protocol.sponsorCollaboratorsModule || {}
  const contacts = protocol.contactsLocationsModule || {}
  
  // Parse phase
  const phaseStr = design.phases?.[0] || ''
  const phase = parsePhase(phaseStr)
  
  return {
    nct_id: identification.nctId || '',
    title: identification.officialTitle || identification.briefTitle || '',
    brief_summary: description.briefSummary,
    phase: phase,
    status: mapStatus(status.overallStatus),
    indication: conditions.conditions?.[0] || '',
    conditions: conditions.conditions || [],
    interventions: interventions.interventions?.map((i: any) => i.name) || [],
    enrollment: status.enrollmentInfo?.count,
    start_date: status.startDateStruct?.date,
    primary_completion_date: status.primaryCompletionDateStruct?.date,
    completion_date: status.completionDateStruct?.date,
    has_results: study.hasResults || false,
    primary_endpoint: outcomes.primaryOutcomes?.[0]?.measure,
    secondary_endpoints: outcomes.secondaryOutcomes?.map((o: any) => o.measure),
    study_design: {
      allocation: design.designInfo?.allocation,
      intervention_model: design.designInfo?.interventionModel,
      masking: design.designInfo?.maskingInfo?.masking,
      primary_purpose: design.designInfo?.primaryPurpose
    },
    sponsor: sponsors.leadSponsor?.name,
    collaborators: sponsors.collaborators?.map((c: any) => c.name),
    locations: contacts.locations?.map((l: any) => l.country),
    eligibility: {
      min_age: protocol.eligibilityModule?.minimumAge,
      max_age: protocol.eligibilityModule?.maximumAge,
      gender: protocol.eligibilityModule?.sex,
      healthy_volunteers: protocol.eligibilityModule?.healthyVolunteers === 'Yes'
    },
    url: `https://clinicaltrials.gov/study/${identification.nctId}`
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse phase string to ClinicalPhase number
 * Returns 0 for Phase 1 (which will be filtered out)
 */
function parsePhase(phaseStr: string | undefined): ClinicalPhase {
  if (!phaseStr) return 2 // Default to Phase 2 if unknown
  
  const str = phaseStr.toLowerCase()
  
  // Check for Phase 1 - return 0 (will be filtered out)
  if (str.includes('phase 1') && !str.includes('phase 2')) {
    return 0 as ClinicalPhase // Will be filtered out
  }
  
  // Phase 2/3 or Phase 2
  if (str.includes('phase 2') || str.includes('phase ii')) {
    return 2
  }
  
  // Phase 3
  if (str.includes('phase 3') || str.includes('phase iii')) {
    return 3
  }
  
  // Phase 4
  if (str.includes('phase 4') || str.includes('phase iv')) {
    return 4
  }
  
  // Early Phase 1 - return 0 (will be filtered out)
  if (str.includes('early phase') || str.includes('phase i')) {
    return 0 as ClinicalPhase
  }
  
  // Default to Phase 2
  return 2
}

/**
 * Map status string to TrialStatus
 */
function mapStatus(status: string | undefined): ClinicalTrial['status'] {
  if (!status) return 'unknown'
  
  const s = status.toLowerCase().replace(/[_\s]+/g, '_')
  
  if (s.includes('not_yet')) return 'not_yet_recruiting'
  if (s.includes('recruiting') && !s.includes('not')) return 'recruiting'
  if (s.includes('enrolling')) return 'enrolling_by_invitation'
  if (s.includes('active') && s.includes('not')) return 'active_not_recruiting'
  if (s.includes('suspended')) return 'suspended'
  if (s.includes('terminated')) return 'terminated'
  if (s.includes('completed')) return 'completed'
  if (s.includes('withdrawn')) return 'withdrawn'
  
  return 'unknown'
}

/**
 * Check if indication matches (fuzzy matching)
 */
export function indicationMatches(
  trialIndication: string,
  targetIndication: string
): boolean {
  if (!trialIndication || !targetIndication) return false
  
  const trial = trialIndication.toLowerCase()
  const target = targetIndication.toLowerCase()
  
  // Direct match
  if (trial.includes(target) || target.includes(trial)) {
    return true
  }
  
  // Common synonyms
  const synonyms: Record<string, string[]> = {
    'depression': ['major depressive disorder', 'mdd', 'depressive disorder', 'unipolar depression'],
    'anxiety': ['generalized anxiety disorder', 'gad', 'anxiety disorder'],
    'rheumatoid arthritis': ['ra', 'rheumatoid', 'inflammatory arthritis'],
    'psoriasis': ['plaque psoriasis', 'psoriatic'],
    'crohn': ['crohn\'s disease', 'crohns', 'inflammatory bowel'],
    'ulcerative colitis': ['uc', 'colitis'],
    'cancer': ['carcinoma', 'tumor', 'malignancy', 'oncology'],
    'diabetes': ['type 2 diabetes', 't2dm', 'dm2', 'diabetic']
  }
  
  for (const [key, values] of Object.entries(synonyms)) {
    if (target.includes(key) || values.some(v => target.includes(v))) {
      if (trial.includes(key) || values.some(v => trial.includes(v))) {
        return true
      }
    }
  }
  
  return false
}
