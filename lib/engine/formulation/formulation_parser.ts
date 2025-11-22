/**
 * Phase H.1: Formulation Parser
 * 
 * Parses raw drug formulation strings and extracts structured information
 */

import type { ParsedFormulation, Strength, DosageForm, Route, StrengthUnit } from './types'
import {
  DOSAGE_FORM_SYNONYMS,
  ROUTE_SYNONYMS,
  UNIT_NORMALIZATIONS,
  CHEMICAL_SALTS,
  NORMALIZATION_RULES,
} from './formulation_catalog'

/**
 * Parse raw formulation string
 */
export function parseFormulation(rawInput: string): ParsedFormulation {
  const normalized = normalizeInput(rawInput)
  
  // Extract components (order matters!)
  const dosageForm = extractDosageForm(normalized) // Extract form first
  const route = extractRoute(normalized, dosageForm) // Then route (using form context)
  const strength = extractStrength(normalized)
  const apiName = extractAPIName(normalized) // Extract name last (after removing other parts)
  const additionalProperties = extractAdditionalProperties(normalized)
  
  // Calculate confidence scores
  const confidence = calculateConfidence({
    apiName,
    dosageForm,
    route,
    strength,
    rawInput: normalized,
  })
  
  // Collect warnings
  const warnings = collectWarnings({
    apiName,
    dosageForm,
    route,
    strength,
    rawInput: normalized,
  })
  
  return {
    apiName,
    dosageForm,
    route,
    strength,
    additionalProperties,
    rawInput,
    confidence,
    warnings,
  }
}

/**
 * Normalize input string
 */
function normalizeInput(input: string): string {
  let normalized = input.trim()
  
  // Apply normalization rules
  for (const rule of NORMALIZATION_RULES) {
    normalized = normalized.replace(rule.pattern, rule.replacement)
  }
  
  // Clean up extra spaces
  normalized = normalized.replace(/\s+/g, ' ').trim()
  
  return normalized
}

/**
 * Extract API name (pure INN)
 */
function extractAPIName(input: string): string {
  // Remove strength patterns first (including compound units like IU/ml)
  let cleaned = input.replace(/\d+\.?\d*\s*(mg\/ml|g\/ml|mcg\/ml|iu\/ml|units\/ml|mg|g|mcg|iu|%|units|u|мг)/gi, '')
  
  // Remove common dosage forms (more comprehensive)
  const commonForms = [
    'tablet', 'tablets', 'capsule', 'capsules', 'injection', 'injections',
    'suppository', 'suppositories', 'cream', 'ointment', 'gel', 'spray',
    'solution', 'suspension', 'powder', 'drops', 'inhaler', 'patch',
    'vaginal', 'ophthalmic', 'nasal', 'rectal', 'topical', 'oral',
    'inhalation', 'nebulizer', 'pen', 'syringe', 'infusion',
    'film-coated', 'extended-release', 'immediate-release', 'modified-release', 'sustained-release',
    'chewable', 'dispersible', 'effervescent', 'enteric-coated', 'pre-filled'
  ]
  
  for (const form of commonForms) {
    cleaned = cleaned.replace(new RegExp(`\\b${form}\\b`, 'gi'), '')
  }
  
  // Remove dosage form synonyms
  const dosageForms = Object.keys(DOSAGE_FORM_SYNONYMS)
  for (const form of dosageForms) {
    cleaned = cleaned.replace(new RegExp(`\\b${form}\\b`, 'gi'), '')
  }
  
  // Remove route patterns
  const routes = Object.keys(ROUTE_SYNONYMS)
  for (const route of routes) {
    cleaned = cleaned.replace(new RegExp(`\\b${route}\\b`, 'gi'), '')
  }
  
  // Clean up
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  // Remove chemical salts
  let apiName = cleaned
  for (const salt of CHEMICAL_SALTS) {
    apiName = apiName.replace(new RegExp(`\\b${salt}\\b`, 'gi'), '')
  }
  
  apiName = apiName.replace(/\s+/g, ' ').trim()
  
  // If we removed too much, fall back to cleaned version
  if (!apiName || apiName.length < 3) {
    apiName = cleaned
  }
  
  // If still too short, try first 1-2 words
  if (!apiName || apiName.length < 3) {
    const words = input.split(/\s+/)
    apiName = words.slice(0, Math.min(2, words.length)).join(' ')
  }
  
  // Capitalize properly (preserve compound names like "Insulin glargine")
  if (apiName) {
    const words = apiName.split(/\s+/)
    apiName = words.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }
  
  return apiName || input.split(/\s+/)[0] // Fallback to first word
}

