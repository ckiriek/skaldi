/**
 * ClinicalTrials.gov API Client
 * API Documentation: https://clinicaltrials.gov/data-api/api
 */

export interface ClinicalTrial {
  nctId: string
  title: string
  status: string
  phase: string[]
  conditions: string[]
  interventions: string[]
  sponsor: string
  startDate: string
  completionDate?: string
  enrollment?: number
  studyType: string
  hasResults: boolean
  resultsUrl?: string
}

export class ClinicalTrialsClient {
  private baseUrl = 'https://clinicaltrials.gov/api/v2'
  private lastRequestTime = 0
  private minRequestInterval = 1200 // 1.2 sec = 50 req/min

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
    
    // Handle rate limit errors (HTTP 429)
    if (response.status === 429) {
      console.warn('ClinicalTrials.gov rate limit exceeded, waiting 60 seconds...')
      await new Promise(resolve => setTimeout(resolve, 60000))
      return this.fetchWithRateLimit(url) // Retry
    }
    
    return response
  }

  /**
   * Search clinical trials by condition/disease
   */
  async searchByCondition(condition: string, limit: number = 10): Promise<ClinicalTrial[]> {
    try {
      const params = new URLSearchParams({
        'query.cond': condition,
        'pageSize': limit.toString(),
        'format': 'json',
      })

      const response = await fetch(`${this.baseUrl}/studies?${params}`)
      
      if (!response.ok) {
        throw new Error(`ClinicalTrials.gov API error: ${response.statusText}`)
      }

      const data = await response.json()
      return this.parseStudies(data.studies || [])
    } catch (error) {
      console.error('ClinicalTrials.gov search error:', error)
      return []
    }
  }

  /**
   * Search clinical trials by intervention/drug
   */
  async searchByIntervention(intervention: string, limit: number = 10): Promise<ClinicalTrial[]> {
    try {
      const params = new URLSearchParams({
        'query.intr': intervention,
        'pageSize': limit.toString(),
        'format': 'json',
      })

      const response = await this.fetchWithRateLimit(`${this.baseUrl}/studies?${params}`)
      
      if (!response.ok) {
        throw new Error(`ClinicalTrials.gov API error: ${response.statusText}`)
      }

      const data = await response.json()
      return this.parseStudies(data.studies || [])
    } catch (error) {
      console.error('ClinicalTrials.gov search error:', error)
      return []
    }
  }

  /**
   * Get specific trial by NCT ID
   */
  async getStudy(nctId: string): Promise<ClinicalTrial | null> {
    try {
      const response = await this.fetchWithRateLimit(`${this.baseUrl}/studies/${nctId}`)
      
      if (!response.ok) {
        throw new Error(`ClinicalTrials.gov API error: ${response.statusText}`)
      }

      const data = await response.json()
      const studies = this.parseStudies([data])
      return studies[0] || null
    } catch (error) {
      console.error('ClinicalTrials.gov get study error:', error)
      return null
    }
  }

  /**
   * Parse API response to ClinicalTrial format
   */
  private parseStudies(studies: any[]): ClinicalTrial[] {
    return studies.map(study => {
      const protocolSection = study.protocolSection || {}
      const identificationModule = protocolSection.identificationModule || {}
      const statusModule = protocolSection.statusModule || {}
      const designModule = protocolSection.designModule || {}
      const conditionsModule = protocolSection.conditionsModule || {}
      const armsInterventionsModule = protocolSection.armsInterventionsModule || {}
      const sponsorCollaboratorsModule = protocolSection.sponsorCollaboratorsModule || {}
      
      return {
        nctId: identificationModule.nctId || '',
        title: identificationModule.officialTitle || identificationModule.briefTitle || '',
        status: statusModule.overallStatus || 'Unknown',
        phase: designModule.phases || [],
        conditions: conditionsModule.conditions || [],
        interventions: (armsInterventionsModule.interventions || []).map((i: any) => i.name),
        sponsor: sponsorCollaboratorsModule.leadSponsor?.name || 'Unknown',
        startDate: statusModule.startDateStruct?.date || '',
        completionDate: statusModule.completionDateStruct?.date,
        enrollment: statusModule.enrollmentInfo?.count,
        studyType: designModule.studyType || 'Unknown',
        hasResults: study.hasResults || false,
        resultsUrl: study.hasResults ? `https://clinicaltrials.gov/study/${identificationModule.nctId}` : undefined,
      }
    })
  }
}

export const clinicalTrialsClient = new ClinicalTrialsClient()
