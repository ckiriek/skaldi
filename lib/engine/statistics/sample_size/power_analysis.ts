/**
 * Power Analysis Functions
 * Calculate statistical power and sample size for clinical trials
 */

import { getZAlpha, getZBeta } from '../distributions/normal'
import type { SampleSizeParameters, SampleSizeResult, TestSidedness } from '../types'

/**
 * Calculate sample size for continuous endpoint (two-sample t-test)
 * 
 * Formula: n = 2 * ((Z_α + Z_β) / effect_size)^2
 * where effect_size = (μ1 - μ2) / σ (Cohen's d)
 */
export function calculateContinuousSampleSize(
  params: {
    meanDifference: number
    standardDeviation: number
    power: number
    alpha: number
    sided: TestSidedness
    allocationRatio?: number // default 1:1
  }
): SampleSizeResult {
  const { meanDifference, standardDeviation, power, alpha, sided, allocationRatio = 1 } = params

  // Calculate effect size (Cohen's d)
  const effectSize = Math.abs(meanDifference) / standardDeviation

  // Get z-scores
  const zAlpha = getZAlpha(alpha, sided)
  const zBeta = getZBeta(power)

  // Calculate sample size per group (equal allocation)
  const r = allocationRatio
  const nControl = 2 * Math.pow((zAlpha + zBeta) / effectSize, 2) * ((1 + r) / r)
  const nTreatment = nControl * r

  // Round up
  const n1 = Math.ceil(nControl)
  const n2 = Math.ceil(nTreatment)

  return {
    totalSampleSize: n1 + n2,
    sampleSizePerArm: [n1, n2],
    power,
    alpha,
    effectSize,
    method: 'two_sample_t_test',
    assumptions: [
      'Normal distribution of endpoint',
      'Equal variances between groups',
      `Allocation ratio: ${r}:1`,
      `Mean difference: ${meanDifference}`,
      `Standard deviation: ${standardDeviation}`,
    ],
    adjustments: {},
  }
}

/**
 * Calculate sample size for binary endpoint (two-proportion test)
 * 
 * Formula: n = (Z_α * sqrt(p_pooled * (1-p_pooled) * 2) + Z_β * sqrt(p1*(1-p1) + p2*(1-p2)))^2 / (p1 - p2)^2
 */
export function calculateBinarySampleSize(
  params: {
    proportionControl: number
    proportionTreatment: number
    power: number
    alpha: number
    sided: TestSidedness
    allocationRatio?: number
  }
): SampleSizeResult {
  const { proportionControl: p1, proportionTreatment: p2, power, alpha, sided, allocationRatio = 1 } = params

  // Validate proportions
  if (p1 <= 0 || p1 >= 1 || p2 <= 0 || p2 >= 1) {
    throw new Error('Proportions must be between 0 and 1 (exclusive)')
  }

  const r = allocationRatio
  const pDiff = Math.abs(p2 - p1)
  const pPooled = (p1 + r * p2) / (1 + r)

  // Get z-scores
  const zAlpha = getZAlpha(alpha, sided)
  const zBeta = getZBeta(power)

  // Calculate sample size
  const numerator = Math.pow(
    zAlpha * Math.sqrt(pPooled * (1 - pPooled) * (1 + 1/r)) +
    zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2) / r),
    2
  )
  
  const nControl = numerator / Math.pow(pDiff, 2)
  const nTreatment = nControl * r

  // Round up
  const n1 = Math.ceil(nControl)
  const n2 = Math.ceil(nTreatment)

  // Calculate effect size (risk difference)
  const effectSize = pDiff

  return {
    totalSampleSize: n1 + n2,
    sampleSizePerArm: [n1, n2],
    power,
    alpha,
    effectSize,
    method: 'two_proportion_test',
    assumptions: [
      'Independent observations',
      'Binary outcome',
      `Control proportion: ${(p1 * 100).toFixed(1)}%`,
      `Treatment proportion: ${(p2 * 100).toFixed(1)}%`,
      `Risk difference: ${(pDiff * 100).toFixed(1)}%`,
      `Allocation ratio: ${r}:1`,
    ],
    adjustments: {},
  }
}

/**
 * Calculate sample size for time-to-event endpoint (log-rank test)
 * 
 * Based on Schoenfeld's formula for survival analysis
 */
