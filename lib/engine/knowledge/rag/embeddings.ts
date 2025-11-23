/**
 * Phase H.5: RAG Embeddings
 * 
 * Generates embeddings using OpenAI API
 */

import type { TextChunk, EmbeddedChunk } from '../types'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_EMBEDDING_MODEL = 'text-embedding-ada-002'
const BATCH_SIZE = 100
const MAX_RETRIES = 3

/**
 * Generate embeddings for text chunks
 */
export async function embedChunks(chunks: TextChunk[]): Promise<EmbeddedChunk[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  
  const embeddedChunks: EmbeddedChunk[] = []
  
  // Process in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const batchEmbeddings = await embedBatch(batch)
    embeddedChunks.push(...batchEmbeddings)
    
    // Log progress
    console.log(`Embedded ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks`)
  }
  
  return embeddedChunks
}

/**
 * Embed a batch of chunks
 */
async function embedBatch(chunks: TextChunk[]): Promise<EmbeddedChunk[]> {
  const texts = chunks.map(c => c.text)
  
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const embeddings = await callOpenAIEmbeddings(texts)
      
      return chunks.map((chunk, i) => ({
        ...chunk,
        embedding: embeddings[i]
      }))
      
    } catch (error) {
      lastError = error as Error
      console.error(`Embedding attempt ${attempt} failed:`, error)
      
      if (attempt < MAX_RETRIES) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
  }
  
  throw new Error(`Failed to embed batch after ${MAX_RETRIES} attempts: ${lastError?.message}`)
}

/**
 * Call OpenAI Embeddings API
 */
async function callOpenAIEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input: texts
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} ${error}`)
  }
  
  const data = await response.json()
  
  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('Invalid response from OpenAI API')
  }
  
  return data.data.map((item: any) => item.embedding)
}

/**
 * Embed single text
 */
export async function embedText(text: string): Promise<number[]> {
  const embeddings = await callOpenAIEmbeddings([text])
  return embeddings[0]
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
