/**
 * FDA Orange Book Adapter
 * 
 * Fetches Reference Listed Drug (RLD) and Therapeutic Equivalence (TE) data
 * Critical for Generic drug applications
 * 
 * API: https://api.fda.gov/drug/drugsfda.json
 * Data: Approved Drug Products with Therapeutic Equivalence Evaluations
 */

import type { Product } from '@/lib/types/regulatory-data'

const ORANGE_BOOK_BASE_URL = 'https://api.fda.gov/drug/drugsfda.json'

interface OrangeBookResponse {
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
    application_number?: string
    sponsor_name?: string
    openfda?: {
      application_number?: string[]
      brand_name?: string[]
      generic_name?: string[]
      manufacturer_name?: string[]
      product_type?: string[]
      route?: string[]
      substance_name?: string[]
    }
    products?: Array<{
      product_number?: string
      reference_drug?: string // "Yes" or "No"
      brand_name?: string
      active_ingredients?: Array<{
        name?: string
        strength?: string
      }>
      dosage_form?: string
      route?: string
      marketing_status?: string
      te_code?: string
    }>
    submissions?: Array<{
      submission_type?: string
      submission_number?: string
      submission_status?: string
      submission_status_date?: string
      review_priority?: string
      submission_class_code?: string
      submission_class_code_description?: string
    }>
  }>
}

export interface RLDInfo {
  application_number: string
  brand_name: string
  generic_name?: string
  sponsor_name?: string
  is_rld: boolean
  te_code?: string
  dosage_form?: string
  route?: string
  strength?: string
  marketing_status?: string
  approval_date?: string
}

export class OrangeBookAdapter {
  private baseUrl = ORANGE_BOOK_BASE_URL
  private apiKey?: string
  private lastRequestTime = 0
  private minRequestInterval = 250 // 250ms = 240 req/min

