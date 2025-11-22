/**
 * Visit-Endpoint Alignment
 * Validates that visits have correct procedures for endpoints
 */

import type {
  Visit,
  Procedure,
  VisitEndpointAlignment,
  EndpointProcedureMap,
  VisitId,
  EndpointId,
  ProcedureId,
} from '../types'
import { getProceduresForEndpointAtVisit } from './endpoint_procedure_map'

/**
 * Check visit-endpoint alignment
 */
export function checkVisitEndpointAlignment(
  visit: Visit,
  endpointMap: EndpointProcedureMap,
  availableProcedures: Procedure[]
): VisitEndpointAlignment {
  // Get required procedures for this endpoint at this visit type
  const requiredProcIds = getProceduresForEndpointAtVisit(endpointMap, visit.type)

  // Check which procedures are present
  const hasProcedures = requiredProcIds.every(procId =>
    visit.procedures.includes(procId)
  )

  // Find missing procedures
  const missingProcedures = requiredProcIds.filter(
    procId => !visit.procedures.includes(procId)
  )

  // Check timing
  const timingCorrect = checkTimingCorrect(visit, endpointMap)

  return {
    visitId: visit.id,
    endpointId: endpointMap.endpointId,
    hasProcedures,
    missingProcedures,
    timingCorrect,
    aligned: hasProcedures && timingCorrect,
  }
}

/**
 * Check if timing is correct for endpoint
 */
function checkTimingCorrect(
  visit: Visit,
  endpointMap: EndpointProcedureMap
): boolean {
  switch (visit.type) {
    case 'baseline':
      return endpointMap.timing.baseline
    case 'treatment':
      return endpointMap.timing.treatment
    case 'follow_up':
    case 'end_of_treatment':
      return endpointMap.timing.followUp
    case 'screening':
      // Screening typically doesn't have endpoint assessments
      return false
    case 'unscheduled':
      // Unscheduled visits are flexible
      return true
    default:
      return false
  }
}

/**
 * Check alignment for all visits and endpoints
 */
export function checkAllVisitEndpointAlignments(
  visits: Visit[],
  endpointMaps: EndpointProcedureMap[],
  availableProcedures: Procedure[]
): VisitEndpointAlignment[] {
  const alignments: VisitEndpointAlignment[] = []

  visits.forEach(visit => {
    endpointMaps.forEach(endpointMap => {
      const alignment = checkVisitEndpointAlignment(
        visit,
        endpointMap,
        availableProcedures
      )
      alignments.push(alignment)
    })
  })

  return alignments
}

/**
 * Get misaligned visit-endpoint pairs
 */
export function getMisalignedPairs(
  alignments: VisitEndpointAlignment[]
): VisitEndpointAlignment[] {
  return alignments.filter(a => !a.aligned)
}

/**
 * Get alignment summary
 */
export function getAlignmentSummary(
  alignments: VisitEndpointAlignment[]
): {
  total: number
  aligned: number
  misaligned: number
  alignmentPercentage: number
  missingProceduresCount: number
  timingIssuesCount: number
} {
  const total = alignments.length
  const aligned = alignments.filter(a => a.aligned).length
  const misaligned = total - aligned
  const alignmentPercentage = total > 0 ? (aligned / total) * 100 : 0

  const missingProceduresCount = alignments.filter(
    a => !a.hasProcedures
  ).length

  const timingIssuesCount = alignments.filter(
    a => !a.timingCorrect
  ).length

  return {
    total,
    aligned,
    misaligned,
    alignmentPercentage,
    missingProceduresCount,
    timingIssuesCount,
  }
}

/**
 * Get alignment by visit
 */
export function getAlignmentByVisit(
  alignments: VisitEndpointAlignment[],
  visits: Visit[]
): Array<{
  visit: Visit
  totalEndpoints: number
  alignedEndpoints: number
  misalignedEndpoints: number
  alignmentPercentage: number
}> {
  return visits.map(visit => {
    const visitAlignments = alignments.filter(a => a.visitId === visit.id)
    const totalEndpoints = visitAlignments.length
    const alignedEndpoints = visitAlignments.filter(a => a.aligned).length
    const misalignedEndpoints = totalEndpoints - alignedEndpoints
    const alignmentPercentage = totalEndpoints > 0
      ? (alignedEndpoints / totalEndpoints) * 100
      : 0

    return {
      visit,
      totalEndpoints,
      alignedEndpoints,
      misalignedEndpoints,
      alignmentPercentage,
    }
  })
}

/**
 * Get alignment by endpoint
 */
export function getAlignmentByEndpoint(
  alignments: VisitEndpointAlignment[],
  endpointMaps: EndpointProcedureMap[]
): Array<{
  endpointMap: EndpointProcedureMap
  totalVisits: number
  alignedVisits: number
  misalignedVisits: number
  alignmentPercentage: number
}> {
  return endpointMaps.map(endpointMap => {
    const endpointAlignments = alignments.filter(
      a => a.endpointId === endpointMap.endpointId
    )
    const totalVisits = endpointAlignments.length
    const alignedVisits = endpointAlignments.filter(a => a.aligned).length
    const misalignedVisits = totalVisits - alignedVisits
    const alignmentPercentage = totalVisits > 0
      ? (alignedVisits / totalVisits) * 100
      : 0

    return {
      endpointMap,
      totalVisits,
      alignedVisits,
      misalignedVisits,
      alignmentPercentage,
    }
  })
}

