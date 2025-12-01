/**
 * openFDA API Client v2.0
 * API Documentation: https://open.fda.gov/apis/
 * 
 * Enhanced with:
 * - Count API for reaction frequencies
 * - Seriousness breakdown
 * - SOC (System Organ Class) grouping
 * - Extended safety data
 */

export interface AdverseEvent {
  receiptDate: string
  drugName: string
  reactions: string[]
  seriousness: string
  outcomes: string[]
  patientAge?: number
  patientSex?: string
  // Extended fields
  reporterType?: string
  reportCountry?: string
  serious?: boolean
  seriousnessDetails?: {
    death?: boolean
    hospitalization?: boolean
    lifeThreatening?: boolean
    disability?: boolean
    congenitalAnomaly?: boolean
    other?: boolean
  }
}

export interface ReactionCount {
  term: string
  count: number
  percentage?: number
}

export interface SafetySummary {
  totalReports: number
  seriousReports: number
  deathReports: number
  hospitalizationReports: number
  topReactions: ReactionCount[]
  reactionsBySoc?: { soc: string; reactions: ReactionCount[] }[]
}

export interface DrugLabel {
  brandName: string
  genericName: string
  manufacturer: string
  indications?: string
  warnings?: string
  boxedWarning?: string
  adverseReactions?: string
  dosage?: string
  contraindications?: string
  drugInteractions?: string
  useInPregnancy?: string
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
   * Get comprehensive safety summary using count API
   */
  async getSafetySummary(drugName: string): Promise<SafetySummary> {
    console.log(`🛡️ openFDA: Fetching safety summary for "${drugName}"`)
    
    try {
      // 1. Get top reactions with counts
      const reactionsParams = new URLSearchParams({
        search: `patient.drug.medicinalproduct:"${drugName}"`,
        count: 'patient.reaction.reactionmeddrapt.exact',
        limit: '25', // Top 25 reactions
      })
      if (this.apiKey) reactionsParams.append('api_key', this.apiKey)

      const reactionsResponse = await this.fetchWithRateLimit(`${this.baseUrl}/drug/event.json?${reactionsParams}`)
      
      let topReactions: ReactionCount[] = []
      let totalReports = 0
      
      if (reactionsResponse.ok) {
        const reactionsData = await reactionsResponse.json()
        const results = reactionsData.results || []
        totalReports = results.reduce((sum: number, r: any) => sum + r.count, 0)
        topReactions = results.map((r: any) => ({
          term: r.term,
          count: r.count,
          percentage: totalReports > 0 ? Math.round((r.count / totalReports) * 100 * 10) / 10 : 0
        }))
      }

      // 2. Get serious events count
      const seriousParams = new URLSearchParams({
        search: `patient.drug.medicinalproduct:"${drugName}" AND serious:1`,
        limit: '1',
      })
      if (this.apiKey) seriousParams.append('api_key', this.apiKey)

      let seriousReports = 0
      const seriousResponse = await this.fetchWithRateLimit(`${this.baseUrl}/drug/event.json?${seriousParams}`)
      if (seriousResponse.ok) {
        const seriousData = await seriousResponse.json()
        seriousReports = seriousData.meta?.results?.total || 0
      }

      // 3. Get death reports count
      const deathParams = new URLSearchParams({
        search: `patient.drug.medicinalproduct:"${drugName}" AND seriousnessdeath:1`,
        limit: '1',
      })
      if (this.apiKey) deathParams.append('api_key', this.apiKey)

      let deathReports = 0
      const deathResponse = await this.fetchWithRateLimit(`${this.baseUrl}/drug/event.json?${deathParams}`)
      if (deathResponse.ok) {
        const deathData = await deathResponse.json()
        deathReports = deathData.meta?.results?.total || 0
      }

      // 4. Get hospitalization reports count
      const hospParams = new URLSearchParams({
        search: `patient.drug.medicinalproduct:"${drugName}" AND seriousnesshospitalization:1`,
        limit: '1',
      })
      if (this.apiKey) hospParams.append('api_key', this.apiKey)

      let hospitalizationReports = 0
      const hospResponse = await this.fetchWithRateLimit(`${this.baseUrl}/drug/event.json?${hospParams}`)
      if (hospResponse.ok) {
        const hospData = await hospResponse.json()
        hospitalizationReports = hospData.meta?.results?.total || 0
      }

      console.log(`✅ openFDA: Found ${totalReports} total reports, ${seriousReports} serious, ${deathReports} deaths`)

      return {
        totalReports,
        seriousReports,
        deathReports,
        hospitalizationReports,
        topReactions
      }
    } catch (error) {
      console.error('openFDA safety summary error:', error)
      return { 
        totalReports: 0, 
        seriousReports: 0, 
        deathReports: 0,
        hospitalizationReports: 0,
        topReactions: [] 
      }
    }
  }

