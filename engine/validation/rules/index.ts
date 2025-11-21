/**
 * Validation Rules Registry
 * 
 * All validation rules exported from here
 */

export { primaryEndpointRule } from './endpoints'
export { inclusionCriteriaRule, exclusionCriteriaRule } from './criteria'
export { doseRegimenRule } from './dose_regimen'
export { requiredSectionsRule } from './structure'

import { primaryEndpointRule } from './endpoints'
import { inclusionCriteriaRule, exclusionCriteriaRule } from './criteria'
import { doseRegimenRule } from './dose_regimen'
import { requiredSectionsRule } from './structure'
import type { ValidationRule } from '../types'

/**
 * All available validation rules
 */
export const allRules: ValidationRule[] = [
  // Structure
  requiredSectionsRule,
  
  // Endpoints
  primaryEndpointRule,
  
  // Population
  inclusionCriteriaRule,
  exclusionCriteriaRule,
  
  // Treatment
  doseRegimenRule
]
