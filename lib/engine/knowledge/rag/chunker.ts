/**
 * Phase H.5: RAG Chunker
 * 
 * Splits text into chunks for embedding and indexing
 */

import type { TextChunk, SourceType } from '../types'

export interface ChunkOptions {
  maxTokens?: number
  overlapTokens?: number
  preserveSentences?: boolean
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxTokens: 512,
  overlapTokens: 50,
  preserveSentences: true
}

/**
 * Chunk text into smaller pieces for embedding
 */
export function chunkText(
  sourceId: string,
  sourceType: SourceType,
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  if (!text || text.trim().length === 0) {
    return []
  }
  
  // Split into sentences first
  const sentences = splitIntoSentences(text)
  
  // Group sentences into chunks
  const chunks: TextChunk[] = []
  let currentChunk: string[] = []
  let currentTokens = 0
  let chunkOrder = 0
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence)
    
    // If adding this sentence would exceed max tokens, save current chunk
    if (currentTokens + sentenceTokens > opts.maxTokens && currentChunk.length > 0) {
      chunks.push({
        id: generateChunkId(sourceId, chunkOrder),
        sourceId,
        sourceType,
        text: currentChunk.join(' '),
        order: chunkOrder
      })
      
      chunkOrder++
      
      // Start new chunk with overlap
      if (opts.overlapTokens > 0 && currentChunk.length > 0) {
        const overlapSentences = getOverlapSentences(currentChunk, opts.overlapTokens)
        currentChunk = overlapSentences
        currentTokens = overlapSentences.reduce((sum, s) => sum + estimateTokens(s), 0)
      } else {
        currentChunk = []
        currentTokens = 0
      }
    }
    
    currentChunk.push(sentence)
    currentTokens += sentenceTokens
  }
  
  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      id: generateChunkId(sourceId, chunkOrder),
      sourceId,
      sourceType,
      text: currentChunk.join(' '),
      order: chunkOrder
    })
  }
  
  return chunks
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  // Simple sentence splitting (can be improved with NLP library)
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
  
  return sentences
}

/**
 * Estimate token count (rough approximation)
 * Real implementation would use tiktoken
 */
function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4)
}

/**
 * Get sentences for overlap
 */
function getOverlapSentences(sentences: string[], targetTokens: number): string[] {
  const overlap: string[] = []
  let tokens = 0
  
  // Take sentences from the end
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentenceTokens = estimateTokens(sentences[i])
    if (tokens + sentenceTokens > targetTokens) break
    
    overlap.unshift(sentences[i])
    tokens += sentenceTokens
  }
  
  return overlap
}

/**
 * Generate chunk ID
 */
function generateChunkId(sourceId: string, order: number): string {
  return `${sourceId}-chunk-${order}`
}

/**
 * Chunk multiple documents
 */
export function chunkDocuments(
  documents: Array<{ id: string; type: SourceType; text: string }>,
  options?: ChunkOptions
): TextChunk[] {
  const allChunks: TextChunk[] = []
  
  for (const doc of documents) {
    const chunks = chunkText(doc.id, doc.type, doc.text, options)
    allChunks.push(...chunks)
  }
  
  return allChunks
}

/**
 * Get chunk statistics
 */
export function getChunkStats(chunks: TextChunk[]): {
  totalChunks: number
  avgLength: number
  minLength: number
  maxLength: number
  totalTokens: number
} {
  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      avgLength: 0,
      minLength: 0,
      maxLength: 0,
      totalTokens: 0
    }
  }
  
  const lengths = chunks.map(c => c.text.length)
  const tokens = chunks.map(c => estimateTokens(c.text))
  
  return {
    totalChunks: chunks.length,
    avgLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
    minLength: Math.min(...lengths),
    maxLength: Math.max(...lengths),
    totalTokens: tokens.reduce((a, b) => a + b, 0)
  }
}
