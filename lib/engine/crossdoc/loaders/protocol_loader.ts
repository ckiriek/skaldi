/**
 * Protocol Loader
 * Load and normalize Protocol for cross-document validation
 */

import { createClient } from '@/lib/supabase/server'
import type {
  StructuredProtocolDocument,
  ProtocolObjective,
  ProtocolEndpoint,
  TreatmentArm,
  Visit,
  AnalysisPopulation,
} from '../types'

/**
 * Load Protocol document and extract structured data
 */
export async function loadProtocolForCrossDoc(docId: string): Promise<StructuredProtocolDocument | null> {
  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .single()

  if (error || !doc) {
    console.error('Failed to load Protocol:', error)
    return null
  }

  const content = doc.content || ''
  const metadata = doc.metadata || {}

  return {
    id: doc.id,
    version: doc.version || metadata.version,
    objectives: extractProtocolObjectives(content, metadata),
    endpoints: extractProtocolEndpoints(content, metadata),
    arms: extractTreatmentArms(content, metadata),
    visitSchedule: extractVisitSchedule(content, metadata),
    inclusionCriteria: extractInclusionCriteria(content),
    exclusionCriteria: extractExclusionCriteria(content),
    analysisPopulations: extractAnalysisPopulations(content, metadata),
    metadata,
  }
}

/**
 * Extract objectives from Protocol
 */
function extractProtocolObjectives(content: string, metadata: any): ProtocolObjective[] {
  const objectives: ProtocolObjective[] = []

  // Try metadata first
  if (metadata.objectives && Array.isArray(metadata.objectives)) {
    return metadata.objectives.map((obj: any, index: number) => ({
      id: obj.id || `prot_obj_${index}`,
      type: obj.type || 'exploratory',
      text: obj.text || obj.description || '',
    }))
  }

  // Parse from content
  const objectivesMatch = content.match(/##?\s*(?:Study\s+)?Objectives?\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (objectivesMatch) {
    const objectivesText = objectivesMatch[1]
    
    // Primary objective
    const primaryMatch = objectivesText.match(/(?:Primary|Main)\s+Objective[:\s]+(.*?)(?=\n\n|Secondary|$)/i)
    if (primaryMatch) {
      objectives.push({
        id: 'prot_obj_primary',
        type: 'primary',
        text: primaryMatch[1].trim().replace(/\n/g, ' '),
      })
    }

    // Secondary objectives
    const secondaryMatch = objectivesText.match(/Secondary\s+Objective[s]?[:\s]+([\s\S]*?)(?=\n\n|Exploratory|$)/i)
    if (secondaryMatch) {
      const items = secondaryMatch[1].split(/\n[-•*]\s+/).filter(Boolean)
      items.forEach((item, index) => {
        objectives.push({
          id: `prot_obj_secondary_${index}`,
          type: 'secondary',
          text: item.trim().replace(/\n/g, ' '),
        })
      })
    }

    // Exploratory objectives
    const exploratoryMatch = objectivesText.match(/Exploratory\s+Objective[s]?[:\s]+([\s\S]*?)(?=\n\n|$)/i)
    if (exploratoryMatch) {
      const items = exploratoryMatch[1].split(/\n[-•*]\s+/).filter(Boolean)
      items.forEach((item, index) => {
        objectives.push({
          id: `prot_obj_exploratory_${index}`,
          type: 'exploratory',
          text: item.trim().replace(/\n/g, ' '),
        })
      })
    }
  }

  return objectives
}

/**
 * Extract endpoints from Protocol
 */
function extractProtocolEndpoints(content: string, metadata: any): ProtocolEndpoint[] {
  const endpoints: ProtocolEndpoint[] = []

  // Try metadata first
  if (metadata.endpoints && Array.isArray(metadata.endpoints)) {
    return metadata.endpoints.map((ep: any, index: number) => ({
      id: ep.id || `prot_ep_${index}`,
      type: ep.type || 'exploratory',
      name: ep.name || '',
      description: ep.description || '',
      dataType: ep.dataType,
      variable: ep.variable,
    }))
  }

  // Parse from content
  const endpointsMatch = content.match(/##?\s*(?:Study\s+)?Endpoints?\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (endpointsMatch) {
    const endpointsText = endpointsMatch[1]
    
    // Primary endpoint
    const primaryMatch = endpointsText.match(/Primary\s+Endpoint[:\s]+(.*?)(?=\n\n|Secondary|$)/i)
    if (primaryMatch) {
      endpoints.push({
        id: 'prot_ep_primary',
        type: 'primary',
        name: extractEndpointName(primaryMatch[1]),
        description: primaryMatch[1].trim().replace(/\n/g, ' '),
      })
    }

    // Secondary endpoints
    const secondaryMatch = endpointsText.match(/Secondary\s+Endpoint[s]?[:\s]+([\s\S]*?)(?=\n\n|$)/i)
    if (secondaryMatch) {
      const items = secondaryMatch[1].split(/\n[-•*]\s+/).filter(Boolean)
      items.forEach((item, index) => {
        endpoints.push({
          id: `prot_ep_secondary_${index}`,
          type: 'secondary',
          name: extractEndpointName(item),
          description: item.trim().replace(/\n/g, ' '),
        })
      })
    }
  }

  return endpoints
}

