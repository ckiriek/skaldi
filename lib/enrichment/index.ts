/**
 * Universal Enrichment Layer
 * 
 * Compound-agnostic enrichment for Skaldi document generation.
 * Supports Phase 2/3/4 clinical trials (NO Phase 1).
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

// ============================================================================
// MAIN BUILDER
// ============================================================================

export { buildIBInput, quickEnrichCompound } from './ib-input-builder'

// ============================================================================
// INDIVIDUAL ENRICHERS
// ============================================================================

export { enrichCMC } from './cmc-enricher'
export { enrichClinicalTrials, indicationMatches } from './clinical-enricher'
export { enrichPKPD, enrichPK, enrichPD } from './pkpd-enricher'
export { enrichSafety } from './safety-enricher'
export { enrichNonclinical } from './nonclinical-enricher'
export { 
  enrichSynopsisParameters,
  detectTherapeuticArea,
  getTreatmentDurationByIndication,
  getWashoutDuration,
  inferDosingFrequency,
  getEffectSizeDescription,
  formatDuration,
  THERAPEUTIC_AREA_DEFAULTS,
  PHASE_ADJUSTMENTS,
  type SynopsisParameters 
} from './synopsis-enricher'

// ============================================================================
// CLASS FALLBACKS
// ============================================================================

export {
  // Registry and getters
  getClassFallback,
  hasSpecificFallback,
  getSupportedClasses,
  getClassCMCFallback,
  getClassNonclinicalFallback,
  getClassPKFallback,
  getClassPDFallback,
  getClassSafetyFallback,
  // Individual fallbacks
  SSRI_FALLBACK,
  MAB_FALLBACK,
  PPI_FALLBACK,
  ANTI_TNF_FALLBACK,
  DEFAULT_FALLBACK,
  // Types
  type ClassFallbackData
} from './class-fallbacks'
