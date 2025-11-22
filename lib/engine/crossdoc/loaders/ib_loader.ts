/**
 * IB Loader
 * Load and normalize Investigator's Brochure for cross-document validation
 */

import { createClient } from '@/lib/supabase/server'
import type { StructuredIbDocument, IbObjective, DosingInfo } from '../types'

/**
 * Load IB document and extract structured data
 */
export async function loadIbForCrossDoc(docId: string): Promise<StructuredIbDocument | null> {
  const supabase = await createClient()

  // Load document from database
  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .eq('type', 'IB')
    .single()

  if (error || !doc) {
    console.error('Failed to load IB:', error)
    return null
  }

  // Extract structured data from content
  const content = doc.content || ''
  const metadata = doc.metadata || {}

  return {
    id: doc.id,
    version: doc.version || metadata.version,
    objectives: extractIbObjectives(content, metadata),
    mechanismOfAction: extractMechanismOfAction(content),
    targetPopulation: extractTargetPopulation(content),
    keyRiskProfile: extractKeyRisks(content),
    dosingInformation: extractDosingInfo(content, metadata),
    metadata,
  }
}

/**
 * Extract objectives from IB content
 */
function extractIbObjectives(content: string, metadata: any): IbObjective[] {
  const objectives: IbObjective[] = []

  // Try to extract from metadata first
  if (metadata.objectives && Array.isArray(metadata.objectives)) {
    return metadata.objectives.map((obj: any, index: number) => ({
      id: obj.id || `ib_obj_${index}`,
      type: obj.type || 'exploratory',
      text: obj.text || obj.description || '',
    }))
  }

  // Parse from content - look for objectives section
  const objectivesMatch = content.match(/##?\s*(?:Study\s+)?Objectives?\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (objectivesMatch) {
    const objectivesText = objectivesMatch[1]
    
    // Look for primary objective
    const primaryMatch = objectivesText.match(/(?:Primary|Main)\s+Objective[:\s]+(.*?)(?=\n\n|Secondary|$)/i)
    if (primaryMatch) {
      objectives.push({
        id: 'ib_obj_primary',
        type: 'primary',
        text: primaryMatch[1].trim().replace(/\n/g, ' '),
      })
    }

    // Look for secondary objectives
    const secondaryMatch = objectivesText.match(/Secondary\s+Objective[s]?[:\s]+([\s\S]*?)(?=\n\n|$)/i)
    if (secondaryMatch) {
      const secondaryText = secondaryMatch[1]
      const secondaryItems = secondaryText.split(/\n[-•*]\s+/).filter(Boolean)
      
      secondaryItems.forEach((item, index) => {
        objectives.push({
          id: `ib_obj_secondary_${index}`,
          type: 'secondary',
          text: item.trim().replace(/\n/g, ' '),
        })
      })
    }
  }

  return objectives
}

/**
 * Extract mechanism of action
 */
function extractMechanismOfAction(content: string): string | undefined {
  const moaMatch = content.match(/##?\s*Mechanism\s+of\s+Action\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (moaMatch) {
    return moaMatch[1].trim().substring(0, 500) // First 500 chars
  }

  return undefined
}

/**
 * Extract target population
 */
function extractTargetPopulation(content: string): string | undefined {
  const populationMatch = content.match(/##?\s*(?:Target\s+)?Population\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (populationMatch) {
    return populationMatch[1].trim().substring(0, 500)
  }

  return undefined
}

/**
 * Extract key risks
 */
function extractKeyRisks(content: string): string[] {
  const risks: string[] = []
  
  const risksMatch = content.match(/##?\s*(?:Key\s+)?Risk[s]?\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (risksMatch) {
    const risksText = risksMatch[1]
    const riskItems = risksText.split(/\n[-•*]\s+/).filter(Boolean)
    
    riskItems.forEach(item => {
      const cleaned = item.trim().replace(/\n/g, ' ')
      if (cleaned.length > 10) {
        risks.push(cleaned)
      }
    })
  }

  return risks
}

/**
 * Extract dosing information
 */
function extractDosingInfo(content: string, metadata: any): DosingInfo[] {
  const dosingInfo: DosingInfo[] = []

  // Try metadata first
  if (metadata.dosing && Array.isArray(metadata.dosing)) {
    return metadata.dosing.map((d: any, index: number) => ({
      id: d.id || `ib_dose_${index}`,
      dose: d.dose || d.dosage || '',
      route: d.route || '',
      frequency: d.frequency || '',
      duration: d.duration,
    }))
  }

  // Parse from content
  const dosingMatch = content.match(/##?\s*Dosing?\s*(?:Information|Regimen)?\s*\n([\s\S]*?)(?=\n##|\n---|$)/i)
  
  if (dosingMatch) {
    const dosingText = dosingMatch[1]
    
    // Look for dose patterns like "10 mg", "100 mg/day", etc.
    const dosePattern = /(\d+(?:\.\d+)?\s*(?:mg|g|mcg|µg|IU|mL)(?:\/day|\/week)?)/gi
    const doses = dosingText.match(dosePattern)
    
    if (doses) {
      doses.forEach((dose, index) => {
        dosingInfo.push({
          id: `ib_dose_${index}`,
          dose: dose.trim(),
          route: extractRoute(dosingText),
          frequency: extractFrequency(dosingText),
        })
      })
    }
  }

  return dosingInfo
}

/**
 * Extract route of administration
 */
function extractRoute(text: string): string {
  const routes = ['oral', 'IV', 'intravenous', 'subcutaneous', 'SC', 'IM', 'intramuscular', 'topical']
  
  for (const route of routes) {
    if (text.toLowerCase().includes(route.toLowerCase())) {
      return route
    }
  }

  return 'not specified'
}

/**
 * Extract frequency
 */
function extractFrequency(text: string): string {
  const frequencies = ['once daily', 'twice daily', 'QD', 'BID', 'TID', 'QID', 'weekly', 'monthly']
  
  for (const freq of frequencies) {
    if (text.toLowerCase().includes(freq.toLowerCase())) {
      return freq
    }
  }

  return 'not specified'
}