  constructor(apiKey?: string) {
    this.apiKey = apiKey
    if (!apiKey) {
      console.warn('⚠️ Orange Book: No API key provided. Limited to 240 requests/minute.')
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
  private buildUrl(params: Record<string, string>): string {
    const url = new URL(this.baseUrl)
    
    if (this.apiKey) {
      url.searchParams.set('api_key', this.apiKey)
    }
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
    
    return url.toString()
  }

  /**
   * Get RLD information by application number
   * 
   * @param applicationNumber - e.g., "NDA020357"
   * @returns RLD information or null
   */
  async getRLDByApplicationNumber(applicationNumber: string): Promise<RLDInfo | null> {
    try {
      await this.rateLimit()

      const url = this.buildUrl({
        search: `application_number:"${applicationNumber}"`,
        limit: '1',
      })

      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Orange Book: No data found for ${applicationNumber}`)
          return null
        }
        throw new Error(`Orange Book API error: ${response.status}`)
      }

      const data: OrangeBookResponse = await response.json()

      if (!data.results || data.results.length === 0) {
        console.warn(`Orange Book: No results for ${applicationNumber}`)
        return null
      }

      const result = data.results[0]
      const openfda = result.openfda || {}

      // Find RLD product
      const rldProduct = result.products?.find(p => p.reference_drug === 'Yes')
      
      if (!rldProduct) {
        console.warn(`Orange Book: No RLD product found for ${applicationNumber}`)
        // Still return info even if not marked as RLD
      }

      const product = rldProduct || result.products?.[0]

      if (!product) {
        return null
      }

      // Get approval date from submissions
      const approvalSubmission = result.submissions?.find(
        s => s.submission_type === 'ORIG' && s.submission_status === 'AP'
      )

      const rldInfo: RLDInfo = {
        application_number: result.application_number || applicationNumber,
        brand_name: product.brand_name || openfda.brand_name?.[0] || '',
        generic_name: openfda.generic_name?.[0],
        sponsor_name: result.sponsor_name,
        is_rld: product.reference_drug === 'Yes',
        te_code: product.te_code,
        dosage_form: product.dosage_form,
        route: product.route || openfda.route?.[0],
        strength: product.active_ingredients?.[0]?.strength,
        marketing_status: product.marketing_status,
        approval_date: approvalSubmission?.submission_status_date,
      }

      console.log(`✅ Orange Book: Found RLD info for ${applicationNumber}`)
      return rldInfo

    } catch (error) {
      console.error(`Orange Book getRLDByApplicationNumber error for ${applicationNumber}:`, error)
      return null
    }
  }

  /**
   * Search for RLD by brand name
   * 
   * @param brandName - e.g., "GLUCOPHAGE"
   * @returns Array of RLD information
   */
  async searchRLDByBrandName(brandName: string): Promise<RLDInfo[]> {
    try {
      await this.rateLimit()

      // Use wildcard for partial matching (e.g., "gluco" matches "Glucophage")
      // Also search generic_name to allow finding brands by active ingredient
      const url = this.buildUrl({
        search: `openfda.brand_name:${brandName}* OR openfda.generic_name:${brandName}*`,
        limit: '10',
      })

      console.log('🔶 Orange Book search URL:', url)
      const response = await fetch(url)

      console.log('🔶 Orange Book response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔶 Orange Book error response:', errorText)
        
        if (response.status === 404) {
          console.warn(`Orange Book: No data found for ${brandName}`)
          return []
        }
        throw new Error(`Orange Book API error: ${response.status} - ${errorText}`)
      }

      const data: OrangeBookResponse = await response.json()

      if (!data.results || data.results.length === 0) {
        return []
      }

      const rldInfos: RLDInfo[] = []

      for (const result of data.results) {
        const openfda = result.openfda || {}
        const rldProduct = result.products?.find(p => p.reference_drug === 'Yes')
        
        if (!rldProduct) continue

        const approvalSubmission = result.submissions?.find(
          s => s.submission_type === 'ORIG' && s.submission_status === 'AP'
        )

        rldInfos.push({
          application_number: result.application_number || '',
          brand_name: rldProduct.brand_name || openfda.brand_name?.[0] || '',
          generic_name: openfda.generic_name?.[0],
          sponsor_name: result.sponsor_name,
          is_rld: true,
          te_code: rldProduct.te_code,
          dosage_form: rldProduct.dosage_form,
          route: rldProduct.route || openfda.route?.[0],
          strength: rldProduct.active_ingredients?.[0]?.strength,
          marketing_status: rldProduct.marketing_status,
          approval_date: approvalSubmission?.submission_status_date,
        })
      }

      console.log(`✅ Orange Book: Found ${rldInfos.length} RLD(s) for ${brandName}`)
      return rldInfos

    } catch (error) {
      console.error(`Orange Book searchRLDByBrandName error for ${brandName}:`, error)
      return []
    }
  }

  /**
   * Get all products (including generics) for an application number
   * 
   * @param applicationNumber - e.g., "NDA020357"
   * @returns Array of Product objects
   */
  async getProductsByApplicationNumber(applicationNumber: string): Promise<Product[]> {
    try {
      await this.rateLimit()

      const url = this.buildUrl({
        search: `application_number:"${applicationNumber}"`,
        limit: '1',
      })

      const response = await fetch(url)

      if (!response.ok) {
        return []
      }

      const data: OrangeBookResponse = await response.json()

      if (!data.results || data.results.length === 0) {
        return []
      }

      const result = data.results[0]
      const openfda = result.openfda || {}

      if (!result.products) {
        return []
      }

      const products: Product[] = result.products.map(p => ({
        id: '', // Will be set by database
        inchikey: '', // Will be linked later
        brand_name: p.brand_name || openfda.brand_name?.[0] || '',
        generic_name: openfda.generic_name?.[0],
        dosage_form: p.dosage_form,
        strength: p.active_ingredients?.[0]?.strength,
        route: p.route || openfda.route?.[0],
        region: 'US',
        application_number: result.application_number,
        approval_date: undefined, // Would need to parse from submissions
        approval_status: p.marketing_status === 'Prescription' ? 'approved' : 'withdrawn',
        is_rld: p.reference_drug === 'Yes',
        te_code: p.te_code,
        manufacturer: result.sponsor_name,
        source: 'FDA Orange Book',
        source_url: `https://www.accessdata.fda.gov/scripts/cder/ob/results_product.cfm?Appl_Type=N&Appl_No=${applicationNumber.replace('NDA', '')}`,
        retrieved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      console.log(`✅ Orange Book: Found ${products.length} product(s) for ${applicationNumber}`)
      return products

    } catch (error) {
      console.error(`Orange Book getProductsByApplicationNumber error for ${applicationNumber}:`, error)
      return []
    }
  }

  /**
   * Validate TE code format
   * 
   * @param teCode - e.g., "AB", "AP", "BX"
   * @returns true if valid
   */
  static isValidTECode(teCode: string): boolean {
    // TE codes are 2 characters: first letter indicates equivalence, second is subcode
    // A = therapeutically equivalent
    // B = not therapeutically equivalent
    // Common codes: AB, AP, AT, AN, AO, AA, BC, BD, BE, BN, BP, BR, BS, BT, BX
    const pattern = /^[AB][A-Z]$/
    return pattern.test(teCode)
  }

  /**
   * Get TE code description
   * 
   * @param teCode - e.g., "AB"
   * @returns Description of TE code
   */
  static getTECodeDescription(teCode: string): string {
    const descriptions: Record<string, string> = {
      'AB': 'Therapeutically equivalent - Standard bioequivalence',
      'AP': 'Therapeutically equivalent - Injectable solution',
      'AT': 'Therapeutically equivalent - Topical product',
      'AN': 'Therapeutically equivalent - Aerosol/nasal spray',
      'AO': 'Therapeutically equivalent - Injectable oil solution',
      'AA': 'Therapeutically equivalent - No bioequivalence issues',
      'BC': 'Not therapeutically equivalent - Extended release',
      'BD': 'Not therapeutically equivalent - Active ingredient',
      'BE': 'Not therapeutically equivalent - Delayed release',
      'BN': 'Not therapeutically equivalent - Aerosol/nasal spray',
      'BP': 'Not therapeutically equivalent - Potential bioequivalence issues',
      'BR': 'Not therapeutically equivalent - Suppository/enema',
      'BS': 'Not therapeutically equivalent - Standard deficiency',
      'BT': 'Not therapeutically equivalent - Bioequivalence issues',
      'BX': 'Not therapeutically equivalent - Insufficient data',
    }

    return descriptions[teCode] || 'Unknown TE code'
  }

  /**
   * Check if TE code indicates therapeutic equivalence
   * 
   * @param teCode - e.g., "AB"
   * @returns true if therapeutically equivalent (starts with A)
   */
  static isTherapeuticallyEquivalent(teCode: string): boolean {
    return teCode.startsWith('A')
  }
}

// Export singleton instance
export const orangeBookAdapter = new OrangeBookAdapter(process.env.OPENFDA_API_KEY)
