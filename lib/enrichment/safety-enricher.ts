/**
 * Universal Safety Enricher
 * 
 * Enriches safety data for any compound.
 * Uses REAL DATA from FDA label + FAERS - NO FALLBACKS.
 * 
 * Sources:
 * 1. openFDA Drug Label API (warnings, precautions, adverse reactions with frequencies)
 * 2. openFDA FAERS API (real-world adverse event reports)
 * 
 * @version 2.0.0
 * @date 2025-12-03
 */

import { createClient } from '@/lib/supabase/server'
import type { UniversalCompound } from '@/lib/core/compound-model'
import type { UniversalSafety, AdverseEvent, DrugInteraction } from '@/lib/core/safety-model'
import { 
  mergeSafetyData, 
  calculateSafetyCompleteness,
  getFrequencyCategory
} from '@/lib/core/safety-model'
import { openFDAClient, type DrugLabel } from '@/lib/integrations/openfda'

// ============================================================================
// MAIN ENRICHER
// ============================================================================

/**
 * Enrich safety data for a compound
 * Uses REAL DATA from FDA label + FAERS - NO FALLBACKS
 * 
 * @param compound - Compound data
 * @param projectId - Optional project ID for fetching project-specific FAERS data
 * @returns Enriched safety data
 */
export async function enrichSafety(
  compound: UniversalCompound,
  projectId?: string
): Promise<UniversalSafety> {
  console.log(`[Safety Enricher] Starting enrichment for ${compound.inn_name}`)
  
  const sources: string[] = []
  
  // 1. Fetch FDA label from openFDA API
  let labelSafety: Partial<UniversalSafety> = {}
  try {
    const label = await openFDAClient.getFullDrugLabel(compound.inn_name)
    if (label) {
      labelSafety = extractSafetyFromLabel(label)
      if (labelSafety.warnings?.length || labelSafety.common_ae?.length || labelSafety.contraindications?.length) {
        sources.push('label')
      }
    }
  } catch (error) {
    console.warn(`[Safety Enricher] Label extraction failed:`, error)
  }
  
  // 2. Fetch FAERS data from openFDA API
  let faersSafety: Partial<UniversalSafety> = {}
  try {
    faersSafety = await fetchFAERSDataFromAPI(compound.inn_name)
    if (faersSafety.common_ae?.length) {
      sources.push('faers')
    }
  } catch (error) {
    console.warn(`[Safety Enricher] FAERS fetch failed:`, error)
  }
  
  // 3. Also check evidence_sources for pre-fetched FAERS data
  if (!faersSafety.common_ae?.length && projectId) {
    try {
      const dbFaers = await fetchFAERSFromDatabase(compound.inn_name, projectId)
      if (dbFaers.common_ae?.length) {
        faersSafety = dbFaers
        if (!sources.includes('faers')) sources.push('faers')
      }
    } catch (error) {
      console.warn(`[Safety Enricher] DB FAERS fetch failed:`, error)
    }
  }
  
  // 4. Merge data (label takes priority, then FAERS)
  const merged = mergeSafetyData(labelSafety, faersSafety)
  
  // 5. Set source and completeness - NO FALLBACKS
  if (sources.length === 0) {
    merged.source = 'not_available'
    console.warn(`[Safety Enricher] No safety data found for ${compound.inn_name}`)
  } else {
    merged.source = sources[0] as UniversalSafety['source']
    merged.additional_sources = sources.slice(1) as UniversalSafety['source'][]
  }
  
  merged.completeness_score = calculateSafetyCompleteness(merged)
  merged.last_updated = new Date().toISOString()
  
  console.log(`[Safety Enricher] Enrichment complete. Sources: ${sources.join(', ') || 'none'}. AEs: ${merged.common_ae?.length || 0} common, ${merged.serious_ae?.length || 0} serious. Completeness: ${Math.round(merged.completeness_score * 100)}%`)
  
  return merged
}

// ============================================================================
// LABEL EXTRACTION
// ============================================================================

/**
 * Extract safety data from FDA label (DrugLabel object from openFDA)
 */
