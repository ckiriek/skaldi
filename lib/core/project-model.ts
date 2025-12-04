/**
 * Universal Project Model
 * 
 * Extended project model for Skaldi that supports:
 * - Phase 2/3/4 clinical trials (NO Phase 1)
 * - All compound types (small molecules, biologics, biosimilars, ATMPs)
 * - Multi-region regulatory submissions (FDA, EMA, MHRA, PMDA)
 * 
 * This is the foundation for all document generation in Skaldi.
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import { CompoundType, TherapeuticClass } from './compound-model'

// ============================================================================
// ENUMS & TYPES
// ============================================================================

/**
 * Product type for regulatory pathway
 */
export type ProductType = 'innovator' | 'generic' | 'hybrid'

/**
 * Study phase - ONLY Phase 2, 3, 4 supported
 * Phase 1 is explicitly NOT supported in Skaldi
 */
export type StudyPhase = 2 | 3 | 4

/**
 * Project status
 */
export type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'archived'

/**
 * Regulatory region
 */
export type RegulatoryRegion = 
  | 'FDA'           // US Food and Drug Administration
  | 'EMA'           // European Medicines Agency
  | 'MHRA'          // UK Medicines and Healthcare products Regulatory Agency
  | 'PMDA'          // Japan Pharmaceuticals and Medical Devices Agency
  | 'TGA'           // Australia Therapeutic Goods Administration
  | 'Health_Canada' // Health Canada
  | 'ANVISA'        // Brazil National Health Surveillance Agency
  | 'multi_region'  // Multiple regions

/**
 * Population type
 */
export type PopulationType = 'adults' | 'pediatrics' | 'mixed' | 'elderly'

/**
 * Route of administration
 */
export type RouteOfAdministration = 
  | 'oral'
  | 'iv'           // Intravenous
  | 'sc'           // Subcutaneous
  | 'im'           // Intramuscular
  | 'inhalation'
  | 'topical'
  | 'transdermal'
  | 'ophthalmic'
  | 'nasal'
  | 'rectal'
  | 'intrathecal'
  | 'other'

/**
 * Enrichment status
 */
export type EnrichmentStatus = 
  | 'pending'       // Not started
  | 'in_progress'   // Currently running
  | 'completed'     // Successfully completed
  | 'partial'       // Completed with some data missing
  | 'failed'        // Failed with errors
  | 'skipped'       // Skipped (e.g., for innovator products)

// ============================================================================
// STUDY DESIGN
// ============================================================================

/**
 * Study design configuration
 */
export interface StudyDesign {
  /**
   * Design type
   */
  design_type: 'randomized' | 'non_randomized' | 'observational' | 'single_arm'
  
  /**
   * Blinding level
   */
  blinding: 'open_label' | 'single_blind' | 'double_blind' | 'triple_blind'
  
  /**
   * Control type
   */
  control_type?: 'placebo' | 'active' | 'dose_response' | 'historical' | 'none'
  
  /**
   * Number of treatment arms
   */
  arms: number
  
  /**
   * Treatment duration in weeks
   */
  duration_weeks: number
  
  /**
   * Follow-up duration in weeks (post-treatment)
   */
  followup_weeks?: number
  
  /**
   * Primary endpoint description
   */
  primary_endpoint?: string
  
  /**
   * Key secondary endpoints
   */
  secondary_endpoints?: string[]
  
  /**
   * Target enrollment
   */
  target_enrollment?: number
  
  /**
   * Randomization ratio (e.g., "1:1", "2:1")
   */
  randomization_ratio?: string
}

// ============================================================================
// ENRICHMENT METADATA
// ============================================================================

/**
 * Enrichment metadata tracking
 */
export interface EnrichmentMetadata {
  /**
   * Data sources successfully used
   */
  sources_used: string[]
  
  /**
   * Coverage scores by category (0-1)
   */
  coverage: {
    compound_identity: number    // InChIKey/CAS resolved
    labels: number               // FDA/EMA labels found
    nonclinical: number          // Nonclinical data completeness
    clinical: number             // Clinical trials data
    safety: number               // Safety data (FAERS, etc.)
    literature: number           // PubMed references
  }
  
  /**
   * Errors encountered during enrichment
   */
  errors?: Array<{
    code: string
    message: string
    source: string
    severity: 'error' | 'warning'
  }>
  
  /**
   * Timing information
   */
  started_at: string
  completed_at: string
  duration_ms: number
  
