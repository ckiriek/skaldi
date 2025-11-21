/**
 * Data Normalizer Service
 * 
 * Normalizes external data from FDA, PubMed, ClinicalTrials.gov
 * for consistent usage in RAG and document generation.
 * 
 * Functions:
 * - Remove HTML tags
 * - Normalize units (mg, mcg, ml, etc.)
 * - Standardize dosage formats
 * - Clean whitespace and special characters
 * - Extract structured data from free text
 */

export interface NormalizationResult {
  normalized_content: string
  metadata: {
    original_length: number
    normalized_length: number
    html_removed: boolean
    units_normalized: boolean
    dosages_found: string[]
  }
}

export class DataNormalizer {
  /**
   * Remove HTML tags and entities
   */
  private cleanHTML(html: string): string {
    if (!html) return ''
    
    return html
      // Remove script and style tags with content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Normalize dosage units to standard format
   */
  private normalizeUnits(text: string): string {
    if (!text) return ''
    
    return text
      // Standardize microgram
      .replace(/\b(\d+\.?\d*)\s*(mcg|μg|ug|micrograms?)\b/gi, '$1 mcg')
      // Standardize milligram
      .replace(/\b(\d+\.?\d*)\s*(mg|milligrams?)\b/gi, '$1 mg')
      // Standardize gram
      .replace(/\b(\d+\.?\d*)\s*(g|grams?)\b/gi, '$1 g')
      // Standardize milliliter
      .replace(/\b(\d+\.?\d*)\s*(ml|mL|milliliters?)\b/gi, '$1 mL')
      // Standardize liter
      .replace(/\b(\d+\.?\d*)\s*(l|L|liters?)\b/gi, '$1 L')
      // Standardize international units
      .replace(/\b(\d+\.?\d*)\s*(IU|iu|units?)\b/gi, '$1 IU')
      // Standardize percentage
      .replace(/\b(\d+\.?\d*)\s*%/g, '$1%')
  }

  /**
   * Extract dosage information from text
   */
  private extractDosages(text: string): string[] {
    if (!text) return []
    
    const dosagePatterns = [
      // Standard dosage: "100 mg", "2.5 mcg"
      /\b\d+\.?\d*\s*(mg|mcg|g|mL|L|IU|%)\b/gi,
      // Range: "10-20 mg", "1.5 to 3 g"
      /\b\d+\.?\d*\s*(?:to|-)\s*\d+\.?\d*\s*(mg|mcg|g|mL|L|IU|%)\b/gi,
      // Per unit: "5 mg/kg", "10 mg/day"
      /\b\d+\.?\d*\s*(mg|mcg|g|mL|L|IU)\/(?:kg|day|dose|m2)\b/gi,
    ]
    
    const dosages = new Set<string>()
    
    for (const pattern of dosagePatterns) {
      const matches = text.match(pattern)
      if (matches) {
        matches.forEach(match => dosages.add(match.trim()))
      }
    }
    
    return Array.from(dosages)
  }

  /**
   * Normalize FDA label section
   */
  normalizeLabelSection(content: string, sectionName: string): NormalizationResult {
    const originalLength = content?.length || 0
    
    // Step 1: Clean HTML
    let normalized = this.cleanHTML(content)
    const htmlRemoved = normalized !== content
    
    // Step 2: Normalize units
    const beforeUnits = normalized
    normalized = this.normalizeUnits(normalized)
    const unitsNormalized = normalized !== beforeUnits
    
    // Step 3: Extract dosages
    const dosages = this.extractDosages(normalized)
    
    // Step 4: Clean up spacing and formatting
    normalized = normalized
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 newlines
      .replace(/\s+/g, ' ') // Single spaces
      .trim()
    
    return {
      normalized_content: normalized,
      metadata: {
        original_length: originalLength,
        normalized_length: normalized.length,
        html_removed: htmlRemoved,
        units_normalized: unitsNormalized,
        dosages_found: dosages,
      },
    }
  }

  /**
   * Normalize PubMed abstract
   */
  normalizeAbstract(abstract: string): NormalizationResult {
    const originalLength = abstract?.length || 0
    
    // Abstracts are usually clean, but may have some HTML
    let normalized = this.cleanHTML(abstract)
    
    // Normalize units
    normalized = this.normalizeUnits(normalized)
    
    // Extract dosages
    const dosages = this.extractDosages(normalized)
    
    // Clean spacing
    normalized = normalized
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim()
    
    return {
      normalized_content: normalized,
      metadata: {
        original_length: originalLength,
        normalized_length: normalized.length,
        html_removed: normalized !== abstract,
        units_normalized: true,
        dosages_found: dosages,
      },
    }
  }

  /**
   * Normalize ClinicalTrials.gov trial description
   */
  normalizeTrialDescription(description: string): NormalizationResult {
    const originalLength = description?.length || 0
    
    // Clean HTML (CT.gov sometimes has HTML in descriptions)
    let normalized = this.cleanHTML(description)
    
    // Normalize units
    normalized = this.normalizeUnits(normalized)
    
    // Extract dosages
    const dosages = this.extractDosages(normalized)
    
    // Clean spacing
    normalized = normalized
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim()
    
    return {
      normalized_content: normalized,
      metadata: {
        original_length: originalLength,
        normalized_length: normalized.length,
        html_removed: normalized !== description,
        units_normalized: true,
        dosages_found: dosages,
      },
    }
  }

  /**
   * Normalize adverse event description
   */
  normalizeAdverseEvent(event: string): NormalizationResult {
    const originalLength = event?.length || 0
    
    // Clean and standardize
    let normalized = this.cleanHTML(event)
    
    // Lowercase for consistency (adverse events are often in CAPS)
    normalized = normalized.toLowerCase()
    
    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim()
    
    return {
      normalized_content: normalized,
      metadata: {
        original_length: originalLength,
        normalized_length: normalized.length,
        html_removed: false,
        units_normalized: false,
        dosages_found: [],
      },
    }
  }

  /**
   * Generic normalization for any text content
   */
  normalize(content: string, contentType: string): NormalizationResult {
    switch (contentType) {
      case 'label_section':
        return this.normalizeLabelSection(content, '')
      case 'abstract':
        return this.normalizeAbstract(content)
      case 'trial_design':
      case 'trial_description':
        return this.normalizeTrialDescription(content)
      case 'adverse_event':
        return this.normalizeAdverseEvent(content)
      default:
        // Generic normalization
        const originalLength = content?.length || 0
        const normalized = this.cleanHTML(content)
          .replace(/\s+/g, ' ')
          .trim()
        
        return {
          normalized_content: normalized,
          metadata: {
            original_length: originalLength,
            normalized_length: normalized.length,
            html_removed: normalized !== content,
            units_normalized: false,
            dosages_found: [],
          },
        }
    }
  }
}
