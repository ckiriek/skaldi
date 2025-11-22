/**
 * Statistical Parameter Validator
 * Validates statistical parameters for regulatory compliance
 */

import type {
  SampleSizeParameters,
  Endpoint,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types'

/**
 * Validate sample size parameters
 */
export function validateSampleSizeParameters(
  params: SampleSizeParameters
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Power validation
  if (params.power < 0 || params.power > 1) {
    errors.push({
      code: 'INVALID_POWER',
      message: 'Power must be between 0 and 1',
      field: 'power',
      severity: 'critical',
    })
  } else if (params.power < 0.70) {
    warnings.push({
      code: 'LOW_POWER',
      message: 'Power is below 70%, which may be insufficient',
      field: 'power',
      recommendation: 'Consider increasing power to at least 80%',
    })
  } else if (params.power < 0.80) {
    warnings.push({
      code: 'SUBOPTIMAL_POWER',
      message: 'Power is below the conventional 80% threshold',
      field: 'power',
      recommendation: 'Standard practice is 80% or 90% power',
    })
  }

  // Alpha validation
  if (params.alpha < 0 || params.alpha > 1) {
    errors.push({
      code: 'INVALID_ALPHA',
      message: 'Alpha must be between 0 and 1',
      field: 'alpha',
      severity: 'critical',
    })
  } else if (params.alpha > 0.05) {
    warnings.push({
      code: 'HIGH_ALPHA',
      message: 'Alpha is above the conventional 0.05 level',
      field: 'alpha',
      recommendation: 'Standard practice is alpha = 0.05 (two-sided)',
    })
  }

  // Effect size validation
  if (params.effectSize <= 0) {
    errors.push({
      code: 'INVALID_EFFECT_SIZE',
      message: 'Effect size must be positive',
      field: 'effectSize',
      severity: 'critical',
    })
  } else {
    // Context-specific effect size checks
    if (params.endpointType === 'continuous') {
      // Cohen's d interpretation
      if (params.effectSize < 0.2) {
        warnings.push({
          code: 'VERY_SMALL_EFFECT',
          message: 'Effect size is very small (Cohen\'s d < 0.2)',
          field: 'effectSize',
          recommendation: 'Verify clinical significance and feasibility',
        })
      }
    } else if (params.endpointType === 'binary') {
      // Odds ratio or risk ratio
      if (params.effectSize < 1.2 && params.effectSize > 0.83) {
        warnings.push({
          code: 'SMALL_EFFECT',
          message: 'Effect size is small (OR/RR close to 1)',
          field: 'effectSize',
          recommendation: 'Consider if this effect is clinically meaningful',
        })
      }
    }
  }

  // Dropout rate validation
  if (params.dropoutRate !== undefined) {
    if (params.dropoutRate < 0 || params.dropoutRate >= 1) {
      errors.push({
        code: 'INVALID_DROPOUT_RATE',
        message: 'Dropout rate must be between 0 and 1 (exclusive)',
        field: 'dropoutRate',
        severity: 'critical',
      })
    } else if (params.dropoutRate > 0.30) {
      warnings.push({
        code: 'HIGH_DROPOUT',
        message: 'Dropout rate exceeds 30%',
        field: 'dropoutRate',
        recommendation: 'High dropout may compromise study validity. Consider mitigation strategies.',
      })
    }
  }

  // Number of arms validation
  if (params.numberOfArms < 2) {
    errors.push({
      code: 'INSUFFICIENT_ARMS',
      message: 'Study must have at least 2 arms',
      field: 'numberOfArms',
      severity: 'critical',
    })
  }

  // Allocation ratio validation
  if (params.allocationRatio) {
    if (params.allocationRatio.length !== params.numberOfArms) {
      errors.push({
        code: 'ALLOCATION_MISMATCH',
        message: 'Allocation ratio length must match number of arms',
        field: 'allocationRatio',
        severity: 'critical',
      })
    }

    const sum = params.allocationRatio.reduce((a, b) => a + b, 0)
    if (Math.abs(sum - params.numberOfArms) > 0.01) {
      warnings.push({
        code: 'UNBALANCED_ALLOCATION',
        message: 'Allocation ratio is unbalanced',
        field: 'allocationRatio',
        recommendation: 'Unequal allocation may reduce power. Ensure justification.',
      })
    }
  }

  // Standard deviation validation (for continuous endpoints)
  if (params.endpointType === 'continuous' && params.standardDeviation !== undefined) {
    if (params.standardDeviation <= 0) {
      errors.push({
        code: 'INVALID_SD',
        message: 'Standard deviation must be positive',
        field: 'standardDeviation',
        severity: 'critical',
      })
    }
  }

  // Event rate validation (for binary/time-to-event)
  if (params.eventRate !== undefined) {
    if (params.eventRate <= 0 || params.eventRate >= 1) {
      errors.push({
        code: 'INVALID_EVENT_RATE',
        message: 'Event rate must be between 0 and 1 (exclusive)',
        field: 'eventRate',
        severity: 'critical',
      })
    } else if (params.eventRate < 0.05) {
      warnings.push({
        code: 'LOW_EVENT_RATE',
        message: 'Event rate is very low (<5%)',
        field: 'eventRate',
        recommendation: 'Low event rates require large sample sizes. Verify feasibility.',
      })
    }
  }

  // Non-inferiority margin validation
  if (params.nonInferiorityMargin !== undefined) {
    if (params.nonInferiorityMargin <= 0) {
      errors.push({
        code: 'INVALID_NI_MARGIN',
        message: 'Non-inferiority margin must be positive',
        field: 'nonInferiorityMargin',
        severity: 'critical',
      })
    } else {
      warnings.push({
        code: 'NI_MARGIN_JUSTIFICATION',
        message: 'Non-inferiority margin requires clinical justification',
        field: 'nonInferiorityMargin',
        recommendation: 'Ensure margin is clinically acceptable and regulatory compliant',
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate endpoint definition
 */
export function validateEndpoint(endpoint: Endpoint): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Name validation
  if (!endpoint.name || endpoint.name.trim().length === 0) {
    errors.push({
      code: 'MISSING_ENDPOINT_NAME',
      message: 'Endpoint name is required',
      field: 'name',
      severity: 'critical',
    })
  }

  // Variable validation
  if (!endpoint.variable || endpoint.variable.trim().length === 0) {
    errors.push({
      code: 'MISSING_VARIABLE',
      message: 'Endpoint variable name is required',
      field: 'variable',
      severity: 'critical',
    })
  }

  // Data type specific validations
  if (endpoint.dataType === 'continuous') {
    if (endpoint.covariates && endpoint.covariates.length === 0) {
      warnings.push({
        code: 'NO_COVARIATES',
        message: 'No covariates specified for continuous endpoint',
        field: 'covariates',
        recommendation: 'Consider including baseline value as covariate (ANCOVA)',
      })
    }
  }

  // Hypothesis validation
  if (endpoint.hypothesis === 'non_inferiority' || endpoint.hypothesis === 'equivalence') {
    warnings.push({
      code: 'NI_EQUIV_DESIGN',
      message: `${endpoint.hypothesis} design requires careful margin justification`,
      field: 'hypothesis',
      recommendation: 'Ensure regulatory guidance is followed for margin selection',
    })
  }

  // Primary endpoint checks
  if (endpoint.type === 'primary') {
    if (!endpoint.description || endpoint.description.trim().length < 20) {
      warnings.push({
        code: 'INSUFFICIENT_DESCRIPTION',
        message: 'Primary endpoint description should be detailed',
        field: 'description',
        recommendation: 'Include timing, measurement method, and clinical relevance',
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate consistency between sample size and endpoint
 */
export function validateSampleSizeEndpointConsistency(
  params: SampleSizeParameters,
  endpoint: Endpoint
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Check endpoint type matches sample size calculation
  if (params.endpointType !== endpoint.dataType) {
    errors.push({
      code: 'ENDPOINT_TYPE_MISMATCH',
      message: `Sample size endpoint type (${params.endpointType}) does not match endpoint data type (${endpoint.dataType})`,
      field: 'endpointType',
      severity: 'critical',
    })
  }

  // Check hypothesis consistency
  if (params.nonInferiorityMargin !== undefined && endpoint.hypothesis === 'superiority') {
    errors.push({
      code: 'HYPOTHESIS_MISMATCH',
      message: 'Non-inferiority margin specified but endpoint hypothesis is superiority',
      field: 'hypothesis',
      severity: 'high',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate overall study design feasibility
 */
export function validateStudyFeasibility(
  totalSampleSize: number,
  studyDuration: number,
  recruitmentRate: number
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Calculate required recruitment time
  const requiredTime = totalSampleSize / recruitmentRate

  if (requiredTime > studyDuration) {
    errors.push({
      code: 'INFEASIBLE_RECRUITMENT',
      message: `Required recruitment time (${requiredTime.toFixed(1)} months) exceeds study duration (${studyDuration} months)`,
      field: 'recruitmentRate',
      severity: 'critical',
    })
  } else if (requiredTime > studyDuration * 0.8) {
    warnings.push({
      code: 'TIGHT_RECRUITMENT',
      message: 'Recruitment timeline is very tight',
      field: 'recruitmentRate',
      recommendation: 'Consider adding buffer time or increasing recruitment capacity',
    })
  }

  // Sample size magnitude check
  if (totalSampleSize > 10000) {
    warnings.push({
      code: 'VERY_LARGE_SAMPLE',
      message: 'Sample size exceeds 10,000 participants',
      field: 'totalSampleSize',
      recommendation: 'Verify feasibility and consider practical significance vs statistical significance',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
