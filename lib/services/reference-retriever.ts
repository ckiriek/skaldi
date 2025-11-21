/**
 * ReferenceRetriever - RAG service for retrieving relevant reference chunks
 * 
 * Uses vector similarity search to find relevant drug/disease reference material
 * from clinical_reference/ documents and external sources.
 */

import { createClient } from '@/lib/supabase/server'

export interface ReferenceChunk {
  id: string
  content: string
  source: string
  url?: string
  metadata?: Record<string, any>
  similarity?: number
}

export interface RetrievalParams {
  compoundName?: string
  disease?: string
  indication?: string
  sectionId?: string
  documentType?: string
  topK?: number
  minSimilarity?: number
}

export class ReferenceRetriever {
  private supabaseClient?: any

  constructor(supabaseClient?: any) {
    this.supabaseClient = supabaseClient
  }

  /**
   * Get Supabase client (uses provided client or creates new one for server components)
   */
  private async getClient() {
    if (this.supabaseClient) {
      return this.supabaseClient
    }
    return await createClient()
  }

  /**
   * Generate embedding for query text using Azure OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT
    const apiKey = process.env.AZURE_OPENAI_API_KEY
    const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || 'text-embedding-ada-002'
    const apiVersion = '2023-05-15' // Embeddings use older API version

    if (!endpoint || !apiKey) {
      throw new Error('Azure OpenAI credentials not configured')
    }

    const url = `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        input: text,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to generate embedding: ${error}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  }

  /**
   * Retrieve drug/compound reference chunks
   */
  async retrieveDrugReferences(params: RetrievalParams): Promise<ReferenceChunk[]> {
    const {
      compoundName,
      sectionId,
      documentType,
      topK = 5,
      minSimilarity = 0.7,
    } = params

    if (!compoundName) {
      console.log('⚠️ No compound name provided for drug reference retrieval')
      return []
    }

    const supabase = await this.getClient()

    // Build query text for embedding
    const queryText = [
      compoundName,
      sectionId ? `section: ${sectionId}` : '',
      documentType ? `document: ${documentType}` : '',
    ]
      .filter(Boolean)
      .join(' ')

    console.log(`🔍 Retrieving drug references for: "${queryText}"`)

    try {
      // Generate embedding for query
      const embedding = await this.generateEmbedding(queryText)

      // Query with vector similarity
      const { data, error } = await supabase
        .rpc('match_drug_references', {
          query_embedding: embedding,
          match_threshold: minSimilarity,
          match_count: topK,
        })
      
      // Filter results in JavaScript (SQL function returns all matches)
      let filteredData = data || []
      
      if (compoundName) {
        filteredData = filteredData.filter(row => row.compound_name === compoundName)
      }
      if (sectionId) {
        filteredData = filteredData.filter(row => row.section_id === sectionId)
      }
      if (documentType) {
        filteredData = filteredData.filter(row => row.document_type === documentType)
      }

      if (error) {
        console.error('❌ Error retrieving drug references:', error)
        return []
      }

      console.log(`✅ Retrieved ${filteredData.length} drug reference chunks`)

      return (
        filteredData.map((row: any) => ({
          id: row.id,
          content: row.content,
          source: row.source,
          url: row.url,
          metadata: row.metadata,
          similarity: row.similarity,
        })) || []
      )
    } catch (error) {
      console.error('❌ Error in drug reference retrieval:', error)
      return []
    }
  }

  /**
   * Retrieve disease reference chunks
   */
  async retrieveDiseaseReferences(params: RetrievalParams): Promise<ReferenceChunk[]> {
    const {
      disease,
      indication,
      sectionId,
      documentType,
      topK = 5,
      minSimilarity = 0.7,
    } = params

    if (!disease) {
      console.log('⚠️ No disease provided for disease reference retrieval')
      return []
    }

    const supabase = await this.getClient()

    // Build query text
    const queryText = [
      disease,
      indication || '',
      sectionId ? `section: ${sectionId}` : '',
      documentType ? `document: ${documentType}` : '',
    ]
      .filter(Boolean)
      .join(' ')

    console.log(`🔍 Retrieving disease references for: "${queryText}"`)

    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(queryText)

      // Query with vector similarity
      const { data, error } = await supabase
        .rpc('match_disease_references', {
          query_embedding: embedding,
          match_threshold: minSimilarity,
          match_count: topK,
        })
      
      // Filter results in JavaScript
      let filteredData = data || []
      
      if (disease) {
        filteredData = filteredData.filter(row => row.disease_name === disease)
      }
      if (indication) {
        filteredData = filteredData.filter(row => row.indication === indication)
      }
      if (sectionId) {
        filteredData = filteredData.filter(row => row.section_id === sectionId)
      }
      if (documentType) {
        filteredData = filteredData.filter(row => row.document_type === documentType)
      }

      if (error) {
        console.error('❌ Error retrieving disease references:', error)
        return []
      }

      console.log(`✅ Retrieved ${filteredData.length} disease reference chunks`)

      return (
        filteredData.map((row: any) => ({
          id: row.id,
          content: row.content,
          source: row.source,
          url: row.url,
          metadata: row.metadata,
          similarity: row.similarity,
        })) || []
      )
    } catch (error) {
      console.error('❌ Error in disease reference retrieval:', error)
      return []
    }
  }

  /**
   * Retrieve combined references (drug + disease)
   */
  async retrieveReferences(params: RetrievalParams): Promise<{
    drugReferences: ReferenceChunk[]
    diseaseReferences: ReferenceChunk[]
    combined: ReferenceChunk[]
  }> {
    const [drugReferences, diseaseReferences] = await Promise.all([
      params.compoundName ? this.retrieveDrugReferences(params) : Promise.resolve([]),
      params.disease ? this.retrieveDiseaseReferences(params) : Promise.resolve([]),
    ])

    // Combine and deduplicate
    const combined = [...drugReferences, ...diseaseReferences]
    const uniqueChunks = Array.from(
      new Map(combined.map((chunk) => [chunk.id, chunk])).values()
    )

    // Sort by similarity (highest first)
    uniqueChunks.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))

    return {
      drugReferences,
      diseaseReferences,
      combined: uniqueChunks,
    }
  }

  /**
   * Format references for prompt injection
   */
  formatReferencesForPrompt(chunks: ReferenceChunk[]): string {
    if (chunks.length === 0) {
      return ''
    }

    const formatted = chunks
      .map((chunk, index) => {
        const citation = chunk.url ? `[${index + 1}](${chunk.url})` : `[${index + 1}]`
        return `${citation} ${chunk.source}:\n${chunk.content}\n`
      })
      .join('\n')

    return `\n\n**Reference Material:**\n\n${formatted}\n`
  }
}
