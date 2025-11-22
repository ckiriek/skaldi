/**
 * Text Similarity Utilities
 * Calculate similarity between text strings for alignment
 */

/**
 * Normalize text for comparison
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Remove common stopwords
 */
export function removeStopwords(text: string): string {
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  ])

  return text
    .split(' ')
    .filter(word => !stopwords.has(word))
    .join(' ')
}

/**
 * Calculate Jaccard similarity between two texts
 * Returns value between 0 (no overlap) and 1 (identical)
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  const normalized1 = removeStopwords(normalizeText(text1))
  const normalized2 = removeStopwords(normalizeText(text2))

  const words1 = new Set(normalized1.split(' ').filter(Boolean))
  const words2 = new Set(normalized2.split(' ').filter(Boolean))

  if (words1.size === 0 && words2.size === 0) return 1
  if (words1.size === 0 || words2.size === 0) return 0

  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

/**
 * Calculate cosine similarity using word frequency vectors
 */
export function cosineSimilarity(text1: string, text2: string): number {
  const normalized1 = removeStopwords(normalizeText(text1))
  const normalized2 = removeStopwords(normalizeText(text2))

  const words1 = normalized1.split(' ').filter(Boolean)
  const words2 = normalized2.split(' ').filter(Boolean)

  if (words1.length === 0 || words2.length === 0) return 0

  // Build frequency vectors
  const freq1 = new Map<string, number>()
  const freq2 = new Map<string, number>()

  words1.forEach(word => freq1.set(word, (freq1.get(word) || 0) + 1))
  words2.forEach(word => freq2.set(word, (freq2.get(word) || 0) + 1))

  // Get all unique words
  const allWords = new Set([...words1, ...words2])

  // Calculate dot product and magnitudes
  let dotProduct = 0
  let magnitude1 = 0
  let magnitude2 = 0

  allWords.forEach(word => {
    const f1 = freq1.get(word) || 0
    const f2 = freq2.get(word) || 0

    dotProduct += f1 * f2
    magnitude1 += f1 * f1
    magnitude2 += f2 * f2
  })

  magnitude1 = Math.sqrt(magnitude1)
  magnitude2 = Math.sqrt(magnitude2)

  if (magnitude1 === 0 || magnitude2 === 0) return 0

  return dotProduct / (magnitude1 * magnitude2)
}

/**
 * Calculate Levenshtein distance (edit distance)
 */
export function levenshteinDistance(text1: string, text2: string): number {
  const normalized1 = normalizeText(text1)
  const normalized2 = normalizeText(text2)

  const len1 = normalized1.length
  const len2 = normalized2.length

  // Create matrix
  const matrix: number[][] = []
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = normalized1[i - 1] === normalized2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[len1][len2]
}

/**
 * Calculate normalized Levenshtein similarity (0-1)
 */
export function levenshteinSimilarity(text1: string, text2: string): number {
  const normalized1 = normalizeText(text1)
  const normalized2 = normalizeText(text2)

  const maxLen = Math.max(normalized1.length, normalized2.length)
  if (maxLen === 0) return 1

  const distance = levenshteinDistance(text1, text2)
  return 1 - distance / maxLen
}

/**
 * Combined similarity score using multiple metrics
 * Returns weighted average of Jaccard, Cosine, and Levenshtein
 */
export function combinedSimilarity(text1: string, text2: string): number {
  const jaccard = jaccardSimilarity(text1, text2)
  const cosine = cosineSimilarity(text1, text2)
  const levenshtein = levenshteinSimilarity(text1, text2)

  // Weighted average: Jaccard 40%, Cosine 40%, Levenshtein 20%
  return jaccard * 0.4 + cosine * 0.4 + levenshtein * 0.2
}

/**
 * Check if two texts are similar above threshold
 */
export function areSimilar(text1: string, text2: string, threshold: number = 0.7): boolean {
  return combinedSimilarity(text1, text2) >= threshold
}

/**
 * Find best match from a list of candidates
 */
export function findBestMatch(
  query: string,
  candidates: string[],
  threshold: number = 0.5
): { index: number; text: string; score: number } | null {
  let bestScore = threshold
  let bestIndex = -1

  candidates.forEach((candidate, index) => {
    const score = combinedSimilarity(query, candidate)
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })

  if (bestIndex === -1) return null

  return {
    index: bestIndex,
    text: candidates[bestIndex],
    score: bestScore,
  }
}
