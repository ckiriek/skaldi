/**
 * Universal IB Input Model
 * 
 * The unified input object for Investigator's Brochure generation.
 * This is the ONLY object that the IB generator should receive.
 * 
 * All enrichment data is assembled into this structure before generation.
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import { UniversalProject } from './project-model'
import { UniversalCompound, CompoundType, TherapeuticClass } from './compound-model'
import { UniversalCMC } from './cmc-model'
import { UniversalNonclinical } from './nonclinical-model'
import { UniversalClinicalTrials } from './clinical-model'
import { UniversalPK, UniversalPD } from './pkpd-model'
import { UniversalSafety } from './safety-model'
import { UniversalReferences } from './references-model'

// ============================================================================
// GENERATION CONFIG
// ============================================================================

/**
 * Target document length
 */
export type DocumentLength = 'abbreviated' | 'standard' | 'extended'

/**
 * Regulatory format
 */
export type RegulatoryFormat = 'ICH' | 'FDA' | 'EMA' | 'CTD'

/**
 * Generation configuration
 */
export interface IBGenerationConfig {
  /**
   * Target document length
   * - abbreviated: ~30-50 pages (for early development)
   * - standard: ~80-120 pages (typical IB)
   * - extended: ~150-200 pages (comprehensive)
   */
  target_length: DocumentLength
  
  /**
   * Include appendices
   */
  include_appendices: boolean
  
  /**
   * Output language
   */
  language: 'en' | 'de' | 'fr' | 'es' | 'ja'
  
  /**
   * Regulatory format/structure
   */
  regulatory_format: RegulatoryFormat
  
  /**
   * Include immunogenicity section (auto-set for biologics)
   */
  include_immunogenicity?: boolean
  
  /**
   * Include CMC details level
   */
  cmc_detail_level: 'minimal' | 'standard' | 'detailed'
  
  /**
   * Maximum trials to include in detail
   */
  max_trials_detailed: number
  
  /**
   * Include FAERS data
   */
  include_faers: boolean
  
  /**
   * Auto-generate references
   */
  auto_generate_references: boolean
}

// ============================================================================
// MAIN INTERFACE
// ============================================================================

/**
 * Universal IB Input
 * 
 * The single unified object that the IB generator receives.
 * Contains all enriched data needed for document generation.
 * 
 * CRITICAL: The generator should NOT know about specific drugs.
 * All drug-specific data comes through this object.
 */
export interface IBInput {
  // -------------------------------------------------------------------------
  // CORE DATA
  // -------------------------------------------------------------------------
  
  /**
   * Project data
   */
  project: UniversalProject
  
  /**
   * Compound data
   */
  compound: UniversalCompound
  
  // -------------------------------------------------------------------------
  // ENRICHED DATA
  // -------------------------------------------------------------------------
  
  /**
   * CMC (Chemistry, Manufacturing, Controls) data
   */
  cmc: UniversalCMC
  
  /**
   * Nonclinical data
   */
  nonclinical: UniversalNonclinical
  
  /**
   * Clinical trials data (Phase 2+ only)
   */
  clinical_trials: UniversalClinicalTrials
  
  /**
   * Pharmacokinetics data
   */
  pk: UniversalPK
  
  /**
   * Pharmacodynamics data
   */
  pd: UniversalPD
  
  /**
   * Safety data
   */
  safety: UniversalSafety
  
  /**
   * References
   */
  references: UniversalReferences
  
  // -------------------------------------------------------------------------
  // GENERATION CONFIG
  // -------------------------------------------------------------------------
  
  /**
   * Generation configuration
   */
  generation_config: IBGenerationConfig
  
  // -------------------------------------------------------------------------
  // METADATA
  // -------------------------------------------------------------------------
  
  /**
   * Enrichment timestamp
   */
  enriched_at: string
  
  /**
   * Data completeness scores
   */
  completeness: {
    cmc: number
    nonclinical: number
    clinical: number
    pk: number
    pd: number
    safety: number
    overall: number
  }
  
  /**
   * Warnings from enrichment
   */
  enrichment_warnings: string[]
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create default generation config
 */
export function createDefaultGenerationConfig(
  compoundType: CompoundType
): IBGenerationConfig {
  return {
    target_length: 'standard',
    include_appendices: true,
    language: 'en',
    regulatory_format: 'ICH',
    include_immunogenicity: compoundType === 'biologic' || compoundType === 'biosimilar',
    cmc_detail_level: 'standard',
    max_trials_detailed: 10,
    include_faers: true,
    auto_generate_references: true
  }
}

/**
 * Calculate overall completeness score
 */
export function calculateOverallCompleteness(scores: {
  cmc: number
  nonclinical: number
  clinical: number
  pk: number
  pd: number
  safety: number
}): number {
  // Weighted average
  const weights = {
    cmc: 0.10,
    nonclinical: 0.15,
    clinical: 0.25,
    pk: 0.15,
    pd: 0.10,
    safety: 0.25
  }
  
  return (
    scores.cmc * weights.cmc +
    scores.nonclinical * weights.nonclinical +
    scores.clinical * weights.clinical +
    scores.pk * weights.pk +
    scores.pd * weights.pd +
    scores.safety * weights.safety
  )
}

/**
 * Validate IB Input before generation
 */
export function validateIBInput(input: IBInput): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Required fields
  if (!input.project) {
    errors.push('Project data is required')
  }
  
  if (!input.compound) {
    errors.push('Compound data is required')
  }
  
  // Phase validation
  if (input.project?.study_phase && ![2, 3, 4].includes(input.project.study_phase)) {
    errors.push('Only Phase 2, 3, and 4 are supported. Phase 1 is not supported.')
  }
  
