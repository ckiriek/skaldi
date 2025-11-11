/**
 * Statistics API Route
 * 
 * Provides statistical calculations for clinical data.
 * 
 * POST /api/v1/statistics - Calculate statistics
 * 
 * @module app/api/v1/statistics/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateRequiredFields } from '@/lib/middleware/error-handler'

/**
 * POST /api/v1/statistics
 * 
 * Calculate statistical metrics
 * 
 * Request body:
 * {
 *   type: 'power' | 'confidence_interval' | 'p_value' | 'effect_size' | 'sample_size',
 *   data: {
 *     // For power analysis
 *     effect_size?: number,
 *     sample_size?: number,
 *     alpha?: number,
 *     
 *     // For confidence interval
 *     mean?: number,
 *     std_dev?: number,
 *     n?: number,
 *     confidence_level?: number,
 *     
 *     // For p-value
 *     test_statistic?: number,
 *     df?: number,
 *     
 *     // For sample size
 *     power?: number,
 *     effect_size?: number,
 *     alpha?: number
 *   }
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     result: number,
 *     interpretation: string,
 *     details: object
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    validateRequiredFields(
      body,
      ['type', 'data'],
      'StatisticsEngine',
      'calculate'
    )

    const { type, data } = body
    let result: any = {}

    switch (type) {
      case 'power':
        result = calculatePower(data)
        break

      case 'confidence_interval':
        result = calculateConfidenceInterval(data)
        break

      case 'p_value':
        result = calculatePValue(data)
        break

      case 'effect_size':
        result = calculateEffectSize(data)
        break

      case 'sample_size':
        result = calculateSampleSize(data)
        break

      default:
        throw new Error(`Unknown statistics type: ${type}`)
    }

    return NextResponse.json({
      success: true,
      data: result,
      type,
    })
  } catch (error) {
    return handleApiError(error, 'StatisticsEngine', 'calculate')
  }
}

/**
 * Calculate statistical power
 */
function calculatePower(data: any) {
  const { effect_size = 0.5, sample_size = 100, alpha = 0.05 } = data

  // Simplified power calculation (Cohen's d)
  // In production, use proper statistical library
  const z_alpha = 1.96 // For alpha = 0.05 (two-tailed)
  const z_beta = effect_size * Math.sqrt(sample_size / 2) - z_alpha
  const power = normalCDF(z_beta)

  return {
    result: power,
    interpretation: power >= 0.8 
      ? 'Adequate power (≥80%)' 
      : 'Insufficient power (<80%)',
    details: {
      effect_size,
      sample_size,
      alpha,
      power,
      recommended_sample_size: power < 0.8 
        ? Math.ceil(2 * Math.pow((z_alpha + 1.28) / effect_size, 2))
        : sample_size,
    },
  }
}

/**
 * Calculate confidence interval
 */
function calculateConfidenceInterval(data: any) {
  const { mean, std_dev, n, confidence_level = 0.95 } = data

  validateRequiredFields(data, ['mean', 'std_dev', 'n'], 'StatisticsEngine', 'confidence_interval')

  const z = confidence_level === 0.95 ? 1.96 : 2.576 // 95% or 99%
  const se = std_dev / Math.sqrt(n)
  const margin = z * se
  const lower = mean - margin
  const upper = mean + margin

  return {
    result: [lower, upper],
    interpretation: `${confidence_level * 100}% CI: [${lower.toFixed(2)}, ${upper.toFixed(2)}]`,
    details: {
      mean,
      std_dev,
      n,
      confidence_level,
      standard_error: se,
      margin_of_error: margin,
      lower_bound: lower,
      upper_bound: upper,
    },
  }
}

/**
 * Calculate p-value
 */
function calculatePValue(data: any) {
  const { test_statistic, df } = data

  validateRequiredFields(data, ['test_statistic'], 'StatisticsEngine', 'p_value')

  // Simplified p-value calculation
  // In production, use proper statistical library
  const p_value = 2 * (1 - normalCDF(Math.abs(test_statistic)))

  return {
    result: p_value,
    interpretation: p_value < 0.05 
      ? 'Statistically significant (p < 0.05)' 
      : 'Not statistically significant (p ≥ 0.05)',
    details: {
      test_statistic,
      df,
      p_value,
      alpha: 0.05,
      significant: p_value < 0.05,
    },
  }
}

/**
 * Calculate effect size (Cohen's d)
 */
function calculateEffectSize(data: any) {
  const { mean1, mean2, std1, std2, n1, n2 } = data

  validateRequiredFields(
    data, 
    ['mean1', 'mean2', 'std1', 'std2', 'n1', 'n2'], 
    'StatisticsEngine', 
    'effect_size'
  )

  // Pooled standard deviation
  const pooled_std = Math.sqrt(
    ((n1 - 1) * std1 * std1 + (n2 - 1) * std2 * std2) / (n1 + n2 - 2)
  )

  const cohens_d = (mean1 - mean2) / pooled_std

  let interpretation = ''
  if (Math.abs(cohens_d) < 0.2) interpretation = 'Small effect'
  else if (Math.abs(cohens_d) < 0.5) interpretation = 'Medium effect'
  else interpretation = 'Large effect'

  return {
    result: cohens_d,
    interpretation,
    details: {
      mean1,
      mean2,
      std1,
      std2,
      n1,
      n2,
      pooled_std,
      cohens_d,
      absolute_effect: Math.abs(cohens_d),
    },
  }
}

/**
 * Calculate required sample size
 */
function calculateSampleSize(data: any) {
  const { power = 0.8, effect_size = 0.5, alpha = 0.05 } = data

  // Simplified sample size calculation
  const z_alpha = 1.96 // For alpha = 0.05 (two-tailed)
  const z_beta = 0.84 // For power = 0.8

  const n = 2 * Math.pow((z_alpha + z_beta) / effect_size, 2)
  const sample_size = Math.ceil(n)

  return {
    result: sample_size,
    interpretation: `Required sample size: ${sample_size} per group`,
    details: {
      power,
      effect_size,
      alpha,
      sample_size_per_group: sample_size,
      total_sample_size: sample_size * 2,
    },
  }
}

/**
 * Normal CDF approximation
 */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp(-x * x / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x > 0 ? 1 - p : p
}
