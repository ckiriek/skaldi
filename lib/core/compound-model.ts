/**
 * Universal Compound Model
 * 
 * Defines the structure for any pharmaceutical compound:
 * - Small molecules (fluoxetine, omeprazole, atorvastatin)
 * - Biologics (adalimumab, pembrolizumab, trastuzumab)
 * - Biosimilars (adalimumab-atto, infliximab-dyyb)
 * - ATMPs (CAR-T, gene therapies)
 * 
 * This model is compound-agnostic and supports all therapeutic classes.
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

// ============================================================================
// ENUMS & TYPES
// ============================================================================

/**
 * Type of pharmaceutical compound
 */
export type CompoundType = 'small_molecule' | 'biologic' | 'biosimilar' | 'atmp'

/**
 * Role of the product in the market
 */
export type ProductRole = 'originator' | 'generic' | 'biosimilar'

/**
 * Therapeutic class categories
 * Extensible - add new classes as needed
 */
export type TherapeuticClass =
  // Small molecule classes
  | 'SSRI'           // Selective Serotonin Reuptake Inhibitors
  | 'SNRI'           // Serotonin-Norepinephrine Reuptake Inhibitors
  | 'TCA'            // Tricyclic Antidepressants
  | 'PPI'            // Proton Pump Inhibitors
  | 'STATIN'         // HMG-CoA Reductase Inhibitors
  | 'NSAID'          // Non-Steroidal Anti-Inflammatory Drugs
  | 'ACE_INHIBITOR'  // Angiotensin-Converting Enzyme Inhibitors
  | 'ARB'            // Angiotensin II Receptor Blockers
  | 'BETA_BLOCKER'   // Beta-Adrenergic Blockers
  | 'ANTIBIOTIC'     // Antibiotics (various subclasses)
  | 'ANTIVIRAL'      // Antivirals
  | 'ANTIFUNGAL'     // Antifungals
  | 'ANTICOAGULANT'  // Anticoagulants
  | 'ANTIDIABETIC'   // Antidiabetics (oral)
  | 'OPIOID'         // Opioid Analgesics
  // Biologic classes
  | 'mAb'            // Monoclonal Antibodies (general)
  | 'ANTI_TNF'       // TNF-alpha Inhibitors (adalimumab, infliximab)
  | 'PD1_INHIBITOR'  // PD-1/PD-L1 Inhibitors (pembrolizumab, nivolumab)
  | 'IL_INHIBITOR'   // Interleukin Inhibitors (ustekinumab, secukinumab)
  | 'CD20_INHIBITOR' // CD20 Inhibitors (rituximab, ocrelizumab)
  | 'HER2_INHIBITOR' // HER2 Inhibitors (trastuzumab)
  | 'VEGF_INHIBITOR' // VEGF Inhibitors (bevacizumab, ranibizumab)
  | 'INSULIN'        // Insulin and analogs
  | 'GLP1_AGONIST'   // GLP-1 Receptor Agonists (semaglutide)
  | 'EPO'            // Erythropoietin and analogs
  | 'GCSF'           // G-CSF (filgrastim, pegfilgrastim)
  // ATMP classes
  | 'CAR_T'          // CAR-T Cell Therapies
  | 'GENE_THERAPY'   // Gene Therapies
  // Fallback
  | 'OTHER'          // Unknown or unclassified

/**
 * Data source for compound information
 */
export type CompoundDataSource = 
  | 'pubchem'        // PubChem database
  | 'dailymed'       // DailyMed FDA labels
  | 'epar'           // EMA European Public Assessment Reports
  | 'orange_book'    // FDA Orange Book
  | 'manual'         // Manually entered by user
  | 'sponsor_data'   // Provided by sponsor

// ============================================================================
// MAIN INTERFACE
// ============================================================================

/**
 * Universal Compound Model
 * 
 * Core entity representing any pharmaceutical compound in Skaldi.
 * Used across all document types (IB, Protocol, CSR, etc.)
 */
export interface UniversalCompound {
  // -------------------------------------------------------------------------
  // IDENTITY
  // -------------------------------------------------------------------------
  
  /**
   * Unique identifier for the compound in Skaldi
   */
  compound_id: string
  
