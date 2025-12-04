/**
 * IB Input Builder
 * 
 * Orchestrates all enrichers to build a complete IBInput object.
 * This is the main entry point for IB enrichment.
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import { createClient } from '@/lib/supabase/server'
import type { UniversalProject } from '@/lib/core/project-model'
import type { UniversalCompound, TherapeuticClass, CompoundType } from '@/lib/core/compound-model'
import type { IBInput, IBGenerationConfig } from '@/lib/core/ib-input'
import { 
  createDefaultGenerationConfig, 
  calculateOverallCompleteness,
  validateIBInput 
} from '@/lib/core/ib-input'
import { calculateCMCCompleteness } from '@/lib/core/cmc-model'
import { calculateNonclinicalCompleteness } from '@/lib/core/nonclinical-model'
import { calculatePKCompleteness, calculatePDCompleteness } from '@/lib/core/pkpd-model'
import { calculateSafetyCompleteness } from '@/lib/core/safety-model'
import { buildReferencesFromEnrichment } from '@/lib/core/references-model'

// Import enrichers
import { enrichCMC } from './cmc-enricher'
import { enrichClinicalTrials } from './clinical-enricher'
import { enrichPKPD } from './pkpd-enricher'
import { enrichSafety } from './safety-enricher'
import { enrichNonclinical } from './nonclinical-enricher'

// ============================================================================
// MAIN BUILDER
// ============================================================================

/**
 * Build complete IBInput from project data
 * 
 * This is the main entry point for IB enrichment.
 * It orchestrates all enrichers and builds the unified IBInput object.
 * 
 * @param projectId - Project ID to enrich
 * @param config - Optional generation config overrides
 * @returns Complete IBInput ready for IB generation
 */
