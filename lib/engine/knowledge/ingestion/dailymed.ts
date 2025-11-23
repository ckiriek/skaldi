/**
 * Phase H.2: DailyMed Integration
 * 
 * Fetches drug information from DailyMed API
 */

import type { DailyMedRecord } from '../types'

const DAILYMED_SEARCH_API = 'https://dailymed.nlm.nih.gov/dailymed/services/v2/search.json'
const DAILYMED_SPL_API = 'https://dailymed.nlm.nih.gov/dailymed/services/v2/spls'
const MAX_RETRIES = 3
const TIMEOUT_MS = 15000

/**
 * Fetch DailyMed records by INN
 */
export async function fetchDailyMedByInn(inn: string): Promise<DailyMedRecord[]> {
  // Step 1: Search for SPL set IDs
  const setIds = await searchDailyMed(inn)
  
  if (setIds.length === 0) {
    return []
  }
  
  // Step 2: Fetch SPL details for each set ID (limit to first 5)
  const records: DailyMedRecord[] = []
  for (const setId of setIds.slice(0, 5)) {
    try {
      const record = await fetchSplDetails(setId, inn)
      if (record) {
        records.push(record)
      }
    } catch (error) {
      console.error(`Failed to fetch SPL ${setId}:`, error)
      // Continue with other records
    }
  }
  
  return records
}

/**
 * Search DailyMed for set IDs
 */
async function searchDailyMed(inn: string): Promise<string[]> {
  const url = `${DAILYMED_SEARCH_API}?ingredient=${encodeURIComponent(inn)}`
  
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
        throw new Error(`DailyMed search returned ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.data || !Array.isArray(data.data)) {
        return []
      }
      
      return data.data
        .map((item: any) => item.setid)
        .filter((setid: any) => setid)
      
    } catch (error) {
      lastError = error as Error
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        continue
      }
    }
  }
  
  console.error(`Failed to search DailyMed: ${lastError?.message}`)
  return []
}

/**
 * Fetch SPL details
 */
async function fetchSplDetails(setId: string, inn: string): Promise<DailyMedRecord | null> {
  const url = `${DAILYMED_SPL_API}/${setId}.json`
  
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
        throw new Error(`DailyMed SPL returned ${response.status}`)
      }
      
      const data = await response.json()
      
      return parseDailyMedSpl(data, setId, inn)
      
    } catch (error) {
      lastError = error as Error
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        continue
      }
    }
  }
  
  throw new Error(`Failed to fetch SPL ${setId}: ${lastError?.message}`)
}

/**
 * Parse DailyMed SPL data
 */
function parseDailyMedSpl(data: any, setId: string, inn: string): DailyMedRecord {
  const spl = data.data?.[0] || {}
  
  return {
    setId,
    innCandidates: [inn],
    routes: extractRoutes(spl),
    dosageForms: extractDosageForms(spl),
    indicationsText: extractSection(spl, 'indications_and_usage'),
    dosageAndAdministrationText: extractSection(spl, 'dosage_and_administration'),
    clinicalPharmacologyText: extractSection(spl, 'clinical_pharmacology'),
    warningsText: extractSection(spl, 'warnings'),
    adverseReactionsText: extractSection(spl, 'adverse_reactions'),
    rawJson: data
  }
}

/**
 * Extract routes from SPL
 */
function extractRoutes(spl: any): string[] {
  const routes: string[] = []
  
  if (spl.route && Array.isArray(spl.route)) {
    routes.push(...spl.route)
  } else if (spl.route) {
    routes.push(spl.route)
  }
  
  return routes
}

/**
 * Extract dosage forms from SPL
 */
function extractDosageForms(spl: any): string[] {
  const forms: string[] = []
  
  if (spl.dosage_form && Array.isArray(spl.dosage_form)) {
    forms.push(...spl.dosage_form)
  } else if (spl.dosage_form) {
    forms.push(spl.dosage_form)
  }
  
  return forms
}

/**
 * Extract section text from SPL
 */
function extractSection(spl: any, sectionName: string): string | undefined {
  const section = spl[sectionName]
  
  if (!section) return undefined
  
  if (typeof section === 'string') return section
  
  if (Array.isArray(section)) {
    return section.join('\n\n')
  }
  
  if (section.text) {
    return typeof section.text === 'string' ? section.text : section.text.join('\n\n')
  }
  
  return undefined
}
