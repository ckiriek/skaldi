/**
 * Universal Nonclinical Enricher
 * 
 * Enriches nonclinical (preclinical) data for any compound.
 * Uses REAL DATA from FDA label via openFDA API - NO FALLBACKS.
 * 
 * Sources:
 * 1. openFDA Drug Label API (nonclinical toxicology section)
 * 
 * @version 2.0.0
 * @date 2025-12-03
 */

import type { UniversalCompound } from '@/lib/core/compound-model'
import type { UniversalNonclinical } from '@/lib/core/nonclinical-model'
import { calculateNonclinicalCompleteness } from '@/lib/core/nonclinical-model'
import { openFDAClient, type DrugLabel } from '@/lib/integrations/openfda'

// ============================================================================
// MAIN ENRICHER
// ============================================================================

/**
 * Enrich nonclinical data for a compound
 * Uses REAL DATA from FDA label - NO FALLBACKS
 * 
 * @param compound - Compound data
 * @returns Enriched nonclinical data
 */
export async function enrichNonclinical(
  compound: UniversalCompound
): Promise<UniversalNonclinical> {
  console.log(`[Nonclinical Enricher] Starting enrichment for ${compound.inn_name}`)
  
  // Fetch FDA label from openFDA API
  const label = await openFDAClient.getFullDrugLabel(compound.inn_name)
  
  if (!label) {
    console.warn(`[Nonclinical Enricher] No FDA label found for ${compound.inn_name}`)
    return {
      source: 'not_available',
      completeness_score: 0,
      last_updated: new Date().toISOString()
    }
  }
  
  // Extract nonclinical data from label
  const extracted = extractNonclinicalFromLabel(label)
  
  // Build complete result
  const hasData = Object.keys(extracted).filter(k => k !== 'source').length > 0
  
  const result: UniversalNonclinical = {
    ...extracted,
    source: hasData ? 'label' : 'not_available',
    completeness_score: 0,
    last_updated: new Date().toISOString()
  }
  
  result.completeness_score = calculateNonclinicalCompleteness(result)
  
  console.log(`[Nonclinical Enricher] Enrichment complete. Source: ${result.source}. Completeness: ${Math.round(result.completeness_score * 100)}%`)
  
  return result
}

// ============================================================================
// LABEL EXTRACTION
// ============================================================================

/**
 * Extract nonclinical data from FDA label (DrugLabel object from openFDA)
 */
function extractNonclinicalFromLabel(label: DrugLabel): Partial<UniversalNonclinical> {
  const nonclinical: Partial<UniversalNonclinical> = {
    source: 'label'
  }
  
  // Get nonclinical toxicology section
  const nonclinicalTox = label.nonclinicalToxicology || ''
  
  // Get mechanism of action for PD info
  if (label.mechanismOfAction) {
    nonclinical.primary_pharmacodynamics = cleanText(label.mechanismOfAction).slice(0, 1000)
  }
  
  // Parse nonclinical toxicology section
  if (nonclinicalTox) {
    // Extract carcinogenicity
    const carcinoMatch = nonclinicalTox.match(/carcinogen[^]*?(?=mutagen|fertility|genotox|$)/i)
    if (carcinoMatch) {
      nonclinical.carcinogenicity = cleanText(carcinoMatch[0]).slice(0, 1000)
    }
    
    // Extract genotoxicity/mutagenicity
    const geneMatch = nonclinicalTox.match(/(?:mutagen|genotox)[^]*?(?=fertility|impairment|carcinogen|$)/i)
    if (geneMatch) {
      nonclinical.genotoxicity = cleanText(geneMatch[0]).slice(0, 1000)
    }
    
    // Extract reproductive toxicity
    const reproMatch = nonclinicalTox.match(/(?:fertility|impairment of fertility|reproductive)[^]*/i)
    if (reproMatch) {
      nonclinical.reproductive_toxicity = cleanText(reproMatch[0]).slice(0, 1000)
    }
    
    // Target organs
    const targetOrgans = extractTargetOrgans(nonclinicalTox)
    if (targetOrgans.length > 0) {
      nonclinical.target_organs = targetOrgans
    }
    
    // Extract NOAEL if mentioned
    const noaelMatch = nonclinicalTox.match(/NOAEL[^.]*(\d+(?:\.\d+)?)\s*(mg\/kg|mg\/m2)/i)
    if (noaelMatch) {
      nonclinical.noael = {
        value: `${noaelMatch[1]} ${noaelMatch[2]}`,
        species: extractSpecies(nonclinicalTox),
        duration: extractDuration(nonclinicalTox)
      }
    }
  }
  
  return nonclinical
}

/**
 * Extract target organs from text
 */
function extractTargetOrgans(text: string): string[] {
  const organs: string[] = []
  
  // Common target organs to look for
  const organPatterns = [
    { pattern: /liver|hepat/i, organ: 'Liver' },
    { pattern: /kidney|renal/i, organ: 'Kidney' },
    { pattern: /heart|cardi/i, organ: 'Heart' },
    { pattern: /lung|pulmon/i, organ: 'Lung' },
    { pattern: /brain|cns|central nervous/i, organ: 'Central Nervous System' },
    { pattern: /bone marrow|hematop/i, organ: 'Bone Marrow' },
    { pattern: /thyroid/i, organ: 'Thyroid' },
    { pattern: /adrenal/i, organ: 'Adrenal Gland' },
    { pattern: /spleen/i, organ: 'Spleen' },
    { pattern: /gastrointestinal|gi tract|stomach|intestin/i, organ: 'Gastrointestinal Tract' },
    { pattern: /reproductive|testes|ovary/i, organ: 'Reproductive System' },
    { pattern: /immune|lymph/i, organ: 'Immune System' },
    { pattern: /skin|dermal/i, organ: 'Skin' },
    { pattern: /eye|ocular/i, organ: 'Eye' },
    { pattern: /muscle|skeletal/i, organ: 'Skeletal Muscle' }
  ]
  
  for (const { pattern, organ } of organPatterns) {
    if (pattern.test(text)) {
      organs.push(organ)
    }
  }
  
  return [...new Set(organs)]
}

/**
 * Extract species from text
 */
function extractSpecies(text: string): string {
  const speciesPatterns = [
    { pattern: /rat/i, species: 'Rat' },
    { pattern: /mouse|mice/i, species: 'Mouse' },
    { pattern: /dog/i, species: 'Dog' },
    { pattern: /monkey|primate|cynomolgus/i, species: 'Monkey' },
    { pattern: /rabbit/i, species: 'Rabbit' }
  ]
  
  for (const { pattern, species } of speciesPatterns) {
    if (pattern.test(text)) {
      return species
    }
  }
  
  return 'Not specified'
}

/**
 * Extract study duration from text
 */
function extractDuration(text: string): string {
  const durationMatch = text.match(/(\d+)\s*(?:-|to)?\s*(\d+)?\s*(week|month|day|year)/i)
  if (durationMatch) {
    const num = durationMatch[2] ? `${durationMatch[1]}-${durationMatch[2]}` : durationMatch[1]
    return `${num} ${durationMatch[3]}s`
  }
  return 'Not specified'
}

/**
 * Clean text by removing extra whitespace and HTML
 */
function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()
}
