/**
 * Protocol-SAP Cross-Document Rules
 * Validate consistency between Protocol and Statistical Analysis Plan
 */

import type { CrossDocRuleContext, CrossDocIssue } from '../types'

/**
 * Rule: Primary endpoint must match between Protocol and SAP
 */
export async function primaryEndpointDrift(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle, alignments } = ctx

  if (!bundle.protocol || !bundle.sap) return issues

  const primaryLinks = alignments.endpoints.filter(link => link.type === 'primary')
  const alignedPrimary = primaryLinks.filter(link => link.aligned && link.sapEndpointId)

  if (primaryLinks.length > 0 && alignedPrimary.length === 0) {
    issues.push({
      code: 'PRIMARY_ENDPOINT_DRIFT',
      severity: 'critical',
      category: 'PROTOCOL_SAP',
      message: 'Primary endpoint differs between Protocol and SAP',
      details: 'The primary endpoint defined in the Statistical Analysis Plan does not match the primary endpoint in the Protocol. This is a critical regulatory issue that must be resolved before study start.',
      locations: [
        { documentType: 'PROTOCOL', sectionId: 'ENDPOINTS' },
        { documentType: 'SAP', sectionId: 'PRIMARY_ANALYSIS' },
      ],
      suggestions: [
        {
          id: 'ALIGN_SAP_PRIMARY_ENDPOINT',
          label: 'Align SAP primary endpoint with Protocol',
          autoFixable: true,
          patches: [],
        },
      ],
    })
  }

  return issues
}

/**
 * Rule: Statistical test must be appropriate for endpoint type
 */
export async function testMismatch(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  if (!bundle.protocol || !bundle.sap) return issues

  const protocolEndpoints = bundle.protocol.endpoints || []
  const sapTests = bundle.sap.statisticalTests || []

  // Check each SAP test against corresponding Protocol endpoint
  sapTests.forEach(test => {
    const endpoint = protocolEndpoints.find(ep => ep.id === test.endpointId)
    
    if (!endpoint) return

    // Validate test appropriateness based on endpoint data type
    const appropriateTests = getAppropriateTests(endpoint.dataType)
    
    if (appropriateTests.length > 0 && !appropriateTests.includes(test.test.toLowerCase())) {
      issues.push({
        code: 'TEST_MISMATCH',
        severity: 'error',
        category: 'PROTOCOL_SAP',
        message: `Statistical test "${test.test}" may not be appropriate for ${endpoint.dataType} endpoint`,
        details: `The endpoint "${endpoint.name}" is ${endpoint.dataType}, but the SAP specifies "${test.test}". Consider using: ${appropriateTests.join(', ')}.`,
        locations: [
          { documentType: 'PROTOCOL', sectionId: 'ENDPOINTS', blockId: endpoint.id },
          { documentType: 'SAP', sectionId: 'STATISTICAL_METHODS', blockId: test.endpointId },
        ],
      })
    }
  })

  return issues
}

/**
 * Get appropriate statistical tests for endpoint data type
 */
function getAppropriateTests(dataType?: string): string[] {
  const testMap: Record<string, string[]> = {
    continuous: ['t-test', 'ancova', 'anova', 'mmrm', 'mann-whitney', 'wilcoxon'],
    binary: ['chi-square', 'fisher exact', 'cmh', 'logistic regression'],
    time_to_event: ['log-rank', 'cox regression', 'kaplan-meier'],
    ordinal: ['mann-whitney', 'wilcoxon', 'proportional odds'],
    count: ['poisson regression', 'negative binomial', 'glmm'],
  }

  return testMap[dataType || ''] || []
}

/**
 * Rule: Sample size driver endpoint must match primary endpoint
 */
