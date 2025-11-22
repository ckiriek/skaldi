/**
 * Sample Size Calculators with Adjustments
 * Main entry point for sample size calculations
 */

import type { SampleSizeParameters, SampleSizeResult } from '../types'
import {
  calculateContinuousSampleSize,
  calculateBinarySampleSize,
  calculateSurvivalSampleSize,
  calculateANCOVASampleSize,
} from './power_analysis'

/**
 * Apply dropout adjustment to sample size
 */
export function applyDropoutAdjustment(
  baseSampleSize: SampleSizeResult,
  dropoutRate: number
): SampleSizeResult {
  if (dropoutRate <= 0 || dropoutRate >= 1) {
    throw new Error('Dropout rate must be between 0 and 1 (exclusive)')
  }

  const adjustmentFactor = 1 / (1 - dropoutRate)
  
  const adjustedPerArm = baseSampleSize.sampleSizePerArm.map(n =>
    Math.ceil(n * adjustmentFactor)
  )

  return {
    ...baseSampleSize,
    totalSampleSize: adjustedPerArm.reduce((a, b) => a + b, 0),
    sampleSizePerArm: adjustedPerArm,
    assumptions: [
      ...baseSampleSize.assumptions,
      `Dropout rate: ${(dropoutRate * 100).toFixed(1)}%`,
      `Adjustment factor: ${adjustmentFactor.toFixed(3)}`,
    ],
    adjustments: {
      ...baseSampleSize.adjustments,
      dropout: dropoutRate,
    },
  }
}

/**
 * Apply multiplicity adjustment (Bonferroni)
 */
export function applyMultiplicityAdjustment(
  baseSampleSize: SampleSizeResult,
  numberOfComparisons: number,
  method: 'bonferroni' | 'holm' | 'sidak' = 'bonferroni'
): SampleSizeResult {
  if (numberOfComparisons < 1) {
    throw new Error('Number of comparisons must be at least 1')
  }

  let adjustedAlpha: number

  switch (method) {
    case 'bonferroni':
      adjustedAlpha = baseSampleSize.alpha / numberOfComparisons
      break
    case 'holm':
      // Holm is sequential, use Bonferroni as conservative estimate
      adjustedAlpha = baseSampleSize.alpha / numberOfComparisons
      break
    case 'sidak':
      adjustedAlpha = 1 - Math.pow(1 - baseSampleSize.alpha, 1 / numberOfComparisons)
      break
    default:
      adjustedAlpha = baseSampleSize.alpha / numberOfComparisons
  }

  // Recalculate with adjusted alpha
  // This is approximate - would need to call original calculator
  // For now, use conservative factor
  const adjustmentFactor = Math.sqrt(numberOfComparisons)
  
  const adjustedPerArm = baseSampleSize.sampleSizePerArm.map(n =>
    Math.ceil(n * adjustmentFactor)
  )

  return {
    ...baseSampleSize,
    totalSampleSize: adjustedPerArm.reduce((a, b) => a + b, 0),
    sampleSizePerArm: adjustedPerArm,
    alpha: adjustedAlpha,
    assumptions: [
      ...baseSampleSize.assumptions,
      `Multiplicity adjustment: ${method}`,
      `Number of comparisons: ${numberOfComparisons}`,
      `Adjusted alpha: ${adjustedAlpha.toFixed(4)}`,
    ],
    adjustments: {
      ...baseSampleSize.adjustments,
      multiplicity: numberOfComparisons,
    },
  }
}

/**
 * Apply interim analysis adjustment (O'Brien-Fleming)
 */
export function applyInterimAdjustment(
  baseSampleSize: SampleSizeResult,
  numberOfInterims: number,
  method: 'obrien_fleming' | 'pocock' = 'obrien_fleming'
): SampleSizeResult {
  if (numberOfInterims < 1) {
    throw new Error('Number of interim analyses must be at least 1')
  }

  let adjustmentFactor: number

  if (method === 'obrien_fleming') {
    // O'Brien-Fleming: conservative early, liberal late
    // Approximate inflation factor
    adjustmentFactor = 1 + 0.05 * Math.log(numberOfInterims + 1)
  } else {
    // Pocock: constant boundary
    // More conservative, larger sample size
    adjustmentFactor = 1 + 0.1 * Math.log(numberOfInterims + 1)
  }

  const adjustedPerArm = baseSampleSize.sampleSizePerArm.map(n =>
    Math.ceil(n * adjustmentFactor)
  )

  return {
    ...baseSampleSize,
    totalSampleSize: adjustedPerArm.reduce((a, b) => a + b, 0),
    sampleSizePerArm: adjustedPerArm,
    assumptions: [
      ...baseSampleSize.assumptions,
      `Interim analyses: ${numberOfInterims}`,
      `Boundary method: ${method}`,
      `Inflation factor: ${adjustmentFactor.toFixed(3)}`,
    ],
    adjustments: {
      ...baseSampleSize.adjustments,
      interim: numberOfInterims,
    },
  }
}

/**
 * Main sample size calculator with all adjustments
 */
