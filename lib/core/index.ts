/**
 * Skaldi Core Models
 * 
 * Universal data models for compound-agnostic document generation.
 * Supports Phase 2/3/4 clinical trials (NO Phase 1).
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

// ============================================================================
// COMPOUND MODEL
// ============================================================================

export {
  // Types
  type CompoundType,
  type ProductRole,
  type TherapeuticClass,
  type CompoundDataSource,
  // Interface
  type UniversalCompound,
  // Functions
  isSmallMolecule,
  isBiologic,
  isBiosimilar,
  isATMP,
  requiresReferenceProduct,
  getCMCSectionTitle,
  requiresImmunogenicitySection,
  getClassFallbackKey,
  createMinimalCompound,
  validateCompound
} from './compound-model'

// ============================================================================
// PROJECT MODEL
// ============================================================================

export {
  // Types
  type ProductType,
  type StudyPhase,
  type ProjectStatus,
  type RegulatoryRegion,
  type PopulationType,
  type RouteOfAdministration,
  type EnrichmentStatus,
  // Interfaces
  type StudyDesign,
  type EnrichmentMetadata,
  type UniversalProject,
  // Functions
  isGenericProject,
  isInnovatorProject,
  requiresReferenceProduct as projectRequiresReferenceProduct,
  isBiologicProject,
  shouldTriggerEnrichment,
  getPhaseDefaults,
  validateProjectForGeneration,
  createMinimalProject
} from './project-model'

// ============================================================================
// CMC MODEL
// ============================================================================

export {
  // Types
  type CMCDataSource,
  // Interfaces
  type SolubilityProfile,
  type PhysicalProperties,
  type BiologicProperties,
  type FormulationData,
  type StorageStability,
  type UniversalCMC,
  // Functions
  createCMCForCompoundType,
  hasSmallMoleculeData,
  hasBiologicData,
  calculateCMCCompleteness,
  mergeCMCData,
  validateCMC
} from './cmc-model'

// ============================================================================
// NONCLINICAL MODEL
// ============================================================================

export {
  // Types
  type NonclinicalDataSource,
  // Interfaces
  type NOAELData,
  type ToxicityStudySummary,
  type UniversalNonclinical,
  // Functions
  hasPharmacologyData,
  hasToxicologyData,
  calculateNonclinicalCompleteness,
  getRequiredNonclinicalSections,
  mergeNonclinicalData,
  validateNonclinical,
  createEmptyNonclinical
} from './nonclinical-model'

// ============================================================================
// CLINICAL MODEL
// ============================================================================

export {
  // Types
  type ClinicalPhase,
  type TrialStatus,
  type ClinicalEnrichmentStatus,
  // Interfaces
  type ClinicalTrial,
  type TrialFilterCriteria,
  type UniversalClinicalTrials,
  // Functions
  filterTrials,
  sortTrialsByRelevance,
  createDefaultFilterCriteria,
  calculateTrialStats,
  createEmptyClinicalTrials,
  buildClinicalTrials,
  validateClinicalTrials
} from './clinical-model'

// ============================================================================
// PK/PD MODEL
// ============================================================================

export {
  // Types
  type PKPDDataSource,
  // Interfaces
  type DistributionParams,
  type MetabolismParams,
  type EliminationParams,
  type SpecialPopulationsPK,
  type UniversalPK,
  type UniversalPD,
  type UniversalPKPD,
  // Functions
  hasSufficientPKData,
  hasSufficientPDData,
  calculatePKCompleteness,
  calculatePDCompleteness,
  mergePKData,
  mergePDData,
  createEmptyPK,
  createEmptyPD,
  validatePKPD
} from './pkpd-model'

// ============================================================================
// SAFETY MODEL
// ============================================================================

export {
  // Types
  type SafetyDataSource,
  type AESeverity,
  type InteractionSeverity,
  // Interfaces
  type AdverseEvent,
  type DrugInteraction,
  type SpecialPopulationSafety,
  type UniversalSafety,
  // Functions
  getFrequencyCategory,
  sortAEByFrequency,
  filterCommonAE,
  filterSeriousAE,
  groupAEBySOC,
  calculateSafetyCompleteness,
  mergeSafetyData,
  createEmptySafety,
  validateSafety
} from './safety-model'

// ============================================================================
// REFERENCES MODEL
// ============================================================================

export {
  // Types
  type ReferenceSource,
  type ReferenceType,
  // Interfaces
  type LabelReference,
  type EparReference,
  type ClinicalTrialReference,
  type Publication,
  type ClassReview,
  type UniversalReferences,
  // Functions
  formatLabelCitation,
  formatPublicationCitation,
  formatTrialCitation,
  generateFormattedReferenceList,
  createEmptyReferences,
  mergeReferences,
  buildReferencesFromEnrichment,
  validateReferences
} from './references-model'

// ============================================================================
// IB INPUT MODEL
// ============================================================================

export {
  // Types
  type DocumentLength,
  type RegulatoryFormat,
  // Interfaces
  type IBGenerationConfig,
  type IBInput,
  // Functions
  createDefaultGenerationConfig,
  calculateOverallCompleteness,
  validateIBInput,
  getIBSections,
  createMinimalIBInput
} from './ib-input'