  /**
   * Record counts
   */
  records_fetched: {
    labels: number
    trials: number
    literature: number
    adverse_events: number
  }
}

// ============================================================================
// MAIN INTERFACE
// ============================================================================

/**
 * Universal Project Model
 * 
 * Core entity representing a clinical development project in Skaldi.
 * All document generation starts from this model.
 */
export interface UniversalProject {
  // -------------------------------------------------------------------------
  // IDENTITY
  // -------------------------------------------------------------------------
  
  /**
   * Unique project identifier (UUID)
   */
  project_id: string
  
  /**
   * Human-readable project code
   * Example: "SKD-054"
   */
  project_code: string
  
  /**
   * Project title
   */
  title: string
  
  /**
   * Project version
   */
  version: string
  
  /**
   * Current status
   */
  status: ProjectStatus
  
  // -------------------------------------------------------------------------
  // ORGANIZATION
  // -------------------------------------------------------------------------
  
  /**
   * Organization ID (tenant)
   */
  org_id: string
  
  /**
   * Sponsor name
   */
  sponsor_name: string
  
  /**
   * Sponsor address (for regulatory documents)
   */
  sponsor_address?: string
  
  // -------------------------------------------------------------------------
  // REGULATORY
  // -------------------------------------------------------------------------
  
  /**
   * Primary regulatory region
   */
  region: RegulatoryRegion
  
  /**
   * Additional regions (for multi-region submissions)
   */
  additional_regions?: RegulatoryRegion[]
  
  /**
   * Product type for regulatory pathway
   */
  product_type: ProductType
  
  // -------------------------------------------------------------------------
  // COMPOUND
  // -------------------------------------------------------------------------
  
  /**
   * Compound name (INN)
   */
  compound_name: string
  
  /**
   * Compound type
   */
  compound_type: CompoundType
  
  /**
   * Therapeutic class
   */
  therapeutic_class?: TherapeuticClass
  
  /**
   * Reference to compound entity (if exists)
   */
  compound_id?: string
  
  /**
   * InChIKey for chemical identification
   */
  inchikey?: string
  
  // -------------------------------------------------------------------------
  // STUDY PARAMETERS
  // -------------------------------------------------------------------------
  
  /**
   * Target indication
   */
  indication: string
  
  /**
   * Study phase - ONLY 2, 3, or 4
   * Phase 1 is NOT supported
   */
  study_phase: StudyPhase
  
  /**
   * Population type
   */
  population_type: PopulationType
  
  /**
   * Minimum age for inclusion (years)
   */
  population_age_min: number
  
  /**
   * Maximum age for inclusion (years)
   */
  population_age_max: number
  
  // -------------------------------------------------------------------------
  // DRUG ADMINISTRATION
  // -------------------------------------------------------------------------
  
  /**
   * Route of administration
   */
  route_of_administration: RouteOfAdministration
  
  /**
   * Dosage form
   * Example: "tablet", "capsule", "solution for injection"
   */
  dosage_form: string
  
  /**
   * Dose strength(s)
   * Example: "20 mg", "40 mg/mL"
   */
  dose_strength?: string
  
  // -------------------------------------------------------------------------
  // STUDY DESIGN
  // -------------------------------------------------------------------------
  
  /**
   * Study design description (free text)
   */
  study_design: string
  
  /**
   * Structured study design configuration
   */
  design_config?: StudyDesign
  
  /**
   * Treatment duration in weeks
   */
  treatment_duration_weeks: number
  
  // -------------------------------------------------------------------------
  // REFERENCE PRODUCT (for Generic/Biosimilar)
  // -------------------------------------------------------------------------
  
  /**
   * Reference Listed Drug (RLD) brand name
   */
  rld_brand_name?: string
  
  /**
   * RLD application number
   */
  rld_application_number?: string
  
  /**
   * Therapeutic Equivalence code
   */
  te_code?: string
  
  // -------------------------------------------------------------------------
  // ENRICHMENT
  // -------------------------------------------------------------------------
  
  /**
   * Enrichment status
   */
  enrichment_status: EnrichmentStatus
  
  /**
   * Enrichment completion timestamp
   */
  enrichment_completed_at?: string
  
  /**
   * Detailed enrichment metadata
   */
  enrichment_metadata?: EnrichmentMetadata
  
  /**
   * IB-specific enrichment data (cached)
   */
  ib_enrichment_data?: Record<string, unknown>
  
