/**
 * Phase H.UI v2: ML Ranker
 * 
 * Ranks candidates using ML-based scoring
 */

import { buildFeatures, type UserContext, type RankingFeatures } from './feature_builder'
import type { Candidate } from './feature_builder'

export type { Candidate } from './feature_builder'

export interface RankedCandidate extends Candidate {
  score: number
  features: RankingFeatures
  rank: number
}

export interface RankingWeights {
  kgConfidence: number
  sourceReliability: number
  embeddingSimilarity: number
  contextRelevance: number
  popularity: number
}

// Default weights (can be personalized via feedback)
const DEFAULT_WEIGHTS: RankingWeights = {
  kgConfidence: 0.30,
  sourceReliability: 0.25,
  embeddingSimilarity: 0.20,
  contextRelevance: 0.15,
  popularity: 0.10
}

/**
 * Rank candidates using ML scoring
 */
export function rankCandidates(
  candidates: Candidate[],
  query: string,
  userContext: UserContext,
  queryEmbedding?: number[],
  customWeights?: Partial<RankingWeights>
): RankedCandidate[] {
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights }
  
  // Build features and calculate scores
  const scored = candidates.map(candidate => {
    const features = buildFeatures(candidate, query, userContext, queryEmbedding)
    const score = calculateScore(features, weights)
    
    return {
      ...candidate,
      score,
      features,
      rank: 0 // Will be set after sorting
    }
  })
  
  // Sort by score (descending)
  scored.sort((a, b) => b.score - a.score)
  
  // Assign ranks
  scored.forEach((candidate, index) => {
    candidate.rank = index + 1
  })
  
  return scored
}

/**
 * Calculate final score
 */
function calculateScore(features: RankingFeatures, weights: RankingWeights): number {
  return (
    features.kgConfidence * weights.kgConfidence +
    features.sourceReliability * weights.sourceReliability +
    features.embeddingSimilarity * weights.embeddingSimilarity +
    features.contextRelevance * weights.contextRelevance +
    features.popularity * weights.popularity
  )
}

/**
 * Get top N candidates
 */
export function getTopCandidates(
  ranked: RankedCandidate[],
  n: number = 5
): RankedCandidate[] {
  return ranked.slice(0, n)
}

/**
 * Filter by minimum score
 */
export function filterByScore(
  ranked: RankedCandidate[],
  minScore: number = 0.5
): RankedCandidate[] {
  return ranked.filter(c => c.score >= minScore)
}

/**
 * Get quality label
 */
export function getQualityLabel(score: number): string {
  if (score >= 0.9) return 'Excellent'
  if (score >= 0.8) return 'High Quality'
  if (score >= 0.7) return 'Good'
  if (score >= 0.6) return 'Fair'
  return 'Low'
}

/**
 * Get recommendation badge
 */
export function getRecommendationBadge(candidate: RankedCandidate): string | null {
  if (candidate.rank === 1 && candidate.score >= 0.85) {
    return 'Recommended'
  }
  
  if (candidate.features.sourceReliability >= 0.9 && candidate.sources && candidate.sources.length >= 3) {
    return 'Multi-source Validated'
  }
  
  if (candidate.features.kgConfidence >= 0.9) {
    return 'High Confidence'
  }
  
  return null
}
