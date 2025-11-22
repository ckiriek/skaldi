/**
 * Objectives Mapping
 * Map objectives between IB and Protocol
 */

import type { StructuredIbDocument, StructuredProtocolDocument, ObjectiveLink } from '../types'
import { combinedSimilarity } from './similarity'

/**
 * Map objectives between IB and Protocol
 */
export async function mapObjectives(
  ib?: StructuredIbDocument,
  protocol?: StructuredProtocolDocument
): Promise<ObjectiveLink[]> {
  const links: ObjectiveLink[] = []

  if (!ib || !protocol) return links

  const ibObjectives = ib.objectives || []
  const protocolObjectives = protocol.objectives || []

  // Map by type first (primary to primary, secondary to secondary)
  const ibByType = groupByType(ibObjectives)
  const protocolByType = groupByType(protocolObjectives)

  // Map primary objectives
  if (ibByType.primary.length > 0 && protocolByType.primary.length > 0) {
    const primaryLinks = mapObjectivesByType(
      ibByType.primary,
      protocolByType.primary,
      'primary'
    )
    links.push(...primaryLinks)
  }

  // Map secondary objectives
  if (ibByType.secondary.length > 0 && protocolByType.secondary.length > 0) {
    const secondaryLinks = mapObjectivesByType(
      ibByType.secondary,
      protocolByType.secondary,
      'secondary'
    )
    links.push(...secondaryLinks)
  }

  // Map exploratory objectives
  if (ibByType.exploratory.length > 0 && protocolByType.exploratory.length > 0) {
    const exploratoryLinks = mapObjectivesByType(
      ibByType.exploratory,
      protocolByType.exploratory,
      'exploratory'
    )
    links.push(...exploratoryLinks)
  }

  return links
}

/**
 * Group objectives by type
 */
function groupByType(objectives: any[]) {
  return {
    primary: objectives.filter(obj => obj.type === 'primary'),
    secondary: objectives.filter(obj => obj.type === 'secondary'),
    exploratory: objectives.filter(obj => obj.type === 'exploratory'),
  }
}

/**
 * Map objectives of the same type
 */
function mapObjectivesByType(
  ibObjectives: any[],
  protocolObjectives: any[],
  type: 'primary' | 'secondary' | 'exploratory'
): ObjectiveLink[] {
  const links: ObjectiveLink[] = []
  const threshold = 0.6 // Similarity threshold

  // For primary objectives, try 1:1 mapping
  if (type === 'primary') {
    if (ibObjectives.length > 0 && protocolObjectives.length > 0) {
      const ibObj = ibObjectives[0]
      const protObj = protocolObjectives[0]
      const score = combinedSimilarity(ibObj.text, protObj.text)

      links.push({
        ibObjectiveId: ibObj.id,
        protocolObjectiveId: protObj.id,
        type,
        similarityScore: score,
        aligned: score >= threshold,
      })
    }
  } else {
    // For secondary/exploratory, try to match each IB objective to best Protocol objective
    const usedProtocolIds = new Set<string>()

    ibObjectives.forEach(ibObj => {
      let bestMatch: { id: string; score: number } | null = null

      protocolObjectives.forEach(protObj => {
        if (usedProtocolIds.has(protObj.id)) return

        const score = combinedSimilarity(ibObj.text, protObj.text)
        if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { id: protObj.id, score }
        }
      })

      if (bestMatch && bestMatch.id) {
        usedProtocolIds.add(bestMatch.id)
        links.push({
          ibObjectiveId: ibObj.id,
          protocolObjectiveId: bestMatch.id,
          type,
          similarityScore: bestMatch.score || 0,
          aligned: true,
        })
      } else {
        // No match found - IB objective without Protocol counterpart
        links.push({
          ibObjectiveId: ibObj.id,
          type,
          similarityScore: 0,
          aligned: false,
        })
      }
    })

    // Find Protocol objectives without IB counterparts
    protocolObjectives.forEach(protObj => {
      if (!usedProtocolIds.has(protObj.id)) {
        links.push({
          protocolObjectiveId: protObj.id,
          type,
          similarityScore: 0,
          aligned: false,
        })
      }
    })
  }

  return links
}

/**
 * Validate objective alignment
 */
export function validateObjectiveAlignment(links: ObjectiveLink[]): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check if primary objectives are aligned
  const primaryLinks = links.filter(link => link.type === 'primary')
  const alignedPrimary = primaryLinks.filter(link => link.aligned)

  if (primaryLinks.length > 0 && alignedPrimary.length === 0) {
    issues.push('Primary objectives are not aligned between IB and Protocol')
  }

  // Check for low similarity scores
  links.forEach(link => {
    if (link.aligned && link.similarityScore < 0.7) {
      issues.push(
        `Low similarity (${(link.similarityScore * 100).toFixed(0)}%) for ${link.type} objective`
      )
    }
  })

  return {
    valid: issues.length === 0,
    issues,
  }
}