export async function sampleSizeDriverMismatch(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  if (!bundle.protocol || !bundle.sap) return issues

  const primaryEndpoints = bundle.protocol.endpoints?.filter(ep => ep.type === 'primary') || []
  const sampleSizeDriver = bundle.sap.sampleSizeDriverEndpoint

  if (primaryEndpoints.length === 0 || !sampleSizeDriver) return issues

  // Check if sample size driver matches a primary endpoint
  const driverMatchesPrimary = primaryEndpoints.some(ep => 
    ep.name.toLowerCase().includes(sampleSizeDriver.toLowerCase()) ||
    sampleSizeDriver.toLowerCase().includes(ep.name.toLowerCase())
  )

  if (!driverMatchesPrimary) {
    issues.push({
      code: 'SAMPLE_SIZE_DRIVER_MISMATCH',
      severity: 'error',
      category: 'PROTOCOL_SAP',
      message: 'Sample size calculation not based on primary endpoint',
      details: `The SAP indicates sample size was calculated for "${sampleSizeDriver}", but this does not match the Protocol primary endpoint(s). Sample size should be driven by the primary endpoint.`,
      locations: [
        { documentType: 'PROTOCOL', sectionId: 'ENDPOINTS' },
        { documentType: 'SAP', sectionId: 'SAMPLE_SIZE' },
      ],
    })
  }

  return issues
}

/**
 * Rule: Analysis populations must be defined consistently
 */
export async function analysisPopulationInconsistent(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  if (!bundle.protocol || !bundle.sap) return issues

  const protocolPops = bundle.protocol.analysisPopulations || []
  const sapPops = bundle.sap.analysisPopulations || []

  // Check for missing populations
  const protocolPopNames = new Set(protocolPops.map(p => p.abbreviation.toUpperCase()))
  const sapPopNames = new Set(sapPops.map(p => p.abbreviation.toUpperCase()))

  // Essential populations that should be in both
  const essentialPops = ['FAS', 'PPS', 'SAF']

  essentialPops.forEach(pop => {
    const inProtocol = protocolPopNames.has(pop)
    const inSap = sapPopNames.has(pop)

    if (inProtocol && !inSap) {
      issues.push({
        code: 'ANALYSIS_POPULATION_MISSING_IN_SAP',
        severity: 'warning',
        category: 'PROTOCOL_SAP',
        message: `Analysis population "${pop}" defined in Protocol but missing in SAP`,
        locations: [
          { documentType: 'PROTOCOL', sectionId: 'ANALYSIS_POPULATIONS' },
          { documentType: 'SAP', sectionId: 'ANALYSIS_SETS' },
        ],
      })
    }

    if (!inProtocol && inSap) {
      issues.push({
        code: 'ANALYSIS_POPULATION_MISSING_IN_PROTOCOL',
        severity: 'warning',
        category: 'PROTOCOL_SAP',
        message: `Analysis population "${pop}" defined in SAP but missing in Protocol`,
        locations: [
          { documentType: 'SAP', sectionId: 'ANALYSIS_SETS' },
          { documentType: 'PROTOCOL', sectionId: 'ANALYSIS_POPULATIONS' },
        ],
      })
    }
  })

  return issues
}

/**
 * Rule: Multiplicity strategy should be defined if multiple primary endpoints
 */
export async function multiplicityStrategyMissing(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  if (!bundle.protocol || !bundle.sap) return issues

  const primaryEndpoints = bundle.protocol.endpoints?.filter(ep => ep.type === 'primary') || []
  const multiplicityStrategy = bundle.sap.multiplicityStrategy

  if (primaryEndpoints.length > 1 && !multiplicityStrategy) {
    issues.push({
      code: 'MULTIPLICITY_STRATEGY_MISSING',
      severity: 'error',
      category: 'PROTOCOL_SAP',
      message: `${primaryEndpoints.length} primary endpoints but no multiplicity adjustment strategy defined`,
      details: 'When multiple primary endpoints are tested, a multiplicity adjustment strategy (e.g., Bonferroni, Holm, hierarchical testing) must be specified to control Type I error rate.',
      locations: [
        { documentType: 'PROTOCOL', sectionId: 'ENDPOINTS' },
        { documentType: 'SAP', sectionId: 'MULTIPLICITY' },
      ],
    })
  }

  return issues
}

/**
 * All Protocol-SAP rules
 */
export const protocolSapRules = [
  primaryEndpointDrift,
  testMismatch,
  sampleSizeDriverMismatch,
  analysisPopulationInconsistent,
  multiplicityStrategyMissing,
]
