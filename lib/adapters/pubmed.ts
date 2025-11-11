/**
 * PubMed Adapter
 * 
 * Fetches scientific literature from NCBI PubMed
 * Critical for references in regulatory documents
 * 
 * API: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/
 * Rate Limit: 3 req/sec without API key, 10 req/sec with API key
 */

import type { Literature } from '@/lib/types/regulatory-data'

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

interface PubMedSearchResponse {
  esearchresult: {
    count: string
    retmax: string
    retstart: string
    idlist: string[]
  }
}

interface PubMedArticle {
  MedlineCitation: {
    PMID: { _: string }
    Article: {
      ArticleTitle: string
      Abstract?: {
        AbstractText: string | string[]
      }
      AuthorList?: {
        Author: Array<{
          LastName?: string
          ForeName?: string
          Initials?: string
        }>
      }
      Journal: {
        Title: string
        JournalIssue: {
          Volume?: string
          Issue?: string
          PubDate: {
            Year?: string
            Month?: string
          }
        }
      }
      Pagination?: {
        MedlinePgn?: string
      }
      PublicationTypeList?: {
        PublicationType: Array<{ _: string }>
      }
    }
    MeshHeadingList?: {
      MeshHeading: Array<{
        DescriptorName: { _: string }
      }>
    }
  }
}

interface PubMedFetchResponse {
  PubmedArticleSet: {
    PubmedArticle: PubMedArticle[]
  }
}

export class PubMedAdapter {
  private baseUrl = PUBMED_BASE_URL
  private apiKey?: string
  private email = 'asetria@example.com' // Required by NCBI
  private tool = 'asetria'
  private lastRequestTime = 0
  private minRequestInterval: number

  constructor(apiKey?: string, email?: string) {
    this.apiKey = apiKey
    if (email) this.email = email
    
    if (!apiKey) {
      console.warn('⚠️ PubMed: No API key provided. Limited to 3 requests/second.')
      this.minRequestInterval = 334 // 334ms = ~3 req/sec
    } else {
      console.log('✅ PubMed: API key configured. Limit: 10 requests/second.')
      this.minRequestInterval = 100 // 100ms = 10 req/sec
    }
  }

