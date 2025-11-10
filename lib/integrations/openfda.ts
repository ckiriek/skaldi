/**
 * openFDA API Client
 * API Documentation: https://open.fda.gov/apis/
 */

export interface AdverseEvent {
  receiptDate: string
  drugName: string
  reactions: string[]
  seriousness: string
  outcomes: string[]
  patientAge?: number
  patientSex?: string
}

export interface DrugLabel {
  brandName: string
  genericName: string
  manufacturer: string
  indications?: string
  warnings?: string
  adverseReactions?: string
  dosage?: string
}

export class OpenFDAClient {
  private baseUrl = 'https://api.fda.gov'
  private apiKey?: string
  private lastRequestTime = 0
  private minRequestInterval = 250 // 250ms = 240 req/min (conservative)

  constructor(apiKey?: string) {
    this.apiKey = apiKey
    if (!apiKey) {
      console.warn('⚠️ openFDA: No API key provided. Limited to 240 requests/minute and 1000 requests/day.')
    } else {
      console.log('✅ openFDA: API key configured. Limit: 240 requests/minute, 120,000 requests/day.')
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
      console.warn('openFDA rate limit exceeded, waiting 60 seconds...')
      await new Promise(resolve => setTimeout(resolve, 60000))
      return this.fetchWithRateLimit(url) // Retry
    }
    
    return response
  }

  /**
   * Search adverse events by drug name
   */
  async searchAdverseEvents(drugName: string, limit: number = 10): Promise<AdverseEvent[]> {
    try {
      const params = new URLSearchParams({
        search: `patient.drug.medicinalproduct:"${drugName}"`,
        limit: limit.toString(),
      })

      if (this.apiKey) {
        params.append('api_key', this.apiKey)
      }

      const response = await this.fetchWithRateLimit(`${this.baseUrl}/drug/event.json?${params}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return [] // No results found
        }
        throw new Error(`openFDA API error: ${response.statusText}`)
      }

      const data = await response.json()
      return this.parseAdverseEvents(data.results || [])
    } catch (error) {
      console.error('openFDA adverse events search error:', error)
      return []
    }
  }

  /**
   * Get drug label information
   */
  async getDrugLabel(drugName: string): Promise<DrugLabel | null> {
    try {
      const params = new URLSearchParams({
        search: `openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`,
        limit: '1',
      })

      if (this.apiKey) {
        params.append('api_key', this.apiKey)
      }

      const response = await this.fetchWithRateLimit(`${this.baseUrl}/drug/label.json?${params}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null // No results found
        }
        throw new Error(`openFDA API error: ${response.statusText}`)
      }

      const data = await response.json()
      const results = data.results || []
      
      if (results.length === 0) {
        return null
      }

      return this.parseDrugLabel(results[0])
    } catch (error) {
      console.error('openFDA drug label error:', error)
      return null
    }
  }

  /**
   * Get safety information summary using count API
   */
  async getSafetySummary(drugName: string): Promise<{
    totalEvents: number
    seriousEvents: number
    commonReactions: { reaction: string; count: number }[]
  }> {
    try {
      const params = new URLSearchParams({
        search: `patient.drug.medicinalproduct:"${drugName}"`,
        count: 'patient.reaction.reactionmeddrapt.exact',
        limit: '10',
      })

      if (this.apiKey) {
        params.append('api_key', this.apiKey)
      }

      const response = await this.fetchWithRateLimit(`${this.baseUrl}/drug/event.json?${params}`)
      
      if (!response.ok) {
        return { totalEvents: 0, seriousEvents: 0, commonReactions: [] }
      }

      const data = await response.json()
      const results = data.results || []
      
      const totalEvents = results.reduce((sum: number, r: any) => sum + r.count, 0)
      
      return {
        totalEvents,
        seriousEvents: Math.floor(totalEvents * 0.3), // Estimate (30% serious)
        commonReactions: results.map((r: any) => ({
          reaction: r.term,
          count: r.count,
        })),
      }
    } catch (error) {
      console.error('openFDA safety summary error:', error)
      return { totalEvents: 0, seriousEvents: 0, commonReactions: [] }
    }
  }

  /**
   * Parse adverse events from API response
   */
  private parseAdverseEvents(events: any[]): AdverseEvent[] {
    return events.map(event => {
      const drug = event.patient?.drug?.[0] || {}
      const reactions = (event.patient?.reaction || []).map((r: any) => r.reactionmeddrapt)
      
      return {
        receiptDate: event.receiptdate || '',
        drugName: drug.medicinalproduct || 'Unknown',
        reactions,
        seriousness: event.serious === '1' ? 'Serious' : 'Non-serious',
        outcomes: event.patient?.reaction?.map((r: any) => r.reactionoutcome) || [],
        patientAge: event.patient?.patientonsetage,
        patientSex: event.patient?.patientsex === '1' ? 'Male' : event.patient?.patientsex === '2' ? 'Female' : undefined,
      }
    })
  }

  /**
   * Parse drug label from API response
   */
  private parseDrugLabel(label: any): DrugLabel {
    const openfda = label.openfda || {}
    
    return {
      brandName: openfda.brand_name?.[0] || 'Unknown',
      genericName: openfda.generic_name?.[0] || 'Unknown',
      manufacturer: openfda.manufacturer_name?.[0] || 'Unknown',
      indications: label.indications_and_usage?.[0],
      warnings: label.warnings?.[0] || label.boxed_warning?.[0],
      adverseReactions: label.adverse_reactions?.[0],
      dosage: label.dosage_and_administration?.[0],
    }
  }
}

// Export singleton with optional API key from env
export const openFDAClient = new OpenFDAClient(process.env.OPENFDA_API_KEY)
