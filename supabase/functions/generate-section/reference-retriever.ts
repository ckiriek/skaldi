/**
 * Reference Retriever for Deno Edge Functions
 * 
 * Retrieves relevant references from RAG chunks using vector similarity search
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ReferenceChunk {
  id: string
  compound_name?: string
  disease_name?: string
  source: string
  document_type: string
  content: string
  url?: string
  metadata?: Record<string, any>
  similarity?: number
}

export interface RetrievalOptions {
  compoundName?: string
  diseaseName?: string
  query?: string
  topK?: number
  minSimilarity?: number
}

export class ReferenceRetriever {
  private supabase: SupabaseClient
  private azureEndpoint: string
  private azureKey: string
  private embeddingDeployment: string
  private embeddingApiVersion: string

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    this.azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')!
    this.azureKey = Deno.env.get('AZURE_OPENAI_API_KEY')!
    this.embeddingDeployment = Deno.env.get('AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME') || 'text-embedding-ada-002'
    this.embeddingApiVersion = '2023-05-15'
  }

  /**
   * Generate embedding for query text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const url = `${this.azureEndpoint}/openai/deployments/${this.embeddingDeployment}/embeddings?api-version=${this.embeddingApiVersion}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.azureKey,
      },
      body: JSON.stringify({ input: text }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Azure OpenAI embedding error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  }

  /**
   * Retrieve drug references
   */
  async retrieveDrugReferences(options: RetrievalOptions): Promise<ReferenceChunk[]> {
    const { compoundName, query, topK = 5, minSimilarity = 0.7 } = options

    // Generate embedding for query
    const queryText = query || compoundName || ''
    const embedding = await this.generateEmbedding(queryText)

    // Call RPC function for vector search
    const { data, error } = await this.supabase.rpc('match_drug_references', {
      query_embedding: embedding,
      match_threshold: minSimilarity,
      match_count: topK,
      filter_compound: compoundName || null,
    })

    if (error) {
      console.error('Error retrieving drug references:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      compound_name: row.compound_name,
      source: row.source,
      document_type: row.document_type,
      content: row.content,
      url: row.url,
      metadata: row.metadata,
      similarity: row.similarity,
    }))
  }

  /**
   * Retrieve disease references
   */
  async retrieveDiseaseReferences(options: RetrievalOptions): Promise<ReferenceChunk[]> {
    const { diseaseName, query, topK = 5, minSimilarity = 0.7 } = options

    // Generate embedding for query
    const queryText = query || diseaseName || ''
    const embedding = await this.generateEmbedding(queryText)

    // Call RPC function for vector search
    const { data, error } = await this.supabase.rpc('match_disease_references', {
      query_embedding: embedding,
      match_threshold: minSimilarity,
      match_count: topK,
      filter_disease: diseaseName || null,
    })

    if (error) {
      console.error('Error retrieving disease references:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      disease_name: row.disease_name,
      source: row.source,
      document_type: row.document_type,
      content: row.content,
      url: row.url,
      metadata: row.metadata,
      similarity: row.similarity,
    }))
  }

  /**
   * Format references for prompt injection
   */
  formatReferences(references: ReferenceChunk[]): string {
    if (references.length === 0) {
      return 'No references available.'
    }

    return references.map((ref, i) => {
      const parts = [
        `[Reference ${i + 1}]`,
        `Source: ${ref.source}`,
        `Type: ${ref.document_type}`,
        `Content: ${ref.content}`,
      ]

      if (ref.url) {
        parts.push(`URL: ${ref.url}`)
      }

      if (ref.similarity) {
        parts.push(`Relevance: ${(ref.similarity * 100).toFixed(1)}%`)
      }

      parts.push('---')
      return parts.join('\n')
    }).join('\n\n')
  }
}
