/**
 * Class Fallbacks Index
 * 
 * Central export for all therapeutic class fallback data.
 * Used when specific compound data is not available from labels or databases.
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import type { TherapeuticClass } from '@/lib/core/compound-model'
import type { ClassFallbackData } from './types'

// Export types
export type { ClassFallbackData } from './types'

// Import fallback data
import { SSRI_FALLBACK } from './ssri'
import { MAB_FALLBACK } from './mab'
import { PPI_FALLBACK } from './ppi'
import { ANTI_TNF_FALLBACK } from './anti-tnf'
import { DEFAULT_FALLBACK } from './default'

// Export individual fallbacks
export { SSRI_FALLBACK } from './ssri'
export { MAB_FALLBACK } from './mab'
export { PPI_FALLBACK } from './ppi'
export { ANTI_TNF_FALLBACK } from './anti-tnf'
export { DEFAULT_FALLBACK } from './default'

/**
 * Registry of all class fallbacks
 */
export const CLASS_FALLBACK_REGISTRY: Partial<Record<TherapeuticClass, ClassFallbackData>> = {
  // Small molecule classes
  'SSRI': SSRI_FALLBACK,
  'PPI': PPI_FALLBACK,
  
  // Biologic classes
  'mAb': MAB_FALLBACK,
  'ANTI_TNF': ANTI_TNF_FALLBACK,
  
  // Default
  'OTHER': DEFAULT_FALLBACK
}

/**
 * Get fallback data for a therapeutic class
 * 
 * @param therapeuticClass - The therapeutic class to get fallback for
 * @returns ClassFallbackData for the class, or DEFAULT_FALLBACK if not found
 */
export function getClassFallback(therapeuticClass: TherapeuticClass): ClassFallbackData {
  // Direct match
  if (CLASS_FALLBACK_REGISTRY[therapeuticClass]) {
    return CLASS_FALLBACK_REGISTRY[therapeuticClass]!
  }
  
  // Map related classes to existing fallbacks
  const classMapping: Partial<Record<TherapeuticClass, TherapeuticClass>> = {
    // Map SNRI to SSRI (similar profile)
    'SNRI': 'SSRI',
    'TCA': 'SSRI',
    
    // Map specific mAb classes to general mAb or anti-TNF
    'PD1_INHIBITOR': 'mAb',
    'IL_INHIBITOR': 'mAb',
    'CD20_INHIBITOR': 'mAb',
    'HER2_INHIBITOR': 'mAb',
    'VEGF_INHIBITOR': 'mAb',
    
    // Map other classes to default
    'STATIN': 'OTHER',
    'NSAID': 'OTHER',
    'ACE_INHIBITOR': 'OTHER',
    'ARB': 'OTHER',
    'BETA_BLOCKER': 'OTHER',
    'ANTIBIOTIC': 'OTHER',
    'ANTIVIRAL': 'OTHER',
    'ANTIFUNGAL': 'OTHER',
    'ANTICOAGULANT': 'OTHER',
    'ANTIDIABETIC': 'OTHER',
    'OPIOID': 'OTHER',
    'INSULIN': 'OTHER',
    'GLP1_AGONIST': 'OTHER',
    'EPO': 'OTHER',
    'GCSF': 'OTHER',
    'CAR_T': 'OTHER',
    'GENE_THERAPY': 'OTHER'
  }
  
  const mappedClass = classMapping[therapeuticClass]
  if (mappedClass && CLASS_FALLBACK_REGISTRY[mappedClass]) {
    return CLASS_FALLBACK_REGISTRY[mappedClass]!
  }
  
  // Return default fallback
  return DEFAULT_FALLBACK
}

/**
 * Check if a specific fallback exists for a class
 */
export function hasSpecificFallback(therapeuticClass: TherapeuticClass): boolean {
  return therapeuticClass in CLASS_FALLBACK_REGISTRY && therapeuticClass !== 'OTHER'
}

/**
 * Get list of all supported therapeutic classes with specific fallbacks
 */
export function getSupportedClasses(): TherapeuticClass[] {
  return Object.keys(CLASS_FALLBACK_REGISTRY).filter(
    key => key !== 'OTHER'
  ) as TherapeuticClass[]
}

/**
 * Get fallback CMC data for a class
 */
export function getClassCMCFallback(therapeuticClass: TherapeuticClass) {
  return getClassFallback(therapeuticClass).cmc
}

/**
 * Get fallback nonclinical data for a class
 */
export function getClassNonclinicalFallback(therapeuticClass: TherapeuticClass) {
  return getClassFallback(therapeuticClass).nonclinical
}

/**
 * Get fallback PK data for a class
 */
export function getClassPKFallback(therapeuticClass: TherapeuticClass) {
  return getClassFallback(therapeuticClass).pk
}

/**
 * Get fallback PD data for a class
 */
export function getClassPDFallback(therapeuticClass: TherapeuticClass) {
  return getClassFallback(therapeuticClass).pd
}

/**
 * Get fallback safety data for a class
 */
export function getClassSafetyFallback(therapeuticClass: TherapeuticClass) {
  return getClassFallback(therapeuticClass).safety
}
