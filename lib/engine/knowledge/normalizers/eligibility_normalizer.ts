/**
 * Phase H.3: Eligibility Normalizer
 * 
 * Parses and normalizes inclusion/exclusion criteria
 */

import type { NormalizedEligibility } from '../types'

/**
 * Normalize eligibility criteria text
 */
export function normalizeEligibility(criteriaText: string): NormalizedEligibility {
  if (!criteriaText || typeof criteriaText !== 'string') {
    return {
      inclusionCriteria: [],
      exclusionCriteria: []
    }
  }
  
  // Try to split into inclusion/exclusion sections
  const { inclusionText, exclusionText } = splitCriteria(criteriaText)
  
  // Parse each section into individual criteria
  const inclusionCriteria = parseCriteriaList(inclusionText)
  const exclusionCriteria = parseCriteriaList(exclusionText)
  
  return {
    inclusionCriteria,
    exclusionCriteria
  }
}

/**
 * Split criteria text into inclusion and exclusion sections
 */
function splitCriteria(text: string): { inclusionText: string; exclusionText: string } {
  // Common section headers
  const inclusionHeaders = [
    /inclusion criteria:?/i,
    /inclusion:?/i,
    /patients must meet/i,
    /eligible patients/i
  ]
  
  const exclusionHeaders = [
    /exclusion criteria:?/i,
    /exclusion:?/i,
    /patients must not/i,
    /ineligible patients/i
  ]
  
  // Find inclusion section
  let inclusionStart = -1
  let inclusionHeader = ''
  for (const header of inclusionHeaders) {
    const match = text.search(header)
    if (match !== -1) {
      inclusionStart = match
      inclusionHeader = text.match(header)?.[0] || ''
      break
    }
  }
  
  // Find exclusion section
  let exclusionStart = -1
  let exclusionHeader = ''
  for (const header of exclusionHeaders) {
    const match = text.search(header)
    if (match !== -1) {
      exclusionStart = match
      exclusionHeader = text.match(header)?.[0] || ''
      break
    }
  }
  
  // Extract sections
  let inclusionText = ''
  let exclusionText = ''
  
  if (inclusionStart !== -1 && exclusionStart !== -1) {
    // Both sections found
    if (inclusionStart < exclusionStart) {
      inclusionText = text.substring(inclusionStart + inclusionHeader.length, exclusionStart)
      exclusionText = text.substring(exclusionStart + exclusionHeader.length)
    } else {
      exclusionText = text.substring(exclusionStart + exclusionHeader.length, inclusionStart)
      inclusionText = text.substring(inclusionStart + inclusionHeader.length)
    }
  } else if (inclusionStart !== -1) {
    // Only inclusion found
    inclusionText = text.substring(inclusionStart + inclusionHeader.length)
  } else if (exclusionStart !== -1) {
    // Only exclusion found
    exclusionText = text.substring(exclusionStart + exclusionHeader.length)
  } else {
    // No headers found - treat as inclusion
    inclusionText = text
  }
  
  return {
    inclusionText: inclusionText.trim(),
    exclusionText: exclusionText.trim()
  }
}

/**
 * Parse criteria list into individual items
 */
function parseCriteriaList(text: string): string[] {
  if (!text) return []
  
  const criteria: string[] = []
  
  // Try numbered list (1., 2., etc.)
  const numberedMatches = text.match(/\d+\.\s*([^\n]+)/g)
  if (numberedMatches && numberedMatches.length > 2) {
    return numberedMatches.map(item => 
      item.replace(/^\d+\.\s*/, '').trim()
    ).filter(item => item.length > 0)
  }
  
  // Try bullet points (-, *, •)
  const bulletMatches = text.match(/[-*•]\s*([^\n]+)/g)
  if (bulletMatches && bulletMatches.length > 2) {
    return bulletMatches.map(item => 
      item.replace(/^[-*•]\s*/, '').trim()
    ).filter(item => item.length > 0)
  }
  
  // Try newline-separated items
  const lines = text.split(/\n+/)
  const cleanedLines = lines
    .map(line => line.trim())
    .filter(line => line.length > 10) // Filter out very short lines
    .filter(line => !line.match(/^(inclusion|exclusion|criteria)/i)) // Remove headers
  
  if (cleanedLines.length > 0) {
    return cleanedLines
  }
  
  // Fallback: return as single item
  return [text.trim()]
}

/**
 * Clean individual criterion
 */
export function cleanCriterion(criterion: string): string {
  let cleaned = criterion.trim()
  
  // Remove leading numbers/bullets
  cleaned = cleaned.replace(/^[\d\-*•.)\]]+\s*/, '')
  
  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,;:]+$/, '')
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ')
  
  return cleaned
}

/**
 * Categorize criterion type
 */
export function categorizeCriterion(criterion: string): string {
  const lower = criterion.toLowerCase()
  
  if (lower.includes('age') || lower.includes('years old')) return 'age'
  if (lower.includes('diagnosis') || lower.includes('confirmed')) return 'diagnosis'
  if (lower.includes('consent') || lower.includes('willing')) return 'consent'
  if (lower.includes('pregnant') || lower.includes('pregnancy')) return 'pregnancy'
  if (lower.includes('laboratory') || lower.includes('lab value')) return 'laboratory'
  if (lower.includes('medication') || lower.includes('treatment')) return 'medication'
  if (lower.includes('disease') || lower.includes('condition')) return 'medical_history'
  if (lower.includes('organ') || lower.includes('function')) return 'organ_function'
  
  return 'other'
}

/**
 * Merge eligibility criteria from multiple sources
 */
export function mergeEligibility(eligibilities: NormalizedEligibility[]): NormalizedEligibility {
  const allInclusion = new Set<string>()
  const allExclusion = new Set<string>()
  
  for (const eligibility of eligibilities) {
    eligibility.inclusionCriteria.forEach(c => allInclusion.add(c))
    eligibility.exclusionCriteria.forEach(c => allExclusion.add(c))
  }
  
  return {
    inclusionCriteria: Array.from(allInclusion),
    exclusionCriteria: Array.from(allExclusion)
  }
}
