/**
 * Class Fallback Types
 * 
 * Type definitions for therapeutic class fallback data.
 * Used when specific compound data is not available.
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import type { TherapeuticClass } from '@/lib/core/compound-model'
import type { UniversalCMC } from '@/lib/core/cmc-model'
import type { UniversalNonclinical } from '@/lib/core/nonclinical-model'
import type { UniversalPK, UniversalPD } from '@/lib/core/pkpd-model'
import type { UniversalSafety } from '@/lib/core/safety-model'

/**
 * Complete class fallback data structure
 */
export interface ClassFallbackData {
  /**
   * Therapeutic class identifier
   */
  therapeutic_class: TherapeuticClass
  
  /**
   * Display name for the class
   */
  display_name: string
  
  /**
   * Brief description of the class
   */
  description: string
  
  /**
   * Example compounds in this class
   */
  example_compounds: string[]
  
  /**
   * CMC fallback data
   */
  cmc: Partial<UniversalCMC>
  
  /**
   * Nonclinical/toxicology fallback data
   */
  nonclinical: Partial<UniversalNonclinical>
  
  /**
   * PK fallback data
   */
  pk: Partial<UniversalPK>
  
  /**
   * PD fallback data
   */
  pd: Partial<UniversalPD>
  
  /**
   * Safety fallback data
   */
  safety: Partial<UniversalSafety>
}

/**
 * Minimal fallback for unknown classes
 */
export interface MinimalFallback {
  therapeutic_class: 'OTHER'
  display_name: string
  description: string
}
