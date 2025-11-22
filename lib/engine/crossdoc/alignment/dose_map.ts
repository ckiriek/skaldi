/**
 * Dose Mapping
 * Map dosing information between IB, Protocol, and SAP
 */

import type { StructuredIbDocument, StructuredProtocolDocument, StructuredSapDocument, DoseLink } from '../types'
import { combinedSimilarity, normalizeText } from './similarity'

/**
 * Map doses across IB, Protocol, and SAP
 */
export async function mapDoses(
  ib?: StructuredIbDocument,
  protocol?: StructuredProtocolDocument,
  sap?: StructuredSapDocument
): Promise<DoseLink[]> {
  const links: DoseLink[] = []

  if (!ib && !protocol) return links

  const ibDoses = ib?.dosingInformation || []
  const protocolArms = protocol?.arms || []

  // Map IB doses to Protocol arms
  ibDoses.forEach(ibDose => {
    const match = findBestArmMatch(ibDose, protocolArms)

    links.push({
      ibDoseId: ibDose.id,
      protocolArmId: match?.id,
      similarityScore: match?.score || 0,
      aligned: (match?.score || 0) >= 0.6,
    })
  })

  // Find Protocol arms without IB counterparts
  const usedArmIds = new Set(links.map(link => link.protocolArmId).filter(Boolean))
  protocolArms.forEach(arm => {
    if (!usedArmIds.has(arm.id)) {
      links.push({
        protocolArmId: arm.id,
        similarityScore: 0,
        aligned: false,
      })
    }
  })

  return links
}

/**
 * Find best matching Protocol arm for IB dose
 */
function findBestArmMatch(
  ibDose: any,
  protocolArms: any[]
): { id: string; score: number } | null {
  const threshold = 0.5
  let bestMatch: { id: string; score: number } | null = null

  protocolArms.forEach(arm => {
    let score = 0

    // Compare dose values
    if (ibDose.dose && arm.dose) {
      const doseScore = compareDoses(ibDose.dose, arm.dose)
      score += doseScore * 0.5
    }

    // Compare route
    if (ibDose.route && arm.route) {
      const routeScore = combinedSimilarity(ibDose.route, arm.route)
      score += routeScore * 0.3
    }

    // Compare frequency
    if (ibDose.frequency && arm.frequency) {
      const freqScore = combinedSimilarity(ibDose.frequency, arm.frequency)
      score += freqScore * 0.2
    }

    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: arm.id, score }
    }
  })

  return bestMatch
}

/**
 * Compare dose values (e.g., "10 mg" vs "10mg" vs "10 milligrams")
 */
function compareDoses(dose1: string, dose2: string): number {
  const normalized1 = normalizeDose(dose1)
  const normalized2 = normalizeDose(dose2)

  if (normalized1 === normalized2) return 1.0

  // Extract numeric value and unit
  const match1 = normalized1.match(/(\d+(?:\.\d+)?)\s*(\w+)/)
  const match2 = normalized2.match(/(\d+(?:\.\d+)?)\s*(\w+)/)

  if (!match1 || !match2) {
    return combinedSimilarity(dose1, dose2)
  }

  const [, value1, unit1] = match1
  const [, value2, unit2] = match2

  // Compare units
  const unitScore = compareUnits(unit1, unit2)
  if (unitScore < 0.8) return unitScore * 0.5

  // Compare values
  const num1 = parseFloat(value1)
  const num2 = parseFloat(value2)

  if (num1 === num2) return 1.0

  // Allow small differences (within 10%)
  const diff = Math.abs(num1 - num2) / Math.max(num1, num2)
  if (diff < 0.1) return 0.9

  return 0.5
}

/**
 * Normalize dose string
 */
function normalizeDose(dose: string): string {
  return normalizeText(dose)
    .replace(/milligrams?/gi, 'mg')
    .replace(/grams?/gi, 'g')
    .replace(/micrograms?/gi, 'mcg')
    .replace(/µg/g, 'mcg')
    .replace(/\s+/g, '')
}

/**
 * Compare dose units
 */
function compareUnits(unit1: string, unit2: string): number {
  const normalized1 = unit1.toLowerCase()
  const normalized2 = unit2.toLowerCase()

  if (normalized1 === normalized2) return 1.0

  // Common equivalents
  const equivalents: Record<string, string[]> = {
    mg: ['milligram', 'milligrams'],
    g: ['gram', 'grams'],
    mcg: ['microgram', 'micrograms', 'µg'],
    ml: ['milliliter', 'milliliters'],
    iu: ['international unit', 'international units'],
  }

  for (const [standard, variants] of Object.entries(equivalents)) {
    if (
      (normalized1 === standard || variants.includes(normalized1)) &&
      (normalized2 === standard || variants.includes(normalized2))
    ) {
      return 1.0
    }
  }

  return 0.3
}

/**
 * Validate dose alignment
 */
export function validateDoseAlignment(links: DoseLink[]): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  const alignedLinks = links.filter(link => link.aligned)
  const totalLinks = links.filter(link => link.ibDoseId || link.protocolArmId)

  if (totalLinks.length > 0 && alignedLinks.length === 0) {
    issues.push('No doses are aligned between IB and Protocol')
  }

  // Check for IB doses without Protocol counterparts
  const orphanedIbDoses = links.filter(
    link => link.ibDoseId && !link.protocolArmId
  )
  if (orphanedIbDoses.length > 0) {
    issues.push(`${orphanedIbDoses.length} IB dose(s) not found in Protocol`)
  }

  // Check for Protocol arms without IB counterparts
  const orphanedProtocolArms = links.filter(
    link => link.protocolArmId && !link.ibDoseId
  )
  if (orphanedProtocolArms.length > 0) {
    issues.push(`${orphanedProtocolArms.length} Protocol arm(s) not found in IB`)
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}
