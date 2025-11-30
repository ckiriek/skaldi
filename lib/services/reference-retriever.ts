/**
 * ReferenceRetriever - RAG service for retrieving STRUCTURE EXAMPLES
 * 
 * PURPOSE: Retrieve structure examples from clinical_reference/ to show AI:
 * - How sections should be formatted
 * - Typical length and style
 * - Section organization
 * 
 * NOT for retrieving data about specific compounds!
 * Compound-specific data comes from Knowledge Graph.
 * 
 * Uses vector similarity search to find relevant structural examples.
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
   * Retrieve STRUCTURE EXAMPLES (not compound-specific data)
   * 
   * Searches for structural examples from clinical_reference/ that show:
   * - How to format the section
   * - Typical length and organization
   * - Style and tone
   * 
   * Does NOT filter by compound name - examples are universal!
   */
  async retrieveDrugReferences(params: RetrievalParams): Promise<ReferenceChunk[]> {
    const {
      sectionId,
      documentType,
      topK = 3,  // Fewer examples needed
      minSimilarity = 0.6,  // Lower threshold for more variety
    } = params

    const supabase = await this.getClient()

    // Build query text focused on STRUCTURE, not compound
    const queryText = [
      documentType || 'clinical document',
      sectionId ? `${sectionId} section` : '',
      'structure example formatting',
    ]
      .filter(Boolean)
      .join(' ')

    console.log(`🔍 Retrieving structure examples for: "${queryText}"`)

    try {
      // Generate embedding for query
      const embedding = await this.generateEmbedding(queryText)

      // Query with vector similarity
      const { data, error } = await supabase
        .rpc('match_drug_references', {
          query_embedding: embedding,
          match_threshold: minSimilarity,
          match_count: topK * 2,  // Get more, then filter
        })
      
      if (error) {
        console.error('❌ Error retrieving structure examples:', error)
        return []
      }

      // Filter for structure examples only (NOT compound-specific)
      let filteredData = (data || []).filter((row: any) => 
        row.compound_name === 'STRUCTURE_EXAMPLE' ||
        row.metadata?.purpose === 'structure_example'
      )
      
      // Further filter by section/document type if specified
      if (sectionId) {
        filteredData = filteredData.filter((row: any) => 
          row.section_id?.includes(sectionId) || 
          row.metadata?.heading?.toLowerCase().includes(sectionId.toLowerCase())
        )
      }
      if (documentType) {
        filteredData = filteredData.filter((row: any) => row.document_type === documentType)
      }

      // Limit to topK
      filteredData = filteredData.slice(0, topK)

      console.log(`✅ Retrieved ${filteredData.length} structure example chunks`)

      return filteredData.map((row: any) => ({
        id: row.id,
        content: row.content,
        source: row.source,
        url: row.url,
        metadata: row.metadata,
        similarity: row.similarity,
      }))
    } catch (error) {
      console.error('❌ Error in structure example retrieval:', error)
      return []
    }
  }

  /**
   * Retrieve disease STRUCTURE EXAMPLES
   * 
   * Currently returns empty - disease-specific structure examples not yet implemented.
   * Most structure comes from drug_reference_chunks.
   */
  async retrieveDiseaseReferences(params: RetrievalParams): Promise<ReferenceChunk[]> {
    const {
      sectionId,
      documentType,
      topK = 2,
      minSimilarity = 0.6,
    } = params

    const supabase = await this.getClient()

    // Build query text focused on STRUCTURE
    const queryText = [
      documentType || 'clinical document',
      sectionId ? `${sectionId} section` : '',
      'disease indication structure example',
    ]
      .filter(Boolean)
      .join(' ')

    console.log(`🔍 Retrieving disease structure examples for: "${queryText}"`)

    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(queryText)

      // Query with vector similarity
      const { data, error } = await supabase
        .rpc('match_disease_references', {
          query_embedding: embedding,
          match_threshold: minSimilarity,
          match_count: topK * 2,
        })
      
      if (error) {
        console.error('❌ Error retrieving disease structure examples:', error)
        return []
      }

      // Filter for structure examples
      let filteredData = (data || []).filter((row: any) => 
        row.metadata?.purpose === 'structure_example'
      )
      
      if (sectionId) {
        filteredData = filteredData.filter((row: any) => 
          row.section_id?.includes(sectionId) ||
          row.metadata?.heading?.toLowerCase().includes(sectionId.toLowerCase())
        )
      }
      if (documentType) {
        filteredData = filteredData.filter((row: any) => row.document_type === documentType)
      }

      // Limit to topK
      filteredData = filteredData.slice(0, topK)

      console.log(`✅ Retrieved ${filteredData.length} disease structure example chunks`)

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
   * Retrieve STRUCTURE EXAMPLES (universal, not compound-specific)
   * 
   * Always retrieves structural examples regardless of compound name.
   * These examples show AI how to format and structure sections.
   */
  async retrieveReferences(params: RetrievalParams): Promise<{
    drugReferences: ReferenceChunk[]
    diseaseReferences: ReferenceChunk[]
    combined: ReferenceChunk[]
  }> {
    // ALWAYS retrieve structure examples (not conditional on compoundName)
    const [drugReferences, diseaseReferences] = await Promise.all([
      this.retrieveDrugReferences(params),  // Gets structure examples
      this.retrieveDiseaseReferences(params),  // Gets structure examples (if any)
    ])

    // Combine and deduplicate
    const combined = [...drugReferences, ...diseaseReferences]
    const uniqueChunks = Array.from(
      new Map(combined.map((chunk) => [chunk.id, chunk])).values()
    )

    // Sort by similarity (highest first)
    uniqueChunks.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))

    console.log(`📚 Total structure examples retrieved: ${uniqueChunks.length}`)

    return {
      drugReferences,
      diseaseReferences,
      combined: uniqueChunks,
    }
  }

  /**
   * Format STRUCTURE EXAMPLES for prompt injection
   * 
   * These examples show AI how to format and structure the section,
   * NOT what data to include (data comes from Knowledge Graph).
   */
  formatReferencesForPrompt(chunks: ReferenceChunk[]): string {
    if (chunks.length === 0) {
      return ''
    }

    const formatted = chunks
      .map((chunk, index) => {
        const source = chunk.metadata?.filename || chunk.source
        return `**Example ${index + 1}** (from ${source}):\n${chunk.content}\n`
      })
      .join('\n---\n')

    return `\n\n**STRUCTURE REFERENCE EXAMPLES:**\n(Use these to understand formatting, length, and organization - NOT for copying data)\n\n${formatted}\n`
  }
}