  /**
   * International Nonproprietary Name (INN)
   * The official generic name assigned by WHO
   * Example: "fluoxetine", "adalimumab", "pembrolizumab"
   */
  inn_name: string
  
  /**
   * Trade/brand name (optional)
   * Example: "Prozac", "Humira", "Keytruda"
   */
  trade_name?: string
  
  // -------------------------------------------------------------------------
  // CLASSIFICATION
  // -------------------------------------------------------------------------
  
  /**
   * Type of compound
   * Determines which CMC fields are applicable
   */
  compound_type: CompoundType
  
  /**
   * Role in the market
   * Affects enrichment strategy and reference product requirements
   */
  product_role: ProductRole
  
  /**
   * Therapeutic class
   * Used for class-level fallback data when specific data unavailable
   */
  therapeutic_class: TherapeuticClass
  
  /**
   * Mechanism of action (free text)
   * Example: "Selective serotonin reuptake inhibitor"
   */
  mechanism_of_action?: string
  
  /**
   * ATC (Anatomical Therapeutic Chemical) code
   * WHO classification system
   * Example: "N06AB03" for fluoxetine
   */
  atc_code?: string
  
  // -------------------------------------------------------------------------
  // CHEMICAL IDENTITY (Small Molecules)
  // -------------------------------------------------------------------------
  
  /**
   * InChIKey - canonical chemical identifier
   * 27-character hash from InChI
   * Example: "RTHCYVBBDHJXIQ-UHFFFAOYSA-N" for fluoxetine
   */
  inchikey?: string
  
  /**
   * CAS Registry Number
   * Example: "54910-89-3" for fluoxetine
   */
  cas_number?: string
  
  /**
   * SMILES notation
   * Example: "CNCCC(C1=CC=CC=C1)OC2=CC=C(C=C2)C(F)(F)F" for fluoxetine
   */
  smiles?: string
  
  // -------------------------------------------------------------------------
  // BIOLOGIC IDENTITY (Biologics/Biosimilars)
  // -------------------------------------------------------------------------
  
  /**
   * UniProt ID for protein-based biologics
   */
  uniprot_id?: string
  
  /**
   * Target antigen or receptor
   * Example: "TNF-alpha" for adalimumab
   */
  target_antigen?: string
  
  /**
   * Antibody isotype (for mAbs)
   * Example: "IgG1 kappa"
   */
  antibody_isotype?: string
  
  /**
   * Expression system used for production
   * Example: "CHO cells", "E. coli"
   */
  expression_system?: string
  
  // -------------------------------------------------------------------------
  // REFERENCE PRODUCT (for Generics/Biosimilars)
  // -------------------------------------------------------------------------
  
  /**
   * Reference Listed Drug (RLD) brand name
   * Required for generics and biosimilars
   */
  rld_brand_name?: string
  
  /**
   * RLD application number
   * Example: "NDA020357" for Prozac
   */
  rld_application_number?: string
  
  /**
   * Therapeutic Equivalence code (for generics)
   * Example: "AB"
   */
  te_code?: string
  
  // -------------------------------------------------------------------------
  // METADATA
  // -------------------------------------------------------------------------
  
  /**
   * Primary data source
   */
  data_source: CompoundDataSource
  
  /**
   * Additional data sources used
   */
  additional_sources?: CompoundDataSource[]
  
  /**
   * Timestamp of last data update
   */
  last_updated: string
  
