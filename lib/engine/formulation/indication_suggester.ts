/**
 * Phase H.1: Indication Suggester
 * 
 * Context-aware indication suggestions based on formulation
 */

import type { ParsedFormulation, IndicationSuggestion, DosageForm, Route } from './types'
import { getFormulationIndications, isLocalFormulation } from './formulation_catalog'

/**
 * Get indication suggestions with confidence scores
 */
export async function suggestIndications(
  parsed: ParsedFormulation,
  options: {
    includeSystemic?: boolean
    includeFDA?: boolean
    includeEMA?: boolean
    maxSuggestions?: number
  } = {}
): Promise<IndicationSuggestion[]> {
  const {
    includeSystemic = true,
    includeFDA = true,
    includeEMA = true,
    maxSuggestions = 10,
  } = options
  
  const suggestions: IndicationSuggestion[] = []
  
  // 1. Check for formulation-specific indications (highest priority)
  const isLocal = isLocalFormulation(parsed.dosageForm, parsed.route)
  
  if (isLocal) {
    const localIndications = getFormulationIndications(parsed.dosageForm, parsed.route)
    
    for (const indication of localIndications) {
      suggestions.push({
        indication,
        confidence: 0.95,
        source: 'formulation-specific',
        formRelevance: 'local',
      })
    }
  }
  
  // 2. Add systemic indications if requested and not overridden by local
  if (includeSystemic && (!isLocal || suggestions.length === 0)) {
    const systemicIndications = await getSystemicIndications(parsed.apiName, {
      includeFDA,
      includeEMA,
    })
    
    for (const indication of systemicIndications) {
      suggestions.push(indication)
    }
  }
  
  // 3. Sort by confidence and limit
  suggestions.sort((a, b) => b.confidence - a.confidence)
  
  return suggestions.slice(0, maxSuggestions)
}

/**
 * Get systemic indications from external sources
 */
async function getSystemicIndications(
  apiName: string,
  options: {
    includeFDA?: boolean
    includeEMA?: boolean
  }
): Promise<IndicationSuggestion[]> {
  const suggestions: IndicationSuggestion[] = []
  
  // TODO: Integrate with actual FDA/EMA/DrugBank APIs
  // For now, return placeholder suggestions
  
  // Common indications based on drug class patterns
  const commonIndications = getCommonIndicationsByDrugClass(apiName)
  
  for (const indication of commonIndications) {
    suggestions.push({
      indication,
      confidence: 0.7,
      source: 'drugbank',
      formRelevance: 'systemic',
    })
  }
  
  return suggestions
}

/**
 * Get common indications based on drug class
 */
