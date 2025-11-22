/**
 * Cross-Document Alignment
 * Export all alignment modules
 */

export * from './similarity'
export * from './objectives_map'
export * from './endpoints_map'
export * from './dose_map'

import type { CrossDocBundle, CrossDocAlignments } from '../types'
import { mapObjectives } from './objectives_map'
import { mapEndpoints } from './endpoints_map'
import { mapDoses } from './dose_map'

/**
 * Build complete alignments for a document bundle
 */
export async function buildAlignments(bundle: CrossDocBundle): Promise<CrossDocAlignments> {
  const { ib, protocol, icf, sap, csr } = bundle

  // Map objectives (IB ↔ Protocol)
  const objectives = await mapObjectives(ib, protocol)

  // Map endpoints (Protocol ↔ SAP ↔ CSR)
  const endpoints = await mapEndpoints(protocol, sap, csr)

  // Map doses (IB ↔ Protocol ↔ SAP)
  const doses = await mapDoses(ib, protocol, sap)

  // Populations and visits - TODO: implement when needed
  const populations: any[] = []
  const visits: any[] = []

  return {
    objectives,
    endpoints,
    doses,
    populations,
    visits,
  }
}
