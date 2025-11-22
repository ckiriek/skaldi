/**
 * Protocol-ICF Cross-Document Rules
 * Validate consistency between Protocol and Informed Consent Form
 */

import type { CrossDocRuleContext, CrossDocIssue } from '../types'

/**
 * Rule: ICF must describe all Protocol procedures
 */
export async function icfScheduleMismatch(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  if (!bundle.protocol || !bundle.icf) return issues

  const protocolVisits = bundle.protocol.visitSchedule || []
  const icfProcedures = bundle.icf.procedureDescriptions || []

  if (protocolVisits.length > 0 && icfProcedures.length === 0) {
    issues.push({
      code: 'ICF_SCHEDULE_MISMATCH',
      severity: 'error',
      category: 'PROTOCOL_ICF',
      message: 'Protocol visit schedule not described in ICF',
      details: 'The Informed Consent Form must clearly describe all study visits and procedures to ensure subjects understand their participation burden.',
      locations: [
        { documentType: 'PROTOCOL', sectionId: 'VISIT_SCHEDULE' },
        { documentType: 'ICF', sectionId: 'PROCEDURES' },
      ],
    })
  }

  return issues
}

/**
 * Rule: Invasive procedures must have risk description
 */
export async function icfRiskMissing(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  if (!bundle.protocol || !bundle.icf) return issues

  const icfProcedures = bundle.icf.procedureDescriptions || []
  const icfRisks = bundle.icf.risks || []

  const invasiveProcedures = icfProcedures.filter(p => p.invasive)

  if (invasiveProcedures.length > 0 && icfRisks.length === 0) {
    issues.push({
      code: 'ICF_RISK_MISSING',
      severity: 'critical',
      category: 'PROTOCOL_ICF',
      message: 'Invasive procedures described but risks not explained in ICF',
      details: `${invasiveProcedures.length} invasive procedure(s) are mentioned, but the ICF does not contain adequate risk information. This is a regulatory requirement.`,
      locations: [
        { documentType: 'ICF', sectionId: 'PROCEDURES' },
        { documentType: 'ICF', sectionId: 'RISKS' },
      ],
    })
  }

  return issues
}

/**
 * Rule: Treatment description must match Protocol
 */
export async function icfTreatmentIncomplete(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  if (!bundle.protocol || !bundle.icf) return issues

  const protocolArms = bundle.protocol.arms || []
  const icfTreatments = bundle.icf.treatmentDescriptions || []

  if (protocolArms.length > 0 && icfTreatments.length === 0) {
    issues.push({
      code: 'ICF_TREATMENT_INCOMPLETE',
      severity: 'warning',
      category: 'PROTOCOL_ICF',
      message: 'Treatment arms not adequately described in ICF',
      details: 'The ICF should clearly describe all treatment options, including placebo if applicable, so subjects understand what they may receive.',
      locations: [
        { documentType: 'PROTOCOL', sectionId: 'TREATMENT_ARMS' },
        { documentType: 'ICF', sectionId: 'TREATMENTS' },
      ],
    })
  }

  return issues
}

/**
 * All Protocol-ICF rules
 */
export const protocolIcfRules = [
  icfScheduleMismatch,
  icfRiskMissing,
  icfTreatmentIncomplete,
]