export async function buildIBInput(
  projectId: string,
  config?: Partial<IBGenerationConfig>
): Promise<IBInput> {
  console.log(`[IB Input Builder] Starting build for project ${projectId}`)
  const startTime = Date.now()
  const warnings: string[] = []
  
  // 1. Fetch project data
  const project = await fetchProject(projectId)
  if (!project) {
    throw new Error(`Project not found: ${projectId}`)
  }
  
  console.log(`[IB Input Builder] Project: ${project.compound_name}, Phase ${project.study_phase}, ${project.indication}`)
  
  // 2. Build compound object
  const compound = buildCompound(project)
  
  // 3. Run all enrichers in parallel
  console.log(`[IB Input Builder] Running enrichers...`)
  
  const [cmc, clinicalTrials, pkpd, safety, nonclinical] = await Promise.all([
    enrichCMC(project, compound).catch(err => {
      warnings.push(`CMC enrichment failed: ${err.message}`)
      return { source: 'class_based' as const }
    }),
    enrichClinicalTrials(project, compound).catch(err => {
      warnings.push(`Clinical trials enrichment failed: ${err.message}`)
      return {
        all_trials_raw: [],
        filtered_trials: [],
        filter_criteria: { compound_name: compound.inn_name, indication: project.indication, phases_included: [2, 3, 4] as const },
        enrichment_status: 'failed' as const,
        trials_count: 0,
        count_by_phase: { phase_2: 0, phase_3: 0, phase_4: 0 },
        trials_with_results: 0,
        last_updated: new Date().toISOString()
      }
    }),
    enrichPKPD(compound).catch(err => {
      warnings.push(`PK/PD enrichment failed: ${err.message}`)
      return { pk: { source: 'class_based' as const }, pd: { source: 'class_based' as const } }
    }),
    enrichSafety(compound, projectId).catch(err => {
      warnings.push(`Safety enrichment failed: ${err.message}`)
      return {
        common_ae: [],
        serious_ae: [],
        aes_of_special_interest: [],
        warnings: [],
        precautions: [],
        contraindications: [],
        drug_interactions: [],
        special_populations: {},
        source: 'class_based' as const
      }
    }),
    enrichNonclinical(compound).catch(err => {
      warnings.push(`Nonclinical enrichment failed: ${err.message}`)
      return { source: 'class_based' as const }
    })
  ])
  
  // 4. Build references from enrichment data
  const references = buildReferencesFromEnrichment(
    compound.inn_name,
    { source: cmc.source },
    clinicalTrials.filtered_trials,
    [] // Publications would come from literature enricher
  )
  
  // 5. Calculate completeness scores
  const completeness = {
    cmc: calculateCMCCompleteness(cmc, compound.compound_type),
    nonclinical: calculateNonclinicalCompleteness(nonclinical),
    clinical: clinicalTrials.trials_count > 0 ? 0.8 : 0.2,
    pk: calculatePKCompleteness(pkpd.pk),
    pd: calculatePDCompleteness(pkpd.pd),
    safety: calculateSafetyCompleteness(safety),
    overall: 0
  }
  completeness.overall = calculateOverallCompleteness(completeness)
  
  // 6. Build generation config
  const generationConfig: IBGenerationConfig = {
    ...createDefaultGenerationConfig(compound.compound_type),
    ...config
  }
  
  // 7. Assemble IBInput
  const ibInput: IBInput = {
    project,
    compound,
    cmc,
    nonclinical,
    clinical_trials: clinicalTrials,
    pk: pkpd.pk,
    pd: pkpd.pd,
    safety,
    references,
    generation_config: generationConfig,
    enriched_at: new Date().toISOString(),
    completeness,
    enrichment_warnings: warnings
  }
  
  // 8. Validate
  const validation = validateIBInput(ibInput)
  if (validation.warnings.length > 0) {
    warnings.push(...validation.warnings)
  }
  if (!validation.valid) {
    console.error(`[IB Input Builder] Validation errors:`, validation.errors)
    throw new Error(`IBInput validation failed: ${validation.errors.join(', ')}`)
  }
  
  const duration = Date.now() - startTime
  console.log(`[IB Input Builder] Build complete in ${duration}ms. Overall completeness: ${Math.round(completeness.overall * 100)}%`)
  
  if (warnings.length > 0) {
    console.warn(`[IB Input Builder] Warnings:`, warnings)
  }
  
  return ibInput
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Fetch project from database
 */
async function fetchProject(projectId: string): Promise<UniversalProject | null> {
  const supabase = await createClient()
  
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  
  if (error || !project) {
    console.error(`[IB Input Builder] Failed to fetch project:`, error)
    return null
  }
  
  // Map database record to UniversalProject
  return {
    project_id: project.id,
    project_code: project.project_code || `SKD-${project.id.slice(0, 3).toUpperCase()}`,
    title: project.title,
    version: project.version || '1.0',
    status: project.status || 'draft',
    org_id: project.org_id,
    sponsor_name: project.sponsor || 'Sponsor',
    region: project.region || 'FDA',
    product_type: project.product_type || 'innovator',
    compound_name: project.compound_name,
    compound_type: (project.compound_type as CompoundType) || 'small_molecule',
    therapeutic_class: project.drug_class as TherapeuticClass,
    inchikey: project.inchikey,
    indication: project.indication,
    study_phase: parsePhase(project.phase),
    population_type: 'adults',
    population_age_min: 18,
    population_age_max: 65,
    route_of_administration: project.route_of_administration || 'oral',
    dosage_form: project.dosage_form || 'tablet',
    study_design: project.study_design || 'randomized, double-blind, placebo-controlled',
    treatment_duration_weeks: project.treatment_duration_weeks || 12,
    rld_brand_name: project.rld_brand_name,
    rld_application_number: project.rld_application_number,
    enrichment_status: project.enrichment_status || 'pending',
    enrichment_completed_at: project.enrichment_completed_at,
    created_by: project.created_by,
    created_at: project.created_at,
    updated_at: project.updated_at
  }
}

/**
 * Build compound object from project
 */
function buildCompound(project: UniversalProject): UniversalCompound {
  return {
    compound_id: `compound_${project.project_id}`,
    inn_name: project.compound_name,
    compound_type: project.compound_type || 'small_molecule',
    product_role: project.product_type === 'generic' ? 'generic' : 
                  project.product_type === 'hybrid' ? 'biosimilar' : 'originator',
    therapeutic_class: project.therapeutic_class || 'OTHER',
    inchikey: project.inchikey,
    rld_brand_name: project.rld_brand_name,
    rld_application_number: project.rld_application_number,
    data_source: 'manual',
    last_updated: new Date().toISOString()
  }
}

/**
 * Parse phase string to StudyPhase number
 * Returns 2 as default (Phase 1 is not supported)
 */
function parsePhase(phase: string | number | undefined): 2 | 3 | 4 {
  if (!phase) return 2
  
  const phaseNum = typeof phase === 'number' ? phase : parseInt(phase.replace(/\D/g, ''), 10)
  
  // CRITICAL: Phase 1 is NOT supported - default to Phase 2
  if (phaseNum === 1) {
    console.warn(`[IB Input Builder] Phase 1 is not supported. Defaulting to Phase 2.`)
    return 2
  }
  
  if (phaseNum === 2) return 2
  if (phaseNum === 3) return 3
  if (phaseNum === 4) return 4
  
  return 2 // Default
}

/**
 * Quick enrichment for a single compound (without full project)
 */
export async function quickEnrichCompound(
  compoundName: string,
  indication: string,
  compoundType: CompoundType = 'small_molecule',
  therapeuticClass: TherapeuticClass = 'OTHER'
): Promise<IBInput> {
  // Create minimal project
  const project: UniversalProject = {
    project_id: `temp_${Date.now()}`,
    project_code: 'TEMP-001',
    title: `${compoundName} Study`,
    version: '1.0',
    status: 'draft',
    org_id: 'temp',
    sponsor_name: 'Temporary',
    region: 'FDA',
    product_type: 'innovator',
    compound_name: compoundName,
    compound_type: compoundType,
    therapeutic_class: therapeuticClass,
    indication,
    study_phase: 2,
    population_type: 'adults',
    population_age_min: 18,
    population_age_max: 65,
    route_of_administration: 'oral',
    dosage_form: 'tablet',
    study_design: 'randomized, double-blind, placebo-controlled',
    treatment_duration_weeks: 12,
    enrichment_status: 'pending',
    created_by: 'system',
    created_at: new Date().toISOString()
  }
  
  const compound: UniversalCompound = {
    compound_id: `compound_temp_${Date.now()}`,
    inn_name: compoundName,
    compound_type: compoundType,
    product_role: 'originator',
    therapeutic_class: therapeuticClass,
    data_source: 'manual',
    last_updated: new Date().toISOString()
  }
  
  // Run enrichers
  const [cmc, clinicalTrials, pkpd, safety, nonclinical] = await Promise.all([
    enrichCMC(project, compound),
    enrichClinicalTrials(project, compound),
    enrichPKPD(compound),
    enrichSafety(compound),
    enrichNonclinical(compound)
  ])
  
  const references = buildReferencesFromEnrichment(
    compoundName,
    { source: cmc.source },
    clinicalTrials.filtered_trials,
    []
  )
  
  const completeness = {
    cmc: calculateCMCCompleteness(cmc, compoundType),
    nonclinical: calculateNonclinicalCompleteness(nonclinical),
    clinical: clinicalTrials.trials_count > 0 ? 0.8 : 0.2,
    pk: calculatePKCompleteness(pkpd.pk),
    pd: calculatePDCompleteness(pkpd.pd),
    safety: calculateSafetyCompleteness(safety),
    overall: 0
  }
  completeness.overall = calculateOverallCompleteness(completeness)
  
  return {
    project,
    compound,
    cmc,
    nonclinical,
    clinical_trials: clinicalTrials,
    pk: pkpd.pk,
    pd: pkpd.pd,
    safety,
    references,
    generation_config: createDefaultGenerationConfig(compoundType),
    enriched_at: new Date().toISOString(),
    completeness,
    enrichment_warnings: []
  }
}
