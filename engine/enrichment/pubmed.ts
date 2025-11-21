/**
 * Enhanced PubMed Enrichment
 * 
 * Fetches full article details including abstracts, MeSH terms, and metadata
 */

import { PubMedAdapter } from '@/lib/adapters/pubmed'
import type { Literature } from '@/lib/types/regulatory-data'

export interface EnhancedLiterature extends Literature {
  mesh_terms?: string[]
  keywords?: string[]
  full_abstract?: string
  structured_abstract?: {
    background?: string
    methods?: string
    results?: string
    conclusions?: string
  }
}

export class PubMedEnrichment {
  private adapter: PubMedAdapter

  constructor(apiKey?: string, email?: string) {
    this.adapter = new PubMedAdapter(apiKey, email)
  }

  /**
   * Fetch enhanced literature with full abstracts
   */
  async fetchEnhancedLiterature(
    drugName: string,
    maxResults: number = 30
  ): Promise<EnhancedLiterature[]> {
    console.log(`📚 Fetching enhanced literature for: ${drugName}`)

    // Search for articles
    const pmids = await this.adapter.searchByDrug(drugName, maxResults)
    
    if (pmids.length === 0) {
      console.log(`⚠️ No articles found for ${drugName}`)
      return []
    }

    console.log(`📄 Found ${pmids.length} PMIDs, fetching details...`)

    // Fetch article details in batches (PubMed allows up to 200 IDs per request)
    const batchSize = 50
    const allArticles: EnhancedLiterature[] = []

    for (let i = 0; i < pmids.length; i += batchSize) {
      const batchPmids = pmids.slice(i, i + batchSize)
      const articles = await this.adapter.fetchArticles(batchPmids)
      
      // Enhance articles with additional processing
      const enhanced = articles.map(article => this.enhanceArticle(article))
      allArticles.push(...enhanced)

      console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}: ${enhanced.length} articles`)
    }

    console.log(`✅ Total enhanced articles: ${allArticles.length}`)
    return allArticles
  }

  /**
   * Fetch literature by condition
   */
  async fetchByCondition(
    condition: string,
    drugName?: string,
    maxResults: number = 20
  ): Promise<EnhancedLiterature[]> {
    console.log(`📚 Fetching literature for condition: ${condition}`)

    const pmids = await this.adapter.searchByCondition(condition, drugName, maxResults)
    
    if (pmids.length === 0) {
      return []
    }

    const articles = await this.adapter.fetchArticles(pmids)
    return articles.map(article => this.enhanceArticle(article))
  }

  /**
   * Enhance article with structured abstract parsing
   */
  private enhanceArticle(article: Literature): EnhancedLiterature {
    const enhanced: EnhancedLiterature = {
      ...article,
      full_abstract: article.abstract
    }

    // Parse structured abstract if present
    if (article.abstract) {
      const structured = this.parseStructuredAbstract(article.abstract)
      if (structured) {
        enhanced.structured_abstract = structured
      }
    }

    return enhanced
  }

  /**
   * Parse structured abstract sections
   */
  private parseStructuredAbstract(abstract: string): {
    background?: string
    methods?: string
    results?: string
    conclusions?: string
  } | null {
    const sections: any = {}

    // Common section headers
    const patterns = {
      background: /(?:BACKGROUND|INTRODUCTION|OBJECTIVE)[:\s]+(.*?)(?=(?:METHODS|RESULTS|CONCLUSIONS|$))/is,
      methods: /(?:METHODS|MATERIALS AND METHODS|METHODOLOGY)[:\s]+(.*?)(?=(?:RESULTS|CONCLUSIONS|$))/is,
      results: /(?:RESULTS|FINDINGS)[:\s]+(.*?)(?=(?:CONCLUSIONS|DISCUSSION|$))/is,
      conclusions: /(?:CONCLUSIONS|CONCLUSION|DISCUSSION)[:\s]+(.*?)$/is
    }

    let foundAny = false

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = abstract.match(pattern)
      if (match && match[1]) {
        sections[key] = match[1].trim()
        foundAny = true
      }
    }

    return foundAny ? sections : null
  }

  /**
   * Extract key findings from abstract
   */
  extractKeyFindings(abstract: string): string[] {
    const findings: string[] = []

    // Look for sentences with key phrases
    const sentences = abstract.split(/[.!?]+/)
    const keyPhrases = [
      'significantly',
      'demonstrated',
      'showed',
      'found',
      'observed',
      'concluded',
      'resulted in',
      'associated with',
      'compared to',
      'versus'
    ]

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase()
      if (keyPhrases.some(phrase => lower.includes(phrase))) {
        findings.push(sentence.trim())
      }
    }

    return findings.slice(0, 5) // Top 5 findings
  }

  /**
   * Calculate relevance score based on content
   */
  calculateRelevance(article: EnhancedLiterature, drugName: string): number {
    let score = 0
    const drugLower = drugName.toLowerCase()

    // Title mentions drug
    if (article.title.toLowerCase().includes(drugLower)) {
      score += 30
    }

    // Abstract mentions drug
    if (article.abstract?.toLowerCase().includes(drugLower)) {
      score += 20
    }

    // Recent publication (last 5 years)
    const year = parseInt(article.publication_date || '0')
    const currentYear = new Date().getFullYear()
    if (year >= currentYear - 5) {
      score += 20
    }

    // Clinical trial or RCT
    if (article.abstract?.toLowerCase().includes('randomized') || 
        article.abstract?.toLowerCase().includes('clinical trial')) {
      score += 15
    }

    // Has structured abstract
    if (article.structured_abstract) {
      score += 10
    }

    // Has MeSH terms
    if (article.mesh_terms && article.mesh_terms.length > 0) {
      score += 5
    }

    return Math.min(score, 100)
  }
}

// Export singleton
export const pubmedEnrichment = new PubMedEnrichment(
  process.env.PUBMED_API_KEY,
  process.env.PUBMED_EMAIL
)
