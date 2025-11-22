/**
 * Endpoint Type Taxonomy
 * Comprehensive classification of clinical trial endpoints
 */

import type { EndpointDataType, HypothesisType, TestSidedness } from '../types'

/**
 * Detailed endpoint classification
 */
export interface EndpointClassification {
  dataType: EndpointDataType
  subtype?: string
  distributionAssumption: 'normal' | 'non_normal' | 'binary' | 'time_to_event' | 'ordinal' | 'count'
  measurementScale: 'continuous' | 'discrete' | 'categorical' | 'time'
  pairing: 'independent' | 'paired' | 'repeated_measures'
  numberOfGroups: number
  covariates: string[]
  stratificationFactors: string[]
}

/**
 * Continuous endpoint subtypes
 */
export const CONTINUOUS_SUBTYPES = {
  CHANGE_FROM_BASELINE: 'change_from_baseline',
  ABSOLUTE_VALUE: 'absolute_value',
  PERCENT_CHANGE: 'percent_change',
  AUC: 'area_under_curve',
  SLOPE: 'slope',
  RATIO: 'ratio',
} as const

/**
 * Binary endpoint subtypes
 */
export const BINARY_SUBTYPES = {
  RESPONSE_RATE: 'response_rate',
  EVENT_OCCURRENCE: 'event_occurrence',
  DISEASE_FREE: 'disease_free',
  REMISSION: 'remission',
  CURE: 'cure',
} as const

/**
 * Time-to-event subtypes
 */
export const TIME_TO_EVENT_SUBTYPES = {
  OVERALL_SURVIVAL: 'overall_survival',
  PROGRESSION_FREE_SURVIVAL: 'progression_free_survival',
  TIME_TO_PROGRESSION: 'time_to_progression',
  TIME_TO_RESPONSE: 'time_to_response',
  TIME_TO_RECURRENCE: 'time_to_recurrence',
  DISEASE_FREE_SURVIVAL: 'disease_free_survival',
} as const

/**
 * Ordinal endpoint subtypes
 */
export const ORDINAL_SUBTYPES = {
  LIKERT_SCALE: 'likert_scale',
  SEVERITY_SCORE: 'severity_score',
  FUNCTIONAL_STATUS: 'functional_status',
  PAIN_SCALE: 'pain_scale',
  QUALITY_OF_LIFE: 'quality_of_life',
} as const

/**
 * Count endpoint subtypes
 */
export const COUNT_SUBTYPES = {
  ADVERSE_EVENTS: 'adverse_events',
  EXACERBATIONS: 'exacerbations',
  HOSPITALIZATIONS: 'hospitalizations',
  SEIZURES: 'seizures',
  LESIONS: 'lesions',
} as const

/**
 * Classify endpoint based on description
 */
