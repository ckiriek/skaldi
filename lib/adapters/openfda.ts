/**
 * openFDA Adapter
 * 
 * Fetches drug labels and adverse event data from FDA openFDA API
 * 
 * API: https://open.fda.gov/apis/
 * Endpoints:
 * - /drug/label.json - Drug labeling
 * - /drug/event.json - Adverse events (FAERS)
 * - /drug/nda.json - NDA approval data
 */

import type { Label, AdverseEvent } from '@/lib/types/regulatory-data'

const OPENFDA_BASE_URL = 'https://api.fda.gov'

interface OpenFDALabelResponse {
  meta: {
    disclaimer: string
    terms: string
    license: string
    last_updated: string
    results: {
      skip: number
      limit: number
      total: number
    }
  }
  results: Array<{
    effective_time?: string
    openfda?: {
      application_number?: string[]
      brand_name?: string[]
      generic_name?: string[]
      manufacturer_name?: string[]
      product_type?: string[]
      route?: string[]
      substance_name?: string[]
    }
    // Label sections
    indications_and_usage?: string[]
    dosage_and_administration?: string[]
    contraindications?: string[]
    warnings_and_precautions?: string[]
    adverse_reactions?: string[]
    drug_interactions?: string[]
    use_in_specific_populations?: string[]
    clinical_pharmacology?: string[]
    nonclinical_toxicology?: string[]
    clinical_studies?: string[]
    how_supplied?: string[]
    patient_counseling_information?: string[]
    description?: string[]
    warnings?: string[]
    precautions?: string[]
    boxed_warning?: string[]
  }>
}

export class OpenFDAAdapter {
  private baseUrl = OPENFDA_BASE_URL
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
   * Build API URL with optional API key
   */
  private buildUrl(endpoint: string, params: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    
    // Add API key if available
    if (this.apiKey) {
      url.searchParams.set('api_key', this.apiKey)
    }
    
    // Add other params
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
    
    return url.toString()
  }

