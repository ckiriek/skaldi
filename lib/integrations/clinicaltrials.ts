/**
 * ClinicalTrials.gov API Client v2.0
 * API Documentation: https://clinicaltrials.gov/data-api/api
 * 
 * Enhanced with:
 * - Date filters (last 10 years)
 * - Phase filters (Phase 2-4)
 * - Status filters (Completed, Active, Recruiting)
 * - Extended data (outcomes, eligibility, arms)
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
  // Extended fields
  primaryOutcomes?: { measure: string; timeFrame: string; description?: string }[]
  secondaryOutcomes?: { measure: string; timeFrame: string; description?: string }[]
  eligibilityCriteria?: string
  eligibilityMinAge?: string
  eligibilityMaxAge?: string
  eligibilitySex?: string
  armGroups?: { label: string; type: string; description?: string; interventions?: string[] }[]
  designAllocation?: string
  designMasking?: string
  designPrimaryPurpose?: string
}

export interface SearchFilters {
  minYear?: number        // Filter by start date year (default: 2015)
  phases?: string[]       // Filter by phases (default: ['PHASE2', 'PHASE3', 'PHASE4'])
  statuses?: string[]     // Filter by status (default: ['COMPLETED', 'ACTIVE_NOT_RECRUITING', 'RECRUITING'])
  hasResults?: boolean    // Prioritize studies with results
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
   * Search clinical trials by condition/disease with filters
   */
  async searchByCondition(
    condition: string, 
    limit: number = 100,
    filters: SearchFilters = {}
  ): Promise<ClinicalTrial[]> {
    try {
      const params = this.buildSearchParams(condition, 'cond', limit, filters)
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
   * Search clinical trials by intervention/drug with filters
   */
  async searchByIntervention(
    intervention: string, 
    limit: number = 100,
    filters: SearchFilters = {}
  ): Promise<ClinicalTrial[]> {
    try {
      const params = this.buildSearchParams(intervention, 'intr', limit, filters)
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
   * Enhanced search with both condition and intervention
   */
  async searchEnhanced(
    drugName: string,
    indication?: string,
    limit: number = 100,
    filters: SearchFilters = {}
  ): Promise<ClinicalTrial[]> {
    try {
      // Default filters for clinical relevance
      const defaultFilters: SearchFilters = {
        minYear: 2015,
        phases: ['PHASE2', 'PHASE3', 'PHASE4'],
        statuses: ['COMPLETED', 'ACTIVE_NOT_RECRUITING', 'RECRUITING', 'ENROLLING_BY_INVITATION'],
        ...filters
      }

      // Simplify drug name for better matching
      // "Amoxicillin and clavulanic acid" -> "amoxicillin clavulanic" (first words)
      const simplifiedDrug = drugName
        .toLowerCase()
        .replace(/\s+and\s+/gi, ' ')  // Remove "and"
        .replace(/\s+acid$/gi, '')     // Remove trailing "acid"
        .replace(/\s+hydrochloride$/gi, '') // Remove "hydrochloride"
        .replace(/\s+/g, ' ')
        .trim()

      // Build query - use simple term search for better matching
      let queryParts: string[] = []
      queryParts.push(simplifiedDrug)
      if (indication) {
        // Simplify indication too
        const simplifiedIndication = indication
          .replace(/,\s*/g, ' ')
          .split(' ')[0] // Take first word
        queryParts.push(simplifiedIndication)
      }

      const params = new URLSearchParams({
        'query.term': queryParts.join(' AND '),
        'pageSize': limit.toString(),
        'format': 'json',
        'sort': 'StartDate:desc', // Most recent first
      })

      // Add phase filter
      if (defaultFilters.phases && defaultFilters.phases.length > 0) {
        params.append('filter.advanced', `AREA[Phase](${defaultFilters.phases.join(' OR ')})`)
      }

      // Add status filter
      if (defaultFilters.statuses && defaultFilters.statuses.length > 0) {
        const statusFilter = defaultFilters.statuses.join(' OR ')
        const existingFilter = params.get('filter.advanced') || ''
        params.set('filter.advanced', existingFilter ? `${existingFilter} AND AREA[OverallStatus](${statusFilter})` : `AREA[OverallStatus](${statusFilter})`)
      }

      const searchQuery = queryParts.join(' AND ')
      console.log(`🔬 ClinicalTrials.gov: Searching for "${searchQuery}" (limit: ${limit})`)

      const response = await this.fetchWithRateLimit(`${this.baseUrl}/studies?${params}`)
      
      if (!response.ok) {
        throw new Error(`ClinicalTrials.gov API error: ${response.statusText}`)
      }

      const data = await response.json()
      let studies = this.parseStudies(data.studies || [])

      // Filter by year (post-processing since API filter is limited)
      if (defaultFilters.minYear) {
        studies = studies.filter(s => {
          const year = parseInt(s.startDate?.substring(0, 4) || '0')
          return year >= defaultFilters.minYear!
        })
      }

      // Sort: prioritize studies with results
      studies.sort((a, b) => {
        if (a.hasResults && !b.hasResults) return -1
        if (!a.hasResults && b.hasResults) return 1
        return 0
      })

      console.log(`✅ ClinicalTrials.gov: Found ${studies.length} studies (${studies.filter(s => s.hasResults).length} with results)`)

      return studies
    } catch (error) {
      console.error('ClinicalTrials.gov enhanced search error:', error)
      return []
    }
  }

  /**
   * Build search params with filters
   */
  private buildSearchParams(
    query: string, 
    queryType: 'cond' | 'intr', 
    limit: number,
    filters: SearchFilters
  ): URLSearchParams {
    const params = new URLSearchParams({
      [`query.${queryType}`]: query,
      'pageSize': limit.toString(),
      'format': 'json',
      'sort': 'StartDate:desc',
    })

    // Add phase filter
    if (filters.phases && filters.phases.length > 0) {
      params.append('filter.advanced', `AREA[Phase](${filters.phases.join(' OR ')})`)
    }

    return params
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
   * Parse API response to ClinicalTrial format with extended data
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
      const eligibilityModule = protocolSection.eligibilityModule || {}
      const outcomesModule = protocolSection.outcomesModule || {}
      
      // Parse primary outcomes
      const primaryOutcomes = (outcomesModule.primaryOutcomes || []).map((o: any) => ({
        measure: o.measure || '',
        timeFrame: o.timeFrame || '',
        description: o.description
      }))

      // Parse secondary outcomes
      const secondaryOutcomes = (outcomesModule.secondaryOutcomes || []).map((o: any) => ({
        measure: o.measure || '',
        timeFrame: o.timeFrame || '',
        description: o.description
      }))

      // Parse arm groups with their interventions
      const armGroups = (armsInterventionsModule.armGroups || []).map((arm: any) => ({
        label: arm.label || '',
        type: arm.type || '',
        description: arm.description,
        interventions: arm.interventionNames || []
      }))

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
        // Extended fields
        primaryOutcomes: primaryOutcomes.length > 0 ? primaryOutcomes : undefined,
        secondaryOutcomes: secondaryOutcomes.length > 0 ? secondaryOutcomes : undefined,
        eligibilityCriteria: eligibilityModule.eligibilityCriteria,
        eligibilityMinAge: eligibilityModule.minimumAge,
        eligibilityMaxAge: eligibilityModule.maximumAge,
        eligibilitySex: eligibilityModule.sex,
        armGroups: armGroups.length > 0 ? armGroups : undefined,
        designAllocation: designModule.designInfo?.allocation,
        designMasking: designModule.designInfo?.maskingInfo?.masking,
        designPrimaryPurpose: designModule.designInfo?.primaryPurpose,
      }
    })
  }
}

export const clinicalTrialsClient = new ClinicalTrialsClient()
