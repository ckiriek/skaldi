/**
 * Universal CMC (Chemistry, Manufacturing, and Controls) Model
 * 
 * Supports both:
 * - Small molecules: chemical structure, pKa, logP, solubility
 * - Biologics: protein structure, glycosylation, expression system
 * 
 * Used in IB Section 5: Physical, Chemical, and Pharmaceutical Properties
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import { CompoundType } from './compound-model'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Data source for CMC information
 */
export type CMCDataSource = 
  | 'pubchem'        // PubChem database
  | 'label'          // FDA label (DailyMed)
  | 'epar'           // EMA EPAR
  | 'project'        // Project-specific data
  | 'class_based'    // Class-level fallback (deprecated - avoid using)
  | 'sponsor_data'   // Sponsor-provided
  | 'not_available'  // No data found from any source

/**
 * Solubility profile at different pH values
 */
export interface SolubilityProfile {
  /**
   * Solubility at pH 1.2 (gastric)
   */
  pH_1_2?: string
  
  /**
   * Solubility at pH 4.5 (duodenal)
   */
  pH_4_5?: string
  
  /**
   * Solubility at pH 6.8 (intestinal)
   */
  pH_6_8?: string
  
  /**
   * Solubility in water
   */
  water?: string
  
  /**
   * Solubility in organic solvents
   */
  organic?: string
  
  /**
   * BCS (Biopharmaceutics Classification System) class
   */
  bcs_class?: 1 | 2 | 3 | 4
}

/**
 * Physical properties
 */
export interface PhysicalProperties {
  /**
   * Physical state (solid, liquid, etc.)
   */
  state: string
  
  /**
   * Color and appearance
   */
  color?: string
  
  /**
   * Crystalline form / polymorphism
   */
  polymorphism?: string
  
  /**
   * Melting point
   */
  melting_point?: string
  
  /**
   * Boiling point
   */
  boiling_point?: string
  
  /**
   * Hygroscopicity
   */
  hygroscopicity?: string
  
  /**
   * Optical rotation (for chiral compounds)
   */
  optical_rotation?: string
}

/**
 * Biologic-specific properties
 */
export interface BiologicProperties {
  /**
   * Protein structure description
   * Example: "Humanized IgG1 kappa monoclonal antibody"
   */
  protein_structure?: string
  
  /**
   * Molecular weight (for biologics, typically in kDa)
   */
  molecular_weight_kda?: number
  
  /**
   * Glycosylation pattern
   */
  glycosylation?: string
  
  /**
   * Molecular heterogeneity
   */
  molecular_heterogeneity?: string
  
  /**
   * Expression system
   * Example: "Chinese Hamster Ovary (CHO) cells"
   */
  expression_system?: string
  
  /**
   * Post-translational modifications
   */
  post_translational_modifications?: string[]
  
  /**
   * Isoelectric point (pI)
   */
  isoelectric_point?: string
  
  /**
   * Aggregation propensity
   */
  aggregation?: string
  
  /**
   * Deamidation sites
   */
  deamidation?: string
  
  /**
   * Oxidation sites
   */
  oxidation?: string
}

/**
 * Drug product formulation
 */
export interface FormulationData {
  /**
   * Dosage form
   * Example: "film-coated tablet", "solution for injection"
   */
  dosage_form: string
  
  /**
   * Strength(s)
   * Example: "20 mg", "40 mg/mL"
   */
  strength?: string
  
  /**
   * Qualitative composition (list of excipients)
   */
  qualitative_composition?: string[]
  
  /**
   * Quantitative composition (with amounts)
   */
  quantitative_composition?: string[]
  
  /**
   * Route of administration
   */
  route?: string
  
  /**
   * Reconstitution instructions (if applicable)
   */
  reconstitution?: string
  
  /**
   * Dilution instructions (if applicable)
   */
  dilution?: string
  
  /**
   * Compatibility information
   */
  compatibility?: string
}

/**
 * Storage and stability
 */
export interface StorageStability {
  /**
   * Storage conditions
   * Example: "Store at 2-8°C. Do not freeze."
   */
  storage_conditions: string
  
  /**
   * Shelf life
   * Example: "24 months"
   */
  shelf_life?: string
  
  /**
   * In-use stability
   */
  in_use_stability?: string
  
  /**
   * Photostability
   */
  photostability?: string
  
  /**
   * Packaging description
   */
  packaging?: string
  
  /**
   * Special handling instructions
   */
  special_handling?: string
}