  /**
   * Fetch drug label by application number (NDA/ANDA/BLA)
   * 
   * @param applicationNumber - e.g., "NDA020357"
   * @returns Label object or null
   */
  async fetchLabelByApplicationNumber(applicationNumber: string): Promise<Label | null> {
    try {
      await this.rateLimit()

      const url = this.buildUrl('/drug/label.json', {
        search: `openfda.application_number:"${applicationNumber}"`,
        limit: '1',
      })

      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`openFDA: No label found for ${applicationNumber}`)
          return null
        }
        throw new Error(`openFDA API error: ${response.status}`)
      }

      const data: OpenFDALabelResponse = await response.json()

      if (!data.results || data.results.length === 0) {
        console.warn(`openFDA: No results for ${applicationNumber}`)
        return null
      }

      const result = data.results[0]
      const openfda = result.openfda || {}

      // Extract sections
      const clinicalPharmText = result.clinical_pharmacology?.join('\n\n')
      const sections: any = {
        indications_and_usage: result.indications_and_usage?.join('\n\n'),
        dosage_and_administration: result.dosage_and_administration?.join('\n\n'),
        contraindications: result.contraindications?.join('\n\n'),
        warnings_and_precautions: result.warnings_and_precautions?.join('\n\n') || result.warnings?.join('\n\n'),
        adverse_reactions_label: result.adverse_reactions?.join('\n\n'),
        drug_interactions: result.drug_interactions?.join('\n\n'),
        use_in_specific_populations: result.use_in_specific_populations?.join('\n\n'),
        clinical_pharmacology: clinicalPharmText ? {
          mechanism_of_action: undefined,
          pharmacokinetics: undefined,
          pharmacodynamics: undefined,
          _raw_text: clinicalPharmText, // Store raw text for parsing
        } : undefined,
        nonclinical_toxicology: result.nonclinical_toxicology?.join('\n\n'),
        clinical_studies: result.clinical_studies?.join('\n\n'),
        how_supplied: result.how_supplied?.join('\n\n'),
        patient_counseling: result.patient_counseling_information?.join('\n\n'),
        description: result.description?.join('\n\n'),
        boxed_warning: result.boxed_warning?.join('\n\n'),
      }

      // Build full text for search
      const fullText = Object.values(sections)
        .filter(Boolean)
        .join('\n\n')

      const label: Label = {
        id: '', // Will be set by database
        product_id: '', // Will be linked later
        label_type: 'FDA_SPL',
        effective_date: result.effective_time ? this.parseEffectiveDate(result.effective_time) : undefined,
        version: undefined,
        sections,
        full_text: fullText,
        source: 'openFDA',
        source_url: `https://open.fda.gov/apis/drug/label/`,
        retrieved_at: new Date().toISOString(),
        confidence: 'high',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log(`✅ openFDA: Fetched label for ${applicationNumber}`)
      return label

    } catch (error) {
      console.error(`openFDA fetchLabelByApplicationNumber error for ${applicationNumber}:`, error)
      return null
    }
  }

  /**
   * Fetch drug label by brand name
   * 
   * @param brandName - e.g., "GLUCOPHAGE"
   * @returns Label object or null
   */
  async fetchLabelByBrandName(brandName: string): Promise<Label | null> {
    try {
      await this.rateLimit()

      const url = this.buildUrl('/drug/label.json', {
        search: `openfda.brand_name:"${brandName}"`,
        limit: '1',
      })

      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`openFDA: No label found for ${brandName}`)
          return null
        }
        throw new Error(`openFDA API error: ${response.status}`)
      }

      const data: OpenFDALabelResponse = await response.json()

      if (!data.results || data.results.length === 0) {
        return null
      }

      // Use same parsing logic as fetchLabelByApplicationNumber
      const result = data.results[0]
      const applicationNumber = result.openfda?.application_number?.[0]

      if (applicationNumber) {
        // Fetch by application number for consistency
        return this.fetchLabelByApplicationNumber(applicationNumber)
      }

      console.log(`✅ openFDA: Fetched label for ${brandName}`)
      return null

    } catch (error) {
      console.error(`openFDA fetchLabelByBrandName error for ${brandName}:`, error)
      return null
    }
  }

  /**
   * Search for adverse events by generic name
   * 
   * @param genericName - e.g., "metformin"
   * @param limit - Max results (default: 100)
   * @returns Array of adverse events
   */
  async searchAdverseEvents(genericName: string, limit: number = 100): Promise<AdverseEvent[]> {
    try {
      await this.rateLimit()

      const url = this.buildUrl('/drug/event.json', {
        search: `patient.drug.medicinalproduct:"${genericName}"`,
        count: 'patient.reaction.reactionmeddrapt.exact',
        limit: limit.toString(),
      })

      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`openFDA: No adverse events found for ${genericName}`)
          return []
        }
        throw new Error(`openFDA API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.results || data.results.length === 0) {
        return []
      }

      // Parse adverse events
      const events: AdverseEvent[] = data.results.map((result: any) => ({
        id: '', // Will be set by database
        inchikey: '', // Will be linked later
        study_id: 'FAERS',
        population_description: 'Post-marketing surveillance',
        arm: undefined,
        n: undefined,
        soc: undefined,
        soc_code: undefined,
        pt: result.term,
        pt_code: undefined,
        incidence_n: result.count,
        incidence_pct: undefined,
        severity: undefined,
        serious: undefined,
        related: undefined,
        control_arm: undefined,
        control_n: undefined,
        control_incidence_pct: undefined,
        risk_ratio: undefined,
        ci_95_lower: undefined,
        ci_95_upper: undefined,
        p_value: undefined,
        source: 'openFDA FAERS',
        source_url: 'https://open.fda.gov/apis/drug/event/',
        retrieved_at: new Date().toISOString(),
        confidence: 'medium', // FAERS data is less controlled than clinical trials
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      console.log(`✅ openFDA: Fetched ${events.length} adverse events for ${genericName}`)
      return events

    } catch (error) {
      console.error(`openFDA searchAdverseEvents error for ${genericName}:`, error)
      return []
    }
  }

  /**
   * Parse effective date from openFDA format (YYYYMMDD)
   */
  private parseEffectiveDate(effectiveTime: string): string {
    // Format: YYYYMMDD → YYYY-MM-DD
    if (effectiveTime.length === 8) {
      const year = effectiveTime.substring(0, 4)
      const month = effectiveTime.substring(4, 6)
      const day = effectiveTime.substring(6, 8)
      return `${year}-${month}-${day}`
    }
    return effectiveTime
  }

  /**
   * Get application numbers for a brand name
   * 
   * @param brandName - e.g., "GLUCOPHAGE"
   * @returns Array of application numbers
   */
  async getApplicationNumbers(brandName: string): Promise<string[]> {
    try {
      await this.rateLimit()

      const url = this.buildUrl('/drug/label.json', {
        search: `openfda.brand_name:"${brandName}"`,
        limit: '10',
      })

      const response = await fetch(url)

      if (!response.ok) {
        return []
      }

      const data: OpenFDALabelResponse = await response.json()

      if (!data.results || data.results.length === 0) {
        return []
      }

      const applicationNumbers = new Set<string>()
      data.results.forEach(result => {
        result.openfda?.application_number?.forEach(num => {
          applicationNumbers.add(num)
        })
      })

      return Array.from(applicationNumbers)

    } catch (error) {
      console.error(`openFDA getApplicationNumbers error for ${brandName}:`, error)
      return []
    }
  }
}

// Export singleton instance
export const openfdaAdapter = new OpenFDAAdapter(process.env.OPENFDA_API_KEY)
