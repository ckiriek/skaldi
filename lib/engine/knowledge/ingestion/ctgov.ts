/**
 * Phase H.2: ClinicalTrials.gov Integration
 * 
 * Fetches clinical trial data from ClinicalTrials.gov API v2
 */

import type { CtGovRecord, CtGovEndpoint, CtGovStudyDesign, CtGovEligibility } from '../types'

const CTGOV_API_BASE = 'https://clinicaltrials.gov/api/v2/studies'
const MAX_RETRIES = 3
const TIMEOUT_MS = 15000

/**
 * Fetch ClinicalTrials.gov studies by INN or indication
 */
export async function fetchCtGovStudies(query: string, maxResults: number = 10): Promise<CtGovRecord[]> {
  const url = `${CTGOV_API_BASE}?query.term=${encodeURIComponent(query)}&pageSize=${maxResults}`
  
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        if (response.status === 404) {
          return []
        }
        throw new Error(`ClinicalTrials.gov API returned ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.studies || !Array.isArray(data.studies)) {
        return []
      }
      
      // Fetch detailed data for each study
      const records: CtGovRecord[] = []
      for (const study of data.studies.slice(0, maxResults)) {
        try {
          const nctId = study.protocolSection?.identificationModule?.nctId
          if (nctId) {
            const detailedRecord = await fetchStudyDetails(nctId)
            if (detailedRecord) {
              records.push(detailedRecord)
            }
          }
        } catch (error) {
          console.error(`Failed to fetch study details:`, error)
          // Continue with other studies
        }
      }
      
      return records
      
    } catch (error) {
      lastError = error as Error
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        continue
      }
    }
  }
  
  throw new Error(`Failed to fetch CT.gov studies: ${lastError?.message}`)
}

/**
 * Fetch detailed study information
 */
async function fetchStudyDetails(nctId: string): Promise<CtGovRecord | null> {
  const url = `${CTGOV_API_BASE}/${nctId}`
  
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`CT.gov study details returned ${response.status}`)
      }
      
      const data = await response.json()
      
      return parseCtGovStudy(data)
      
    } catch (error) {
      lastError = error as Error
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)))
        continue
      }
    }
  }
  
  console.error(`Failed to fetch study ${nctId}: ${lastError?.message}`)
  return null
}

/**
 * Parse ClinicalTrials.gov study data
 */
function parseCtGovStudy(data: any): CtGovRecord {
  const protocol = data.protocolSection || {}
  const identification = protocol.identificationModule || {}
  const conditions = protocol.conditionsModule || {}
  const outcomes = protocol.outcomesModule || {}
  const design = protocol.designModule || {}
  const eligibility = protocol.eligibilityModule || {}
  
  return {
    nctId: identification.nctId || '',
    title: identification.officialTitle || identification.briefTitle || '',
    indicationCandidates: conditions.conditions || [],
    endpoints: extractEndpoints(outcomes),
    design: extractDesign(design),
    eligibility: extractEligibility(eligibility),
    rawJson: data
  }
}

/**
 * Extract endpoints from outcomes module
 */
function extractEndpoints(outcomes: any): CtGovEndpoint[] {
  const endpoints: CtGovEndpoint[] = []
  
  // Primary outcomes
  if (outcomes.primaryOutcomes && Array.isArray(outcomes.primaryOutcomes)) {
    for (const outcome of outcomes.primaryOutcomes) {
      endpoints.push({
        title: outcome.measure || '',
        description: outcome.description,
        timeFrame: outcome.timeFrame,
        type: 'primary'
      })
    }
  }
  
  // Secondary outcomes
  if (outcomes.secondaryOutcomes && Array.isArray(outcomes.secondaryOutcomes)) {
    for (const outcome of outcomes.secondaryOutcomes) {
      endpoints.push({
        title: outcome.measure || '',
        description: outcome.description,
        timeFrame: outcome.timeFrame,
        type: 'secondary'
      })
    }
  }
  
  // Other outcomes
  if (outcomes.otherOutcomes && Array.isArray(outcomes.otherOutcomes)) {
    for (const outcome of outcomes.otherOutcomes) {
      endpoints.push({
        title: outcome.measure || '',
        description: outcome.description,
        timeFrame: outcome.timeFrame,
        type: 'other'
      })
    }
  }
  
  return endpoints
}

/**
 * Extract study design
 */
function extractDesign(design: any): CtGovStudyDesign | undefined {
  if (!design.designInfo) return undefined
  
  return {
    allocation: design.designInfo.allocation,
    masking: design.designInfo.maskingInfo?.masking
  }
}

/**
 * Extract eligibility criteria
 */
function extractEligibility(eligibility: any): CtGovEligibility | undefined {
  const criteria = eligibility.eligibilityCriteria
  
  if (!criteria) return undefined
  
  // Try to split into inclusion/exclusion
  const inclusionMatch = criteria.match(/Inclusion Criteria:(.*?)(?:Exclusion Criteria:|$)/i)
  const exclusionMatch = criteria.match(/Exclusion Criteria:(.*?)$/i)
  
  return {
    inclusionText: inclusionMatch ? inclusionMatch[1].trim() : criteria,
    exclusionText: exclusionMatch ? exclusionMatch[1].trim() : undefined
  }
}
