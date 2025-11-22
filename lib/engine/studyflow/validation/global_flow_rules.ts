/**
 * Global Flow Validation Rules
 * Cross-document flow integrity checks
 */

import type { FlowIssue, Visit, TreatmentCycle, StudyFlow } from '../types'

/**
 * Rule: FLOW_INTEGRITY_DRIFT
 * Overall study flow must be coherent across all documents
 */
export function checkFlowIntegrityDrift(
  protocolVisits: Visit[],
  sapVisits: Visit[],
  icfVisitCount: number
): FlowIssue[] {
  const issues: FlowIssue[] = []

  const protocolVisitCount = protocolVisits.filter(v => v.type !== 'unscheduled').length
  const sapVisitCount = sapVisits.filter(v => v.type !== 'unscheduled').length

  // Check Protocol vs SAP
  if (Math.abs(protocolVisitCount - sapVisitCount) > 1) {
    issues.push({
      id: 'FLOW_INTEGRITY_DRIFT_PROTOCOL_SAP',
      code: 'FLOW_INTEGRITY_DRIFT',
      severity: 'error',
      category: 'global',
      message: 'Visit count mismatch between Protocol and SAP',
      details: `Protocol defines ${protocolVisitCount} visits, but SAP specifies ${sapVisitCount} visits. This inconsistency must be resolved.`,
      affectedVisits: [...protocolVisits.map(v => v.id), ...sapVisits.map(v => v.id)],
      suggestions: [
        {
          id: 'align_visits',
          label: 'Align visit schedules between Protocol and SAP',
          autoFixable: false,
          changes: [
            {
              type: 'modify_visit',
              targetId: 'sap',
              field: 'visit_count',
              oldValue: sapVisitCount,
              newValue: protocolVisitCount,
              reason: 'SAP must match Protocol visit schedule',
            },
          ],
        },
      ],
    })
  }

  // Check Protocol vs ICF
  if (icfVisitCount > 0 && Math.abs(protocolVisitCount - icfVisitCount) > 2) {
    issues.push({
      id: 'FLOW_INTEGRITY_DRIFT_PROTOCOL_ICF',
      code: 'FLOW_INTEGRITY_DRIFT',
      severity: 'warning',
      category: 'global',
      message: 'Visit count mismatch between Protocol and ICF',
      details: `Protocol defines ${protocolVisitCount} visits, but ICF mentions ${icfVisitCount} visits.`,
      affectedVisits: protocolVisits.map(v => v.id),
      suggestions: [
        {
          id: 'align_icf_visits',
          label: 'Update ICF visit count to match Protocol',
          autoFixable: false,
          changes: [
            {
              type: 'modify_visit',
              targetId: 'icf',
              field: 'visit_count',
              oldValue: icfVisitCount,
              newValue: protocolVisitCount,
              reason: 'ICF should accurately reflect Protocol visit schedule',
            },
          ],
        },
      ],
    })
  }

  return issues
}

/**
 * Rule: CYCLES_INCONSISTENT
 * Treatment cycles must be consistent across documents
 */
export function checkCyclesInconsistent(
  protocolCycles: TreatmentCycle[],
  sapCycles: TreatmentCycle[]
): FlowIssue[] {
  const issues: FlowIssue[] = []

  if (protocolCycles.length === 0 && sapCycles.length === 0) {
    return issues // No cycles in study
  }

  if (protocolCycles.length !== sapCycles.length) {
    issues.push({
      id: 'CYCLES_INCONSISTENT_COUNT',
      code: 'CYCLES_INCONSISTENT',
      severity: 'error',
      category: 'cycle',
      message: 'Cycle count mismatch between Protocol and SAP',
      details: `Protocol defines ${protocolCycles.length} treatment cycles, but SAP specifies ${sapCycles.length} cycles.`,
      suggestions: [
        {
          id: 'align_cycles',
          label: 'Align cycle definitions between Protocol and SAP',
          autoFixable: false,
          changes: [
            {
              type: 'modify_visit',
              targetId: 'sap',
              field: 'cycles',
              oldValue: sapCycles.length,
              newValue: protocolCycles.length,
              reason: 'SAP must match Protocol cycle structure',
            },
          ],
        },
      ],
    })
  } else {
    // Check cycle lengths
    protocolCycles.forEach((protocolCycle, index) => {
      const sapCycle = sapCycles[index]
      if (sapCycle && protocolCycle.lengthDays !== sapCycle.lengthDays) {
        issues.push({
          id: `CYCLES_INCONSISTENT_LENGTH_${index + 1}`,
          code: 'CYCLES_INCONSISTENT',
          severity: 'error',
          category: 'cycle',
          message: `Cycle ${index + 1} length mismatch`,
          details: `Protocol defines Cycle ${index + 1} as ${protocolCycle.lengthDays} days, but SAP specifies ${sapCycle.lengthDays} days.`,
          suggestions: [
            {
              id: `fix_cycle_${index + 1}`,
              label: `Update SAP Cycle ${index + 1} length to ${protocolCycle.lengthDays} days`,
              autoFixable: true,
              changes: [
                {
                  type: 'modify_visit',
                  targetId: 'sap',
                  field: 'cycle_length',
                  oldValue: sapCycle.lengthDays,
                  newValue: protocolCycle.lengthDays,
                  reason: 'SAP cycle length must match Protocol',
                },
              ],
            },
          ],
        })
      }
    })
  }

  return issues
}

