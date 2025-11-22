/**
 * Protocol-CSR Cross-Document Rules
 * Validate consistency between Protocol/SAP and Clinical Study Report
 */

import type { CrossDocRuleContext, CrossDocIssue } from '../types'

/**
 * Rule: CSR methods must match SAP
 */
export async function csrMethodMismatch(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  if (!bundle.sap || !bundle.csr) return issues

  // This is a placeholder - would need more detailed comparison
  const sapTests = bundle.sap.statisticalTests || []
  const csrMethods = bundle.csr.actualMethods || []

  if (sapTests.length > 0 && csrMethods.length === 0) {
    issues.push({
      code: 'CSR_METHOD_MISMATCH',
      severity: 'error',
      category: 'PROTOCOL_CSR',
      message: 'Statistical methods not documented in CSR',
      details: 'The CSR must document the statistical methods that were actually used, as specified in the SAP.',
      locations: [
        { documentType: 'SAP', sectionId: 'STATISTICAL_METHODS' },
        { documentType: 'CSR', sectionId: 'METHODS' },
      ],
    })
  }

  return issues
}

/**
 * Rule: CSR endpoints must match Protocol
 */
export async function csrEndpointMismatch(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle, alignments } = ctx

  if (!bundle.protocol || !bundle.csr) return issues

  const primaryLinks = alignments.endpoints.filter(link => link.type === 'primary')
  const missingInCsr = primaryLinks.filter(link => link.protocolEndpointId && !link.csrEndpointId)

  if (missingInCsr.length > 0) {
    issues.push({
      code: 'CSR_ENDPOINT_MISMATCH',
      severity: 'critical',
      category: 'PROTOCOL_CSR',
      message: `${missingInCsr.length} primary endpoint(s) from Protocol not reported in CSR`,
      details: 'All primary endpoints defined in the Protocol must be reported in the CSR, even if results are negative or inconclusive.',
      locations: [
        { documentType: 'PROTOCOL', sectionId: 'ENDPOINTS' },
        { documentType: 'CSR', sectionId: 'RESULTS' },
      ],
    })
  }

  return issues
}

/**
 * Rule: Protocol deviations should be documented
 */
export async function csrDeviationsMissing(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  if (!bundle.protocol || !bundle.csr) return issues

  const deviations = bundle.csr.deviationsOverview || []

  // This is informational - CSR should document deviations
  if (deviations.length === 0) {
    issues.push({
      code: 'CSR_DEVIATIONS_MISSING',
      severity: 'info',
      category: 'PROTOCOL_CSR',
      message: 'Protocol deviations not documented in CSR',
      details: 'The CSR should include a summary of protocol deviations, even if none occurred.',
      locations: [
        { documentType: 'CSR', sectionId: 'DEVIATIONS' },
      ],
    })
  }

  return issues
}

/**
 * All Protocol-CSR rules
 */
export const protocolCsrRules = [
  csrMethodMismatch,
  csrEndpointMismatch,
  csrDeviationsMissing,
]