  /**
   * IB enrichment timestamp
   */
  ib_enriched_at?: string
  
  // -------------------------------------------------------------------------
  // AUDIT
  // -------------------------------------------------------------------------
  
  /**
   * Created by user ID
   */
  created_by: string
  
  /**
   * Creation timestamp
   */
  created_at: string
  
  /**
   * Last update timestamp
   */
  updated_at?: string
  
  /**
   * Last updated by user ID
   */
  updated_by?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if project is for a generic product
 */
export function isGenericProject(project: UniversalProject): boolean {
  return project.product_type === 'generic'
}

/**
 * Check if project is for an innovator product
 */
export function isInnovatorProject(project: UniversalProject): boolean {
  return project.product_type === 'innovator'
}

/**
 * Check if project requires reference product data
 */
export function requiresReferenceProduct(project: UniversalProject): boolean {
  return project.product_type === 'generic' || project.product_type === 'hybrid'
}

/**
 * Check if project is for a biologic compound
 */
export function isBiologicProject(project: UniversalProject): boolean {
  return project.compound_type === 'biologic' || project.compound_type === 'biosimilar'
}

/**
 * Check if enrichment should be triggered
 */
export function shouldTriggerEnrichment(project: UniversalProject): boolean {
  // Skip if already completed
  if (project.enrichment_status === 'completed') {
    return false
  }
  
  // Skip if in progress
  if (project.enrichment_status === 'in_progress') {
    return false
  }
  
  // Always enrich for generic/hybrid
  if (project.product_type === 'generic' || project.product_type === 'hybrid') {
    return true
  }
  
  // For innovator, enrich if compound is known
  if (project.product_type === 'innovator' && project.compound_name) {
    return true
  }
  
  return false
}

/**
 * Get phase-specific defaults for study design
 */
export function getPhaseDefaults(phase: StudyPhase): Partial<StudyDesign> {
  const defaults: Record<StudyPhase, Partial<StudyDesign>> = {
    2: {
      design_type: 'randomized',
      blinding: 'double_blind',
      control_type: 'placebo',
      arms: 3,
      duration_weeks: 12,
      target_enrollment: 200
    },
    3: {
      design_type: 'randomized',
      blinding: 'double_blind',
      control_type: 'placebo',
      arms: 2,
      duration_weeks: 24,
      target_enrollment: 500
    },
    4: {
      design_type: 'observational',
      blinding: 'open_label',
      control_type: 'none',
      arms: 1,
      duration_weeks: 52,
      target_enrollment: 1000
    }
  }
  
  return defaults[phase]
}

/**
 * Validate project for document generation
 */
export function validateProjectForGeneration(project: UniversalProject): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Required fields
  if (!project.compound_name) {
    errors.push('Compound name is required')
  }
  
  if (!project.indication) {
    errors.push('Indication is required')
  }
  
  if (!project.study_phase) {
    errors.push('Study phase is required')
  } else if (![2, 3, 4].includes(project.study_phase)) {
    errors.push('Only Phase 2, 3, and 4 are supported. Phase 1 is not supported.')
  }
  
  if (!project.compound_type) {
    warnings.push('Compound type not specified - defaulting to small_molecule')
  }
  
  // Generic-specific validation
  if (project.product_type === 'generic') {
    if (!project.rld_brand_name) {
      errors.push('RLD brand name is required for generic products')
    }
  }
  
  // Enrichment check
  if (project.enrichment_status !== 'completed' && project.enrichment_status !== 'partial') {
    warnings.push('Enrichment not completed - document may have missing data')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Create a minimal project for testing
 */
export function createMinimalProject(
  compoundName: string,
  indication: string,
  phase: StudyPhase
): Partial<UniversalProject> {
  return {
    project_id: `project_${Date.now()}`,
    project_code: `SKD-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    title: `${compoundName} Phase ${phase} Study`,
    version: '1.0',
    status: 'draft',
    compound_name: compoundName,
    compound_type: 'small_molecule',
    indication,
    study_phase: phase,
    population_type: 'adults',
    population_age_min: 18,
    population_age_max: 65,
    route_of_administration: 'oral',
    dosage_form: 'tablet',
    study_design: 'randomized, double-blind, placebo-controlled',
    treatment_duration_weeks: phase === 2 ? 12 : 24,
    product_type: 'innovator',
    region: 'FDA',
    enrichment_status: 'pending',
    created_at: new Date().toISOString()
  }
}
