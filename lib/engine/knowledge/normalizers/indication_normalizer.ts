/**
 * Phase H.3: Indication Normalizer
 * 
 * Cleans and normalizes clinical indications
 */

import type { NormalizedIndication } from '../types'

// Common prefixes to remove
const INDICATION_PREFIXES = [
  'treatment of',
  'for the treatment of',
  'therapy of',
  'for the therapy of',
  'management of',
  'for the management of',
  'prevention of',
  'for the prevention of',
  'indicated for',
  'used for',
  'used in',
  'for'
]

// ICD-10 mapping (simplified - in production would use full ICD-10 database)
const ICD10_MAPPINGS: Record<string, string> = {
  'type 2 diabetes mellitus': 'E11',
  'type 2 diabetes': 'E11',
  'diabetes mellitus type 2': 'E11',
  'hypertension': 'I10',
  'essential hypertension': 'I10',
  'heart failure': 'I50',
  'congestive heart failure': 'I50',
  'bacterial vaginosis': 'N76.0',
  'asthma': 'J45',
  'copd': 'J44',
  'chronic obstructive pulmonary disease': 'J44',
  'atopic dermatitis': 'L20',
  'psoriasis': 'L40',
  'rheumatoid arthritis': 'M06',
  'osteoarthritis': 'M19',
  'depression': 'F32',
  'major depressive disorder': 'F32',
  'anxiety': 'F41',
  'schizophrenia': 'F20'
}

// Indication categories/tags
const INDICATION_TAGS: Record<string, string[]> = {
  'diabetes': ['endocrine', 'metabolic'],
  'hypertension': ['cardiovascular'],
  'heart failure': ['cardiovascular'],
  'bacterial vaginosis': ['gynecological', 'infectious'],
  'asthma': ['respiratory'],
  'copd': ['respiratory'],
  'dermatitis': ['dermatological'],
  'psoriasis': ['dermatological'],
  'arthritis': ['rheumatological', 'musculoskeletal'],
  'depression': ['psychiatric', 'mental health'],
  'anxiety': ['psychiatric', 'mental health'],
  'schizophrenia': ['psychiatric', 'mental health']
}

/**
 * Normalize indication text
 */
export function normalizeIndication(raw: string): NormalizedIndication {
  if (!raw || typeof raw !== 'string') {
    return {
      original: raw || '',
      cleaned: '',
      tags: []
    }
  }
  
  // Step 1: Clean the input
  let cleaned = raw.trim()
  
  // Step 2: Remove common prefixes
  const lowerCleaned = cleaned.toLowerCase()
  for (const prefix of INDICATION_PREFIXES) {
    if (lowerCleaned.startsWith(prefix)) {
      cleaned = cleaned.substring(prefix.length).trim()
      break
    }
  }
  
  // Step 3: Remove trailing punctuation
  cleaned = cleaned.replace(/[.,;:]+$/, '')
  
  // Step 4: Normalize case (capitalize first letter of each word)
  cleaned = cleaned
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  
  // Step 5: Try to match ICD-10 code
  const lowerForMatch = cleaned.toLowerCase()
  const icd10Code = ICD10_MAPPINGS[lowerForMatch]
  
  // Step 6: Extract tags
  const tags = extractTags(lowerForMatch)
  
  return {
    original: raw,
    cleaned,
    icd10Code,
    tags
  }
}

/**
 * Extract tags from indication
 */
function extractTags(indication: string): string[] {
  const tags = new Set<string>()
  
  for (const [keyword, keywordTags] of Object.entries(INDICATION_TAGS)) {
    if (indication.includes(keyword)) {
      keywordTags.forEach(tag => tags.add(tag))
    }
  }
  
  return Array.from(tags)
}

/**
 * Normalize multiple indications
 */
export function normalizeIndications(rawIndications: string[]): NormalizedIndication[] {
  return rawIndications.map(normalizeIndication)
}

/**
 * Merge duplicate indications
 */
export function mergeIndications(indications: NormalizedIndication[]): NormalizedIndication[] {
  const merged = new Map<string, NormalizedIndication>()
  
  for (const indication of indications) {
    const key = indication.cleaned.toLowerCase()
    
    if (!merged.has(key)) {
      merged.set(key, indication)
    } else {
      // Merge tags
      const existing = merged.get(key)!
      const combinedTags = new Set([...existing.tags, ...indication.tags])
      merged.set(key, {
        ...existing,
        tags: Array.from(combinedTags)
      })
    }
  }
  
  return Array.from(merged.values())
}
