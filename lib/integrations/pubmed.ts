/**
 * PubMed/NCBI Entrez API Client v2.0
 * API Documentation: https://www.ncbi.nlm.nih.gov/books/NBK25501/
 * 
 * Enhanced with:
 * - Publication type filters (RCT, Meta-Analysis, Systematic Review)
 * - Date filters (last 10 years)
 * - MeSH terms extraction
 * - Extended metadata
 */

export interface Publication {
  pmid: string
  title: string
  authors: string[]
  journal: string
  year: string
  abstract?: string
  doi?: string
  pubmedUrl: string
  // Extended fields
  publicationType?: string[]
  meshTerms?: string[]
  keywords?: string[]
  citedBy?: number
  isOpenAccess?: boolean
}

export interface PubMedSearchFilters {
  minYear?: number                    // Filter by publication year (default: 2015)
  publicationTypes?: string[]         // Filter by type: 'Clinical Trial', 'Randomized Controlled Trial', 'Meta-Analysis', 'Systematic Review'
  excludeTypes?: string[]             // Exclude: 'Case Reports', 'Letter', 'Comment', 'Editorial'
  sortBy?: 'relevance' | 'date'       // Sort order (default: relevance)
}

export class PubMedClient {
  private baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
  private email = 'support@skaldi.com' // Required by NCBI
  private tool = 'skaldi'
  private apiKey?: string
  private lastRequestTime = 0
  private minRequestInterval = 100 // 100ms = 10 req/sec with API key

  constructor(apiKey?: string) {
    this.apiKey = apiKey
    if (!apiKey) {
      console.warn('⚠️ PubMed: No API key provided. Limited to 3 requests/second.')
      this.minRequestInterval = 334 // 334ms = ~3 req/sec without key
    }
  }

