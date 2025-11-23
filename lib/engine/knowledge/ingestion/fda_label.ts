/**
 * Phase H.2: OpenFDA Drug Label Integration
 * 
 * Fetches drug label data from OpenFDA API
 */

import type { FdaLabelRecord } from '../types'

const FDA_API_BASE = 'https://api.fda.gov/drug/label.json'
const MAX_RETRIES = 3
const TIMEOUT_MS = 10000

/**
 * Fetch FDA drug labels by INN
 */
export async function fetchFdaLabelsByInn(inn: string): Promise<FdaLabelRecord[]> {
  const query = `openfda.generic_name:"${inn}"`
  const url = `${FDA_API_BASE}?search=${encodeURIComponent(query)}&limit=10`
  
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
          // No results found - not an error
          return []
        }
        throw new Error(`FDA API returned ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.results || !Array.isArray(data.results)) {
        return []
      }
      
      return data.results.map(parseFdaLabelResult)
      
    } catch (error) {
      lastError = error as Error
      
      if (attempt < MAX_RETRIES) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        continue
      }
    }
  }
  
  throw new Error(`Failed to fetch FDA labels after ${MAX_RETRIES} attempts: ${lastError?.message}`)
}

/**
 * Parse FDA API result into FdaLabelRecord
 */
function parseFdaLabelResult(result: any): FdaLabelRecord {
  const openfda = result.openfda || {}
  
  return {
    innCandidates: openfda.generic_name || [],
    brandNames: openfda.brand_name || [],
    routes: openfda.route || [],
    dosageForms: openfda.dosage_form || [],
    indicationsText: extractText(result.indications_and_usage),
    dosageAndAdministrationText: extractText(result.dosage_and_administration),
    warningsText: extractText(result.warnings),
    precautionsText: extractText(result.precautions),
    adverseReactionsText: extractText(result.adverse_reactions),
    rawJson: result
  }
}

/**
 * Extract text from FDA field (can be string or array)
 */
function extractText(field: string | string[] | undefined): string | undefined {
  if (!field) return undefined
  if (typeof field === 'string') return field
  if (Array.isArray(field)) return field.join('\n\n')
  return undefined
}
