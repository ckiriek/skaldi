/**
 * Effect Size Calculations
 * Convert between different effect size measures
 */

/**
 * Calculate Cohen's d from means and SD
 */
export function cohensD(mean1: number, mean2: number, sd: number): number {
  return Math.abs(mean1 - mean2) / sd
}

/**
 * Calculate Cohen's d from means and pooled SD
 */
export function cohensDPooled(
  mean1: number,
  mean2: number,
  sd1: number,
  sd2: number,
  n1: number,
  n2: number
): number {
  const pooledSD = Math.sqrt(
    ((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2)
  )
  return Math.abs(mean1 - mean2) / pooledSD
}

/**
 * Interpret Cohen's d
 */
export function interpretCohensD(d: number): string {
  const absD = Math.abs(d)
  if (absD < 0.2) return 'negligible'
  if (absD < 0.5) return 'small'
  if (absD < 0.8) return 'medium'
  return 'large'
}

/**
 * Calculate risk difference
 */
export function riskDifference(p1: number, p2: number): number {
  return p2 - p1
}

/**
 * Calculate risk ratio (relative risk)
 */
export function riskRatio(p1: number, p2: number): number {
  if (p1 === 0) throw new Error('Control proportion cannot be 0')
  return p2 / p1
}

/**
 * Calculate odds ratio
 */
export function oddsRatio(p1: number, p2: number): number {
  if (p1 === 0 || p1 === 1 || p2 === 0 || p2 === 1) {
    throw new Error('Proportions must be between 0 and 1 (exclusive)')
  }
  const odds1 = p1 / (1 - p1)
  const odds2 = p2 / (1 - p2)
  return odds2 / odds1
}

/**
 * Convert odds ratio to risk ratio (approximate)
 * Assumes rare outcome
 */
export function oddsRatioToRiskRatio(OR: number, p1: number): number {
  // Zhang & Yu (1998) formula
  return OR / ((1 - p1) + (p1 * OR))
}

/**
 * Convert risk ratio to odds ratio
 */
export function riskRatioToOddsRatio(RR: number, p1: number): number {
  const p2 = RR * p1
  return oddsRatio(p1, p2)
}

/**
 * Calculate hazard ratio from median survival times
 * Assumes exponential distribution
 */
export function hazardRatioFromMedians(
  medianControl: number,
  medianTreatment: number
): number {
  // HR = λ_treatment / λ_control
  // λ = ln(2) / median
  return medianControl / medianTreatment
}

/**
 * Calculate median survival from hazard ratio
 */
export function medianFromHazardRatio(
  medianControl: number,
  hazardRatio: number
): number {
  return medianControl / hazardRatio
}

/**
 * Number Needed to Treat (NNT)
 */
export function numberNeededToTreat(p1: number, p2: number): number {
  const rd = riskDifference(p1, p2)
  if (rd === 0) throw new Error('No difference in proportions')
  return Math.abs(1 / rd)
}

/**
 * Calculate minimum clinically important difference (MCID)
 * Based on distribution-based methods
 */
export function mcidFromSD(sd: number, method: 'half_sd' | 'third_sd' | 'sem' = 'half_sd'): number {
  switch (method) {
    case 'half_sd':
      return 0.5 * sd
    case 'third_sd':
      return 0.33 * sd
    case 'sem':
      // SEM = SD / sqrt(n), but we use SD * 1.96 for 95% CI
      return 1.96 * sd
    default:
      return 0.5 * sd
  }
}

/**
 * Calculate standardized mean difference (Hedges' g)
 * Corrects for small sample bias
 */
export function hedgesG(
  mean1: number,
  mean2: number,
  sd1: number,
  sd2: number,
  n1: number,
  n2: number
): number {
  const d = cohensDPooled(mean1, mean2, sd1, sd2, n1, n2)
  
  // Correction factor
  const df = n1 + n2 - 2
  const correction = 1 - (3 / (4 * df - 1))
  
  return d * correction
}

/**
 * Calculate Glass's delta (uses control SD only)
 */
export function glassDelta(mean1: number, mean2: number, sdControl: number): number {
  return Math.abs(mean1 - mean2) / sdControl
}

/**
 * Convert between effect size measures
 */
export interface EffectSizeConversion {
  cohensD?: number
  hedgesG?: number
  glassDelta?: number
  riskDifference?: number
  riskRatio?: number
  oddsRatio?: number
  hazardRatio?: number
  nnt?: number
}

/**
 * Get all applicable effect size measures
 */
export function calculateAllEffectSizes(params: {
  endpointType: 'continuous' | 'binary' | 'survival'
  // Continuous
  mean1?: number
  mean2?: number
  sd?: number
  sd1?: number
  sd2?: number
  n1?: number
  n2?: number
  // Binary
  p1?: number
  p2?: number
  // Survival
  medianControl?: number
  medianTreatment?: number
  hazardRatio?: number
}): EffectSizeConversion {
  const result: EffectSizeConversion = {}

  if (params.endpointType === 'continuous') {
    if (params.mean1 !== undefined && params.mean2 !== undefined && params.sd !== undefined) {
      result.cohensD = cohensD(params.mean1, params.mean2, params.sd)
    }
    
    if (
      params.mean1 !== undefined &&
      params.mean2 !== undefined &&
      params.sd1 !== undefined &&
      params.sd2 !== undefined &&
      params.n1 !== undefined &&
      params.n2 !== undefined
    ) {
      result.hedgesG = hedgesG(params.mean1, params.mean2, params.sd1, params.sd2, params.n1, params.n2)
      result.glassDelta = glassDelta(params.mean1, params.mean2, params.sd1)
    }
  }

  if (params.endpointType === 'binary') {
    if (params.p1 !== undefined && params.p2 !== undefined) {
      result.riskDifference = riskDifference(params.p1, params.p2)
      result.riskRatio = riskRatio(params.p1, params.p2)
      result.oddsRatio = oddsRatio(params.p1, params.p2)
      result.nnt = numberNeededToTreat(params.p1, params.p2)
    }
  }

  if (params.endpointType === 'survival') {
    if (params.hazardRatio !== undefined) {
      result.hazardRatio = params.hazardRatio
    } else if (params.medianControl !== undefined && params.medianTreatment !== undefined) {
      result.hazardRatio = hazardRatioFromMedians(params.medianControl, params.medianTreatment)
    }
  }

  return result
}
