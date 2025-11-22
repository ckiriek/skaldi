/**
 * Protocol-SAP Flow Validation Rules
 * Validates consistency between Protocol and SAP
 */

import type { FlowIssue, Visit, Procedure, EndpointProcedureMap } from '../types'

/**
 * Rule: ENDPOINT_TIMING_DRIFT
 * Endpoint assessment timing in SAP must match Protocol visit schedule
 */
export function checkEndpointTimingDrift(
  endpointMaps: EndpointProcedureMap[],
  protocolVisits: Visit[],
  sapAssessmentSchedule: Array<{ endpointId: string; visitIds: string[] }>
): FlowIssue[] {
  const issues: FlowIssue[] = []

  endpointMaps.forEach(endpointMap => {
    const sapSchedule = sapAssessmentSchedule.find(
      s => s.endpointId === endpointMap.endpointId
    )

    if (!sapSchedule) {
      issues.push({
        id: `ENDPOINT_TIMING_DRIFT_${endpointMap.endpointId}`,
        code: 'ENDPOINT_TIMING_DRIFT',
        severity: endpointMap.endpointType === 'primary' ? 'critical' : 'error',
        category: 'timing',
        message: `Endpoint "${endpointMap.endpointName}" timing not defined in SAP`,
        details: `The ${endpointMap.endpointType} endpoint "${endpointMap.endpointName}" is defined in the Protocol but its assessment schedule is not specified in the SAP.`,
        suggestions: [
          {
            id: `fix_timing_${endpointMap.endpointId}`,
            label: 'Add assessment schedule to SAP',
            autoFixable: true,
            changes: [
              {
                type: 'add_visit',
                targetId: 'sap',
                newValue: {
                  endpointId: endpointMap.endpointId,
                  timing: endpointMap.timing,
                },
                reason: 'SAP must specify when each endpoint will be assessed',
              },
            ],
          },
        ],
      })
    }
  })

  return issues
}

/**
 * Rule: MISSING_ASSESSMENT_FOR_ENDPOINT
 * All primary endpoints must have assessment procedures in Protocol
 */
export function checkMissingAssessmentForEndpoint(
  endpointMaps: EndpointProcedureMap[],
  protocolProcedures: Procedure[]
): FlowIssue[] {
  const issues: FlowIssue[] = []

  const primaryEndpoints = endpointMaps.filter(e => e.endpointType === 'primary')

  primaryEndpoints.forEach(endpointMap => {
    const hasRequiredProcedures = endpointMap.requiredProcedures.every(procId =>
      protocolProcedures.some(p => p.id === procId)
    )

    if (!hasRequiredProcedures) {
      const missingProcs = endpointMap.requiredProcedures.filter(
        procId => !protocolProcedures.some(p => p.id === procId)
      )

      issues.push({
        id: `MISSING_ASSESSMENT_${endpointMap.endpointId}`,
        code: 'MISSING_ASSESSMENT_FOR_ENDPOINT',
        severity: 'critical',
        category: 'procedure',
        message: `Missing assessment procedures for primary endpoint "${endpointMap.endpointName}"`,
        details: `The primary endpoint "${endpointMap.endpointName}" requires ${missingProcs.length} procedures that are not included in the Protocol.`,
        affectedProcedures: missingProcs,
        suggestions: [
          {
            id: `add_procs_${endpointMap.endpointId}`,
            label: `Add ${missingProcs.length} required procedures to Protocol`,
            autoFixable: true,
            changes: missingProcs.map(procId => ({
              type: 'add_procedure' as const,
              targetId: 'protocol',
              newValue: procId,
              reason: `Required for primary endpoint "${endpointMap.endpointName}"`,
            })),
          },
        ],
      })
    }
  })

  return issues
}

/**
 * Rule: INCORRECT_SCHEDULE_FOR_PRIMARY
 * Primary endpoint assessments must occur at baseline and end of treatment
 */
export function checkIncorrectScheduleForPrimary(
  endpointMaps: EndpointProcedureMap[],
  protocolVisits: Visit[]
): FlowIssue[] {
  const issues: FlowIssue[] = []

  const primaryEndpoints = endpointMaps.filter(e => e.endpointType === 'primary')

  primaryEndpoints.forEach(endpointMap => {
    const hasBaseline = protocolVisits.some(v => v.type === 'baseline')
    const hasEOT = protocolVisits.some(
      v => v.type === 'end_of_treatment' || v.type === 'follow_up'
    )

    if (endpointMap.timing.baseline && !hasBaseline) {
      issues.push({
        id: `NO_BASELINE_${endpointMap.endpointId}`,
        code: 'INCORRECT_SCHEDULE_FOR_PRIMARY',
        severity: 'critical',
        category: 'visit',
        message: `No baseline visit for primary endpoint "${endpointMap.endpointName}"`,
        details: `Primary endpoint "${endpointMap.endpointName}" requires baseline assessment, but no baseline visit is defined in the Protocol.`,
        suggestions: [
          {
            id: 'add_baseline',
            label: 'Add baseline visit to Protocol',
            autoFixable: true,
            changes: [
              {
                type: 'add_visit',
                targetId: 'protocol',
                newValue: {
                  type: 'baseline',
                  day: 0,
                },
                reason: 'Baseline required for primary endpoint assessment',
              },
            ],
          },
        ],
      })
    }

    if (endpointMap.timing.followUp && !hasEOT) {
      issues.push({
        id: `NO_EOT_${endpointMap.endpointId}`,
        code: 'INCORRECT_SCHEDULE_FOR_PRIMARY',
        severity: 'error',
        category: 'visit',
        message: `No end-of-treatment visit for primary endpoint "${endpointMap.endpointName}"`,
        details: `Primary endpoint "${endpointMap.endpointName}" requires end-of-treatment assessment, but no EOT or follow-up visit is defined.`,
        suggestions: [
          {
            id: 'add_eot',
            label: 'Add end-of-treatment visit to Protocol',
            autoFixable: true,
            changes: [
              {
                type: 'add_visit',
                targetId: 'protocol',
                newValue: {
                  type: 'end_of_treatment',
                },
                reason: 'EOT required for primary endpoint assessment',
              },
            ],
          },
        ],
      })
    }
  })

  return issues
}

/**
 * All Protocol-SAP flow rules
 */
export const protocolSapFlowRules = [
  checkEndpointTimingDrift,
  checkMissingAssessmentForEndpoint,
  checkIncorrectScheduleForPrimary,
]