  /**
   * Rate limiting
   */
  private async rateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()
  }

  /**
   * Build query parameters
   */
  private buildParams(params: Record<string, string>): string {
    const allParams = {
      email: this.email,
      tool: this.tool,
      ...(this.apiKey && { api_key: this.apiKey }),
      ...params,
    }

    return new URLSearchParams(allParams).toString()
  }

  /**
   * Search PubMed by drug name
   * 
   * @param drugName - e.g., "metformin"
   * @param maxResults - Maximum number of results (default: 20)
   * @returns Array of PMIDs
   */
  async searchByDrug(drugName: string, maxResults: number = 20): Promise<string[]> {
    try {
      await this.rateLimit()

      const query = `${drugName}[Title/Abstract] AND (clinical trial[Publication Type] OR randomized controlled trial[Publication Type])`
      const params = this.buildParams({
        db: 'pubmed',
        term: query,
        retmax: maxResults.toString(),
        retmode: 'json',
      })

      const url = `${this.baseUrl}/esearch.fcgi?${params}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`PubMed API error: ${response.status}`)
      }

      const data: PubMedSearchResponse = await response.json()
      const pmids = data.esearchresult.idlist || []

      console.log(`✅ PubMed: Found ${pmids.length} articles for ${drugName}`)
      return pmids

    } catch (error) {
      console.error(`PubMed searchByDrug error for ${drugName}:`, error)
      return []
    }
  }

  /**
   * Search PubMed by condition
   * 
   * @param condition - e.g., "Type 2 Diabetes"
   * @param drugName - Optional drug name to filter
   * @param maxResults - Maximum number of results (default: 20)
   * @returns Array of PMIDs
   */
  async searchByCondition(condition: string, drugName?: string, maxResults: number = 20): Promise<string[]> {
    try {
      await this.rateLimit()

      let query = `${condition}[Title/Abstract] AND (clinical trial[Publication Type] OR meta-analysis[Publication Type])`
      if (drugName) {
        query += ` AND ${drugName}[Title/Abstract]`
      }

      const params = this.buildParams({
        db: 'pubmed',
        term: query,
        retmax: maxResults.toString(),
        retmode: 'json',
      })

      const url = `${this.baseUrl}/esearch.fcgi?${params}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`PubMed API error: ${response.status}`)
      }

      const data: PubMedSearchResponse = await response.json()
      const pmids = data.esearchresult.idlist || []

      console.log(`✅ PubMed: Found ${pmids.length} articles for ${condition}`)
      return pmids

    } catch (error) {
      console.error(`PubMed searchByCondition error for ${condition}:`, error)
      return []
    }
  }

  /**
   * Fetch article details by PMIDs
   * 
   * @param pmids - Array of PubMed IDs
   * @returns Array of Literature objects
   */
  async fetchArticles(pmids: string[]): Promise<Literature[]> {
    if (pmids.length === 0) return []

    try {
      await this.rateLimit()

      const params = this.buildParams({
        db: 'pubmed',
        id: pmids.join(','),
        retmode: 'xml',
      })

      const url = `${this.baseUrl}/efetch.fcgi?${params}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`PubMed API error: ${response.status}`)
      }

      const xmlText = await response.text()
      const articles = this.parseXML(xmlText)

      console.log(`✅ PubMed: Fetched ${articles.length} articles`)
      return articles

    } catch (error) {
      console.error(`PubMed fetchArticles error:`, error)
      return []
    }
  }

  /**
   * Search and fetch articles in one call
   * 
   * @param drugName - Drug name to search
   * @param maxResults - Maximum number of results (default: 10)
   * @returns Array of Literature objects
   */
  async searchAndFetch(drugName: string, maxResults: number = 10): Promise<Literature[]> {
    const pmids = await this.searchByDrug(drugName, maxResults)
    if (pmids.length === 0) return []

    const articles = await this.fetchArticles(pmids)
    return articles
  }

  /**
   * Parse XML response to Literature objects
   * Simple XML parsing - in production, use a proper XML parser
   */
  private parseXML(xmlText: string): Literature[] {
    const articles: Literature[] = []

    // Simple regex-based parsing (for demo purposes)
    // In production, use xml2js or similar library
    const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g
    const articleMatches = xmlText.match(articleRegex) || []

    for (const match of articleMatches) {
      const articleXml = match

      try {
        const pmid = this.extractTag(articleXml, 'PMID')
        const title = this.extractTag(articleXml, 'ArticleTitle')
        const abstractText = this.extractTag(articleXml, 'AbstractText')
        const journalTitle = this.extractTag(articleXml, 'Title') // Journal title
        const year = this.extractTag(articleXml, 'Year')
        const volume = this.extractTag(articleXml, 'Volume')
        const issue = this.extractTag(articleXml, 'Issue')
        const pages = this.extractTag(articleXml, 'MedlinePgn')

        // Extract authors
        const authors: string[] = []
        const authorRegex = /<Author[\s\S]*?>([\s\S]*?)<\/Author>/g
        const authorMatches = articleXml.match(authorRegex) || []
        for (const authorMatch of authorMatches) {
          const authorXml = authorMatch
          const lastName = this.extractTag(authorXml, 'LastName')
          const foreName = this.extractTag(authorXml, 'ForeName')
          if (lastName) {
            authors.push(foreName ? `${lastName} ${foreName}` : lastName)
          }
        }

        // Extract publication types
        const pubTypes: string[] = []
        const pubTypeRegex = /<PublicationType[\s\S]*?>([\s\S]*?)<\/PublicationType>/g
        let pubTypeMatch
        while ((pubTypeMatch = pubTypeRegex.exec(articleXml)) !== null) {
          pubTypes.push(pubTypeMatch[1].trim())
        }

        const studyType = pubTypes.includes('Randomized Controlled Trial') 
          ? 'RCT' 
          : pubTypes.includes('Meta-Analysis')
          ? 'Meta-Analysis'
          : pubTypes.includes('Clinical Trial')
          ? 'Clinical Trial'
          : 'Other'

        const citation = this.buildCitation(authors, title, journalTitle, year, volume, issue, pages)

        const article: Literature = {
          pmid,
          inchikey: '', // Will be linked later
          title,
          authors, // Already an array
          journal: journalTitle,
          publication_date: year,
          volume,
          issue,
          pages,
          doi: undefined, // Would need additional parsing
          abstract: abstractText,
          keywords: undefined,
          mesh_terms: undefined,
          relevance_score: undefined,
          source: 'PubMed',
          source_url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
          retrieved_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        articles.push(article)
      } catch (error) {
        console.error('Error parsing article:', error)
        continue
      }
    }

    return articles
  }

  /**
   * Extract text from XML tag
   */
  private extractTag(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`, 'i')
    const match = xml.match(regex)
    return match ? match[1].trim() : ''
  }

  /**
   * Build citation string
   */
  private buildCitation(
    authors: string[],
    title: string,
    journal: string,
    year?: string,
    volume?: string,
    issue?: string,
    pages?: string
  ): string {
    let citation = ''

    // Authors
    if (authors.length > 0) {
      if (authors.length <= 3) {
        citation += authors.join(', ')
      } else {
        citation += `${authors[0]} et al`
      }
      citation += '. '
    }

    // Title
    citation += `${title}. `

    // Journal
    citation += `${journal}. `

    // Year
    if (year) {
      citation += `${year}`
    }

    // Volume/Issue
    if (volume) {
      citation += `;${volume}`
      if (issue) {
        citation += `(${issue})`
      }
    }

    // Pages
    if (pages) {
      citation += `:${pages}`
    }

    citation += '.'

    return citation
  }
}

// Export singleton instance
export const pubmedAdapter = new PubMedAdapter(
  process.env.PUBMED_API_KEY,
  process.env.PUBMED_EMAIL
)