/**
 * Extract dosage form
 */
function extractDosageForm(input: string): DosageForm | null {
  const lowerInput = input.toLowerCase()
  
  // Check for compound forms FIRST (before synonyms, to avoid false matches)
  if ((lowerInput.includes('film-coated') || lowerInput.includes('film coated') || lowerInput.includes('filmcoated')) && (lowerInput.includes('tablet') || lowerInput.includes('таблетка'))) {
    return 'film-coated tablet'
  }
  
  // Check exact matches
  for (const [synonym, form] of Object.entries(DOSAGE_FORM_SYNONYMS)) {
    if (lowerInput.includes(synonym.toLowerCase())) {
      return form
    }
  }
  
  if (lowerInput.includes('vaginal') && lowerInput.includes('suppository')) {
    return 'vaginal suppository'
  }
  
  if (lowerInput.includes('vaginal') && lowerInput.includes('cream')) {
    return 'vaginal cream'
  }
  
  if (lowerInput.includes('vaginal') && lowerInput.includes('gel')) {
    return 'vaginal gel'
  }
  
  if (lowerInput.includes('ophthalmic') && lowerInput.includes('solution')) {
    return 'ophthalmic solution'
  }
  
  if (lowerInput.includes('ophthalmic') && lowerInput.includes('ointment')) {
    return 'ophthalmic ointment'
  }
  
  if (lowerInput.includes('eye') && lowerInput.includes('drop')) {
    return 'eye drops'
  }
  
  if (lowerInput.includes('nasal') && lowerInput.includes('spray')) {
    return 'nasal spray'
  }
  
  if (lowerInput.includes('inhalation') && lowerInput.includes('powder')) {
    return 'inhalation powder'
  }
  
  // Check for basic forms
  if (lowerInput.includes('tablet')) return 'tablet'
  if (lowerInput.includes('capsule')) return 'capsule'
  if (lowerInput.includes('injection')) return 'injection'
  if (lowerInput.includes('cream')) return 'cream'
  if (lowerInput.includes('ointment')) return 'ointment'
  if (lowerInput.includes('gel')) return 'gel'
  if (lowerInput.includes('spray')) return 'spray'
  if (lowerInput.includes('suppository')) return 'vaginal suppository'
  if (lowerInput.includes('pessary')) return 'vaginal suppository'
  
  return null
}

/**
 * Extract route of administration
 */
