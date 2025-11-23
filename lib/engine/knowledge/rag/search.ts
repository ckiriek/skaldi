/**
 * Phase H.5: RAG Semantic Search
 * 
 * Performs vector similarity search
 */

import { createClient } from '@supabase/supabase-js'
import { embedText } from './embeddings'
import type { SourceType } from '../types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export interface SearchResult {
  id: string
  sourceId: string
  sourceType: SourceType
  text: string
  similarity: number
  metadata: any
}

export interface SearchOptions {
  limit?: number
  minSimilarity?: number
  sourceTypes?: SourceType[]
  sourceIds?: string[]
}

const DEFAULT_OPTIONS: Required<Omit<SearchOptions, 'sourceTypes' | 'sourceIds'>> = {
  limit: 10,
  minSimilarity: 0.7
}

/**
 * Semantic search using vector similarity
 */
export async function semanticSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  // Generate embedding for query
  const queryEmbedding = await embedText(query)
  
  // Build SQL query for vector search
  let rpcQuery = supabase.rpc('match_knowledge_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: opts.minSimilarity,
    match_count: opts.limit
  })
  
  const { data, error } = await rpcQuery
  
  if (error) {
    throw new Error(`Semantic search failed: ${error.message}`)
  }
  
  if (!data || data.length === 0) {
    return []
  }
  
  // Filter by source type if specified
  let results = data.map((row: any) => ({
    id: row.id,
    sourceId: row.source_id,
    sourceType: row.source_type as SourceType,
    text: row.chunk_text,
    similarity: row.similarity,
    metadata: row.metadata
  }))
  
  if (opts.sourceTypes && opts.sourceTypes.length > 0) {
    results = results.filter((r: SearchResult) => opts.sourceTypes!.includes(r.sourceType))
  }
  
  if (opts.sourceIds && opts.sourceIds.length > 0) {
    results = results.filter((r: SearchResult) => opts.sourceIds!.includes(r.sourceId))
  }
  
  return results
}

/**
 * Search for similar chunks to a given chunk
 */
export async function findSimilarChunks(
  chunkId: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  // Get the chunk
  const { data: chunk, error: fetchError } = await supabase
    .from('knowledge_rag_index')
    .select('*')
    .eq('id', chunkId)
    .single()
  
  if (fetchError || !chunk) {
    throw new Error(`Chunk not found: ${chunkId}`)
  }
  
  // Use its embedding for search
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: chunk.embedding,
    match_threshold: opts.minSimilarity,
    match_count: opts.limit + 1 // +1 to exclude self
  })
  
  if (error) {
    throw new Error(`Similar chunks search failed: ${error.message}`)
  }
  
  if (!data) return []
  
  // Filter out the original chunk and map results
  return data
    .filter((row: any) => row.id !== chunkId)
    .slice(0, opts.limit)
    .map((row: any) => ({
      id: row.id,
      sourceId: row.source_id,
      sourceType: row.source_type as SourceType,
      text: row.chunk_text,
      similarity: row.similarity,
      metadata: row.metadata
    }))
}

/**
 * Get chunks by source
 */
export async function getChunksBySource(
  sourceId: string,
  limit: number = 100
): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('knowledge_rag_index')
    .select('*')
    .eq('source_id', sourceId)
    .order('chunk_order', { ascending: true })
    .limit(limit)
  
  if (error) {
    throw new Error(`Failed to get chunks: ${error.message}`)
  }
  
  if (!data) return []
  
  return data.map(row => ({
    id: row.id,
    sourceId: row.source_id,
    sourceType: row.source_type as SourceType,
    text: row.chunk_text,
    similarity: 1.0, // Not from similarity search
    metadata: row.metadata
  }))
}