// ============================================================================
// MAIN INTERFACE
// ============================================================================

/**
 * Universal CMC Model
 * 
 * Comprehensive CMC data structure supporting both small molecules and biologics.
 * Used for IB Section 5 generation.
 */
export interface UniversalCMC {
  // -------------------------------------------------------------------------
  // SMALL MOLECULE SPECIFIC
  // -------------------------------------------------------------------------
  
  /**
   * Chemical name (IUPAC or common)
   */
  chemical_name?: string
  
  /**
   * Chemical structure (SMILES, InChI, or description)
   */
  chemical_structure?: string
  
  /**
   * Molecular formula
   * Example: "C17H18F3NO"
   */
  molecular_formula?: string
  
  /**
   * Molecular weight in g/mol
   */
  molecular_weight?: number
  
  /**
   * pKa value(s)
   */
  pKa?: string
  
  /**
   * logP (partition coefficient)
   */
  logP?: number
  
  /**
   * logD at pH 7.4
   */
  logD?: number
  
  /**
   * Solubility profile
   */
  solubility_profile?: SolubilityProfile
  
  /**
   * Physical properties
   */
  physical_properties?: PhysicalProperties
  
  /**
   * Stereochemistry
   */
  stereochemistry?: string
  
  /**
   * Salt form
   * Example: "hydrochloride"
   */
  salt_form?: string
  
  // -------------------------------------------------------------------------
  // BIOLOGIC SPECIFIC
  // -------------------------------------------------------------------------
  
  /**
   * Biologic-specific properties
   * Only populated for biologics/biosimilars
   */
  biologic_properties?: BiologicProperties
  
  // -------------------------------------------------------------------------
  // COMMON (Drug Product)
  // -------------------------------------------------------------------------
  
  /**
   * Formulation data
   */
  formulation?: FormulationData
  
  /**
   * Manufacturing sites (optional)
   */
  manufacturing_sites?: string[]
  
  /**
   * Storage and stability
   */
  storage_stability?: StorageStability
  
  // -------------------------------------------------------------------------
  // METADATA
  // -------------------------------------------------------------------------
  
  /**
   * Primary data source
   */
  source: CMCDataSource
  