/**
 * Rule: UNSUPPORTED_VISIT_TIMING
 * Visit timing must be realistic and follow regulatory standards
 */
export function checkUnsupportedVisitTiming(visits: Visit[]): FlowIssue[] {
  const issues: FlowIssue[] = []

  visits.forEach(visit => {
    // Check for unrealistic visit windows
    if (visit.window) {
      const totalWindow = visit.window.minus + visit.window.plus

      // Window too large (>50% of visit day)
      if (visit.day > 0 && totalWindow > visit.day * 0.5) {
        issues.push({
          id: `UNSUPPORTED_VISIT_TIMING_${visit.id}`,
          code: 'UNSUPPORTED_VISIT_TIMING',
          severity: 'warning',
          category: 'timing',
          message: `Visit "${visit.name}" has unrealistic window`,
          details: `Visit "${visit.name}" (Day ${visit.day}) has a window of ±${visit.window.minus}/${visit.window.plus} days, which is ${((totalWindow / visit.day) * 100).toFixed(0)}% of the visit day. This may be too flexible.`,
          affectedVisits: [visit.id],
          suggestions: [
            {
              id: `fix_window_${visit.id}`,
              label: 'Reduce visit window to ±10-20%',
              autoFixable: true,
              changes: [
                {
                  type: 'modify_visit',
                  targetId: visit.id,
                  field: 'window',
                  oldValue: visit.window,
                  newValue: {
                    minus: Math.ceil(visit.day * 0.1),
                    plus: Math.ceil(visit.day * 0.1),
                    unit: 'days',
                  },
                  reason: 'Visit windows should typically be ±10-20% of visit day',
                },
              ],
            },
          ],
        })
      }
    }

    // Check for visits too close together
    const otherVisits = visits.filter(v => v.id !== visit.id && v.type !== 'unscheduled')
    otherVisits.forEach(otherVisit => {
      const dayDiff = Math.abs(visit.day - otherVisit.day)
      if (dayDiff > 0 && dayDiff < 3) {
        issues.push({
          id: `VISITS_TOO_CLOSE_${visit.id}_${otherVisit.id}`,
          code: 'UNSUPPORTED_VISIT_TIMING',
          severity: 'info',
          category: 'timing',
          message: `Visits "${visit.name}" and "${otherVisit.name}" are very close`,
          details: `Visits "${visit.name}" (Day ${visit.day}) and "${otherVisit.name}" (Day ${otherVisit.day}) are only ${dayDiff} days apart. Consider combining or spacing them further.`,
          affectedVisits: [visit.id, otherVisit.id],
          suggestions: [
            {
              id: `combine_visits_${visit.id}_${otherVisit.id}`,
              label: 'Consider combining these visits',
              autoFixable: false,
              changes: [],
            },
          ],
        })
      }
    })
  })

  return issues
}

/**
 * Rule: MISSING_MANDATORY_VISITS
 * Study must have baseline and end-of-treatment visits
 */
export function checkMissingMandatoryVisits(visits: Visit[]): FlowIssue[] {
  const issues: FlowIssue[] = []

  const hasBaseline = visits.some(v => v.type === 'baseline')
  const hasEOT = visits.some(v => v.type === 'end_of_treatment')

  if (!hasBaseline) {
    issues.push({
      id: 'MISSING_BASELINE',
      code: 'MISSING_MANDATORY_VISITS',
      severity: 'critical',
      category: 'visit',
      message: 'No baseline visit defined',
      details: 'A baseline visit (Day 0) is mandatory for all clinical trials to establish baseline measurements.',
      suggestions: [
        {
          id: 'add_baseline',
          label: 'Add baseline visit',
          autoFixable: true,
          changes: [
            {
              type: 'add_visit',
              targetId: 'protocol',
              newValue: {
                type: 'baseline',
                day: 0,
                name: 'Baseline',
              },
              reason: 'Baseline visit is mandatory',
            },
          ],
        },
      ],
    })
  }

  if (!hasEOT) {
    issues.push({
      id: 'MISSING_EOT',
      code: 'MISSING_MANDATORY_VISITS',
      severity: 'error',
      category: 'visit',
      message: 'No end-of-treatment visit defined',
      details: 'An end-of-treatment visit is required to assess final outcomes and safety.',
      suggestions: [
        {
          id: 'add_eot',
          label: 'Add end-of-treatment visit',
          autoFixable: true,
          changes: [
            {
              type: 'add_visit',
              targetId: 'protocol',
              newValue: {
                type: 'end_of_treatment',
                name: 'End of Treatment',
              },
              reason: 'EOT visit is required',
            },
          ],
        },
      ],
    })
  }

  return issues
}

/**
 * All global flow rules
 */
export const globalFlowRules = [
  checkFlowIntegrityDrift,
  checkCyclesInconsistent,
  checkUnsupportedVisitTiming,
  checkMissingMandatoryVisits,
]