  /**
   * Data completeness score (0-1)
   */
  completeness_score?: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if compound is a small molecule
 */
export function isSmallMolecule(compound: UniversalCompound): boolean {
  return compound.compound_type === 'small_molecule'
}

/**
 * Check if compound is a biologic (including biosimilars)
 */
export function isBiologic(compound: UniversalCompound): boolean {
  return compound.compound_type === 'biologic' || compound.compound_type === 'biosimilar'
}

/**
 * Check if compound is a biosimilar
 */
export function isBiosimilar(compound: UniversalCompound): boolean {
  return compound.compound_type === 'biosimilar'
}

/**
 * Check if compound is an ATMP
 */
export function isATMP(compound: UniversalCompound): boolean {
  return compound.compound_type === 'atmp'
}

/**
 * Check if compound requires reference product data
 */
export function requiresReferenceProduct(compound: UniversalCompound): boolean {
  return compound.product_role === 'generic' || compound.product_role === 'biosimilar'
}

/**
 * Get the appropriate CMC section title based on compound type
 */
export function getCMCSectionTitle(compound: UniversalCompound): string {
  if (isSmallMolecule(compound)) {
    return 'Physical, Chemical, and Pharmaceutical Properties'
  } else if (isBiologic(compound)) {
    return 'Physical, Biological, and Pharmaceutical Properties'
  } else if (isATMP(compound)) {
    return 'Manufacturing and Quality Attributes'
  }
  return 'Physical and Pharmaceutical Properties'
}

/**
 * Determine if immunogenicity section is needed in IB
 */
export function requiresImmunogenicitySection(compound: UniversalCompound): boolean {
  return isBiologic(compound) || isATMP(compound)
}

/**
 * Get class-level fallback key for therapeutic class
 */
export function getClassFallbackKey(therapeuticClass: TherapeuticClass): string {
  // Map specific classes to broader fallback categories
  const classMapping: Record<TherapeuticClass, string> = {
    'SSRI': 'SSRI',
    'SNRI': 'SNRI',
    'TCA': 'TCA',
    'PPI': 'PPI',
    'STATIN': 'STATIN',
    'NSAID': 'NSAID',
    'ACE_INHIBITOR': 'ACE_INHIBITOR',
    'ARB': 'ARB',
    'BETA_BLOCKER': 'BETA_BLOCKER',
    'ANTIBIOTIC': 'ANTIBIOTIC',
    'ANTIVIRAL': 'ANTIVIRAL',
    'ANTIFUNGAL': 'ANTIFUNGAL',
    'ANTICOAGULANT': 'ANTICOAGULANT',
    'ANTIDIABETIC': 'ANTIDIABETIC',
    'OPIOID': 'OPIOID',
    'mAb': 'mAb',
    'ANTI_TNF': 'ANTI_TNF',
    'PD1_INHIBITOR': 'PD1_INHIBITOR',
    'IL_INHIBITOR': 'IL_INHIBITOR',
    'CD20_INHIBITOR': 'CD20_INHIBITOR',
    'HER2_INHIBITOR': 'HER2_INHIBITOR',
    'VEGF_INHIBITOR': 'VEGF_INHIBITOR',
    'INSULIN': 'INSULIN',
    'GLP1_AGONIST': 'GLP1_AGONIST',
    'EPO': 'EPO',
    'GCSF': 'GCSF',
    'CAR_T': 'CAR_T',
    'GENE_THERAPY': 'GENE_THERAPY',
    'OTHER': 'DEFAULT'
  }
  
  return classMapping[therapeuticClass] || 'DEFAULT'
}

/**
 * Create a minimal compound object for testing
 */
export function createMinimalCompound(
  innName: string,
  compoundType: CompoundType,
  therapeuticClass: TherapeuticClass
): UniversalCompound {
  return {
    compound_id: `compound_${Date.now()}`,
    inn_name: innName,
    compound_type: compoundType,
    product_role: 'originator',
    therapeutic_class: therapeuticClass,
    data_source: 'manual',
    last_updated: new Date().toISOString()
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate compound data completeness
 */
export function validateCompound(compound: UniversalCompound): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Required fields
  if (!compound.inn_name) {
    errors.push('INN name is required')
  }
  
  if (!compound.compound_type) {
    errors.push('Compound type is required')
  }
  
  if (!compound.therapeutic_class) {
    errors.push('Therapeutic class is required')
  }
  
  // Type-specific validation
  if (isSmallMolecule(compound)) {
    if (!compound.inchikey && !compound.cas_number) {
      warnings.push('Small molecule should have InChIKey or CAS number for identification')
    }
  }
  
  if (isBiologic(compound)) {
    if (!compound.target_antigen) {
      warnings.push('Biologic should have target antigen specified')
    }
  }
  
  if (requiresReferenceProduct(compound)) {
    if (!compound.rld_brand_name) {
      errors.push('Reference product (RLD) brand name is required for generics/biosimilars')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