  /**
   * Additional sources used
   */
  additional_sources?: CMCDataSource[]
  
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
 * Create CMC structure appropriate for compound type
 */
export function createCMCForCompoundType(compoundType: CompoundType): Partial<UniversalCMC> {
  if (compoundType === 'small_molecule') {
    return {
      source: 'class_based',
      physical_properties: {
        state: 'White to off-white crystalline powder'
      },
      formulation: {
        dosage_form: 'tablet'
      }
    }
  } else if (compoundType === 'biologic' || compoundType === 'biosimilar') {
    return {
      source: 'class_based',
      biologic_properties: {
        expression_system: 'Chinese Hamster Ovary (CHO) cells'
      },
      formulation: {
        dosage_form: 'solution for injection'
      },
      storage_stability: {
        storage_conditions: 'Store at 2-8°C. Do not freeze. Protect from light.'
      }
    }
  } else if (compoundType === 'atmp') {
    return {
      source: 'class_based',
      formulation: {
        dosage_form: 'cell suspension for infusion'
      },
      storage_stability: {
        storage_conditions: 'Store frozen. Thaw immediately before use.'
      }
    }
  }
  
  return { source: 'class_based' }
}

/**
 * Check if CMC has small molecule data
 */
export function hasSmallMoleculeData(cmc: UniversalCMC): boolean {
  return !!(cmc.molecular_formula || cmc.molecular_weight || cmc.pKa || cmc.logP)
}

/**
 * Check if CMC has biologic data
 */
export function hasBiologicData(cmc: UniversalCMC): boolean {
  return !!(cmc.biologic_properties?.protein_structure || 
            cmc.biologic_properties?.expression_system ||
            cmc.biologic_properties?.glycosylation)
}

/**
 * Calculate CMC completeness score
 */
export function calculateCMCCompleteness(cmc: UniversalCMC, compoundType: CompoundType): number {
  let score = 0
  let maxScore = 0
  
  if (compoundType === 'small_molecule') {
    // Small molecule fields
    maxScore = 10
    if (cmc.chemical_name) score++
    if (cmc.molecular_formula) score++
    if (cmc.molecular_weight) score++
    if (cmc.pKa) score++
    if (cmc.logP) score++
    if (cmc.solubility_profile) score++
    if (cmc.physical_properties) score++
    if (cmc.formulation?.dosage_form) score++
    if (cmc.storage_stability?.storage_conditions) score++
    if (cmc.storage_stability?.shelf_life) score++
  } else {
    // Biologic fields
    maxScore = 10
    if (cmc.biologic_properties?.protein_structure) score++
    if (cmc.biologic_properties?.molecular_weight_kda) score++
    if (cmc.biologic_properties?.glycosylation) score++
    if (cmc.biologic_properties?.expression_system) score++
    if (cmc.biologic_properties?.isoelectric_point) score++
    if (cmc.formulation?.dosage_form) score++
    if (cmc.formulation?.strength) score++
    if (cmc.storage_stability?.storage_conditions) score++
    if (cmc.storage_stability?.shelf_life) score++
    if (cmc.manufacturing_sites?.length) score++
  }
  
  return maxScore > 0 ? score / maxScore : 0
}

/**
 * Merge CMC data from multiple sources
 */
export function mergeCMCData(
  primary: Partial<UniversalCMC>,
  secondary: Partial<UniversalCMC>,
  fallback: Partial<UniversalCMC>
): UniversalCMC {
  // Helper to get first non-null value
  const firstValue = <T>(a: T | undefined, b: T | undefined, c: T | undefined): T | undefined => {
    return a ?? b ?? c
  }
  
  return {
    // Small molecule
    chemical_name: firstValue(primary.chemical_name, secondary.chemical_name, fallback.chemical_name),
    chemical_structure: firstValue(primary.chemical_structure, secondary.chemical_structure, fallback.chemical_structure),
    molecular_formula: firstValue(primary.molecular_formula, secondary.molecular_formula, fallback.molecular_formula),
    molecular_weight: firstValue(primary.molecular_weight, secondary.molecular_weight, fallback.molecular_weight),
    pKa: firstValue(primary.pKa, secondary.pKa, fallback.pKa),
    logP: firstValue(primary.logP, secondary.logP, fallback.logP),
    solubility_profile: firstValue(primary.solubility_profile, secondary.solubility_profile, fallback.solubility_profile),
    physical_properties: firstValue(primary.physical_properties, secondary.physical_properties, fallback.physical_properties),
    
    // Biologic
    biologic_properties: firstValue(primary.biologic_properties, secondary.biologic_properties, fallback.biologic_properties),
    
    // Common
    formulation: {
      dosage_form: firstValue(
        primary.formulation?.dosage_form,
        secondary.formulation?.dosage_form,
        fallback.formulation?.dosage_form
      ) || 'tablet',
      strength: firstValue(
        primary.formulation?.strength,
        secondary.formulation?.strength,
        fallback.formulation?.strength
      ),
      qualitative_composition: firstValue(
        primary.formulation?.qualitative_composition,
        secondary.formulation?.qualitative_composition,
        fallback.formulation?.qualitative_composition
      ),
      quantitative_composition: firstValue(
        primary.formulation?.quantitative_composition,
        secondary.formulation?.quantitative_composition,
        fallback.formulation?.quantitative_composition
      )
    },
    storage_stability: firstValue(primary.storage_stability, secondary.storage_stability, fallback.storage_stability),
    manufacturing_sites: firstValue(primary.manufacturing_sites, secondary.manufacturing_sites, fallback.manufacturing_sites),
    
    // Metadata
    source: primary.source || secondary.source || fallback.source || 'class_based',
    additional_sources: [
      ...(primary.additional_sources || []),
      ...(secondary.additional_sources || []),
      ...(fallback.additional_sources || [])
    ].filter((v, i, a) => a.indexOf(v) === i), // unique
    last_updated: new Date().toISOString()
  }
}

/**
 * Validate CMC data
 */
export function validateCMC(cmc: UniversalCMC, compoundType: CompoundType): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Common validation
  if (!cmc.formulation?.dosage_form) {
    warnings.push('Dosage form not specified')
  }
  
  if (!cmc.storage_stability?.storage_conditions) {
    warnings.push('Storage conditions not specified')
  }
  
  // Type-specific validation
  if (compoundType === 'small_molecule') {
    if (!cmc.molecular_formula && !cmc.molecular_weight) {
      warnings.push('Molecular formula and weight not specified for small molecule')
    }
  } else if (compoundType === 'biologic' || compoundType === 'biosimilar') {
    if (!cmc.biologic_properties?.expression_system) {
      warnings.push('Expression system not specified for biologic')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
