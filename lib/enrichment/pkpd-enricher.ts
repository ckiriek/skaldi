/**
 * Universal PK/PD Enricher
 * 
 * Enriches pharmacokinetics and pharmacodynamics data for any compound.
 * Uses REAL DATA from FDA label via openFDA API - NO FALLBACKS.
 * 
 * Sources:
 * 1. openFDA Drug Label API (primary)
 * 2. DailyMed API (backup)
 * 
 * @version 2.0.0
 * @date 2025-12-03
 */

import type { UniversalCompound } from '@/lib/core/compound-model'
import type { UniversalPK, UniversalPD, UniversalPKPD } from '@/lib/core/pkpd-model'
import { calculatePKCompleteness } from '@/lib/core/pkpd-model'
import { openFDAClient, type DrugLabel } from '@/lib/integrations/openfda'

// ============================================================================
// MAIN ENRICHER
// ============================================================================

/**
 * Enrich PK/PD data for a compound
 * Uses REAL DATA from FDA label - NO FALLBACKS
 * 
 * @param compound - Compound data
 * @returns Enriched PK and PD data
 */
export async function enrichPKPD(
  compound: UniversalCompound
): Promise<UniversalPKPD> {
  console.log(`[PKPD Enricher] Starting enrichment for ${compound.inn_name}`)
  
  // 1. Fetch FDA label from openFDA API
  const label = await openFDAClient.getFullDrugLabel(compound.inn_name)
  
  if (!label) {
    console.warn(`[PKPD Enricher] No FDA label found for ${compound.inn_name}`)
    return {
      pk: { source: 'not_available', completeness_score: 0 },
      pd: { source: 'not_available' }
    }
  }
  
  // 2. Extract PK data from label
  const pk = extractPKFromLabel(label)
  
  // 3. Extract PD data from label
  const pd = extractPDFromLabel(label)
  
  // 4. Calculate completeness
  pk.completeness_score = calculatePKCompleteness(pk)
  
  const pkFields = Object.keys(pk).filter(k => k !== 'source' && k !== 'completeness_score' && (pk as any)[k])
  const pdFields = Object.keys(pd).filter(k => k !== 'source' && (pd as any)[k])
  
  console.log(`[PKPD Enricher] Enrichment complete. PK fields: ${pkFields.length}, PD fields: ${pdFields.length}, completeness: ${Math.round(pk.completeness_score * 100)}%`)
  
  return { pk, pd }
}

/**
 * Extract PK data from FDA label
 */
function extractPKFromLabel(label: DrugLabel): UniversalPK {
  const pk: UniversalPK = {
    source: 'label'
  }
  
  // Use pre-extracted structured PK data from openFDA client
  if (label.pkData) {
    if (label.pkData.tmax) pk.tmax = label.pkData.tmax
    if (label.pkData.tHalf) pk.t_half = label.pkData.tHalf
    if (label.pkData.bioavailability) pk.bioavailability = label.pkData.bioavailability
    if (label.pkData.foodEffect) pk.food_effect = label.pkData.foodEffect
    
    if (label.pkData.proteinBinding || label.pkData.volumeOfDistribution) {
      pk.distribution = {
        protein_binding: label.pkData.proteinBinding,
        vd: label.pkData.volumeOfDistribution
      }
    }
    
    if (label.pkData.metabolism) {
      pk.metabolism = {
        primary_pathway: label.pkData.metabolism
      }
    }
    
    if (label.pkData.elimination || label.pkData.clearance) {
      pk.elimination = {
        route: label.pkData.elimination,
        clearance: label.pkData.clearance
      }
    }
    
    if (label.pkData.renalImpairment || label.pkData.hepaticImpairment) {
      pk.special_populations = {
        renal_impairment: label.pkData.renalImpairment,
        hepatic_impairment: label.pkData.hepaticImpairment
      }
    }
  }
  
  // Also parse from raw text if available
  if (label.pharmacokinetics || label.clinicalPharmacology) {
    const text = (label.pharmacokinetics || '') + '\n' + (label.clinicalPharmacology || '')
    
    // Absorption description
    if (text.toLowerCase().includes('well absorbed') || text.toLowerCase().includes('rapidly absorbed')) {
      pk.absorption = 'Well absorbed after oral administration'
    } else if (text.toLowerCase().includes('poorly absorbed')) {
      pk.absorption = 'Poorly absorbed after oral administration'
    }
    
    // Extract CYP enzymes if not already done
    if (!pk.metabolism?.enzymes) {
      const cypMatch = text.match(/cyp\s*(\d[a-z]\d+)/gi)
      if (cypMatch) {
        const enzymes = [...new Set(cypMatch.map(m => m.toUpperCase().replace(/\s/g, '')))]
        pk.metabolism = {
          ...pk.metabolism,
          enzymes
        }
      }
    }
  }
  
  return pk
}

/**
 * Extract PD data from FDA label
 */
function extractPDFromLabel(label: DrugLabel): UniversalPD {
  const pd: UniversalPD = {
    source: 'label'
  }
  
  // Mechanism of action
  if (label.mechanismOfAction) {
    pd.mechanism = label.mechanismOfAction.slice(0, 1000) // Truncate if too long
  }
  
  // Parse pharmacodynamics section
  const pdText = (label.pharmacodynamics || '') + '\n' + (label.clinicalPharmacology || '')
  const lowerText = pdText.toLowerCase()
  
  // QT effect
  if (lowerText.includes('qt') || lowerText.includes('qtc')) {
    if (lowerText.includes('prolong') && !lowerText.includes('not') && !lowerText.includes('no ')) {
      pd.qt_effect = 'QT prolongation observed; ECG monitoring recommended'
    } else if (lowerText.includes('no clinically significant') || (lowerText.includes('no') && lowerText.includes('qt'))) {
      pd.qt_effect = 'No clinically significant QT prolongation'
    }
  }
  
  // Onset of action
  const onsetMatch = pdText.match(/(?:onset|begins? to work|effect (?:seen|observed))[^.]*(\d+(?:\.\d+)?(?:\s*[-–to]\s*\d+(?:\.\d+)?)?)\s*(hours?|days?|weeks?|minutes?)/i)
  if (onsetMatch) {
    pd.onset_of_action = `${onsetMatch[1]} ${onsetMatch[2]}`
  }
  
  // Duration of effect
  const durationMatch = pdText.match(/(?:duration of (?:effect|action)|effect lasts?)[^.]*(\d+(?:\.\d+)?(?:\s*[-–to]\s*\d+(?:\.\d+)?)?)\s*(hours?|days?|weeks?)/i)
  if (durationMatch) {
    pd.duration_of_effect = `${durationMatch[1]} ${durationMatch[2]}`
  }
  
  return pd
}

/**
 * Enrich only PK data
 */
export async function enrichPK(compound: UniversalCompound): Promise<UniversalPK> {
  const { pk } = await enrichPKPD(compound)
  return pk
}

/**
 * Enrich only PD data
 */
export async function enrichPD(compound: UniversalCompound): Promise<UniversalPD> {
  const { pd } = await enrichPKPD(compound)
  return pd
}
