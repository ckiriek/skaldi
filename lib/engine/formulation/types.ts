/**
 * Phase H.1: Formulation Normalizer - Type Definitions
 * 
 * Core types for drug formulation parsing, normalization, and indication mapping
 */

/**
 * Parsed formulation result
 */
export interface ParsedFormulation {
  // Pure INN or chemical name (for enrichment)
  apiName: string
  
  // Controlled vocabulary dosage form
  dosageForm: DosageForm | null
  
  // Controlled vocabulary route
  route: Route | null
  
  // Normalized strength
  strength: Strength | null
  
  // Additional descriptors (film-coated, extended-release, etc.)
  additionalProperties: string[]
  
  // Original raw input
  rawInput: string
  
  // Confidence scores
  confidence: {
    apiName: number      // 0-1
    dosageForm: number   // 0-1
    route: number        // 0-1
    strength: number     // 0-1
    overall: number      // 0-1
  }
  
  // Warnings or issues
  warnings: string[]
}

/**
 * Strength representation
 */
export interface Strength {
  value: number
  unit: StrengthUnit
  normalized: string  // e.g., "500 mg"
  raw: string        // e.g., "0.5g"
}

/**
 * Supported strength units
 */
export type StrengthUnit = 
  | 'mg'
  | 'g'
  | 'mcg'
  | 'IU'
  | '%'
  | 'mg/ml'
  | 'g/ml'
  | 'mcg/ml'
  | 'IU/ml'
  | 'units/ml'

/**
 * Dosage forms (40+ controlled vocabulary)
 */
export type DosageForm =
  // Oral solid
  | 'tablet'
  | 'film-coated tablet'
  | 'chewable tablet'
  | 'dispersible tablet'
  | 'effervescent tablet'
  | 'capsule'
  | 'hard capsule'
  | 'soft capsule'
  | 'powder for oral suspension'
  | 'granules'
  
  // Oral liquid
  | 'oral solution'
  | 'oral suspension'
  | 'syrup'
  | 'drops'
  
  // Parenteral
  | 'injection'
  | 'solution for injection'
  | 'powder for injection'
  | 'IV infusion'
  | 'subcutaneous injection'
  | 'intramuscular injection'
  | 'pre-filled syringe'
  | 'pen injector'
  
  // Inhalation
  | 'inhalation powder'
  | 'inhalation solution'
  | 'metered-dose inhaler'
  | 'nebulizer solution'
  
  // Topical
  | 'cream'
  | 'ointment'
  | 'gel'
  | 'lotion'
  | 'foam'
  | 'patch'
  | 'transdermal patch'
  
  // Vaginal
  | 'vaginal suppository'
  | 'vaginal cream'
  | 'vaginal gel'
  | 'vaginal tablet'
  | 'vaginal ring'
  
  // Rectal
  | 'rectal suppository'
  | 'rectal cream'
  | 'enema'
  
  // Ophthalmic
  | 'ophthalmic solution'
  | 'ophthalmic ointment'
  | 'eye drops'
  
  // Nasal
  | 'nasal spray'
  | 'nasal drops'
  | 'nasal gel'
  
  // Other
  | 'spray'
  | 'pessary'
  | 'lozenge'
  | 'implant'

/**
 * Routes of administration (20+ controlled vocabulary)
 */
export type Route =
  | 'oral'
  | 'intravenous'
  | 'intramuscular'
  | 'subcutaneous'
  | 'inhalation'
  | 'topical'
  | 'transdermal'
  | 'vaginal'
  | 'intravaginal'
  | 'rectal'
  | 'ophthalmic'
  | 'intranasal'
  | 'sublingual'
  | 'buccal'
  | 'intradermal'
  | 'intra-articular'
  | 'intrathecal'
  | 'epidural'
  | 'intracardiac'
  | 'intraperitoneal'

/**
 * Indication suggestion based on formulation
 */
export interface IndicationSuggestion {
  indication: string
  confidence: number
  source: 'formulation-specific' | 'systemic' | 'fda' | 'ema' | 'drugbank' | 'ctgov'
  formRelevance: 'local' | 'systemic' | 'both'
}

/**
 * Formulation-specific indication mapping
 */
export interface FormulationIndicationMap {
  dosageForms: DosageForm[]
  routes: Route[]
  indications: string[]
  category: 'gynecological' | 'dermatological' | 'ophthalmic' | 'respiratory' | 'gastrointestinal' | 'other'
}

/**
 * Normalization rule
 */
export interface NormalizationRule {
  pattern: RegExp
  replacement: string
  type: 'synonym' | 'unit' | 'manufacturer' | 'brand' | 'salt'
}

/**
 * INN extraction result
 */
export interface INNExtraction {
  inn: string
  salt: string | null
  confidence: number
}