  /**
   * Rate-limited fetch with retry logic
   */
  private async fetchWithRateLimit(url: string): Promise<Response> {
    // Wait if needed to respect rate limit
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      )
    }
    
    this.lastRequestTime = Date.now()
    
    const response = await fetch(url)
    
    // Handle rate limit errors
    if (response.status === 429) {
      console.warn('PubMed rate limit exceeded, waiting 1 second...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      return this.fetchWithRateLimit(url) // Retry
    }
    
    return response
  }

  /**
   * Search PubMed articles with filters
   */
  async search(query: string, limit: number = 50, filters: PubMedSearchFilters = {}): Promise<Publication[]> {
    try {
      // Apply default filters
      const defaultFilters: PubMedSearchFilters = {
        minYear: 2015,
        publicationTypes: ['Clinical Trial', 'Randomized Controlled Trial', 'Meta-Analysis', 'Systematic Review', 'Review'],
        excludeTypes: ['Case Reports', 'Letter', 'Comment', 'Editorial', 'News'],
        sortBy: 'relevance',
        ...filters
      }

      // Build enhanced query with filters
      let enhancedQuery = query

      // Add date filter
      if (defaultFilters.minYear) {
        enhancedQuery += ` AND (${defaultFilters.minYear}:3000[pdat])`
      }

      // Add publication type filter
      if (defaultFilters.publicationTypes && defaultFilters.publicationTypes.length > 0) {
        const typeFilter = defaultFilters.publicationTypes.map(t => `"${t}"[pt]`).join(' OR ')
        enhancedQuery += ` AND (${typeFilter})`
      }

      // Exclude unwanted types
      if (defaultFilters.excludeTypes && defaultFilters.excludeTypes.length > 0) {
        const excludeFilter = defaultFilters.excludeTypes.map(t => `NOT "${t}"[pt]`).join(' ')
        enhancedQuery += ` ${excludeFilter}`
      }

      console.log(`📚 PubMed: Searching "${query}" with filters (limit: ${limit})`)

      // Step 1: Search for PMIDs
      const searchParams = new URLSearchParams({
        db: 'pubmed',
        term: enhancedQuery,
        retmax: limit.toString(),
        retmode: 'json',
        sort: defaultFilters.sortBy === 'date' ? 'pub+date' : 'relevance',
        email: this.email,
        tool: this.tool,
      })
      
      if (this.apiKey) {
        searchParams.append('api_key', this.apiKey)
      }

      const searchResponse = await this.fetchWithRateLimit(`${this.baseUrl}/esearch.fcgi?${searchParams}`)
      
      if (!searchResponse.ok) {
        throw new Error(`PubMed search error: ${searchResponse.statusText}`)
      }

      const searchData = await searchResponse.json()
      const pmids = searchData.esearchresult?.idlist || []

      if (pmids.length === 0) {
        console.log(`📚 PubMed: No results found`)
        return []
      }

      console.log(`📚 PubMed: Found ${pmids.length} articles, fetching details...`)

      // Step 2: Fetch article details
      const articles = await this.fetchArticles(pmids)
      
      console.log(`✅ PubMed: Retrieved ${articles.length} articles`)
      return articles
    } catch (error) {
      console.error('PubMed search error:', error)
      return []
    }
  }

  /**
   * Enhanced search for clinical evidence
   */
  async searchClinicalEvidence(
    drugName: string, 
    indication?: string, 
    limit: number = 50
  ): Promise<Publication[]> {
    // Build optimized query for clinical evidence
    // Use simple terms without complex field tags for better matching
    let query = drugName
    if (indication) {
      // Simplify indication: remove commas, extract key terms
      const simplifiedIndication = indication
        .replace(/,\s*/g, ' ')  // "Tuberculosis, Pulmonary" -> "Tuberculosis Pulmonary"
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')[0]  // Take first word for broader matching (e.g., "Tuberculosis")
      
      query += ` ${simplifiedIndication}`
    }
    
    // Prioritize high-quality evidence
    const filters: PubMedSearchFilters = {
      minYear: 2015,
      publicationTypes: [
        'Randomized Controlled Trial',
        'Meta-Analysis', 
        'Systematic Review',
        'Clinical Trial, Phase III',
        'Clinical Trial, Phase IV',
        'Comparative Study'
      ],
      excludeTypes: ['Case Reports', 'Letter', 'Comment', 'Editorial'],
      sortBy: 'relevance'
    }

    return this.search(query, limit, filters)
  }

  /**
   * Get article by PMID
   */
  async getArticle(pmid: string): Promise<Publication | null> {
    try {
      const articles = await this.fetchArticles([pmid])
      return articles[0] || null
    } catch (error) {
      console.error('PubMed get article error:', error)
      return null
    }
  }

  /**
   * Fetch article details by PMIDs
   */
  private async fetchArticles(pmids: string[]): Promise<Publication[]> {
    try {
      const fetchParams = new URLSearchParams({
        db: 'pubmed',
        id: pmids.join(','),
        retmode: 'xml',
        email: this.email,
        tool: this.tool,
      })
      
      // Add API key if available
      if (this.apiKey) {
        fetchParams.append('api_key', this.apiKey)
      }

      const fetchResponse = await this.fetchWithRateLimit(`${this.baseUrl}/efetch.fcgi?${fetchParams}`)
      
      if (!fetchResponse.ok) {
        throw new Error(`PubMed fetch error: ${fetchResponse.statusText}`)
      }

      const xmlText = await fetchResponse.text()
      return this.parseXML(xmlText)
    } catch (error) {
      console.error('PubMed fetch articles error:', error)
      return []
    }
  }

  /**
   * Parse PubMed XML response with extended data
   */
  private parseXML(xmlText: string): Publication[] {
    const publications: Publication[] = []
    
    const articleMatches = xmlText.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)
    
    for (const match of articleMatches) {
      const articleXml = match[1]
      
      const pmid = this.extractTag(articleXml, 'PMID') || ''
      const title = this.extractTag(articleXml, 'ArticleTitle') || ''
      const journal = this.extractTag(articleXml, 'Title') || ''
      const year = this.extractTag(articleXml, 'Year') || ''
      const abstract = this.extractTag(articleXml, 'AbstractText') || undefined
      const doi = this.extractTag(articleXml, 'ELocationID', 'doi') || undefined
      
      // Extract authors
      const authors: string[] = []
      const authorMatches = articleXml.matchAll(/<Author[^>]*>([\s\S]*?)<\/Author>/g)
      for (const authorMatch of authorMatches) {
        const authorXml = authorMatch[1]
        const lastName = this.extractTag(authorXml, 'LastName')
        const foreName = this.extractTag(authorXml, 'ForeName')
        if (lastName) {
          authors.push(foreName ? `${lastName} ${foreName}` : lastName)
        }
      }

      // Extract publication types
      const publicationType: string[] = []
      const pubTypeMatches = articleXml.matchAll(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/g)
      for (const ptMatch of pubTypeMatches) {
        publicationType.push(ptMatch[1].trim())
      }

      // Extract MeSH terms
      const meshTerms: string[] = []
      const meshMatches = articleXml.matchAll(/<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g)
      for (const meshMatch of meshMatches) {
        meshTerms.push(meshMatch[1].trim())
      }

      // Extract keywords
      const keywords: string[] = []
      const keywordMatches = articleXml.matchAll(/<Keyword[^>]*>([^<]+)<\/Keyword>/g)
      for (const kwMatch of keywordMatches) {
        keywords.push(kwMatch[1].trim())
      }
      
      publications.push({
        pmid,
        title,
        authors: authors.slice(0, 10),
        journal,
        year,
        abstract,
        doi,
        pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        // Extended fields
        publicationType: publicationType.length > 0 ? publicationType : undefined,
        meshTerms: meshTerms.length > 0 ? meshTerms.slice(0, 20) : undefined, // Limit to 20
        keywords: keywords.length > 0 ? keywords.slice(0, 10) : undefined,
      })
    }
    
    return publications
  }

  /**
   * Extract tag content from XML
   */
  private extractTag(xml: string, tag: string, type?: string): string | undefined {
    let pattern: RegExp
    
    if (type) {
      pattern = new RegExp(`<${tag}[^>]*EIdType="${type}"[^>]*>([^<]*)<\/${tag}>`, 'i')
    } else {
      pattern = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i')
    }
    
    const match = xml.match(pattern)
    return match ? match[1].trim() : undefined
  }
}

// Export singleton with API key from environment
export const pubMedClient = new PubMedClient(process.env.NCBI_API_KEY)