  // Compound type validation
  if (!input.compound?.compound_type) {
    warnings.push('Compound type not specified - defaulting to small_molecule')
  }
  
  // Completeness warnings
  if (input.completeness.overall < 0.5) {
    warnings.push(`Low data completeness (${Math.round(input.completeness.overall * 100)}%) - document may have gaps`)
  }
  
  // Clinical trials check
  if (input.clinical_trials.filtered_trials.length === 0) {
    warnings.push('No clinical trials found for this compound/indication')
  }
  
  // Safety data check
  if (input.safety.common_ae.length === 0) {
    warnings.push('No adverse event data available')
  }
  
  // Biologic-specific checks
  if (input.compound?.compound_type === 'biologic' || input.compound?.compound_type === 'biosimilar') {
    if (!input.cmc.biologic_properties) {
      warnings.push('Biologic properties not specified for biologic compound')
    }
    if (!input.safety.immunogenicity) {
      warnings.push('Immunogenicity data not available for biologic')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Get IB sections based on compound type
 */
export function getIBSections(compoundType: CompoundType): Array<{
  id: string
  title: string
  required: boolean
  applicable: boolean
}> {
  const baseSections = [
    { id: 'title_page', title: 'Title Page', required: true, applicable: true },
    { id: 'toc', title: 'Table of Contents', required: true, applicable: true },
    { id: 'summary', title: 'Summary', required: true, applicable: true },
    { id: 'introduction', title: 'Introduction', required: true, applicable: true },
    { id: 'cmc', title: 'Physical, Chemical, and Pharmaceutical Properties', required: true, applicable: true },
    { id: 'nonclinical', title: 'Nonclinical Studies', required: true, applicable: true },
    { id: 'clinical', title: 'Effects in Humans', required: true, applicable: true },
    { id: 'investigator_guidance', title: 'Summary of Data and Guidance for the Investigator', required: true, applicable: true },
    { id: 'references', title: 'References', required: true, applicable: true }
  ]
  
  // Add immunogenicity section for biologics
  if (compoundType === 'biologic' || compoundType === 'biosimilar') {
    // Insert after nonclinical
    const nonclinicalIndex = baseSections.findIndex(s => s.id === 'nonclinical')
    baseSections.splice(nonclinicalIndex + 1, 0, {
      id: 'immunogenicity',
      title: 'Immunogenicity',
      required: true,
      applicable: true
    })
    
    // Update CMC title for biologics
    const cmcSection = baseSections.find(s => s.id === 'cmc')
    if (cmcSection) {
      cmcSection.title = 'Physical, Biological, and Pharmaceutical Properties'
    }
  }
  
  return baseSections
}

/**
 * Create a minimal IB Input for testing
 */
export function createMinimalIBInput(
  compoundName: string,
  indication: string,
  phase: 2 | 3 | 4,
  compoundType: CompoundType = 'small_molecule',
  therapeuticClass: TherapeuticClass = 'OTHER'
): IBInput {
  const now = new Date().toISOString()
  
  return {
    project: {
      project_id: `project_${Date.now()}`,
      project_code: `SKD-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      title: `${compoundName} Phase ${phase} Study`,
      version: '1.0',
      status: 'draft',
      org_id: 'test_org',
      sponsor_name: 'Test Sponsor',
      region: 'FDA',
      product_type: 'innovator',
      compound_name: compoundName,
      compound_type: compoundType,
      therapeutic_class: therapeuticClass,
      indication,
      study_phase: phase,
      population_type: 'adults',
      population_age_min: 18,
      population_age_max: 65,
      route_of_administration: 'oral',
      dosage_form: 'tablet',
      study_design: 'randomized, double-blind, placebo-controlled',
      treatment_duration_weeks: phase === 2 ? 12 : 24,
      enrichment_status: 'pending',
      created_by: 'system',
      created_at: now
    },
    compound: {
      compound_id: `compound_${Date.now()}`,
      inn_name: compoundName,
      compound_type: compoundType,
      product_role: 'originator',
      therapeutic_class: therapeuticClass,
      data_source: 'manual',
      last_updated: now
    },
    cmc: {
      source: 'class_based',
      formulation: {
        dosage_form: 'tablet'
      }
    },
    nonclinical: {
      source: 'class_based'
    },
    clinical_trials: {
      all_trials_raw: [],
      filtered_trials: [],
      filter_criteria: {
        compound_name: compoundName,
        indication,
        phases_included: [2, 3, 4]
      },
      enrichment_status: 'fallback',
      trials_count: 0,
      count_by_phase: { phase_2: 0, phase_3: 0, phase_4: 0 },
      trials_with_results: 0,
      last_updated: now
    },
    pk: {
      source: 'class_based'
    },
    pd: {
      source: 'class_based'
    },
    safety: {
      common_ae: [],
      serious_ae: [],
      aes_of_special_interest: [],
      warnings: [],
      precautions: [],
      contraindications: [],
      drug_interactions: [],
      special_populations: {},
      source: 'class_based'
    },
    references: {
      labels: [],
      epar_documents: [],
      clinical_trial_ids: [],
      clinical_trials: [],
      publications: [],
      class_reviews: [],
      last_updated: now
    },
    generation_config: createDefaultGenerationConfig(compoundType),
    enriched_at: now,
    completeness: {
      cmc: 0,
      nonclinical: 0,
      clinical: 0,
      pk: 0,
      pd: 0,
      safety: 0,
      overall: 0
    },
    enrichment_warnings: ['Using minimal test data - no enrichment performed']
  }
}
