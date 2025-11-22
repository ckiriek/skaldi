/**
 * Endpoints Mapping
 * Map endpoints between Protocol, SAP, and CSR
 */

import type {
  StructuredProtocolDocument,
  StructuredSapDocument,
  StructuredCsrDocument,
  EndpointLink,
} from '../types'
import { combinedSimilarity } from './similarity'

/**
 * Map endpoints across Protocol, SAP, and CSR
 */
export async function mapEndpoints(
  protocol?: StructuredProtocolDocument,
  sap?: StructuredSapDocument,
  csr?: StructuredCsrDocument
): Promise<EndpointLink[]> {
  const links: EndpointLink[] = []

  if (!protocol) return links

  const protocolEndpoints = protocol.endpoints || []

  // Map Protocol to SAP
  if (sap) {
    const sapPrimary = sap.primaryEndpoints || []
    const sapSecondary = sap.secondaryEndpoints || []

    // Map primary endpoints
    const protocolPrimary = protocolEndpoints.filter(ep => ep.type === 'primary')
    protocolPrimary.forEach(protEp => {
      const match = findBestEndpointMatch(protEp, sapPrimary)
      
      links.push({
        protocolEndpointId: protEp.id,
        sapEndpointId: match?.id,
        type: 'primary',
        similarityScore: match?.score || 0,
        aligned: (match?.score || 0) >= 0.6,
      })
    })

    // Map secondary endpoints
    const protocolSecondary = protocolEndpoints.filter(ep => ep.type === 'secondary')
    const usedSapIds = new Set<string>()

    protocolSecondary.forEach(protEp => {
      const match = findBestEndpointMatch(protEp, sapSecondary, usedSapIds)
      
      if (match) {
        usedSapIds.add(match.id)
      }

      links.push({
        protocolEndpointId: protEp.id,
        sapEndpointId: match?.id,
        type: 'secondary',
        similarityScore: match?.score || 0,
        aligned: (match?.score || 0) >= 0.6,
      })
    })
  }

  // Map Protocol to CSR
  if (csr) {
    const csrPrimary = csr.reportedPrimaryEndpoints || []
    const csrSecondary = csr.reportedSecondaryEndpoints || []

    // Map primary endpoints
    const protocolPrimary = protocolEndpoints.filter(ep => ep.type === 'primary')
    protocolPrimary.forEach(protEp => {
      const match = findBestCsrEndpointMatch(protEp, csrPrimary)
      
      // Find existing link to update
      const existingLink = links.find(
        link => link.protocolEndpointId === protEp.id && link.type === 'primary'
      )

      if (existingLink) {
        existingLink.csrEndpointId = match?.id
      } else {
        links.push({
          protocolEndpointId: protEp.id,
          csrEndpointId: match?.id,
          type: 'primary',
          similarityScore: match?.score || 0,
          aligned: (match?.score || 0) >= 0.6,
        })
      }
    })

    // Map secondary endpoints
    const protocolSecondary = protocolEndpoints.filter(ep => ep.type === 'secondary')
    const usedCsrIds = new Set<string>()

    protocolSecondary.forEach(protEp => {
      const match = findBestCsrEndpointMatch(protEp, csrSecondary, usedCsrIds)
      
      if (match) {
        usedCsrIds.add(match.id)
      }

      const existingLink = links.find(
        link => link.protocolEndpointId === protEp.id && link.type === 'secondary'
      )

      if (existingLink) {
        existingLink.csrEndpointId = match?.id
      } else {
        links.push({
          protocolEndpointId: protEp.id,
          csrEndpointId: match?.id,
          type: 'secondary',
          similarityScore: match?.score || 0,
          aligned: (match?.score || 0) >= 0.6,
        })
      }
    })
  }

  return links
}

/**
 * Find best matching endpoint from SAP
 */
function findBestEndpointMatch(
  protocolEndpoint: any,
  sapEndpoints: any[],
  usedIds: Set<string> = new Set()
): { id: string; score: number } | null {
  const threshold = 0.5
  let bestMatch: { id: string; score: number } | null = null

  sapEndpoints.forEach(sapEp => {
    if (usedIds.has(sapEp.id)) return

    // Compare both name and description
    const nameScore = combinedSimilarity(protocolEndpoint.name, sapEp.name)
    const descScore = combinedSimilarity(
      protocolEndpoint.description || '',
      sapEp.description || ''
    )

    // Weighted average: name 60%, description 40%
    const score = nameScore * 0.6 + descScore * 0.4

    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: sapEp.id, score }
    }
  })

  return bestMatch
}

/**
 * Find best matching endpoint from CSR
 */
function findBestCsrEndpointMatch(
  protocolEndpoint: any,
  csrEndpoints: any[],
  usedIds: Set<string> = new Set()
): { id: string; score: number } | null {
  const threshold = 0.5
  let bestMatch: { id: string; score: number } | null = null

  csrEndpoints.forEach(csrEp => {
    if (usedIds.has(csrEp.id)) return

    const score = combinedSimilarity(protocolEndpoint.name, csrEp.name)

    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: csrEp.id, score }
    }
  })

  return bestMatch
}

/**
 * Validate endpoint alignment
 */
export function validateEndpointAlignment(links: EndpointLink[]): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check primary endpoints
  const primaryLinks = links.filter(link => link.type === 'primary')
  const alignedPrimary = primaryLinks.filter(link => link.aligned)

  if (primaryLinks.length > 0 && alignedPrimary.length === 0) {
    issues.push('Primary endpoints are not aligned across documents')
  }

  // Check for missing SAP endpoints
  const missingInSap = links.filter(
    link => link.protocolEndpointId && !link.sapEndpointId && link.type === 'primary'
  )
  if (missingInSap.length > 0) {
    issues.push(`${missingInSap.length} primary endpoint(s) missing in SAP`)
  }

  // Check for missing CSR endpoints
  const missingInCsr = links.filter(
    link => link.protocolEndpointId && !link.csrEndpointId && link.type === 'primary'
  )
  if (missingInCsr.length > 0) {
    issues.push(`${missingInCsr.length} primary endpoint(s) missing in CSR`)
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}