export function calculateSurvivalSampleSize(
  params: {
    hazardRatio: number
    medianSurvivalControl: number
    accrualPeriod: number
    followUpPeriod: number
    power: number
    alpha: number
    sided: TestSidedness
    allocationRatio?: number
  }
): SampleSizeResult {
  const {
    hazardRatio: HR,
    medianSurvivalControl,
    accrualPeriod,
    followUpPeriod,
    power,
    alpha,
    sided,
    allocationRatio = 1,
  } = params

  // Validate hazard ratio
  if (HR <= 0) {
    throw new Error('Hazard ratio must be positive')
  }

  const r = allocationRatio

  // Get z-scores
  const zAlpha = getZAlpha(alpha, sided)
  const zBeta = getZBeta(power)

  // Calculate required number of events (Schoenfeld formula)
  const logHR = Math.log(HR)
  const eventsRequired = Math.ceil(
    4 * Math.pow((zAlpha + zBeta) / logHR, 2) * ((1 + r) / r)
  )

  // Estimate probability of event
  // Simplified: assume exponential survival
  const lambda = Math.log(2) / medianSurvivalControl
  const totalTime = accrualPeriod + followUpPeriod
  const pEvent = 1 - Math.exp(-lambda * (totalTime / 2)) // approximate

  // Calculate total sample size
  const totalN = Math.ceil(eventsRequired / pEvent)
  const nControl = Math.ceil(totalN / (1 + r))
  const nTreatment = totalN - nControl

  // Effect size (log hazard ratio)
  const effectSize = Math.abs(logHR)

  return {
    totalSampleSize: totalN,
    sampleSizePerArm: [nControl, nTreatment],
    power,
    alpha,
    effectSize,
    method: 'log_rank_test',
    assumptions: [
      'Proportional hazards',
      'Exponential survival distribution',
      `Hazard ratio: ${HR.toFixed(2)}`,
      `Median survival (control): ${medianSurvivalControl} months`,
      `Required events: ${eventsRequired}`,
      `Accrual period: ${accrualPeriod} months`,
      `Follow-up period: ${followUpPeriod} months`,
      `Allocation ratio: ${r}:1`,
    ],
    adjustments: {},
  }
}

/**
 * Calculate sample size for ANCOVA (continuous with covariates)
 * Adjusts for correlation with baseline
 */
export function calculateANCOVASampleSize(
  params: {
    meanDifference: number
    standardDeviation: number
    baselineCorrelation: number // R² with baseline
    power: number
    alpha: number
    sided: TestSidedness
    allocationRatio?: number
  }
): SampleSizeResult {
  const { baselineCorrelation, ...baseParams } = params

  // Calculate unadjusted sample size
  const unadjusted = calculateContinuousSampleSize(baseParams)

  // Adjust for covariate (reduces variance)
  const varianceReduction = 1 - baselineCorrelation
  const adjustmentFactor = varianceReduction

  const n1 = Math.ceil(unadjusted.sampleSizePerArm[0] * adjustmentFactor)
  const n2 = Math.ceil(unadjusted.sampleSizePerArm[1] * adjustmentFactor)

  return {
    ...unadjusted,
    totalSampleSize: n1 + n2,
    sampleSizePerArm: [n1, n2],
    method: 'ancova',
    assumptions: [
      ...unadjusted.assumptions,
      `Baseline correlation (R²): ${(baselineCorrelation * 100).toFixed(1)}%`,
      `Variance reduction: ${((1 - varianceReduction) * 100).toFixed(1)}%`,
    ],
  }
}

/**
 * Calculate power given sample size (reverse calculation)
 */
export function calculatePower(
  params: {
    sampleSizePerArm: number[]
    effectSize: number
    alpha: number
    sided: TestSidedness
    endpointType: 'continuous' | 'binary' | 'survival'
  }
): number {
  const { sampleSizePerArm, effectSize, alpha, sided } = params

  const n1 = sampleSizePerArm[0]
  const n2 = sampleSizePerArm[1]
  const r = n2 / n1

  const zAlpha = getZAlpha(alpha, sided)

  // Calculate Z_beta
  const zBeta = effectSize * Math.sqrt((n1 * r) / (2 * (1 + r))) - zAlpha

  // Convert to power
  // Using standard normal CDF approximation
  const power = 0.5 * (1 + erf(zBeta / Math.sqrt(2)))

  return Math.max(0, Math.min(1, power))
}

// Helper: error function
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1
  x = Math.abs(x)
  
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  
  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  
  return sign * y
}