/**
 * Suggest procedures to add to visits
 */
export function suggestProceduresToAdd(
  alignments: VisitEndpointAlignment[],
  visits: Visit[],
  endpointMaps: EndpointProcedureMap[]
): Array<{
  visitId: VisitId
  visitName: string
  endpointId: EndpointId
  endpointName: string
  proceduresToAdd: ProcedureId[]
  reason: string
}> {
  const suggestions: Array<{
    visitId: VisitId
    visitName: string
    endpointId: EndpointId
    endpointName: string
    proceduresToAdd: ProcedureId[]
    reason: string
  }> = []

  const misaligned = getMisalignedPairs(alignments)

  misaligned.forEach(alignment => {
    if (alignment.missingProcedures.length > 0) {
      const visit = visits.find(v => v.id === alignment.visitId)
      const endpointMap = endpointMaps.find(
        e => e.endpointId === alignment.endpointId
      )

      if (visit && endpointMap) {
        suggestions.push({
          visitId: visit.id,
          visitName: visit.name,
          endpointId: endpointMap.endpointId,
          endpointName: endpointMap.endpointName,
          proceduresToAdd: alignment.missingProcedures,
          reason: `Required for ${endpointMap.endpointType} endpoint "${endpointMap.endpointName}"`,
        })
      }
    }
  })

  return suggestions
}

/**
 * Auto-fix visit-endpoint alignment
 */
export function autoFixVisitEndpointAlignment(
  visits: Visit[],
  alignments: VisitEndpointAlignment[],
  endpointMaps: EndpointProcedureMap[]
): {
  updatedVisits: Visit[]
  changesApplied: number
  suggestions: Array<{
    visitId: VisitId
    proceduresAdded: ProcedureId[]
    reason: string
  }>
} {
  const updatedVisits = visits.map(v => ({ ...v, procedures: [...v.procedures] }))
  let changesApplied = 0
  const suggestions: Array<{
    visitId: VisitId
    proceduresAdded: ProcedureId[]
    reason: string
  }> = []

  const misaligned = getMisalignedPairs(alignments)

  misaligned.forEach(alignment => {
    if (alignment.missingProcedures.length > 0) {
      const visitIndex = updatedVisits.findIndex(v => v.id === alignment.visitId)
      const endpointMap = endpointMaps.find(e => e.endpointId === alignment.endpointId)

      if (visitIndex !== -1 && endpointMap) {
        const visit = updatedVisits[visitIndex]
        const proceduresAdded: ProcedureId[] = []

        alignment.missingProcedures.forEach(procId => {
          if (!visit.procedures.includes(procId)) {
            visit.procedures.push(procId)
            proceduresAdded.push(procId)
            changesApplied++
          }
        })

        if (proceduresAdded.length > 0) {
          suggestions.push({
            visitId: visit.id,
            proceduresAdded,
            reason: `Added procedures for ${endpointMap.endpointType} endpoint "${endpointMap.endpointName}"`,
          })
        }
      }
    }
  })

  return {
    updatedVisits,
    changesApplied,
    suggestions,
  }
}

/**
 * Validate primary endpoint coverage
 */
export function validatePrimaryEndpointCoverage(
  visits: Visit[],
  endpointMaps: EndpointProcedureMap[],
  availableProcedures: Procedure[]
): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  const primaryEndpoints = endpointMaps.filter(e => e.endpointType === 'primary')

  primaryEndpoints.forEach(endpointMap => {
    // Check baseline
    if (endpointMap.timing.baseline) {
      const baselineVisit = visits.find(v => v.type === 'baseline')
      if (!baselineVisit) {
        errors.push(`No baseline visit found for primary endpoint "${endpointMap.endpointName}"`)
      } else {
        const alignment = checkVisitEndpointAlignment(
          baselineVisit,
          endpointMap,
          availableProcedures
        )
        if (!alignment.aligned) {
          errors.push(
            `Baseline visit missing procedures for primary endpoint "${endpointMap.endpointName}"`
          )
        }
      }
    }

    // Check treatment visits
    if (endpointMap.timing.treatment) {
      const treatmentVisits = visits.filter(v => v.type === 'treatment')
      if (treatmentVisits.length === 0) {
        warnings.push(
          `No treatment visits found for primary endpoint "${endpointMap.endpointName}"`
        )
      } else {
        let hasAlignedTreatmentVisit = false
        treatmentVisits.forEach(visit => {
          const alignment = checkVisitEndpointAlignment(
            visit,
            endpointMap,
            availableProcedures
          )
          if (alignment.aligned) {
            hasAlignedTreatmentVisit = true
          }
        })
        if (!hasAlignedTreatmentVisit) {
          errors.push(
            `No treatment visit has procedures for primary endpoint "${endpointMap.endpointName}"`
          )
        }
      }
    }

    // Check follow-up
    if (endpointMap.timing.followUp) {
      const followUpVisits = visits.filter(
        v => v.type === 'follow_up' || v.type === 'end_of_treatment'
      )
      if (followUpVisits.length === 0) {
        warnings.push(
          `No follow-up visit found for primary endpoint "${endpointMap.endpointName}"`
        )
      }
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