function getCommonIndicationsByDrugClass(apiName: string): string[] {
  const lowerName = apiName.toLowerCase()
  
  // Antibiotics
  if (lowerName.includes('cillin') || lowerName.includes('mycin') || lowerName.includes('cycline')) {
    return [
      'Bacterial Infections',
      'Respiratory Tract Infections',
      'Skin and Soft Tissue Infections',
      'Urinary Tract Infections',
    ]
  }
  
  // Antivirals
  if (lowerName.endsWith('vir')) {
    return [
      'Viral Infections',
      'HIV Infection',
      'Herpes Simplex',
      'Influenza',
    ]
  }
  
  // Statins
  if (lowerName.endsWith('statin')) {
    return [
      'Hypercholesterolemia',
      'Dyslipidemia',
      'Cardiovascular Disease Prevention',
      'Atherosclerosis',
    ]
  }
  
  // Beta-blockers
  if (lowerName.endsWith('olol')) {
    return [
      'Hypertension',
      'Angina Pectoris',
      'Heart Failure',
      'Arrhythmias',
    ]
  }
  
  // ACE inhibitors
  if (lowerName.endsWith('pril')) {
    return [
      'Hypertension',
      'Heart Failure',
      'Diabetic Nephropathy',
      'Post-Myocardial Infarction',
    ]
  }
  
  // ARBs
  if (lowerName.endsWith('sartan')) {
    return [
      'Hypertension',
      'Heart Failure',
      'Diabetic Nephropathy',
      'Stroke Prevention',
    ]
  }
  
  // PPIs
  if (lowerName.endsWith('prazole')) {
    return [
      'Gastroesophageal Reflux Disease (GERD)',
      'Peptic Ulcer Disease',
      'Zollinger-Ellison Syndrome',
      'H. Pylori Eradication',
    ]
  }
  
  // Diuretics
  if (lowerName.endsWith('ide') && (lowerName.includes('thiazide') || lowerName.includes('furosemide'))) {
    return [
      'Hypertension',
      'Edema',
      'Heart Failure',
      'Chronic Kidney Disease',
    ]
  }
  
  // Metronidazole (special case)
  if (lowerName.includes('metronidazole')) {
    return [
      'Anaerobic Bacterial Infections',
      'Protozoal Infections',
      'H. Pylori Eradication',
      'Bacterial Vaginosis',
      'Trichomonas Vaginalis',
      'Rosacea',
    ]
  }
  
  // Insulin
  if (lowerName.includes('insulin')) {
    return [
      'Type 1 Diabetes Mellitus',
      'Type 2 Diabetes Mellitus',
      'Diabetic Ketoacidosis',
      'Hyperglycemia',
    ]
  }
  
  // Metformin
  if (lowerName.includes('metformin')) {
    return [
      'Type 2 Diabetes Mellitus',
      'Polycystic Ovary Syndrome (PCOS)',
      'Prediabetes',
    ]
  }
  
  // Sitagliptin (DPP-4 inhibitors)
  if (lowerName.includes('gliptin')) {
    return [
      'Type 2 Diabetes Mellitus',
      'Glycemic Control',
    ]
  }
  
  // Default
  return [
    'To be determined based on drug class',
    'Consult FDA/EMA labeling',
  ]
}

/**
 * Filter indications by formulation relevance
 */
export function filterIndicationsByFormulation(
  indications: IndicationSuggestion[],
  dosageForm: DosageForm | null,
  route: Route | null
): IndicationSuggestion[] {
  const isLocal = isLocalFormulation(dosageForm, route)
  
  if (isLocal) {
    // Prefer local indications
    return indications.filter(ind => 
      ind.formRelevance === 'local' || ind.formRelevance === 'both'
    )
  }
  
  // Prefer systemic indications
  return indications.filter(ind => 
    ind.formRelevance === 'systemic' || ind.formRelevance === 'both'
  )
}

/**
 * Merge indication suggestions from multiple sources
 */
export function mergeIndicationSuggestions(
  ...suggestionLists: IndicationSuggestion[][]
): IndicationSuggestion[] {
  const merged = new Map<string, IndicationSuggestion>()
  
  for (const list of suggestionLists) {
    for (const suggestion of list) {
      const existing = merged.get(suggestion.indication)
      
      if (!existing || suggestion.confidence > existing.confidence) {
        merged.set(suggestion.indication, suggestion)
      }
    }
  }
  
  return Array.from(merged.values()).sort((a, b) => b.confidence - a.confidence)
}

/**
 * Get indication category
 */
export function getIndicationCategory(indication: string): string {
  const lower = indication.toLowerCase()
  
  if (lower.includes('vaginosis') || lower.includes('vaginitis') || lower.includes('trichomonas')) {
    return 'Gynecological'
  }
  
  if (lower.includes('conjunctivitis') || lower.includes('keratitis') || lower.includes('eye')) {
    return 'Ophthalmic'
  }
  
  if (lower.includes('asthma') || lower.includes('copd') || lower.includes('bronch')) {
    return 'Respiratory'
  }
  
  if (lower.includes('dermatitis') || lower.includes('psoriasis') || lower.includes('eczema') || lower.includes('skin')) {
    return 'Dermatological'
  }
  
  if (lower.includes('diabetes') || lower.includes('glycemic')) {
    return 'Endocrine'
  }
  
  if (lower.includes('hypertension') || lower.includes('heart') || lower.includes('cardiovascular')) {
    return 'Cardiovascular'
  }
  
  if (lower.includes('infection') || lower.includes('bacterial') || lower.includes('viral')) {
    return 'Infectious Disease'
  }
  
  if (lower.includes('gerd') || lower.includes('ulcer') || lower.includes('gastro')) {
    return 'Gastrointestinal'
  }
  
  return 'Other'
}
