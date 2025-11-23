/**
 * Phase H.4: Knowledge Graph Schema
 * 
 * Defines the structure of the Knowledge Graph
 */

import type {
  KgFormulation,
  KgIndication,
  KgEndpoint,
  KgProcedure,
  KgEligibilityPattern,
  KnowledgeGraphSnapshot
} from '../types'

/**
 * Knowledge Graph entity base
 */
export interface KgEntity {
  id: string
  sources: string[]
  confidence: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Source metadata
 */
export interface SourceMetadata {
  type: 'fda_label' | 'fda_ndc' | 'dailymed' | 'ctgov' | 'ema' | 'reference_protocol'
  id: string
  fetchedAt: Date
  reliability: number // 0-1, based on source type
}

/**
 * Confidence calculation weights
 */
export const SOURCE_RELIABILITY: Record<string, number> = {
  'fda_label': 0.95,
  'fda_ndc': 0.90,
  'dailymed': 0.90,
  'ema': 0.95,
  'ctgov': 0.85,
  'reference_protocol': 0.80
}

/**
 * Calculate confidence score based on sources
 */
export function calculateConfidence(sources: string[]): number {
  if (sources.length === 0) return 0
  
  // Get reliability scores for each source
  const reliabilities = sources.map(source => {
    const sourceType = source.split(':')[0] // e.g., "fda_label:12345" -> "fda_label"
    return SOURCE_RELIABILITY[sourceType] || 0.5
  })
  
  // Average reliability
  const avgReliability = reliabilities.reduce((a, b) => a + b, 0) / reliabilities.length
  
  // Boost for multiple sources (max 1.0)
  const sourceBoost = Math.min(sources.length * 0.1, 0.3)
  
  return Math.min(avgReliability + sourceBoost, 1.0)
}

/**
 * Merge entities from multiple sources
 */
export function mergeEntities<T extends { sources: string[]; confidence?: number }>(
  entities: T[],
  keyFn: (entity: T) => string
): T[] {
  const merged = new Map<string, T>()
  
  for (const entity of entities) {
    const key = keyFn(entity)
    
    if (!merged.has(key)) {
      merged.set(key, entity)
    } else {
      const existing = merged.get(key)!
      const combinedSources = [...new Set([...existing.sources, ...entity.sources])]
      const newConfidence = calculateConfidence(combinedSources)
      
      merged.set(key, {
        ...existing,
        sources: combinedSources,
        confidence: newConfidence
      })
    }
  }
  
  return Array.from(merged.values())
}

/**
 * Filter entities by confidence threshold
 */
export function filterByConfidence<T extends { confidence: number }>(
  entities: T[],
  minConfidence: number = 0.5
): T[] {
  return entities.filter(e => e.confidence >= minConfidence)
}

/**
 * Sort entities by confidence
 */
export function sortByConfidence<T extends { confidence: number }>(
  entities: T[],
  descending: boolean = true
): T[] {
  return [...entities].sort((a, b) => 
    descending ? b.confidence - a.confidence : a.confidence - b.confidence
  )
}

/**
 * Create empty Knowledge Graph snapshot
 */
export function createEmptySnapshot(inn: string): KnowledgeGraphSnapshot {
  return {
    inn,
    formulations: [],
    indications: [],
    endpoints: [],
    procedures: [],
    eligibilityPatterns: [],
    sourcesUsed: [],
    createdAt: new Date()
  }
}

/**
 * Validate Knowledge Graph snapshot
 */
export function validateSnapshot(snapshot: KnowledgeGraphSnapshot): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!snapshot.inn || snapshot.inn.trim().length === 0) {
    errors.push('INN is required')
  }
  
  if (!snapshot.createdAt) {
    errors.push('createdAt is required')
  }
  
  // Validate confidence scores
  const allEntities = [
    ...snapshot.formulations,
    ...snapshot.indications,
    ...snapshot.endpoints,
    ...snapshot.procedures
  ]
  
  for (const entity of allEntities) {
    if (entity.confidence < 0 || entity.confidence > 1) {
      errors.push(`Invalid confidence score: ${entity.confidence}`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
