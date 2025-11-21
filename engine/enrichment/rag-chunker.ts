/**
 * Enhanced RAG Chunker
 * 
 * Creates optimized chunks for vector search with better metadata
 */

export interface ChunkMetadata {
  source: string
  source_type: 'literature' | 'trial' | 'label' | 'internal'
  source_id: string
  chunk_index: number
  total_chunks: number
  word_count: number
  created_at: string
  relevance_keywords?: string[]
  section?: string
}

export interface EnhancedChunk {
  text: string
  metadata: ChunkMetadata
  embedding?: number[]
}

export class RAGChunker {
  private chunkSize: number
  private chunkOverlap: number
  private minChunkSize: number

  constructor(options?: {
    chunkSize?: number
    chunkOverlap?: number
    minChunkSize?: number
  }) {
    this.chunkSize = options?.chunkSize || 800 // tokens
    this.chunkOverlap = options?.chunkOverlap || 200 // tokens
    this.minChunkSize = options?.minChunkSize || 100 // tokens
  }

  /**
   * Chunk literature abstract
   */
  chunkLiterature(
    pmid: string,
    title: string,
    abstract: string,
    structuredAbstract?: {
      background?: string
      methods?: string
      results?: string
      conclusions?: string
    }
  ): EnhancedChunk[] {
    const chunks: EnhancedChunk[] = []

    // If structured abstract, chunk by sections
    if (structuredAbstract) {
      const sections = [
        { name: 'background', text: structuredAbstract.background },
        { name: 'methods', text: structuredAbstract.methods },
        { name: 'results', text: structuredAbstract.results },
        { name: 'conclusions', text: structuredAbstract.conclusions }
      ]

      for (const section of sections) {
        if (section.text) {
          const sectionChunks = this.chunkText(section.text, this.chunkSize, this.chunkOverlap)
          
          for (let i = 0; i < sectionChunks.length; i++) {
            chunks.push({
              text: `${title}\n\n${section.name.toUpperCase()}: ${sectionChunks[i]}`,
              metadata: {
                source: `PubMed:${pmid}`,
                source_type: 'literature',
                source_id: pmid,
                chunk_index: chunks.length,
                total_chunks: 0, // Will update later
                word_count: this.countWords(sectionChunks[i]),
                created_at: new Date().toISOString(),
                section: section.name
              }
            })
          }
        }
      }
    } else {
      // Chunk full abstract
      const textChunks = this.chunkText(abstract, this.chunkSize, this.chunkOverlap)
      
      for (let i = 0; i < textChunks.length; i++) {
        chunks.push({
          text: `${title}\n\n${textChunks[i]}`,
          metadata: {
            source: `PubMed:${pmid}`,
            source_type: 'literature',
            source_id: pmid,
            chunk_index: i,
            total_chunks: textChunks.length,
            word_count: this.countWords(textChunks[i]),
            created_at: new Date().toISOString()
          }
        })
      }
    }

    // Update total_chunks
    chunks.forEach(chunk => {
      chunk.metadata.total_chunks = chunks.length
    })

    return chunks
  }

  /**
   * Chunk clinical trial
   */
  chunkTrial(
    nctId: string,
    title: string,
    description: string,
    eligibility?: string,
    outcomes?: string
  ): EnhancedChunk[] {
    const chunks: EnhancedChunk[] = []

    // Chunk description
    if (description) {
      const descChunks = this.chunkText(description, this.chunkSize, this.chunkOverlap)
      
      for (let i = 0; i < descChunks.length; i++) {
        chunks.push({
          text: `${title}\n\nDESCRIPTION: ${descChunks[i]}`,
          metadata: {
            source: `ClinicalTrials:${nctId}`,
            source_type: 'trial',
            source_id: nctId,
            chunk_index: chunks.length,
            total_chunks: 0,
            word_count: this.countWords(descChunks[i]),
            created_at: new Date().toISOString(),
            section: 'description'
          }
        })
      }
    }

    // Chunk eligibility
    if (eligibility) {
      const eligChunks = this.chunkText(eligibility, this.chunkSize, this.chunkOverlap)
      
      for (let i = 0; i < eligChunks.length; i++) {
        chunks.push({
          text: `${title}\n\nELIGIBILITY: ${eligChunks[i]}`,
          metadata: {
            source: `ClinicalTrials:${nctId}`,
            source_type: 'trial',
            source_id: nctId,
            chunk_index: chunks.length,
            total_chunks: 0,
            word_count: this.countWords(eligChunks[i]),
            created_at: new Date().toISOString(),
            section: 'eligibility'
          }
        })
      }
    }

    // Chunk outcomes
    if (outcomes) {
      const outcomeChunks = this.chunkText(outcomes, this.chunkSize, this.chunkOverlap)
      
      for (let i = 0; i < outcomeChunks.length; i++) {
        chunks.push({
          text: `${title}\n\nOUTCOMES: ${outcomeChunks[i]}`,
          metadata: {
            source: `ClinicalTrials:${nctId}`,
            source_type: 'trial',
            source_id: nctId,
            chunk_index: chunks.length,
            total_chunks: 0,
            word_count: this.countWords(outcomeChunks[i]),
            created_at: new Date().toISOString(),
            section: 'outcomes'
          }
        })
      }
    }

    // Update total_chunks
    chunks.forEach(chunk => {
      chunk.metadata.total_chunks = chunks.length
    })

    return chunks
  }

  /**
   * Chunk text with overlap
   */
  private chunkText(text: string, size: number, overlap: number): string[] {
    const words = text.split(/\s+/)
    const chunks: string[] = []

    let start = 0
    while (start < words.length) {
      const end = Math.min(start + size, words.length)
      const chunk = words.slice(start, end).join(' ')
      
      if (chunk.trim().length >= this.minChunkSize) {
        chunks.push(chunk)
      }

      start += size - overlap
    }

    return chunks
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text: string, topN: number = 10): string[] {
    // Simple keyword extraction (in production, use TF-IDF or similar)
    const words = text.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4) // Filter short words
      .filter(w => !this.isStopWord(w))

    // Count frequency
    const freq: Record<string, number> = {}
    for (const word of words) {
      freq[word] = (freq[word] || 0) + 1
    }

    // Sort by frequency
    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word]) => word)

    return sorted
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their'
    ])
    return stopWords.has(word)
  }
}

// Export singleton
export const ragChunker = new RAGChunker({
  chunkSize: 800,
  chunkOverlap: 200,
  minChunkSize: 100
})