function extractRoute(input: string, dosageForm: DosageForm | null): Route | null {
  const lowerInput = input.toLowerCase()
  
  // If dosage form is known, infer route from it first (most reliable)
  if (dosageForm) {
    if (dosageForm.includes('vaginal')) return 'vaginal'
    if (dosageForm.includes('ophthalmic') || dosageForm === 'eye drops') return 'ophthalmic'
    if (dosageForm.includes('nasal')) return 'intranasal'
    if (dosageForm.includes('rectal')) return 'rectal'
    if (dosageForm.includes('topical') || dosageForm === 'cream' || dosageForm === 'ointment' || dosageForm === 'gel' || dosageForm === 'lotion') return 'topical'
    if (dosageForm.includes('inhalation') || dosageForm.includes('inhaler') || dosageForm.includes('nebulizer')) return 'inhalation'
    if (dosageForm === 'tablet' || dosageForm === 'capsule' || dosageForm.includes('oral')) return 'oral'
    if (dosageForm.includes('injection') || dosageForm.includes('infusion')) {
      // Check for specific injection routes
      if (lowerInput.includes('iv') || lowerInput.includes('intravenous')) return 'intravenous'
      if (lowerInput.includes('im') || lowerInput.includes('intramuscular')) return 'intramuscular'
      if (lowerInput.includes('sc') || lowerInput.includes('subcutaneous')) return 'subcutaneous'
      return 'intravenous' // Default for injections
    }
  }
  
  // Check explicit route keywords in input
  if (lowerInput.includes('vaginal') || lowerInput.includes('intravaginal')) {
    return 'vaginal'
  }
  
  if (lowerInput.includes('ophthalmic') || lowerInput.includes('eye')) {
    return 'ophthalmic'
  }
  
  if (lowerInput.includes('nasal') || lowerInput.includes('nose')) {
    return 'intranasal'
  }
  
  if (lowerInput.includes('rectal')) {
    return 'rectal'
  }
  
  if (lowerInput.includes('topical') || lowerInput.includes('skin')) {
    return 'topical'
  }
  
  if (lowerInput.includes('inhalation') || lowerInput.includes('inhaler') || lowerInput.includes('podhaler')) {
    return 'inhalation'
  }
  
  if (lowerInput.includes('iv') || lowerInput.includes('intravenous')) {
    return 'intravenous'
  }
  
  if (lowerInput.includes('im') || lowerInput.includes('intramuscular')) {
    return 'intramuscular'
  }
  
  if (lowerInput.includes('sc') || lowerInput.includes('subcutaneous')) {
    return 'subcutaneous'
  }
  
  // Check for oral last (most common, but should not override specific routes)
  if (lowerInput.includes('tablet') || lowerInput.includes('capsule') || lowerInput.includes('oral')) {
    return 'oral'
  }
  
  return null
}

/**
 * Extract strength
 */
function extractStrength(input: string): Strength | null {
  // Pattern: number + optional decimal + optional space + unit
  // Support both "100 mg" and "100mg" and "0.3%" and "500мг"
  const strengthPattern = /(\d+\.?\d*)\s*(mg\/ml|g\/ml|mcg\/ml|iu\/ml|units\/ml|mg|g|mcg|μg|ug|iu|units|u|%|мг)/i
  
  const match = input.match(strengthPattern)
  if (!match) return null
  
  const rawValue = parseFloat(match[1])
  const rawUnit = match[2].toLowerCase()
  
  // Normalize unit
  const unitNorm = UNIT_NORMALIZATIONS[rawUnit]
  if (!unitNorm) {
    // Unknown unit, return as-is
    return {
      value: rawValue,
      unit: rawUnit as StrengthUnit,
      normalized: `${rawValue} ${rawUnit}`,
      raw: match[0],
    }
  }
  
  const normalizedValue = rawValue * unitNorm.multiplier
  const normalizedUnit = unitNorm.target as StrengthUnit
  
  return {
    value: normalizedValue,
    unit: normalizedUnit,
    normalized: `${normalizedValue} ${normalizedUnit}`,
    raw: match[0],
  }
}

/**
 * Extract additional properties
 */
function extractAdditionalProperties(input: string): string[] {
  const properties: string[] = []
  const lowerInput = input.toLowerCase()
  
  if (lowerInput.includes('film-coated') || lowerInput.includes('filmcoated')) {
    properties.push('film-coated')
  }
  
  if (lowerInput.includes('extended-release') || lowerInput.includes('er') || lowerInput.includes('xr')) {
    properties.push('extended-release')
  }
  
  if (lowerInput.includes('immediate-release') || lowerInput.includes('ir')) {
    properties.push('immediate-release')
  }
  
  if (lowerInput.includes('modified-release') || lowerInput.includes('mr')) {
    properties.push('modified-release')
  }
  
  if (lowerInput.includes('sustained-release') || lowerInput.includes('sr')) {
    properties.push('sustained-release')
  }
  
  if (lowerInput.includes('chewable')) {
    properties.push('chewable')
  }
  
  if (lowerInput.includes('dispersible')) {
    properties.push('dispersible')
  }
  
  if (lowerInput.includes('effervescent')) {
    properties.push('effervescent')
  }
  
  if (lowerInput.includes('enteric-coated')) {
    properties.push('enteric-coated')
  }
  
  if (lowerInput.includes('pre-filled')) {
    properties.push('pre-filled')
  }
  
  if (lowerInput.includes('pen')) {
    properties.push('pen-injector')
  }
  
  return properties
}

