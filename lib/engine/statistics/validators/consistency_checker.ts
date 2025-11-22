/**
 * Statistical Consistency Checker
 * Validate consistency between statistical components
 */

import type {
  Endpoint,
  SampleSizeResult,
  StatisticalAnalysisPlan,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types'

/**
 * Check consistency between sample size and endpoints
 */
export function checkSampleSizeEndpointConsistency(
  sampleSize: SampleSizeResult,
  endpoints: Endpoint[]
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  const primaryEndpoints = endpoints.filter(e => e.type === 'primary')

  if (primaryEndpoints.length === 0) {
    errors.push({
      code: 'NO_PRIMARY_ENDPOINT',
      message: 'No primary endpoint defined',
      field: 'endpoints',
      severity: 'critical',
    })
  }

  // Check if sample size method matches primary endpoint type
  if (primaryEndpoints.length > 0) {
    const primaryEndpoint = primaryEndpoints[0]
    
    const methodEndpointMap: Record<string, string[]> = {
      two_sample_t_test: ['continuous'],
      ancova: ['continuous'],
      two_proportion_test: ['binary'],
      log_rank_test: ['time_to_event'],
    }

    const expectedTypes = methodEndpointMap[sampleSize.method] || []
    
    if (expectedTypes.length > 0 && !expectedTypes.includes(primaryEndpoint.dataType)) {
      errors.push({
        code: 'METHOD_ENDPOINT_MISMATCH',
        message: `Sample size method (${sampleSize.method}) does not match primary endpoint type (${primaryEndpoint.dataType})`,
        field: 'method',
        severity: 'critical',
      })
    }
  }

  // Check power
  if (sampleSize.power < 0.80) {
    warnings.push({
      code: 'LOW_POWER',
      message: `Power is ${(sampleSize.power * 100).toFixed(0)}%, below conventional 80%`,
      field: 'power',
      recommendation: 'Consider increasing sample size to achieve 80% or 90% power',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Check consistency of complete SAP
 */
export function checkSAPConsistency(sap: StatisticalAnalysisPlan): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Check analysis sets
  if (!sap.analysisSets || sap.analysisSets.length === 0) {
    errors.push({
      code: 'NO_ANALYSIS_SETS',
      message: 'No analysis sets defined',
      field: 'analysisSets',
      severity: 'critical',
    })
  }

  // Check statistical methods
  if (!sap.statisticalMethods || sap.statisticalMethods.length === 0) {
    errors.push({
      code: 'NO_STATISTICAL_METHODS',
      message: 'No statistical methods defined',
      field: 'statisticalMethods',
      severity: 'critical',
    })
  }

  // Check endpoints vs methods count
  if (sap.endpoints.length !== sap.statisticalMethods.length) {
    warnings.push({
      code: 'ENDPOINT_METHOD_COUNT_MISMATCH',
      message: `Number of endpoints (${sap.endpoints.length}) does not match number of statistical methods (${sap.statisticalMethods.length})`,
      field: 'statisticalMethods',
      recommendation: 'Ensure each endpoint has a corresponding statistical method',
    })
  }

  // Check missing data strategy
  if (!sap.missingDataStrategy) {
    warnings.push({
      code: 'NO_MISSING_DATA_STRATEGY',
      message: 'No missing data strategy defined',
      field: 'missingDataStrategy',
      recommendation: 'Define how missing data will be handled',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate statistical parameters for protocol
 */
export function validateProtocolStatistics(params: {
  endpoints: Endpoint[]
  sampleSize?: SampleSizeResult
  hasInterimAnalysis?: boolean
  hasSubgroupAnalysis?: boolean
}): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  const { endpoints, sampleSize, hasInterimAnalysis, hasSubgroupAnalysis } = params

  // Primary endpoint check
  const primaryEndpoints = endpoints.filter(e => e.type === 'primary')
  
  if (primaryEndpoints.length === 0) {
    errors.push({
      code: 'NO_PRIMARY_ENDPOINT',
      message: 'Protocol must have at least one primary endpoint',
      field: 'endpoints',
      severity: 'critical',
    })
  } else if (primaryEndpoints.length > 1) {
    warnings.push({
      code: 'MULTIPLE_PRIMARY_ENDPOINTS',
      message: `${primaryEndpoints.length} primary endpoints defined - multiplicity adjustment required`,
      field: 'endpoints',
      recommendation: 'Specify multiplicity adjustment method (e.g., Bonferroni, Holm)',
    })
  }

  // Sample size check
  if (!sampleSize) {
    warnings.push({
      code: 'NO_SAMPLE_SIZE',
      message: 'No sample size calculation provided',
      field: 'sampleSize',
      recommendation: 'Provide sample size justification based on primary endpoint',
    })
  }

  // Interim analysis check
  if (hasInterimAnalysis) {
    warnings.push({
      code: 'INTERIM_ANALYSIS_PLANNED',
      message: 'Interim analysis planned - ensure alpha spending function is specified',
      field: 'interimAnalysis',
      recommendation: 'Specify O\'Brien-Fleming or Pocock boundary',
    })
  }

  // Subgroup analysis check
  if (hasSubgroupAnalysis) {
    warnings.push({
      code: 'SUBGROUP_ANALYSIS_PLANNED',
      message: 'Subgroup analyses planned - clearly label as exploratory',
      field: 'subgroupAnalysis',
      recommendation: 'Pre-specify subgroups and interaction tests',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
