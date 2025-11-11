/**
 * DailyMed Adapter
 * 
 * Fetches current drug labels from NLM DailyMed
 * More up-to-date than openFDA (updated daily vs. quarterly)
 * 
 * API: https://dailymed.nlm.nih.gov/dailymed/
 * Data: Current FDA-approved drug labeling
 */

import type { Label } from '@/lib/types/regulatory-data'

const DAILYMED_BASE_URL = 'https://dailymed.nlm.nih.gov/dailymed'

interface DailyMedSearchResponse {
  data: Array<{
    setid: string
    title: string
    published_date: string
    author?: string
    marketing_category?: string
    application_number?: string[]
  }>
  metadata: {
    total_elements: number
    page_length: number
    page_number: number
  }
}

interface DailyMedSPLResponse {
  data: {
    setid: string
    title: string
    published_date: string
    effective_time: string
    version_number: string
    author: string
    marketing_category: string
    application_number: string[]
    spl_sections: Array<{
      section_code: string
      section_title: string
      section_text: string
    }>
  }
}

export class DailyMedAdapter {
  private baseUrl = DAILYMED_BASE_URL
  private lastRequestTime = 0
  private minRequestInterval = 200 // 200ms = 5 req/sec (conservative)

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
   * Search for drug labels by application number
   * 
   * @param applicationNumber - e.g., "NDA020357"
   * @returns Array of setids
   */
  async searchByApplicationNumber(applicationNumber: string): Promise<string[]> {
    try {
      await this.rateLimit()

      // DailyMed API uses application number without prefix
      const appNum = applicationNumber.replace(/^(NDA|ANDA|BLA)/, '')

      const url = `${this.baseUrl}/services/v2/spls.json?application_number=${appNum}`

      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`DailyMed: No labels found for ${applicationNumber}`)
          return []
        }
        throw new Error(`DailyMed API error: ${response.status}`)
      }

      const data: DailyMedSearchResponse = await response.json()

      if (!data.data || data.data.length === 0) {
        return []
      }

      // Return setids (unique identifiers for SPL documents)
      const setids = data.data.map(item => item.setid)

      console.log(`✅ DailyMed: Found ${setids.length} label(s) for ${applicationNumber}`)
      return setids

    } catch (error) {
      console.error(`DailyMed searchByApplicationNumber error for ${applicationNumber}:`, error)
      return []
    }
  }

  /**
   * Search for drug labels by drug name
   * 
   * @param drugName - e.g., "metformin"
   * @returns Array of setids
   */
  async searchByDrugName(drugName: string): Promise<string[]> {
    try {
      await this.rateLimit()

      const url = `${this.baseUrl}/services/v2/spls.json?drug_name=${encodeURIComponent(drugName)}`

      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`DailyMed: No labels found for ${drugName}`)
          return []
        }
        throw new Error(`DailyMed API error: ${response.status}`)
      }

      const data: DailyMedSearchResponse = await response.json()

      if (!data.data || data.data.length === 0) {
        return []
      }

      const setids = data.data.map(item => item.setid)

      console.log(`✅ DailyMed: Found ${setids.length} label(s) for ${drugName}`)
      return setids

    } catch (error) {
      console.error(`DailyMed searchByDrugName error for ${drugName}:`, error)
      return []
    }
  }

  /**
   * Fetch full SPL document by setid
   * 
   * @param setid - DailyMed setid (UUID)
   * @returns Label object or null
   */
  async fetchLabelBySetid(setid: string): Promise<Label | null> {
    try {
      await this.rateLimit()

      const url = `${this.baseUrl}/services/v2/spls/${setid}.json`

      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`DailyMed: No label found for setid ${setid}`)
          return null
        }
        throw new Error(`DailyMed API error: ${response.status}`)
      }

      const data: DailyMedSPLResponse = await response.json()

      if (!data.data) {
        return null
      }

      const spl = data.data

      // Map section codes to our schema
      const sectionMap: Record<string, keyof Label['sections']> = {
        '34067-9': 'indications_and_usage',
        '34068-7': 'dosage_and_administration',
        '34070-3': 'contraindications',
        '43685-7': 'warnings_and_precautions',
        '34084-4': 'adverse_reactions_label',
        '34073-7': 'drug_interactions',
        '43684-0': 'use_in_specific_populations',
        '34090-1': 'clinical_pharmacology',
        '34092-7': 'nonclinical_toxicology',
        '34091-9': 'clinical_studies', // Fixed: was duplicate 34092-7
        '34069-5': 'how_supplied',
        '34076-0': 'patient_counseling',
        '34089-3': 'description',
        '34066-1': 'boxed_warning',
      }

      // Extract sections
      const sections: any = {}
      let fullText = ''

      spl.spl_sections?.forEach(section => {
        const key = sectionMap[section.section_code]
        if (key) {
          // Clean HTML tags from text
          const cleanText = this.cleanHTML(section.section_text)
          sections[key] = cleanText
          fullText += cleanText + '\n\n'
        }
      })

      // Handle clinical_pharmacology as object
      if (sections.clinical_pharmacology) {
        const rawText = sections.clinical_pharmacology
        sections.clinical_pharmacology = {
          mechanism_of_action: undefined,
          pharmacokinetics: undefined,
          pharmacodynamics: undefined,
          _raw_text: rawText,
        }
      }

      const label: Label = {
        id: '', // Will be set by database
        product_id: '', // Will be linked later
        label_type: 'FDA_SPL',
        effective_date: spl.effective_time,
        version: spl.version_number,
        sections,
        full_text: fullText.trim(),
        source: 'DailyMed',
        source_url: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setid}`,
        retrieved_at: new Date().toISOString(),
        confidence: 'high',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log(`✅ DailyMed: Fetched label for setid ${setid}`)
      return label

    } catch (error) {
      console.error(`DailyMed fetchLabelBySetid error for ${setid}:`, error)
      return null
    }
  }

  /**
   * Fetch latest label by application number
   * 
   * @param applicationNumber - e.g., "NDA020357"
   * @returns Label object or null
   */
  async fetchLatestLabelByApplicationNumber(applicationNumber: string): Promise<Label | null> {
    try {
      // Search for labels
      const setids = await this.searchByApplicationNumber(applicationNumber)

      if (setids.length === 0) {
        return null
      }

      // Fetch the first one (most recent)
      const label = await this.fetchLabelBySetid(setids[0])

      return label

    } catch (error) {
      console.error(`DailyMed fetchLatestLabelByApplicationNumber error for ${applicationNumber}:`, error)
      return null
    }
  }

  /**
   * Fetch latest label by drug name
   * 
   * @param drugName - e.g., "metformin"
   * @returns Label object or null
   */
  async fetchLatestLabelByDrugName(drugName: string): Promise<Label | null> {
    try {
      // Search for labels
      const setids = await this.searchByDrugName(drugName)

      if (setids.length === 0) {
        return null
      }

      // Fetch the first one (most recent)
      const label = await this.fetchLabelBySetid(setids[0])

      return label

    } catch (error) {
      console.error(`DailyMed fetchLatestLabelByDrugName error for ${drugName}:`, error)
      return null
    }
  }

  /**
   * Clean HTML tags from text
   * 
   * @param html - HTML string
   * @returns Plain text
   */
  private cleanHTML(html: string): string {
    if (!html) return ''

    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ')

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim()

    return text
  }

  /**
   * Compare DailyMed label with openFDA label
   * Returns the newer one
   * 
   * @param dailyMedLabel - Label from DailyMed
   * @param openFDALabel - Label from openFDA
   * @returns The newer label
   */
  static selectNewerLabel(dailyMedLabel: Label | null, openFDALabel: Label | null): Label | null {
    if (!dailyMedLabel && !openFDALabel) return null
    if (!dailyMedLabel) return openFDALabel
    if (!openFDALabel) return dailyMedLabel

    // Compare effective dates
    const dailyMedDate = new Date(dailyMedLabel.effective_date || 0)
    const openFDADate = new Date(openFDALabel.effective_date || 0)

    if (dailyMedDate > openFDADate) {
      console.log(`✅ DailyMed label is newer (${dailyMedLabel.effective_date} vs ${openFDALabel.effective_date})`)
      return dailyMedLabel
    } else {
      console.log(`✅ openFDA label is newer or same (${openFDALabel.effective_date} vs ${dailyMedLabel.effective_date})`)
      return openFDALabel
    }
  }
}

// Export singleton instance
export const dailyMedAdapter = new DailyMedAdapter()
