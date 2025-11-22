/**
 * Procedure Mapping
 * Maps free text procedure names to canonical catalog entries
 */

import type { ProcedureCatalogEntry, ProcedureMappingResult } from '../types'
import { PROCEDURE_CATALOG, searchProcedures } from './procedure_catalog'
import { jaccardSimilarity, cosineSimilarity, levenshteinSimilarity } from '../../crossdoc/alignment/similarity'

/**
 * Map procedure text to catalog entry
 */
export function mapProcedureText(text: string): ProcedureMappingResult {
  const cleaned = text.trim()
  
  // Try exact match first
  const exactMatch = findExactMatch(cleaned)
  if (exactMatch) {
    return {
      originalText: text,
      matchedProcedure: exactMatch,
      confidence: 1.0,
      alternatives: [],
    }
  }

  // Try fuzzy match
  const fuzzyMatches = findFuzzyMatches(cleaned)
  
  if (fuzzyMatches.length === 0) {
    return {
      originalText: text,
      matchedProcedure: null,
      confidence: 0,
      alternatives: [],
    }
  }

  // Return best match
  const best = fuzzyMatches[0]
  const alternatives = fuzzyMatches.slice(1, 4) // Top 3 alternatives

  return {
    originalText: text,
    matchedProcedure: best.procedure,
    confidence: best.confidence,
    alternatives,
  }
}

/**
 * Find exact match
 */
function findExactMatch(text: string): ProcedureCatalogEntry | null {
  const lower = text.toLowerCase()

  for (const proc of PROCEDURE_CATALOG) {
    // Check name
    if (proc.name.toLowerCase() === lower) return proc
    if (proc.nameRu?.toLowerCase() === lower) return proc

    // Check synonyms
    if (proc.synonyms.some(syn => syn.toLowerCase() === lower)) return proc
  }

  return null
}

/**
 * Find fuzzy matches
 */
function findFuzzyMatches(
  text: string
): Array<{ procedure: ProcedureCatalogEntry; confidence: number }> {
  const matches: Array<{ procedure: ProcedureCatalogEntry; confidence: number }> = []

  for (const proc of PROCEDURE_CATALOG) {
    const confidence = calculateMatchConfidence(text, proc)
    
    if (confidence > 0.5) {
      matches.push({ procedure: proc, confidence })
    }
  }

  // Sort by confidence
  return matches.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Calculate match confidence
 */
function calculateMatchConfidence(
  text: string,
  proc: ProcedureCatalogEntry
): number {
  const lower = text.toLowerCase()
  
  // Calculate similarity with name
  const nameSimilarity = calculateTextSimilarity(lower, proc.name.toLowerCase())
  
  // Calculate similarity with Russian name
  let nameRuSimilarity = 0
  if (proc.nameRu) {
    nameRuSimilarity = calculateTextSimilarity(lower, proc.nameRu.toLowerCase())
  }

  // Calculate similarity with synonyms
  const synonymSimilarities = proc.synonyms.map(syn =>
    calculateTextSimilarity(lower, syn.toLowerCase())
  )
  const maxSynonymSimilarity = Math.max(0, ...synonymSimilarities)

  // Take maximum similarity
  return Math.max(nameSimilarity, nameRuSimilarity, maxSynonymSimilarity)
}

/**
 * Calculate text similarity (combined)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const jaccard = jaccardSimilarity(text1, text2)
  const cosine = cosineSimilarity(text1, text2)
  const levenshtein = levenshteinSimilarity(text1, text2)

  // Weighted average
  return jaccard * 0.3 + cosine * 0.4 + levenshtein * 0.3
}

/**
 * Map multiple procedure texts
 */
export function mapProcedureTexts(texts: string[]): ProcedureMappingResult[] {
  return texts.map(text => mapProcedureText(text))
}

/**
 * Extract procedures from protocol text
 */
export function extractProceduresFromText(text: string): ProcedureMappingResult[] {
  // Split by common delimiters
  const lines = text.split(/[\n,;]/)
  
  const results: ProcedureMappingResult[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length < 3) continue // Skip very short strings
    
    // Try to map
    const result = mapProcedureText(trimmed)
    
    // Only include if confidence > 0.6
    if (result.confidence > 0.6) {
      results.push(result)
    }
  }

  return results
}

/**
 * Validate procedure mapping
 */
export function validateMapping(result: ProcedureMappingResult): {
  valid: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  if (!result.matchedProcedure) {
    warnings.push(`No match found for "${result.originalText}"`)
    return { valid: false, warnings }
  }

  if (result.confidence < 0.7) {
    warnings.push(
      `Low confidence match (${(result.confidence * 100).toFixed(0)}%) for "${result.originalText}" → "${result.matchedProcedure.name}"`
    )
  }

  if (result.alternatives.length > 0 && result.alternatives[0].confidence > result.confidence - 0.1) {
    warnings.push(
      `Ambiguous match: "${result.matchedProcedure.name}" vs "${result.alternatives[0].procedure.name}"`
    )
  }

  return {
    valid: result.confidence >= 0.7,
    warnings,
  }
}

/**
 * Get mapping statistics
 */
export function getMappingStats(results: ProcedureMappingResult[]): {
  total: number
  matched: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
  unmatched: number
} {
  const matched = results.filter(r => r.matchedProcedure !== null).length
  const highConfidence = results.filter(r => r.confidence >= 0.8).length
  const mediumConfidence = results.filter(r => r.confidence >= 0.6 && r.confidence < 0.8).length
  const lowConfidence = results.filter(r => r.confidence > 0 && r.confidence < 0.6).length
  const unmatched = results.filter(r => r.matchedProcedure === null).length

  return {
    total: results.length,
    matched,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    unmatched,
  }
}
