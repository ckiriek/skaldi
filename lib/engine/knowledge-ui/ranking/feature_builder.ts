/**
 * Phase H.UI v2: Feature Builder
 * 
 * Extracts ranking features from candidates
 */

export interface RankingFeatures {
  kgConfidence: number          // 0-1 from Knowledge Graph
  sourceReliability: number     // 0-1 weighted by source type
  embeddingSimilarity: number   // 0-1 cosine similarity
  contextRelevance: number      // 0-1 match with form context
  popularity: number            // 0-1 frequency in trials
}

export interface Candidate {
  id: string
  text: string
  type: string
  confidence?: number
  sources?: string[]
  embedding?: number[]
  metadata?: any
}

export interface UserContext {
  indication?: string
  phase?: string
  compound?: string
  productType?: string
  recentSelections?: string[]
}

// Source reliability weights
const SOURCE_WEIGHTS: Record<string, number> = {
  'fda_label': 0.95,
  'ema': 0.90,
  'dailymed': 0.85,
  'ctgov': 0.75,
  'reference_protocol': 0.70,
  'rag': 0.65,
  'memory': 0.60
}

/**
 * Build ranking features for a candidate
 */
export function buildFeatures(
  candidate: Candidate,
  query: string,
  userContext: UserContext,
  queryEmbedding?: number[]
): RankingFeatures {
  return {
    kgConfidence: extractKgConfidence(candidate),
    sourceReliability: calculateSourceReliability(candidate),
    embeddingSimilarity: calculateEmbeddingSimilarity(candidate, queryEmbedding),
    contextRelevance: calculateContextRelevance(candidate, userContext),
    popularity: calculatePopularity(candidate)
  }
}

/**
 * Extract KG confidence score
 */
function extractKgConfidence(candidate: Candidate): number {
  return candidate.confidence || 0.5
}

/**
 * Calculate source reliability
 */
function calculateSourceReliability(candidate: Candidate): number {
  if (!candidate.sources || candidate.sources.length === 0) {
    return 0.5
  }
  
  const reliabilities = candidate.sources.map(source => {
    const sourceType = source.split(':')[0]
    return SOURCE_WEIGHTS[sourceType] || 0.5
  })
  
  // Average reliability
  const avgReliability = reliabilities.reduce((a, b) => a + b, 0) / reliabilities.length
  
  // Boost for multiple sources
  const sourceBoost = Math.min(candidate.sources.length * 0.05, 0.15)
  
  return Math.min(avgReliability + sourceBoost, 1.0)
}

/**
 * Calculate embedding similarity
 */
function calculateEmbeddingSimilarity(
  candidate: Candidate,
  queryEmbedding?: number[]
): number {
  if (!candidate.embedding || !queryEmbedding) {
    return 0.5
  }
  
  // Cosine similarity
  return cosineSimilarity(candidate.embedding, queryEmbedding)
}

/**
 * Calculate context relevance
 */
function calculateContextRelevance(
  candidate: Candidate,
  userContext: UserContext
): number {
  let relevance = 0.5
  const text = candidate.text.toLowerCase()
  
  // Match with indication
  if (userContext.indication) {
    const indication = userContext.indication.toLowerCase()
    if (text.includes(indication) || indication.includes(text)) {
      relevance += 0.2
    }
  }
  
  // Match with compound
  if (userContext.compound) {
    const compound = userContext.compound.toLowerCase()
    if (text.includes(compound)) {
      relevance += 0.15
    }
  }
  
  // Match with phase
  if (userContext.phase && candidate.metadata?.phase) {
    if (candidate.metadata.phase === userContext.phase) {
      relevance += 0.1
    }
  }
  
  // Match with product type
  if (userContext.productType && candidate.metadata?.productType) {
    if (candidate.metadata.productType === userContext.productType) {
      relevance += 0.05
    }
  }
  
  return Math.min(relevance, 1.0)
}

/**
 * Calculate popularity
 */
function calculatePopularity(candidate: Candidate): number {
  // Based on frequency in trials (if available)
  const trialCount = candidate.metadata?.trialCount || 0
  
  if (trialCount === 0) return 0.5
  
  // Logarithmic scale
  return Math.min(0.5 + Math.log10(trialCount) / 10, 1.0)
}

/**
 * Cosine similarity
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}
