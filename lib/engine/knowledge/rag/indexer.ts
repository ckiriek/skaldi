/**
 * Phase H.5: RAG Vector Indexer
 * 
 * Stores embeddings in Supabase vector database
 */

import { createClient } from '@supabase/supabase-js'
import type { EmbeddedChunk } from '../types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const BATCH_SIZE = 100

/**
 * Index embedded chunks in Supabase
 */
export async function indexChunks(chunks: EmbeddedChunk[]): Promise<void> {
  console.log(`📊 Indexing ${chunks.length} chunks...`)
  
  // Process in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    await indexBatch(batch)
    
    console.log(`Indexed ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks`)
  }
  
  console.log('✅ Indexing complete')
}

/**
 * Index a batch of chunks
 */
async function indexBatch(chunks: EmbeddedChunk[]): Promise<void> {
  const records = chunks.map(chunk => ({
    source_id: chunk.sourceId,
    source_type: chunk.sourceType,
    chunk_text: chunk.text,
    chunk_order: chunk.order,
    embedding: chunk.embedding,
    metadata: {
      id: chunk.id,
      length: chunk.text.length
    }
  }))
  
  const { error } = await supabase
    .from('knowledge_rag_index')
    .insert(records)
  
  if (error) {
    throw new Error(`Failed to index batch: ${error.message}`)
  }
}

/**
 * Delete chunks by source ID
 */
export async function deleteChunksBySource(sourceId: string): Promise<void> {
  const { error } = await supabase
    .from('knowledge_rag_index')
    .delete()
    .eq('source_id', sourceId)
  
  if (error) {
    throw new Error(`Failed to delete chunks: ${error.message}`)
  }
}

/**
 * Delete all chunks for a source type
 */
export async function deleteChunksByType(sourceType: string): Promise<void> {
  const { error } = await supabase
    .from('knowledge_rag_index')
    .delete()
    .eq('source_type', sourceType)
  
  if (error) {
    throw new Error(`Failed to delete chunks: ${error.message}`)
  }
}

/**
 * Get chunk count by source
 */
export async function getChunkCount(sourceId?: string): Promise<number> {
  let query = supabase
    .from('knowledge_rag_index')
    .select('id', { count: 'exact', head: true })
  
  if (sourceId) {
    query = query.eq('source_id', sourceId)
  }
  
  const { count, error } = await query
  
  if (error) {
    throw new Error(`Failed to get chunk count: ${error.message}`)
  }
  
  return count || 0
}

/**
 * Check if source is already indexed
 */
export async function isSourceIndexed(sourceId: string): Promise<boolean> {
  const count = await getChunkCount(sourceId)
  return count > 0
}
