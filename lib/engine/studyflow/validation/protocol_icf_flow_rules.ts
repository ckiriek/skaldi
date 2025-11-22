/**
 * Protocol-ICF Flow Validation Rules
 * Validates consistency between Protocol and ICF
 */

import type { FlowIssue, Visit, Procedure } from '../types'

/**
 * Rule: PROCEDURE_NOT_IN_ICF
 * All procedures in protocol should be described in ICF
 */
export function checkProcedureNotInICF(
  protocolProcedures: Procedure[],
  icfProcedures: string[] // ICF mentions as text
): FlowIssue[] {
  const issues: FlowIssue[] = []

  // Check invasive procedures
  const invasiveProcedures = protocolProcedures.filter(
    p => p.metadata?.invasive || p.category === 'imaging' || p.category === 'device'
  )

  invasiveProcedures.forEach(proc => {
    const mentionedInICF = icfProcedures.some(icfText =>
      icfText.toLowerCase().includes(proc.name.toLowerCase())
    )

    if (!mentionedInICF) {
      issues.push({
        id: `PROCEDURE_NOT_IN_ICF_${proc.id}`,
        code: 'PROCEDURE_NOT_IN_ICF',
        severity: 'error',
        category: 'procedure',
        message: `Procedure "${proc.name}" not described in ICF`,
        details: `The protocol includes procedure "${proc.name}" which is not mentioned in the Informed Consent Form. All study procedures, especially invasive ones, must be described in the ICF.`,
        affectedProcedures: [proc.id],
        suggestions: [
          {
            id: `fix_${proc.id}`,
            label: `Add "${proc.name}" description to ICF`,
            autoFixable: false,
            changes: [
              {
                type: 'add_procedure',
                targetId: 'icf',
                newValue: {
                  procedureName: proc.name,
                  description: `Add description of ${proc.name} procedure to ICF`,
                },
                reason: 'Regulatory requirement: all procedures must be disclosed in ICF',
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
 * Rule: RISKS_NOT_DESCRIBED
 * Invasive procedures must have risk descriptions in ICF
 */
export function checkRisksNotDescribed(
  protocolProcedures: Procedure[],
  icfRisks: string[] // Risk descriptions from ICF
): FlowIssue[] {
  const issues: FlowIssue[] = []

  // High-risk procedures
  const highRiskProcedures = protocolProcedures.filter(
    p =>
      p.metadata?.invasive ||
      p.category === 'imaging' ||
      p.category === 'device' ||
      (p.category === 'labs' && p.name.toLowerCase().includes('biopsy'))
  )

  if (highRiskProcedures.length > 0 && icfRisks.length === 0) {
    issues.push({
      id: 'RISKS_NOT_DESCRIBED',
      code: 'RISKS_NOT_DESCRIBED',
      severity: 'critical',
      category: 'global',
      message: 'ICF missing risk descriptions for invasive procedures',
      details: `The protocol includes ${highRiskProcedures.length} invasive or high-risk procedures, but the ICF does not contain adequate risk descriptions. This is a critical regulatory requirement.`,
      affectedProcedures: highRiskProcedures.map(p => p.id),
      suggestions: [
        {
          id: 'add_risks',
          label: 'Add risk descriptions to ICF',
          autoFixable: false,
          changes: [
            {
              type: 'modify_procedure',
              targetId: 'icf',
              field: 'risks',
              newValue: 'Add comprehensive risk descriptions for all invasive procedures',
              reason: 'Critical regulatory requirement for informed consent',
            },
          ],
        },
      ],
    })
  }

  return issues
}

/**
 * Rule: VISIT_MISSING_IN_ICF
 * Visit schedule should be described in ICF
 */
export function checkVisitMissingInICF(
  protocolVisits: Visit[],
  icfVisitMentions: string[] // Visit mentions from ICF
): FlowIssue[] {
  const issues: FlowIssue[] = []

  // Check if ICF mentions visit schedule
  const hasVisitSchedule = icfVisitMentions.length > 0

  if (!hasVisitSchedule) {
    issues.push({
      id: 'VISIT_MISSING_IN_ICF',
      code: 'VISIT_MISSING_IN_ICF',
      severity: 'warning',
      category: 'visit',
      message: 'Visit schedule not described in ICF',
      details: `The protocol defines ${protocolVisits.length} visits, but the ICF does not describe the visit schedule. Participants should be informed about the number and timing of study visits.`,
      affectedVisits: protocolVisits.map(v => v.id),
      suggestions: [
        {
          id: 'add_visit_schedule',
          label: 'Add visit schedule to ICF',
          autoFixable: false,
          changes: [
            {
              type: 'add_visit',
              targetId: 'icf',
              newValue: {
                visitCount: protocolVisits.length,
                duration: `${Math.max(...protocolVisits.map(v => v.day))} days`,
              },
              reason: 'Participants should be informed about study duration and visit frequency',
            },
          ],
        },
      ],
    })
  } else {
    // Check if number of visits matches
    const mentionedVisitCount = icfVisitMentions.length
    const actualVisitCount = protocolVisits.filter(v => v.type !== 'unscheduled').length

    if (Math.abs(mentionedVisitCount - actualVisitCount) > 2) {
      issues.push({
        id: 'VISIT_COUNT_MISMATCH',
        code: 'VISIT_MISSING_IN_ICF',
        severity: 'warning',
        category: 'visit',
        message: 'Visit count mismatch between Protocol and ICF',
        details: `Protocol defines ${actualVisitCount} visits, but ICF mentions ${mentionedVisitCount} visits. This discrepancy should be resolved.`,
        affectedVisits: protocolVisits.map(v => v.id),
        suggestions: [
          {
            id: 'align_visit_count',
            label: 'Align visit count in ICF with Protocol',
            autoFixable: false,
            changes: [
              {
                type: 'modify_visit',
                targetId: 'icf',
                field: 'visit_count',
                oldValue: mentionedVisitCount,
                newValue: actualVisitCount,
                reason: 'ICF should accurately reflect protocol visit schedule',
              },
            ],
          },
        ],
      })
    }
  }

  return issues
}

/**
 * All Protocol-ICF flow rules
 */
export const protocolIcfFlowRules = [
  checkProcedureNotInICF,
  checkRisksNotDescribed,
  checkVisitMissingInICF,
]