function extractSafetyFromLabel(label: DrugLabel): Partial<UniversalSafety> {
  const safety: Partial<UniversalSafety> = {
    source: 'label'
  }
  
  // Boxed warning
  if (label.boxedWarning && label.boxedWarning.length > 50) {
    safety.boxed_warning = cleanText(label.boxedWarning).slice(0, 1000)
  }
  
  // Warnings
  if (label.warnings) {
    safety.warnings = extractWarnings(label.warnings)
    safety.precautions = extractPrecautions(label.warnings)
  }
  
  // Contraindications
  if (label.contraindications) {
    safety.contraindications = extractContraindications(label.contraindications)
  }
  
  // Adverse events from label
  if (label.adverseReactions) {
    const { common, serious } = extractAdverseEvents(label.adverseReactions)
    safety.common_ae = common
    safety.serious_ae = serious
  }
  
  // Drug interactions
  if (label.drugInteractions) {
    safety.drug_interactions = extractDrugInteractions(label.drugInteractions)
  }
  
  // Special populations
  if (label.useInPregnancy) {
    safety.special_populations = extractSpecialPopulations(label.useInPregnancy)
  }
  
  return safety
}

// ============================================================================
// FAERS DATA FETCHING
// ============================================================================

/**
 * Fetch FAERS data directly from openFDA API
 */
async function fetchFAERSDataFromAPI(drugName: string): Promise<Partial<UniversalSafety>> {
  // Get safety summary with top reactions
  const summary = await openFDAClient.getSafetySummary(drugName)
  
  if (!summary.topReactions.length) {
    return {}
  }
  
  // Map to AdverseEvent format
  const common_ae: AdverseEvent[] = summary.topReactions.map(r => ({
    term: r.term,
    frequency: r.percentage ? r.percentage / 100 : undefined,
    frequency_category: r.percentage ? getFrequencyCategory(r.percentage / 100) : undefined,
    serious: false
  }))
  
  // Get serious events
  const seriousEvents = await openFDAClient.getSeriousAdverseEvents(drugName, 50)
  
  // Extract unique serious AE terms
  const seriousTerms = new Set<string>()
  for (const event of seriousEvents) {
    for (const reaction of event.reactions) {
      seriousTerms.add(reaction)
    }
  }
  
  const serious_ae: AdverseEvent[] = Array.from(seriousTerms).slice(0, 20).map(term => ({
    term,
    serious: true
  }))
  
  return {
    common_ae,
    serious_ae,
    faers_report_count: summary.totalReports,
    source: 'faers'
  }
}

/**
 * Fetch FAERS data from evidence_sources database (pre-fetched data)
 */
async function fetchFAERSFromDatabase(drugName: string, projectId: string): Promise<Partial<UniversalSafety>> {
  const supabase = await createClient()
  
  const { data: events, error } = await supabase
    .from('evidence_sources')
    .select('*')
    .eq('source', 'openFDA')
    .eq('project_id', projectId)
    .limit(100)
  
  if (error || !events || events.length === 0) {
    return {}
  }
  
  // Calculate total reports from payload_json
  const totalReports = events.reduce((sum, e) => {
    const payload = e.payload_json || {}
    return sum + (payload.count || 1)
  }, 0)
  
  // Map to AdverseEvent format
  const common_ae: AdverseEvent[] = events
    .filter(e => e.payload_json?.term && e.payload_json?.count)
    .map(e => {
      const payload = e.payload_json || {}
      const frequency = payload.count / totalReports
      return {
        term: payload.term || e.title,
        frequency,
        frequency_category: getFrequencyCategory(frequency),
        serious: payload.serious === true
      }
    })
    .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
    .slice(0, 20)
  
  // Filter serious AEs
  const seriousTerms = ['death', 'fatal', 'hospitalization', 'disability', 'life-threatening', 'kidney injury', 'cardiac', 'pancreatitis']
  const serious_ae: AdverseEvent[] = events
    .filter(e => {
      const term = (e.payload_json?.term || e.title || '').toLowerCase()
      return seriousTerms.some(s => term.includes(s))
    })
    .map(e => ({
      term: e.payload_json?.term || e.title,
      serious: true
    }))
    .slice(0, 10)
  
  return {
    common_ae,
    serious_ae,
    faers_report_count: totalReports,
    source: 'faers'
  }
}

/**
 * Extract warnings from text
 */