/**
 * Calculate confidence scores
 */
function calculateConfidence(data: {
  apiName: string
  dosageForm: DosageForm | null
  route: Route | null
  strength: Strength | null
  rawInput: string
}): ParsedFormulation['confidence'] {
  let apiNameConf = 0
  let dosageFormConf = 0
  let routeConf = 0
  let strengthConf = 0
  
  // API name confidence
  if (data.apiName && data.apiName.length >= 3) {
    apiNameConf = 0.7
    if (data.apiName.length >= 5) apiNameConf = 0.85
    if (data.apiName.length >= 8) apiNameConf = 0.95
  }
  
  // Dosage form confidence
  if (data.dosageForm) {
    dosageFormConf = 0.9
  }
  
  // Route confidence
  if (data.route) {
    routeConf = 0.85
    // Higher confidence if route matches dosage form
    if (data.dosageForm && isRouteConsistentWithForm(data.route, data.dosageForm)) {
      routeConf = 0.95
    }
  }
  
  // Strength confidence
  if (data.strength) {
    strengthConf = 0.9
  }
  
  // Overall confidence (weighted average)
  const overall = (
    apiNameConf * 0.4 +
    dosageFormConf * 0.25 +
    routeConf * 0.2 +
    strengthConf * 0.15
  )
  
  return {
    apiName: apiNameConf,
    dosageForm: dosageFormConf,
    route: routeConf,
    strength: strengthConf,
    overall,
  }
}

/**
 * Check if route is consistent with dosage form
 */
function isRouteConsistentWithForm(route: Route, form: DosageForm): boolean {
  const consistencyMap: Record<Route, DosageForm[]> = {
    'oral': ['tablet', 'film-coated tablet', 'capsule', 'oral solution', 'oral suspension', 'syrup'],
    'vaginal': ['vaginal suppository', 'vaginal cream', 'vaginal gel', 'vaginal tablet'],
    'intravaginal': ['vaginal suppository', 'vaginal cream', 'vaginal gel', 'vaginal tablet'],
    'ophthalmic': ['ophthalmic solution', 'ophthalmic ointment', 'eye drops'],
    'topical': ['cream', 'ointment', 'gel', 'lotion', 'foam', 'patch'],
    'inhalation': ['inhalation powder', 'inhalation solution', 'metered-dose inhaler'],
    'intranasal': ['nasal spray', 'nasal drops', 'nasal gel'],
    'rectal': ['rectal suppository', 'rectal cream', 'enema'],
    'intravenous': ['injection', 'solution for injection', 'IV infusion'],
    'intramuscular': ['injection', 'solution for injection', 'intramuscular injection'],
    'subcutaneous': ['injection', 'solution for injection', 'subcutaneous injection', 'pre-filled syringe'],
    'transdermal': ['transdermal patch', 'patch'],
    'sublingual': ['tablet', 'lozenge'],
    'buccal': ['tablet', 'lozenge'],
    'intradermal': ['injection'],
    'intra-articular': ['injection'],
    'intrathecal': ['injection'],
    'epidural': ['injection'],
    'intracardiac': ['injection'],
    'intraperitoneal': ['injection'],
  }
  
  const expectedForms = consistencyMap[route]
  return expectedForms ? expectedForms.includes(form) : false
}

/**
 * Collect warnings
 */
function collectWarnings(data: {
  apiName: string
  dosageForm: DosageForm | null
  route: Route | null
  strength: Strength | null
  rawInput: string
}): string[] {
  const warnings: string[] = []
  
  if (!data.apiName || data.apiName.length < 3) {
    warnings.push('API name could not be reliably extracted')
  }
  
  if (!data.dosageForm) {
    warnings.push('Dosage form not detected')
  }
  
  if (!data.route) {
    warnings.push('Route of administration not detected')
  }
  
  if (!data.strength) {
    warnings.push('Strength not detected')
  }
  
  if (data.route && data.dosageForm && !isRouteConsistentWithForm(data.route, data.dosageForm)) {
    warnings.push('Route may not be consistent with dosage form')
  }
  
  return warnings
}
