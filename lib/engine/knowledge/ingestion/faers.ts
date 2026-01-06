/**
 * FDA FAERS (Adverse Event Reporting System) Ingestion
 * 
 * Fetches safety signals for a drug from FDA FAERS database
 * API: https://api.fda.gov/drug/event.json
 */

const FAERS_BASE_URL = 'https://api.fda.gov/drug/event.json'

export interface FaersSafetySignal {
  term: string
  count: number
  serious?: boolean
}

/**
 * Fetch top adverse events for a drug from FDA FAERS
 * 
 * @param drugName - Generic name of the drug (e.g., "metformin")
 * @param limit - Maximum number of signals to return (default 15)
 * @returns Array of safety signals sorted by frequency
 */
export async function fetchFaersSafetySignals(
  drugName: string,
  limit: number = 15
): Promise<FaersSafetySignal[]> {
  try {
    const normalizedDrug = drugName.toLowerCase().trim()
    
    // Search for adverse events where this drug is the suspect
    // Count by reaction term (patient.reaction.reactionmeddrapt)
    const url = `${FAERS_BASE_URL}?search=patient.drug.openfda.generic_name:"${encodeURIComponent(normalizedDrug)}"&count=patient.reaction.reactionmeddrapt.exact&limit=${limit}`
    
    console.log('🔴 FAERS fetching safety signals for:', normalizedDrug)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('🔴 FAERS: No data found for', normalizedDrug)
        return []
      }
      console.error('🔴 FAERS API error:', response.status)
      return []
    }
    
    const data = await response.json()
    
    if (!data.results || !Array.isArray(data.results)) {
      return []
    }
    
    // Map results to safety signals
    const signals: FaersSafetySignal[] = data.results.map((result: any) => ({
      term: result.term,
      count: result.count
    }))
    
    console.log(`🔴 FAERS found ${signals.length} safety signals for ${normalizedDrug}`)
    
    return signals
    
  } catch (error) {
    console.error('🔴 FAERS fetch error:', error)
    return []
  }
}

/**
 * Fetch serious adverse events only
 */
export async function fetchFaersSeriousEvents(
  drugName: string,
  limit: number = 10
): Promise<FaersSafetySignal[]> {
  try {
    const normalizedDrug = drugName.toLowerCase().trim()
    
    // Filter for serious events only
    const url = `${FAERS_BASE_URL}?search=patient.drug.openfda.generic_name:"${encodeURIComponent(normalizedDrug)}"+AND+serious:1&count=patient.reaction.reactionmeddrapt.exact&limit=${limit}`
    
    console.log('🔴 FAERS fetching SERIOUS events for:', normalizedDrug)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 404) {
        return []
      }
      return []
    }
    
    const data = await response.json()
    
    if (!data.results || !Array.isArray(data.results)) {
      return []
    }
    
    const signals: FaersSafetySignal[] = data.results.map((result: any) => ({
      term: result.term,
      count: result.count,
      serious: true
    }))
    
    console.log(`🔴 FAERS found ${signals.length} SERIOUS events for ${normalizedDrug}`)
    
    return signals
    
  } catch (error) {
    console.error('🔴 FAERS serious events fetch error:', error)
    return []
  }
}