function extractWarnings(text: string): string[] {
  if (!text) return []
  
  const warnings: string[] = []
  const cleanedText = cleanText(text)
  
  // Split by numbered sections or bullet points
  const sections = cleanedText.split(/(?:\d+\.\d+|\•|\-)\s+/g)
  
  for (const section of sections) {
    const trimmed = section.trim()
    if (trimmed.length > 20 && trimmed.length < 500) {
      // Extract first sentence as warning
      const firstSentence = trimmed.split(/[.!]/)[0]
      if (firstSentence && firstSentence.length > 20) {
        warnings.push(firstSentence.trim())
      }
    }
  }
  
  // Limit to top 10 warnings
  return warnings.slice(0, 10)
}

/**
 * Extract precautions from text
 */
function extractPrecautions(text: string): string[] {
  if (!text) return []
  
  const precautions: string[] = []
  
  // Look for common precaution patterns
  const patterns = [
    /monitor[^.]+/gi,
    /caution[^.]+/gi,
    /should be used[^.]+/gi,
    /patients should[^.]+/gi,
    /use with caution[^.]+/gi
  ]
  
  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      for (const match of matches.slice(0, 3)) {
        const cleaned = cleanText(match)
        if (cleaned.length > 20 && cleaned.length < 300) {
          precautions.push(cleaned)
        }
      }
    }
  }
  
  return [...new Set(precautions)].slice(0, 8)
}

/**
 * Extract contraindications from text
 */
function extractContraindications(text: string): string[] {
  if (!text) return []
  
  const contraindications: string[] = []
  const cleanedText = cleanText(text)
  
  // Split by bullets or numbered items
  const items = cleanedText.split(/(?:\•|\-|\d+\.)\s+/g)
  
  for (const item of items) {
    const trimmed = item.trim()
    if (trimmed.length > 10 && trimmed.length < 300) {
      contraindications.push(trimmed)
    }
  }
  
  // If no items found, try to extract sentences
  if (contraindications.length === 0) {
    const sentences = cleanedText.split(/[.!]/)
    for (const sentence of sentences.slice(0, 5)) {
      const trimmed = sentence.trim()
      if (trimmed.length > 20) {
        contraindications.push(trimmed)
      }
    }
  }
  
  return contraindications.slice(0, 10)
}

/**
 * Extract adverse events from text
 */
function extractAdverseEvents(text: string): { common: AdverseEvent[]; serious: AdverseEvent[] } {
  if (!text) return { common: [], serious: [] }
  
  const common: AdverseEvent[] = []
  const serious: AdverseEvent[] = []
  
  const lowerText = text.toLowerCase()
  
  // Common AE patterns with frequencies
  const aePattern = /(\w+(?:\s+\w+)?)\s*\(?\s*(\d+(?:\.\d+)?)\s*%\s*\)?/gi
  let match
  
  while ((match = aePattern.exec(text)) !== null) {
    const term = match[1].trim()
    const frequency = parseFloat(match[2]) / 100
    
    // Skip if term is too short or looks like a number
    if (term.length < 3 || /^\d/.test(term)) continue
    
    const ae: AdverseEvent = {
      term: capitalizeFirst(term),
      frequency,
      frequency_category: getFrequencyCategory(frequency)
    }
    
    if (frequency >= 0.05) {
      common.push(ae)
    }
  }
  
  // Look for serious AE mentions
  const seriousPatterns = [
    /serious[^.]*(?:include|such as)[^.]*([^.]+)/gi,
    /(?:death|fatal|life.?threatening)[^.]+/gi,
    /(?:hospitalization|disability)[^.]+/gi
  ]
  
  for (const pattern of seriousPatterns) {
    const matches = text.match(pattern)
    if (matches) {
      for (const m of matches.slice(0, 5)) {
        // Extract individual terms
        const terms = m.split(/[,;]/).map(t => t.trim()).filter(t => t.length > 3 && t.length < 50)
        for (const term of terms) {
          serious.push({
            term: capitalizeFirst(cleanText(term)),
            serious: true
          })
        }
      }
    }
  }
  
  // Sort common by frequency
  common.sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
  
  return {
    common: common.slice(0, 20),
    serious: [...new Map(serious.map(s => [s.term.toLowerCase(), s])).values()].slice(0, 10)
  }
}

/**
 * Extract drug interactions from text
 */