export function classifyEndpoint(params: {
  name: string
  description: string
  dataType: EndpointDataType
  pairing?: 'independent' | 'paired' | 'repeated_measures'
  numberOfGroups?: number
  covariates?: string[]
  stratificationFactors?: string[]
}): EndpointClassification {
  const {
    name,
    description,
    dataType,
    pairing = 'independent',
    numberOfGroups = 2,
    covariates = [],
    stratificationFactors = [],
  } = params

  const lowerName = name.toLowerCase()
  const lowerDesc = description.toLowerCase()

  let subtype: string | undefined
  let distributionAssumption: EndpointClassification['distributionAssumption']
  let measurementScale: EndpointClassification['measurementScale']

  switch (dataType) {
    case 'continuous':
      measurementScale = 'continuous'
      
      // Detect subtype
      if (lowerName.includes('change') || lowerDesc.includes('change from baseline')) {
        subtype = CONTINUOUS_SUBTYPES.CHANGE_FROM_BASELINE
      } else if (lowerName.includes('auc') || lowerDesc.includes('area under')) {
        subtype = CONTINUOUS_SUBTYPES.AUC
      } else if (lowerName.includes('percent') || lowerName.includes('%')) {
        subtype = CONTINUOUS_SUBTYPES.PERCENT_CHANGE
      } else if (lowerName.includes('slope')) {
        subtype = CONTINUOUS_SUBTYPES.SLOPE
      } else if (lowerName.includes('ratio')) {
        subtype = CONTINUOUS_SUBTYPES.RATIO
      } else {
        subtype = CONTINUOUS_SUBTYPES.ABSOLUTE_VALUE
      }

      // Assume normal unless specified
      distributionAssumption = 'normal'
      break

    case 'binary':
      measurementScale = 'categorical'
      distributionAssumption = 'binary'
      
      if (lowerName.includes('response') || lowerDesc.includes('response rate')) {
        subtype = BINARY_SUBTYPES.RESPONSE_RATE
      } else if (lowerName.includes('remission')) {
        subtype = BINARY_SUBTYPES.REMISSION
      } else if (lowerName.includes('cure')) {
        subtype = BINARY_SUBTYPES.CURE
      } else if (lowerName.includes('disease-free') || lowerName.includes('disease free')) {
        subtype = BINARY_SUBTYPES.DISEASE_FREE
      } else {
        subtype = BINARY_SUBTYPES.EVENT_OCCURRENCE
      }
      break

    case 'time_to_event':
      measurementScale = 'time'
      distributionAssumption = 'time_to_event'
      
      if (lowerName.includes('overall survival') || lowerName.includes('os')) {
        subtype = TIME_TO_EVENT_SUBTYPES.OVERALL_SURVIVAL
      } else if (lowerName.includes('progression-free') || lowerName.includes('pfs')) {
        subtype = TIME_TO_EVENT_SUBTYPES.PROGRESSION_FREE_SURVIVAL
      } else if (lowerName.includes('time to progression') || lowerName.includes('ttp')) {
        subtype = TIME_TO_EVENT_SUBTYPES.TIME_TO_PROGRESSION
      } else if (lowerName.includes('disease-free survival') || lowerName.includes('dfs')) {
        subtype = TIME_TO_EVENT_SUBTYPES.DISEASE_FREE_SURVIVAL
      } else if (lowerName.includes('time to response')) {
        subtype = TIME_TO_EVENT_SUBTYPES.TIME_TO_RESPONSE
      } else {
        subtype = TIME_TO_EVENT_SUBTYPES.TIME_TO_RECURRENCE
      }
      break

    case 'ordinal':
      measurementScale = 'discrete'
      distributionAssumption = 'ordinal'
      
      if (lowerName.includes('likert')) {
        subtype = ORDINAL_SUBTYPES.LIKERT_SCALE
      } else if (lowerName.includes('severity')) {
        subtype = ORDINAL_SUBTYPES.SEVERITY_SCORE
      } else if (lowerName.includes('pain')) {
        subtype = ORDINAL_SUBTYPES.PAIN_SCALE
      } else if (lowerName.includes('qol') || lowerName.includes('quality of life')) {
        subtype = ORDINAL_SUBTYPES.QUALITY_OF_LIFE
      } else {
        subtype = ORDINAL_SUBTYPES.FUNCTIONAL_STATUS
      }
      break

    case 'count':
      measurementScale = 'discrete'
      distributionAssumption = 'count'
      
      if (lowerName.includes('adverse') || lowerName.includes('ae')) {
        subtype = COUNT_SUBTYPES.ADVERSE_EVENTS
      } else if (lowerName.includes('exacerbation')) {
        subtype = COUNT_SUBTYPES.EXACERBATIONS
      } else if (lowerName.includes('hospitalization')) {
        subtype = COUNT_SUBTYPES.HOSPITALIZATIONS
      } else if (lowerName.includes('seizure')) {
        subtype = COUNT_SUBTYPES.SEIZURES
      } else {
        subtype = COUNT_SUBTYPES.LESIONS
      }
      break
  }

  return {
    dataType,
    subtype,
    distributionAssumption,
    measurementScale,
    pairing,
    numberOfGroups,
    covariates,
    stratificationFactors,
  }
}

/**
 * Validate endpoint classification
 */
export function validateEndpointClassification(
  classification: EndpointClassification
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (classification.numberOfGroups < 2) {
    errors.push('Number of groups must be at least 2')
  }

  if (classification.pairing === 'paired' && classification.numberOfGroups > 2) {
    errors.push('Paired design only supports 2 groups')
  }

  if (classification.dataType === 'continuous' && classification.covariates.length === 0) {
    // Warning, not error
  }

  if (classification.dataType === 'time_to_event' && classification.pairing === 'paired') {
    errors.push('Time-to-event endpoints typically use independent groups')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get recommended covariates based on endpoint type
 */
export function getRecommendedCovariates(
  classification: EndpointClassification
): string[] {
  const recommendations: string[] = []

  if (classification.dataType === 'continuous') {
    if (classification.subtype === CONTINUOUS_SUBTYPES.CHANGE_FROM_BASELINE) {
      recommendations.push('baseline_value')
    }
    recommendations.push('age', 'sex', 'baseline_severity')
  }

  if (classification.dataType === 'binary') {
    recommendations.push('baseline_risk_factors', 'disease_duration')
  }

  if (classification.dataType === 'time_to_event') {
    recommendations.push('baseline_prognostic_factors', 'stage', 'performance_status')
  }

  return recommendations
}

/**
 * Get recommended stratification factors
 */
export function getRecommendedStratification(
  classification: EndpointClassification
): string[] {
  const recommendations: string[] = []

  // Common stratification factors
  if (classification.numberOfGroups === 2) {
    recommendations.push('site', 'baseline_severity')
  }

  if (classification.dataType === 'time_to_event') {
    recommendations.push('stage', 'risk_group')
  }

  return recommendations
}
