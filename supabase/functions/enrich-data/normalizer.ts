/**
 * Data Normalizer for Edge Functions
 * 
 * Lightweight version for Deno environment
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
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Normalize dosage units
   */
  private normalizeUnits(text: string): string {
    if (!text) return ''
    
    return text
      .replace(/\b(\d+\.?\d*)\s*(mcg|μg|ug|micrograms?)\b/gi, '$1 mcg')
      .replace(/\b(\d+\.?\d*)\s*(mg|milligrams?)\b/gi, '$1 mg')
      .replace(/\b(\d+\.?\d*)\s*(g|grams?)\b/gi, '$1 g')
      .replace(/\b(\d+\.?\d*)\s*(ml|mL|milliliters?)\b/gi, '$1 mL')
      .replace(/\b(\d+\.?\d*)\s*(l|L|liters?)\b/gi, '$1 L')
      .replace(/\b(\d+\.?\d*)\s*(IU|iu|units?)\b/gi, '$1 IU')
      .replace(/\b(\d+\.?\d*)\s*%/g, '$1%')
  }

  /**
   * Extract dosages
   */
  private extractDosages(text: string): string[] {
    if (!text) return []
    
    const dosagePatterns = [
      /\b\d+\.?\d*\s*(mg|mcg|g|mL|L|IU|%)\b/gi,
      /\b\d+\.?\d*\s*(?:to|-)\s*\d+\.?\d*\s*(mg|mcg|g|mL|L|IU|%)\b/gi,
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
   * Generic normalization
   */
  normalize(content: string, contentType: string): NormalizationResult {
    const originalLength = content?.length || 0
    
    // Clean HTML
    let normalized = this.cleanHTML(content)
    const htmlRemoved = normalized !== content
    
    // Normalize units
    const beforeUnits = normalized
    normalized = this.normalizeUnits(normalized)
    const unitsNormalized = normalized !== beforeUnits
    
    // Extract dosages
    const dosages = this.extractDosages(normalized)
    
    // Clean spacing
    normalized = normalized
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim()
    
    // Lowercase for adverse events
    if (contentType === 'adverse_event') {
      normalized = normalized.toLowerCase()
    }
    
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
}