/**
 * Extract endpoint name from description
 */
function extractEndpointName(text: string): string {
  // Take first sentence or first 100 chars
  const firstSentence = text.split(/[.!?]/)[0]
  return firstSentence.trim().substring(0, 100)
}

/**
 * Extract treatment arms
 */
function extractTreatmentArms(content: string, metadata: any): TreatmentArm[] {
  const arms: TreatmentArm[] = []

  // Try metadata first
  if (metadata.arms && Array.isArray(metadata.arms)) {
    return metadata.arms.map((arm: any, index: number) => ({
      id: arm.id || `prot_arm_${index}`,
      name: arm.name || '',
      dose: arm.dose,
      route: arm.route,
      frequency: arm.frequency,
      description: arm.description,
    }))
  }

  // Parse from content
  const armsMatch = content.match(/##?\s*(?:Treatment\s+)?Arms?\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (armsMatch) {
    const armsText = armsMatch[1]
    const armItems = armsText.split(/\n[-•*]\s+|Arm\s+\d+:/i).filter(Boolean)
    
    armItems.forEach((item, index) => {
      arms.push({
        id: `prot_arm_${index}`,
        name: extractArmName(item),
        dose: extractDose(item),
        route: extractRoute(item),
        frequency: extractFrequency(item),
        description: item.trim().substring(0, 200),
      })
    })
  }

  return arms
}

function extractArmName(text: string): string {
  const firstLine = text.split('\n')[0]
  return firstLine.trim().substring(0, 100)
}

function extractDose(text: string): string | undefined {
  const doseMatch = text.match(/(\d+(?:\.\d+)?\s*(?:mg|g|mcg|µg|IU|mL)(?:\/day|\/week)?)/i)
  return doseMatch ? doseMatch[1] : undefined
}

function extractRoute(text: string): string | undefined {
  const routes = ['oral', 'IV', 'intravenous', 'subcutaneous', 'SC', 'IM', 'intramuscular']
  for (const route of routes) {
    if (text.toLowerCase().includes(route.toLowerCase())) {
      return route
    }
  }
  return undefined
}

function extractFrequency(text: string): string | undefined {
  const frequencies = ['once daily', 'twice daily', 'QD', 'BID', 'TID', 'weekly']
  for (const freq of frequencies) {
    if (text.toLowerCase().includes(freq.toLowerCase())) {
      return freq
    }
  }
  return undefined
}

/**
 * Extract visit schedule
 */
function extractVisitSchedule(content: string, metadata: any): Visit[] {
  const visits: Visit[] = []

  if (metadata.visits && Array.isArray(metadata.visits)) {
    return metadata.visits.map((v: any, index: number) => ({
      id: v.id || `prot_visit_${index}`,
      name: v.name || '',
      day: v.day,
      week: v.week,
      procedures: v.procedures || [],
    }))
  }

  return visits
}

/**
 * Extract inclusion criteria
 */
function extractInclusionCriteria(content: string): string[] {
  const criteria: string[] = []
  
  const inclusionMatch = content.match(/##?\s*Inclusion\s+Criteria\s*\n([\s\S]*?)(?=\n##|Exclusion|\n---|\Z)/i)
  
  if (inclusionMatch) {
    const items = inclusionMatch[1].split(/\n\d+\.\s+|\n[-•*]\s+/).filter(Boolean)
    items.forEach(item => {
      const cleaned = item.trim().replace(/\n/g, ' ')
      if (cleaned.length > 10) {
        criteria.push(cleaned)
      }
    })
  }

  return criteria
}

/**
 * Extract exclusion criteria
 */
function extractExclusionCriteria(content: string): string[] {
  const criteria: string[] = []
  
  const exclusionMatch = content.match(/##?\s*Exclusion\s+Criteria\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
  
  if (exclusionMatch) {
    const items = exclusionMatch[1].split(/\n\d+\.\s+|\n[-•*]\s+/).filter(Boolean)
    items.forEach(item => {
      const cleaned = item.trim().replace(/\n/g, ' ')
      if (cleaned.length > 10) {
        criteria.push(cleaned)
      }
    })
  }

  return criteria
}

/**
 * Extract analysis populations
 */
function extractAnalysisPopulations(content: string, metadata: any): AnalysisPopulation[] {
  const populations: AnalysisPopulation[] = []

  if (metadata.populations && Array.isArray(metadata.populations)) {
    return metadata.populations.map((p: any, index: number) => ({
      id: p.id || `prot_pop_${index}`,
      name: p.name || '',
      abbreviation: p.abbreviation || '',
      description: p.description || '',
    }))
  }

  return populations
}