function extractDrugInteractions(text: string): DrugInteraction[] {
  if (!text) return []
  
  const interactions: DrugInteraction[] = []
  
  // Common interaction patterns
  const patterns = [
    { pattern: /MAO\s*inhibitor/gi, drug: 'MAOIs', severity: 'major' as const },
    { pattern: /CYP\s*3A4\s*inhibitor/gi, drug: 'CYP3A4 inhibitors', severity: 'moderate' as const },
    { pattern: /CYP\s*2D6\s*inhibitor/gi, drug: 'CYP2D6 inhibitors', severity: 'moderate' as const },
    { pattern: /anticoagulant/gi, drug: 'Anticoagulants', severity: 'moderate' as const },
    { pattern: /NSAID/gi, drug: 'NSAIDs', severity: 'moderate' as const },
    { pattern: /aspirin/gi, drug: 'Aspirin', severity: 'moderate' as const },
    { pattern: /warfarin/gi, drug: 'Warfarin', severity: 'major' as const },
    { pattern: /serotonergic/gi, drug: 'Serotonergic drugs', severity: 'major' as const },
    { pattern: /QT.?prolong/gi, drug: 'QT-prolonging drugs', severity: 'major' as const }
  ]
  
  for (const { pattern, drug, severity } of patterns) {
    if (pattern.test(text)) {
      // Find the context around the match
      const match = text.match(new RegExp(`[^.]*${pattern.source}[^.]*`, 'i'))
      const context = match ? cleanText(match[0]) : ''
      
      interactions.push({
        drug,
        mechanism: context.slice(0, 200) || `Interaction with ${drug}`,
        severity,
        recommendation: severity === 'major' ? 'Avoid combination or use with extreme caution' : 'Monitor closely'
      })
    }
  }
  
  return interactions
}

/**
 * Extract special populations data
 */
function extractSpecialPopulations(text: string): UniversalSafety['special_populations'] {
  if (!text) return {}
  
  const populations: UniversalSafety['special_populations'] = {}
  
  // Pregnancy
  const pregnancyMatch = text.match(/pregnancy[^]*?(?=lactation|nursing|pediatric|geriatric|renal|hepatic|$)/i)
  if (pregnancyMatch) {
    populations.pregnancy = cleanText(pregnancyMatch[0]).slice(0, 500)
  }
  
  // Lactation
  const lactationMatch = text.match(/(?:lactation|nursing)[^]*?(?=pediatric|geriatric|renal|hepatic|$)/i)
  if (lactationMatch) {
    populations.lactation = cleanText(lactationMatch[0]).slice(0, 500)
  }
  
  // Pediatric
  const pediatricMatch = text.match(/pediatric[^]*?(?=geriatric|renal|hepatic|$)/i)
  if (pediatricMatch) {
    populations.pediatric = cleanText(pediatricMatch[0]).slice(0, 500)
  }
  
  // Geriatric
  const geriatricMatch = text.match(/geriatric[^]*?(?=renal|hepatic|$)/i)
  if (geriatricMatch) {
    populations.geriatric = cleanText(geriatricMatch[0]).slice(0, 500)
  }
  
  // Renal impairment
  const renalMatch = text.match(/renal[^]*?(?=hepatic|$)/i)
  if (renalMatch) {
    populations.renal_impairment = cleanText(renalMatch[0]).slice(0, 500)
  }
  
  // Hepatic impairment
  const hepaticMatch = text.match(/hepatic[^]*/i)
  if (hepaticMatch) {
    populations.hepatic_impairment = cleanText(hepaticMatch[0]).slice(0, 500)
  }
  
  return populations
}

/**
 * Extract overdose symptoms
 */
function extractOverdoseSymptoms(text: string): string {
  const symptomsMatch = text.match(/(?:signs|symptoms|manifestations)[^.]*[.]/i)
  return symptomsMatch ? cleanText(symptomsMatch[0]) : ''
}

/**
 * Extract overdose treatment
 */
function extractOverdoseTreatment(text: string): string {
  const treatmentMatch = text.match(/(?:treatment|management|therapy)[^]*?(?=\n\n|$)/i)
  return treatmentMatch ? cleanText(treatmentMatch[0]).slice(0, 500) : 'Symptomatic and supportive care'
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Clean text by removing extra whitespace and HTML
 */
function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .replace(/\n+/g, ' ')    // Remove newlines
    .trim()
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}
