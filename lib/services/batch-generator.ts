/**
 * Batch Document Generator
 * 
 * Generates multiple documents in parallel or sequence
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type DocumentType = 'Protocol' | 'IB' | 'ICF' | 'Synopsis' | 'CSR' | 'SAP'

export interface BatchGenerationRequest {
  project_id: string
  document_types: DocumentType[]
  options?: {
    parallel?: boolean
    max_concurrent?: number
    include_validation?: boolean
  }
}

export interface BatchGenerationResult {
  total: number
  successful: number
  failed: number
  documents: Array<{
    type: DocumentType
    document_id?: string
    status: 'success' | 'failed'
    error?: string
    duration_ms: number
  }>
  total_duration_ms: number
}

export class BatchGenerator {
  private supabase: SupabaseClient<Database>

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
  }

  /**
   * Generate multiple documents
   */
  async generateBatch(request: BatchGenerationRequest): Promise<BatchGenerationResult> {
    const startTime = Date.now()
    
    console.log(`📦 Batch Generator: Starting generation of ${request.document_types.length} documents`)

    const results: BatchGenerationResult = {
      total: request.document_types.length,
      successful: 0,
      failed: 0,
      documents: [],
      total_duration_ms: 0
    }

    // Parallel or sequential generation
    if (request.options?.parallel) {
      await this.generateParallel(request, results)
    } else {
      await this.generateSequential(request, results)
    }

    results.total_duration_ms = Date.now() - startTime

    console.log(`✅ Batch Generator: Complete`)
    console.log(`   Successful: ${results.successful}/${results.total}`)
    console.log(`   Failed: ${results.failed}/${results.total}`)
    console.log(`   Duration: ${results.total_duration_ms}ms`)

    return results
  }

  /**
   * Generate documents in parallel
   */
  private async generateParallel(
    request: BatchGenerationRequest,
    results: BatchGenerationResult
  ): Promise<void> {
    const maxConcurrent = request.options?.max_concurrent || 3

    console.log(`⚡ Generating in parallel (max ${maxConcurrent} concurrent)`)

    // Split into batches
    const batches: DocumentType[][] = []
    for (let i = 0; i < request.document_types.length; i += maxConcurrent) {
      batches.push(request.document_types.slice(i, i + maxConcurrent))
    }

    // Process each batch
    for (const batch of batches) {
      const promises = batch.map(type => this.generateSingle(request.project_id, type))
      const batchResults = await Promise.all(promises)
      
      for (const result of batchResults) {
        results.documents.push(result)
        if (result.status === 'success') {
          results.successful++
        } else {
          results.failed++
        }
      }
    }
  }

  /**
   * Generate documents sequentially
   */
  private async generateSequential(
    request: BatchGenerationRequest,
    results: BatchGenerationResult
  ): Promise<void> {
    console.log(`📝 Generating sequentially`)

    for (const type of request.document_types) {
      const result = await this.generateSingle(request.project_id, type)
      results.documents.push(result)
      
      if (result.status === 'success') {
        results.successful++
      } else {
        results.failed++
      }
    }
  }

  /**
   * Generate a single document
   */
  private async generateSingle(
    projectId: string,
    type: DocumentType
  ): Promise<{
    type: DocumentType
    document_id?: string
    status: 'success' | 'failed'
    error?: string
    duration_ms: number
  }> {
    const startTime = Date.now()

    try {
      console.log(`   📄 Generating ${type}...`)

      // Call generation API
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectId,
          document_type: type
        })
      })

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status}`)
      }

      const data = await response.json()

      console.log(`   ✅ ${type} generated (${Date.now() - startTime}ms)`)

      return {
        type,
        document_id: data.document_id,
        status: 'success',
        duration_ms: Date.now() - startTime
      }

    } catch (error) {
      console.error(`   ❌ ${type} failed:`, error)

      return {
        type,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: Date.now() - startTime
      }
    }
  }

  /**
   * Get recommended generation order
   */
  getRecommendedOrder(types: DocumentType[]): DocumentType[] {
    // Recommended order based on dependencies
    const order: DocumentType[] = [
      'Protocol',    // Foundation document
      'IB',          // Reference for other docs
      'ICF',         // Based on protocol
      'SAP',         // Based on protocol
      'Synopsis',    // Summary of protocol
      'CSR'          // Final report
    ]

    return types.sort((a, b) => {
      const aIndex = order.indexOf(a)
      const bIndex = order.indexOf(b)
      return aIndex - bIndex
    })
  }

  /**
   * Estimate batch duration
   */
  estimateDuration(
    documentCount: number,
    parallel: boolean = false,
    maxConcurrent: number = 3
  ): number {
    const avgDocumentTime = 30000 // 30 seconds per document

    if (parallel) {
      const batches = Math.ceil(documentCount / maxConcurrent)
      return batches * avgDocumentTime
    } else {
      return documentCount * avgDocumentTime
    }
  }
}