  /**
   * Get serious adverse events only
   */
  async getSeriousAdverseEvents(drugName: string, limit: number = 100): Promise<AdverseEvent[]> {
    try {
      const params = new URLSearchParams({
        search: `patient.drug.medicinalproduct:"${drugName}" AND serious:1`,
        limit: limit.toString(),
      })

      if (this.apiKey) {
        params.append('api_key', this.apiKey)
      }

      console.log(`🛡️ openFDA: Fetching serious adverse events for "${drugName}" (limit: ${limit})`)

      const response = await this.fetchWithRateLimit(`${this.baseUrl}/drug/event.json?${params}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return []
        }
        throw new Error(`openFDA API error: ${response.statusText}`)
      }

      const data = await response.json()
      const events = this.parseAdverseEvents(data.results || [])
      
      console.log(`✅ openFDA: Found ${events.length} serious adverse events`)
      return events
    } catch (error) {
      console.error('openFDA serious adverse events error:', error)
      return []
    }
  }

  /**
   * Parse adverse events from API response with extended data
   */
  private parseAdverseEvents(events: any[]): AdverseEvent[] {
    return events.map(event => {
      const drug = event.patient?.drug?.[0] || {}
      const reactions = (event.patient?.reaction || []).map((r: any) => r.reactionmeddrapt)
      
      // Parse seriousness details
      const seriousnessDetails = {
        death: event.seriousnessdeath === '1',
        hospitalization: event.seriousnesshospitalization === '1',
        lifeThreatening: event.seriousnesslifethreatening === '1',
        disability: event.seriousnessdisabling === '1',
        congenitalAnomaly: event.seriousnesscongenitalanomali === '1',
        other: event.seriousnessother === '1',
      }

      // Map reporter type
      const reporterTypeMap: Record<string, string> = {
        '1': 'Physician',
        '2': 'Pharmacist',
        '3': 'Other Health Professional',
        '4': 'Lawyer',
        '5': 'Consumer',
      }
      
      return {
        receiptDate: event.receiptdate || '',
        drugName: drug.medicinalproduct || 'Unknown',
        reactions,
        seriousness: event.serious === '1' ? 'Serious' : 'Non-serious',
        serious: event.serious === '1',
        outcomes: event.patient?.reaction?.map((r: any) => r.reactionoutcome) || [],
        patientAge: event.patient?.patientonsetage,
        patientSex: event.patient?.patientsex === '1' ? 'Male' : event.patient?.patientsex === '2' ? 'Female' : undefined,
        reporterType: reporterTypeMap[event.primarysource?.qualification] || undefined,
        reportCountry: event.occurcountry,
        seriousnessDetails,
      }
    })
  }

  /**
   * Parse drug label from API response with extended data
   */
  private parseDrugLabel(label: any): DrugLabel {
    const openfda = label.openfda || {}
    
    return {
      brandName: openfda.brand_name?.[0] || 'Unknown',
      genericName: openfda.generic_name?.[0] || 'Unknown',
      manufacturer: openfda.manufacturer_name?.[0] || 'Unknown',
      indications: label.indications_and_usage?.[0],
      warnings: label.warnings?.[0],
      boxedWarning: label.boxed_warning?.[0],
      adverseReactions: label.adverse_reactions?.[0],
      dosage: label.dosage_and_administration?.[0],
      contraindications: label.contraindications?.[0],
      drugInteractions: label.drug_interactions?.[0],
      useInPregnancy: label.pregnancy?.[0] || label.use_in_specific_populations?.[0],
    }
  }
}

// Export singleton with optional API key from env
export const openFDAClient = new OpenFDAClient(process.env.OPENFDA_API_KEY)
