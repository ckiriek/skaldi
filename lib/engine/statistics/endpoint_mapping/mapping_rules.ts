/**
 * Endpoint → Statistical Test Mapping Rules
 * Complete mapping engine with validation
 */

import type { Endpoint, StatisticalMethod } from '../types'
import { classifyEndpoint, validateEndpointClassification } from './endpoint_types'
import { selectStatisticalTest, validateTestSelection } from './test_selector'

export interface MappingResult {
  endpoint: Endpoint
  statisticalMethod: StatisticalMethod
  classification: ReturnType<typeof classifyEndpoint>
  testSelection: ReturnType<typeof selectStatisticalTest>
  validation: {
    valid: boolean
    errors: string[]
    warnings: string[]
  }
}

/**
 * Map endpoint to statistical method
 */
export function mapEndpointToTest(endpoint: Endpoint): MappingResult {
  // Step 1: Classify endpoint
  const classification = classifyEndpoint({
    name: endpoint.name,
    description: endpoint.description,
    dataType: endpoint.dataType,
    covariates: endpoint.covariates,
    stratificationFactors: endpoint.stratificationFactors,
  })

  // Step 2: Validate classification
  const classificationValidation = validateEndpointClassification(classification)

  // Step 3: Select statistical test
  const testSelection = selectStatisticalTest(
    classification,
    endpoint.hypothesis,
    endpoint.sided
  )

  // Step 4: Validate test selection
  const testValidation = validateTestSelection(testSelection.primaryTest, classification)

  // Step 5: Build statistical method
  const statisticalMethod: StatisticalMethod = {
    test: testSelection.primaryTest,
    description: testSelection.rationale,
    assumptions: testSelection.assumptions,
    covariates: testSelection.requiresCovariates ? endpoint.covariates : undefined,
    stratificationFactors: testSelection.requiresStratification ? endpoint.stratificationFactors : undefined,
  }

  // Step 6: Combine validation results
  const validation = {
    valid: classificationValidation.valid && testValidation.valid,
    errors: classificationValidation.errors,
    warnings: testValidation.warnings,
  }

  return {
    endpoint,
    statisticalMethod,
    classification,
    testSelection,
    validation,
  }
}

/**
 * Map multiple endpoints
 */
export function mapMultipleEndpoints(endpoints: Endpoint[]): MappingResult[] {
  return endpoints.map(endpoint => mapEndpointToTest(endpoint))
}

/**
 * Validate consistency across multiple endpoints
 */
export function validateEndpointConsistency(
  mappings: MappingResult[]
): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for primary endpoint
  const primaryEndpoints = mappings.filter(m => m.endpoint.type === 'primary')
  
  if (primaryEndpoints.length === 0) {
    errors.push('No primary endpoint defined')
  } else if (primaryEndpoints.length > 1) {
    warnings.push(`Multiple primary endpoints (${primaryEndpoints.length}) may require multiplicity adjustment`)
  }

  // Check for conflicting statistical methods
  const primaryMethods = new Set(primaryEndpoints.map(m => m.statisticalMethod.test))
  if (primaryMethods.size > 1) {
    warnings.push('Different statistical methods for primary endpoints - ensure this is intentional')
  }

  // Check covariates consistency
  const allCovariates = new Set<string>()
  mappings.forEach(m => {
    m.endpoint.covariates?.forEach(cov => allCovariates.add(cov))
  })

  if (allCovariates.size > 0) {
    // Check if all endpoints with same data type use same covariates
    const continuousEndpoints = mappings.filter(m => m.endpoint.dataType === 'continuous')
    if (continuousEndpoints.length > 1) {
      const covariateSets = continuousEndpoints.map(m => 
        new Set(m.endpoint.covariates || [])
      )
      
      const firstSet = covariateSets[0]
      const allSame = covariateSets.every(set => 
        set.size === firstSet.size && [...set].every(cov => firstSet.has(cov))
      )
      
      if (!allSame) {
        warnings.push('Continuous endpoints use different covariates - ensure this is intentional')
      }
    }
  }

  // Check stratification consistency
  const allStratFactors = new Set<string>()
  mappings.forEach(m => {
    m.endpoint.stratificationFactors?.forEach(factor => allStratFactors.add(factor))
  })

  if (allStratFactors.size > 0) {
    warnings.push('Stratification factors defined - ensure randomization is stratified accordingly')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Generate statistical methods summary for SAP
 */
export function generateMethodsSummary(mappings: MappingResult[]): {
  primary: string
  secondary: string[]
  exploratory: string[]
} {
  const primary = mappings
    .filter(m => m.endpoint.type === 'primary')
    .map(m => {
      const method = m.statisticalMethod
      let summary = `${m.endpoint.name}: ${method.description}. `
      summary += `Statistical test: ${method.test.replace(/_/g, ' ')}. `
      
      if (method.covariates && method.covariates.length > 0) {
        summary += `Covariates: ${method.covariates.join(', ')}. `
      }
      
      if (method.stratificationFactors && method.stratificationFactors.length > 0) {
        summary += `Stratification: ${method.stratificationFactors.join(', ')}. `
      }
      
      return summary
    })
    .join('\n\n')

  const secondary = mappings
    .filter(m => m.endpoint.type === 'secondary')
    .map(m => {
      return `${m.endpoint.name}: ${m.statisticalMethod.test.replace(/_/g, ' ')}`
    })

  const exploratory = mappings
    .filter(m => m.endpoint.type === 'exploratory')
    .map(m => {
      return `${m.endpoint.name}: ${m.statisticalMethod.test.replace(/_/g, ' ')}`
    })

  return {
    primary,
    secondary,
    exploratory,
  }
}

/**
 * Get all unique statistical tests used
 */
export function getUniqueTests(mappings: MappingResult[]): StatisticalMethod['test'][] {
  const tests = new Set(mappings.map(m => m.statisticalMethod.test))
  return Array.from(tests)
}

/**
 * Get all unique covariates used
 */
export function getUniqueCovariates(mappings: MappingResult[]): string[] {
  const covariates = new Set<string>()
  mappings.forEach(m => {
    m.endpoint.covariates?.forEach(cov => covariates.add(cov))
  })
  return Array.from(covariates)
}

/**
 * Get all unique stratification factors
 */
export function getUniqueStratificationFactors(mappings: MappingResult[]): string[] {
  const factors = new Set<string>()
  mappings.forEach(m => {
    m.endpoint.stratificationFactors?.forEach(factor => factors.add(factor))
  })
  return Array.from(factors)
}

/**
 * Check if multiplicity adjustment is needed
 */
export function needsMultiplicityAdjustment(mappings: MappingResult[]): {
  needed: boolean
  reason: string
  numberOfComparisons: number
} {
  const primaryEndpoints = mappings.filter(m => m.endpoint.type === 'primary')
  
  if (primaryEndpoints.length > 1) {
    return {
      needed: true,
      reason: `Multiple primary endpoints (${primaryEndpoints.length})`,
      numberOfComparisons: primaryEndpoints.length,
    }
  }

  const secondaryEndpoints = mappings.filter(m => m.endpoint.type === 'secondary')
  if (secondaryEndpoints.length > 3) {
    return {
      needed: true,
      reason: `Many secondary endpoints (${secondaryEndpoints.length}) - consider adjustment`,
      numberOfComparisons: secondaryEndpoints.length,
    }
  }

  return {
    needed: false,
    reason: 'Single primary endpoint',
    numberOfComparisons: 1,
  }
}
