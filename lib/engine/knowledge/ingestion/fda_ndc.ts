/**
 * Phase H.2: OpenFDA NDC Integration
 * 
 * Fetches National Drug Code data from OpenFDA API
 */

import type { FdaNdcRecord } from '../types'

const FDA_NDC_API_BASE = 'https://api.fda.gov/drug/ndc.json'
const MAX_RETRIES = 3
const TIMEOUT_MS = 10000

/**
 * Fetch FDA NDC records by INN
 */
export async function fetchFdaNdcByInn(inn: string): Promise<FdaNdcRecord[]> {
  const query = `generic_name:"${inn}"`
  const url = `${FDA_NDC_API_BASE}?search=${encodeURIComponent(query)}&limit=20`
  
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
        throw new Error(`FDA NDC API returned ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.results || !Array.isArray(data.results)) {
        return []
      }
      
      return data.results.map(parseFdaNdcResult)
      
    } catch (error) {
      lastError = error as Error
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        continue
      }
    }
  }
  
  throw new Error(`Failed to fetch FDA NDC after ${MAX_RETRIES} attempts: ${lastError?.message}`)
}

/**
 * Parse FDA NDC result
 */
function parseFdaNdcResult(result: any): FdaNdcRecord {
  const brandNames = result.brand_name ? [result.brand_name] : []
  const routes = result.route ? (Array.isArray(result.route) ? result.route : [result.route]) : []
  const dosageForms = result.dosage_form ? [result.dosage_form] : []
  
  // Extract strengths from active_ingredients
  const strengths: string[] = []
  if (result.active_ingredients && Array.isArray(result.active_ingredients)) {
    for (const ingredient of result.active_ingredients) {
      if (ingredient.strength) {
        strengths.push(ingredient.strength)
      }
    }
  }
  
  // Extract pharmaceutical classes
  const pharmClasses = result.pharm_class || []
  
  return {
    inn: result.generic_name || '',
    brandNames,
    routes,
    dosageForms,
    strengths,
    pharmClasses: Array.isArray(pharmClasses) ? pharmClasses : [pharmClasses],
    rawJson: result
  }
}
