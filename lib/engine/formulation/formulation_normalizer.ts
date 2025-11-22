/**
 * Phase H.1: Formulation Normalizer
 * 
 * Main entry point for formulation normalization and enrichment
 */

import type { ParsedFormulation } from './types'
import { parseFormulation } from './formulation_parser'
import { getFormulationIndications, isLocalFormulation } from './formulation_catalog'

/**
 * Normalize formulation input
 * 
 * This is the main function to call from external code
 */
export function normalizeFormulation(rawInput: string): ParsedFormulation {
  return parseFormulation(rawInput)
}

/**
 * Get indication suggestions based on formulation
 */
export function getIndicationSuggestions(
  parsed: ParsedFormulation,
  systemicIndications: string[] = []
): string[] {
  // Check if this is a local formulation
  const isLocal = isLocalFormulation(parsed.dosageForm, parsed.route)
  
  if (isLocal) {
    // Use formulation-specific indications
    const localIndications = getFormulationIndications(parsed.dosageForm, parsed.route)
    if (localIndications.length > 0) {
      return localIndications
    }
  }
  
  // Fall back to systemic indications
  return systemicIndications
}

/**
 * Validate formulation completeness
 */
export function validateFormulation(parsed: ParsedFormulation): {
  isComplete: boolean
  missingFields: string[]
  suggestions: string[]
} {
  const missingFields: string[] = []
  const suggestions: string[] = []
  
  if (!parsed.apiName || parsed.apiName.length < 3) {
    missingFields.push('apiName')
    suggestions.push('Please provide a valid drug name (INN or chemical name)')
  }
  
  if (!parsed.dosageForm) {
    missingFields.push('dosageForm')
    suggestions.push('Consider specifying the dosage form (e.g., tablet, cream, injection)')
  }
  
  if (!parsed.route) {
    missingFields.push('route')
    suggestions.push('Consider specifying the route of administration (e.g., oral, topical, IV)')
  }
  
  if (!parsed.strength) {
    missingFields.push('strength')
    suggestions.push('Consider specifying the strength (e.g., 500 mg, 1%)')
  }
  
  const isComplete = missingFields.length === 0
  
  return {
    isComplete,
    missingFields,
    suggestions,
  }
}

/**
 * Format formulation for display
 */
export function formatFormulation(parsed: ParsedFormulation): string {
  const parts: string[] = []
  
  if (parsed.apiName) {
    parts.push(parsed.apiName)
  }
  
  if (parsed.strength) {
    parts.push(parsed.strength.normalized)
  }
  
  if (parsed.dosageForm) {
    parts.push(parsed.dosageForm)
  }
  
  if (parsed.route && parsed.route !== 'oral') {
    // Only show route if not oral (oral is implied for tablets/capsules)
    parts.push(`(${parsed.route})`)
  }
  
  if (parsed.additionalProperties.length > 0) {
    parts.push(`[${parsed.additionalProperties.join(', ')}]`)
  }
  
  return parts.join(' ')
}

/**
 * Check if formulation needs enrichment
 */
export function needsEnrichment(parsed: ParsedFormulation): boolean {
  return (
    !parsed.dosageForm ||
    !parsed.route ||
    !parsed.strength ||
    parsed.confidence.overall < 0.7
  )
}

/**
 * Get enrichment suggestions
 */
export function getEnrichmentSuggestions(parsed: ParsedFormulation): string[] {
  const suggestions: string[] = []
  
  if (!parsed.dosageForm) {
    suggestions.push('Add dosage form information to improve indication suggestions')
  }
  
  if (!parsed.route) {
    suggestions.push('Add route of administration for better context')
  }
  
  if (!parsed.strength) {
    suggestions.push('Add strength information for complete formulation data')
  }
  
  if (parsed.confidence.overall < 0.7) {
    suggestions.push('Low confidence in parsing - please verify extracted information')
  }
  
  if (parsed.warnings.length > 0) {
    suggestions.push(...parsed.warnings.map(w => `Warning: ${w}`))
  }
  
  return suggestions
}
