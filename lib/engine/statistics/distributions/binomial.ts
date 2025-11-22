/**
 * Binomial Distribution
 * Used for binary endpoints (response rates, event occurrence)
 */

import type { Distribution } from '../types'

export class Binomial implements Distribution {
  name = 'binomial'
  
  constructor(
    public n: number, // number of trials
    public p: number  // probability of success
  ) {
    if (n <= 0 || !Number.isInteger(n)) {
      throw new Error('Number of trials must be a positive integer')
    }
    if (p < 0 || p > 1) {
      throw new Error('Probability must be between 0 and 1')
    }
  }
  
  get parameters() {
    return { n: this.n, p: this.p }
  }
  
  get mean() {
    return this.n * this.p
  }
  
  get variance() {
    return this.n * this.p * (1 - this.p)
  }
  
  /**
   * Probability mass function
   */
  pdf(k: number): number {
    if (k < 0 || k > this.n || !Number.isInteger(k)) {
      return 0
    }
    
    return this.binomialCoefficient(this.n, k) * 
           Math.pow(this.p, k) * 
           Math.pow(1 - this.p, this.n - k)
  }
  
  /**
   * Cumulative distribution function
   */
  cdf(k: number): number {
    if (k < 0) return 0
    if (k >= this.n) return 1
    
    k = Math.floor(k)
    let sum = 0
    
    for (let i = 0; i <= k; i++) {
      sum += this.pdf(i)
    }
    
    return sum
  }
  
  /**
   * Quantile function (inverse CDF)
   */
  quantile(prob: number): number {
    if (prob < 0 || prob > 1) {
      throw new Error('Probability must be between 0 and 1')
    }
    
    let cumProb = 0
    for (let k = 0; k <= this.n; k++) {
      cumProb += this.pdf(k)
      if (cumProb >= prob) {
        return k
      }
    }
    
    return this.n
  }
  
  /**
   * Binomial coefficient: n choose k
   */
  private binomialCoefficient(n: number, k: number): number {
    if (k < 0 || k > n) return 0
    if (k === 0 || k === n) return 1
    
    // Use symmetry property
    k = Math.min(k, n - k)
    
    let result = 1
    for (let i = 0; i < k; i++) {
      result *= (n - i)
      result /= (i + 1)
    }
    
    return result
  }
}

/**
 * Helper functions for binomial distribution
 */

/**
 * Normal approximation to binomial (for large n)
 * Valid when n*p > 5 and n*(1-p) > 5
 */
export function binomialNormalApproximation(
  n: number,
  p: number,
  k: number,
  continuityCorrection: boolean = true
): number {
  const mean = n * p
  const sd = Math.sqrt(n * p * (1 - p))
  
  // Apply continuity correction
  const kAdjusted = continuityCorrection ? k + 0.5 : k
  
  // Standardize
  const z = (kAdjusted - mean) / sd
  
  // Use standard normal CDF
  return 0.5 * (1 + erf(z / Math.sqrt(2)))
}

/**
 * Calculate confidence interval for proportion
 */
export function proportionConfidenceInterval(
  successes: number,
  total: number,
  confidenceLevel: number = 0.95,
  method: 'wald' | 'wilson' | 'agresti_coull' = 'wilson'
): { lower: number; upper: number } {
  const p = successes / total
  const alpha = 1 - confidenceLevel
  const z = getZScore(1 - alpha / 2)
  
  if (method === 'wald') {
    // Simple Wald interval (not recommended for small samples)
    const se = Math.sqrt(p * (1 - p) / total)
    return {
      lower: Math.max(0, p - z * se),
      upper: Math.min(1, p + z * se)
    }
  } else if (method === 'wilson') {
    // Wilson score interval (recommended)
    const denominator = 1 + z * z / total
    const center = (p + z * z / (2 * total)) / denominator
    const margin = (z / denominator) * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total))
    
    return {
      lower: Math.max(0, center - margin),
      upper: Math.min(1, center + margin)
    }
  } else {
    // Agresti-Coull interval
    const nTilde = total + z * z
    const pTilde = (successes + z * z / 2) / nTilde
    const se = Math.sqrt(pTilde * (1 - pTilde) / nTilde)
    
    return {
      lower: Math.max(0, pTilde - z * se),
      upper: Math.min(1, pTilde + z * se)
    }
  }
}

/**
 * Test for difference between two proportions
 */
export function twoProportionTest(
  successes1: number,
  total1: number,
  successes2: number,
  total2: number,
  sided: 'one_sided' | 'two_sided' = 'two_sided'
): { zScore: number; pValue: number; difference: number } {
  const p1 = successes1 / total1
  const p2 = successes2 / total2
  const difference = p1 - p2
  
  // Pooled proportion
  const pPooled = (successes1 + successes2) / (total1 + total2)
  
  // Standard error
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / total1 + 1 / total2))
  
  // Z-score
  const zScore = difference / se
  
  // P-value
  const pValue = sided === 'two_sided'
    ? 2 * (1 - standardNormalCDF(Math.abs(zScore)))
    : 1 - standardNormalCDF(zScore)
  
  return { zScore, pValue, difference }
}

// Helper functions

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

function standardNormalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.sqrt(2)))
}

function getZScore(p: number): number {
  // Approximation for standard normal quantile
  if (p <= 0 || p >= 1) {
    throw new Error('Probability must be between 0 and 1')
  }
  
  const a = [
    -3.969683028665376e+01,
    2.209460984245205e+02,
    -2.759285104469687e+02,
    1.383577518672690e+02,
    -3.066479806614716e+01,
    2.506628277459239e+00
  ]
  
  const b = [
    -5.447609879822406e+01,
    1.615858368580409e+02,
    -1.556989798598866e+02,
    6.680131188771972e+01,
    -1.328068155288572e+01
  ]
  
  const pLow = 0.02425
  const pHigh = 1 - pLow
  
  let q: number, r: number
  
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return -(((((a[0] * q + a[1]) * q + a[2]) * q + a[3]) * q + a[4]) * q + a[5]) /
            ((((b[0] * q + b[1]) * q + b[2]) * q + b[3]) * q + 1)
  } else if (p <= pHigh) {
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p))
    return (((((a[0] * q + a[1]) * q + a[2]) * q + a[3]) * q + a[4]) * q + a[5]) /
           ((((b[0] * q + b[1]) * q + b[2]) * q + b[3]) * q + 1)
  }
}