export function calculateSampleSize(params: SampleSizeParameters): SampleSizeResult {
  let result: SampleSizeResult

  // Base calculation
  switch (params.endpointType) {
    case 'continuous':
      if (params.standardDeviation === undefined) {
        throw new Error('Standard deviation required for continuous endpoint')
      }
      result = calculateContinuousSampleSize({
        meanDifference: params.effectSize,
        standardDeviation: params.standardDeviation,
        power: params.power,
        alpha: params.alpha,
        sided: 'two_sided', // default
        allocationRatio: params.allocationRatio ? params.allocationRatio[1] / params.allocationRatio[0] : 1,
      })
      break

    case 'binary':
      if (params.eventRate === undefined) {
        throw new Error('Event rate required for binary endpoint')
      }
      // Assume effectSize is the treatment proportion
      const p1 = params.eventRate
      const p2 = params.effectSize
      result = calculateBinarySampleSize({
        proportionControl: p1,
        proportionTreatment: p2,
        power: params.power,
        alpha: params.alpha,
        sided: 'two_sided',
        allocationRatio: params.allocationRatio ? params.allocationRatio[1] / params.allocationRatio[0] : 1,
      })
      break

    case 'time_to_event':
      if (params.hazardRatio === undefined) {
        throw new Error('Hazard ratio required for time-to-event endpoint')
      }
      result = calculateSurvivalSampleSize({
        hazardRatio: params.hazardRatio,
        medianSurvivalControl: 12, // default, should be in params
        accrualPeriod: 12,
        followUpPeriod: 12,
        power: params.power,
        alpha: params.alpha,
        sided: 'two_sided',
        allocationRatio: params.allocationRatio ? params.allocationRatio[1] / params.allocationRatio[0] : 1,
      })
      break

    default:
      throw new Error(`Unsupported endpoint type: ${params.endpointType}`)
  }

  // Apply adjustments
  if (params.dropoutRate && params.dropoutRate > 0) {
    result = applyDropoutAdjustment(result, params.dropoutRate)
  }

  if (params.multipleComparisons && params.multipleComparisons > 1) {
    result = applyMultiplicityAdjustment(result, params.multipleComparisons, 'bonferroni')
  }

  if (params.interimAnalyses && params.interimAnalyses > 0) {
    result = applyInterimAdjustment(result, params.interimAnalyses, 'obrien_fleming')
  }

  return result
}

/**
 * Quick sample size estimates (rule of thumb)
 */
export function quickEstimate(params: {
  endpointType: 'continuous' | 'binary' | 'survival'
  effectSize: 'small' | 'medium' | 'large'
  power?: number
  alpha?: number
}): { min: number; typical: number; max: number } {
  const { endpointType, effectSize, power = 0.80, alpha = 0.05 } = params

  // Rule of thumb estimates per arm
  const estimates: Record<string, Record<string, number>> = {
    continuous: {
      small: 400,   // Cohen's d = 0.2
      medium: 100,  // Cohen's d = 0.5
      large: 40,    // Cohen's d = 0.8
    },
    binary: {
      small: 800,   // 5% difference
      medium: 200,  // 10% difference
      large: 80,    // 20% difference
    },
    survival: {
      small: 600,   // HR = 0.8
      medium: 150,  // HR = 0.7
      large: 60,    // HR = 0.6
    },
  }

  const baseEstimate = estimates[endpointType][effectSize]

  // Adjust for power
  const powerFactor = power === 0.90 ? 1.3 : 1.0

  return {
    min: Math.ceil(baseEstimate * 0.8 * powerFactor),
    typical: Math.ceil(baseEstimate * powerFactor),
    max: Math.ceil(baseEstimate * 1.2 * powerFactor),
  }
}

/**
 * Validate sample size feasibility
 */
export function validateFeasibility(
  totalSampleSize: number,
  params: {
    sitesAvailable: number
    recruitmentRatePerSite: number // patients per month
    studyDuration: number // months
  }
): {
  feasible: boolean
  requiredRecruitmentRate: number
  actualCapacity: number
  utilizationRate: number
  recommendations: string[]
} {
  const { sitesAvailable, recruitmentRatePerSite, studyDuration } = params

  const actualCapacity = sitesAvailable * recruitmentRatePerSite * studyDuration
  const requiredRecruitmentRate = totalSampleSize / studyDuration
  const utilizationRate = totalSampleSize / actualCapacity

  const feasible = utilizationRate <= 0.8 // 80% utilization is reasonable

  const recommendations: string[] = []

  if (!feasible) {
    recommendations.push('Sample size exceeds recruitment capacity')
    
    const additionalSites = Math.ceil(
      (totalSampleSize / (recruitmentRatePerSite * studyDuration * 0.8)) - sitesAvailable
    )
    recommendations.push(`Consider adding ${additionalSites} more sites`)
    
    const extendedDuration = Math.ceil(
      totalSampleSize / (sitesAvailable * recruitmentRatePerSite * 0.8)
    )
    recommendations.push(`Or extend study duration to ${extendedDuration} months`)
  } else if (utilizationRate > 0.6) {
    recommendations.push('Recruitment timeline is tight but feasible')
    recommendations.push('Consider contingency plans for recruitment delays')
  }

  return {
    feasible,
    requiredRecruitmentRate,
    actualCapacity,
    utilizationRate,
    recommendations,
  }
}
