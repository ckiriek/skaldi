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
  // Extended sections for enrichment
  clinicalPharmacology?: string
  mechanismOfAction?: string
  pharmacodynamics?: string
  pharmacokinetics?: string
  nonclinicalToxicology?: string
  clinicalStudies?: string
  howSupplied?: string
  description?: string
  // Structured PK data extracted from label
  pkData?: {
    tmax?: string
    tHalf?: string
    bioavailability?: string
    proteinBinding?: string
    volumeOfDistribution?: string
    clearance?: string
    metabolism?: string
    elimination?: string
    foodEffect?: string
    renalImpairment?: string
    hepaticImpairment?: string
  }
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
    
    // Get clinical pharmacology text
    const clinicalPharmacology = label.clinical_pharmacology?.[0] || ''
    const pharmacokinetics = label.pharmacokinetics?.[0] || ''
    
    // Extract structured PK data from text
    const pkData = this.extractPKData(clinicalPharmacology + '\n' + pharmacokinetics)
    
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
      // Extended sections
      clinicalPharmacology,
      mechanismOfAction: label.mechanism_of_action?.[0],
      pharmacodynamics: label.pharmacodynamics?.[0],
      pharmacokinetics,
      nonclinicalToxicology: label.nonclinical_toxicology?.[0] || label.carcinogenesis_and_mutagenesis_and_impairment_of_fertility?.[0],
      clinicalStudies: label.clinical_studies?.[0],
      howSupplied: label.how_supplied?.[0],
      description: label.description?.[0],
      pkData,
    }
  }

  /**
   * Extract structured PK parameters from clinical pharmacology text
   */
  private extractPKData(text: string): DrugLabel['pkData'] {
    if (!text) return undefined
    
    const lowerText = text.toLowerCase()
    const pkData: DrugLabel['pkData'] = {}
    
    // Tmax extraction - multiple patterns for different label formats
    const tmaxPatterns = [
      // "T max ) occurring 1 to 4 hours" (FDA label format with parentheses)
      /T\s*max\s*\)?[^0-9]*?(\d+(?:\.\d+)?(?:\s*(?:to|-|–)\s*\d+(?:\.\d+)?)?)\s*(hours?|h|minutes?|min)/i,
      // "Tmax of 1-4 hours"
      /(?:tmax|time to (?:peak|maximum)(?: concentration)?)[^\d]*(\d+(?:\.\d+)?(?:\s*[-–to]\s*\d+(?:\.\d+)?)?)\s*(hours?|h|minutes?|min)/i,
      // "peak plasma concentrations ... 1 to 4 hours postdose"
      /(?:peak|maximum)\s+(?:plasma\s+)?concentrations?[^0-9]*?(\d+(?:\.\d+)?(?:\s*(?:to|-|–)\s*\d+(?:\.\d+)?)?)\s*(hours?|h)[^.]*(?:postdose|post-dose|after)/i,
      // "occurring 1 to 4 hours postdose"
      /occurring\s+(\d+(?:\.\d+)?(?:\s*(?:to|-|–)\s*\d+(?:\.\d+)?)?)\s*(hours?|h)[^.]*(?:postdose|post-dose|after)/i,
      // Fallback: any "X hours postdose" near peak/maximum
      /(\d+(?:\.\d+)?(?:\s*[-–to]\s*\d+(?:\.\d+)?)?)\s*(hours?|h)\s*(?:after|following|post)[^.]*(?:peak|maximum|tmax)/i,
    ]
    for (const pattern of tmaxPatterns) {
      const match = text.match(pattern)
      if (match) {
        pkData.tmax = `${match[1]} ${match[2]}`.replace(/\s+/g, ' ').trim()
        break
      }
    }
    
    // Half-life extraction
    const halfLifePatterns = [
      /(?:terminal |elimination )?half[- ]?life[^\d]*(\d+(?:\.\d+)?(?:\s*[-–to]\s*\d+(?:\.\d+)?)?)\s*(hours?|h|days?|d)/i,
      /(?:t½|t1\/2)[^\d]*(\d+(?:\.\d+)?(?:\s*[-–to]\s*\d+(?:\.\d+)?)?)\s*(hours?|h|days?|d)/i,
    ]
    for (const pattern of halfLifePatterns) {
      const match = text.match(pattern)
      if (match) {
        pkData.tHalf = `${match[1]} ${match[2]}`.replace(/\s+/g, ' ').trim()
        break
      }
    }
    
    // Bioavailability extraction
    const bioavailPatterns = [
      /(?:absolute )?bioavailability[^\d]*(?:is |of |approximately |about )?(\d+(?:\.\d+)?(?:\s*[-–to]\s*\d+(?:\.\d+)?)?)\s*%/i,
      /(\d+(?:\.\d+)?)\s*%\s*(?:absolute )?bioavailability/i,
    ]
    for (const pattern of bioavailPatterns) {
      const match = text.match(pattern)
      if (match) {
        pkData.bioavailability = `${match[1]}%`
        break
      }
    }
    
    // Protein binding extraction
    const proteinBindPatterns = [
      /(?:protein bind(?:ing)?|bound to (?:plasma )?proteins?)[^\d]*(\d+(?:\.\d+)?(?:\s*[-–to]\s*\d+(?:\.\d+)?)?)\s*%/i,
      /(\d+(?:\.\d+)?)\s*%\s*(?:bound|protein binding)/i,
    ]
    for (const pattern of proteinBindPatterns) {
      const match = text.match(pattern)
      if (match) {
        pkData.proteinBinding = `${match[1]}%`
        break
      }
    }
    
    // Volume of distribution extraction
    const vdPatterns = [
      /(?:volume of distribution|vd|vss)[^\d]*(\d+(?:\.\d+)?(?:\s*[-–to]\s*\d+(?:\.\d+)?)?)\s*(l(?:\/kg)?|liters?)/i,
      /(\d+(?:\.\d+)?)\s*(l(?:\/kg)?|liters?)\s*(?:volume of distribution|vd)/i,
    ]
    for (const pattern of vdPatterns) {
      const match = text.match(pattern)
      if (match) {
        pkData.volumeOfDistribution = `${match[1]} ${match[2]}`.replace(/\s+/g, ' ').trim()
        break
      }
    }
    
    // Clearance extraction
    const clearancePatterns = [
      /(?:renal |total |oral )?clearance[^\d]*(\d+(?:\.\d+)?(?:\s*[-–to]\s*\d+(?:\.\d+)?)?)\s*(ml\/min|l\/h|ml\/min\/kg)/i,
    ]
    for (const pattern of clearancePatterns) {
      const match = text.match(pattern)
      if (match) {
        pkData.clearance = `${match[1]} ${match[2]}`.replace(/\s+/g, ' ').trim()
        break
      }
    }
    
    // Metabolism - look for CYP enzymes
    const cypMatch = text.match(/cyp\s*(\d[a-z]\d+)/gi)
    if (cypMatch) {
      const enzymes = [...new Set(cypMatch.map(m => m.toUpperCase().replace(/\s/g, '')))]
      pkData.metabolism = `Metabolized by ${enzymes.join(', ')}`
    }
    
    // Elimination route
    if (lowerText.includes('renal') && lowerText.includes('excret')) {
      const renalMatch = text.match(/(\d+(?:\.\d+)?)\s*%[^.]*(?:renal|urine|urinary)/i)
      pkData.elimination = renalMatch 
        ? `${renalMatch[1]}% excreted renally`
        : 'Primarily renal excretion'
    } else if (lowerText.includes('feces') || lowerText.includes('fecal') || lowerText.includes('biliary')) {
      pkData.elimination = 'Primarily fecal/biliary excretion'
    }
    
    // Food effect
    if (lowerText.includes('food')) {
      if (lowerText.includes('no clinically significant') || (lowerText.includes('no') && lowerText.includes('effect'))) {
        pkData.foodEffect = 'No clinically significant food effect'
      } else if (lowerText.includes('increase') || lowerText.includes('enhance')) {
        pkData.foodEffect = 'Food increases absorption'
      } else if (lowerText.includes('decrease') || lowerText.includes('reduce')) {
        pkData.foodEffect = 'Food decreases absorption'
      }
    }
    
    // Renal impairment
    if (lowerText.includes('renal impairment')) {
      if (lowerText.includes('no dose adjustment') || lowerText.includes('no dosage adjustment')) {
        pkData.renalImpairment = 'No dose adjustment required'
      } else if (lowerText.includes('dose adjustment') || lowerText.includes('dosage adjustment')) {
        pkData.renalImpairment = 'Dose adjustment required in renal impairment'
      }
    }
    
    // Hepatic impairment
    if (lowerText.includes('hepatic impairment')) {
      if (lowerText.includes('no dose adjustment') || lowerText.includes('no dosage adjustment')) {
        pkData.hepaticImpairment = 'No dose adjustment required'
      } else if (lowerText.includes('dose adjustment') || lowerText.includes('dosage adjustment')) {
        pkData.hepaticImpairment = 'Dose adjustment required in hepatic impairment'
      }
    }
    
    return Object.keys(pkData).length > 0 ? pkData : undefined
  }

  /**
   * Get full drug label with all sections for enrichment
   * This is the primary method for enrichers to use
   */
  async getFullDrugLabel(drugName: string): Promise<DrugLabel | null> {
    console.log(`📋 openFDA: Fetching full label for "${drugName}"`)
    
    try {
      // Fetch multiple results to find monotherapy product (not combination)
      const params = new URLSearchParams({
        search: `openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`,
        limit: '10',
      })

      if (this.apiKey) {
        params.append('api_key', this.apiKey)
      }

      const response = await this.fetchWithRateLimit(`${this.baseUrl}/drug/label.json?${params}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`⚠️ openFDA: No label found for "${drugName}"`)
          return null
        }
        throw new Error(`openFDA API error: ${response.statusText}`)
      }

      const data = await response.json()
      const results = data.results || []
      
      if (results.length === 0) {
        console.log(`⚠️ openFDA: No label found for "${drugName}"`)
        return null
      }

      // Prefer monotherapy product over combination products
      // Combination products often have multiple generic names or contain "and", "/"
      const lowerDrugName = drugName.toLowerCase()
      let selectedResult = results[0]
      
      for (const result of results) {
        const genericNames = result.openfda?.generic_name || []
        const brandName = (result.openfda?.brand_name?.[0] || '').toLowerCase()
        
        // Check if this is a monotherapy (single active ingredient matching our drug)
        if (genericNames.length === 1) {
          const genericName = genericNames[0].toLowerCase()
          // Prefer exact match or single-ingredient product
          if (genericName === lowerDrugName || 
              genericName.includes(lowerDrugName) && !genericName.includes(' and ')) {
            selectedResult = result
            console.log(`   Preferring monotherapy: ${brandName || genericName}`)
            break
          }
        }
        
        // Also check if brand name matches exactly (e.g., "Januvia" for sitagliptin)
        if (brandName === lowerDrugName) {
          selectedResult = result
          console.log(`   Preferring exact brand match: ${brandName}`)
          break
        }
      }

      const label = this.parseDrugLabel(selectedResult)
      console.log(`✅ openFDA: Found label for "${drugName}" (${label.brandName})`)
      
      // Log what PK data was extracted
      if (label.pkData) {
        const pkFields = Object.keys(label.pkData).filter(k => (label.pkData as any)[k])
        console.log(`   PK data extracted: ${pkFields.join(', ')}`)
      }
      
      return label
    } catch (error) {
      console.error(`openFDA getFullDrugLabel error for "${drugName}":`, error)
      return null
    }
  }
}

// Export singleton with optional API key from env
export const openFDAClient = new OpenFDAClient(process.env.OPENFDA_API_KEY)
