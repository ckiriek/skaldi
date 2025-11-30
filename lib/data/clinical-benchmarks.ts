/**
 * Clinical Benchmarks for Sample Size Calculations
 * Used as smart defaults when generating SAP documents.
 */

export interface EndpointBenchmark {
  typical_sd?: number
  clinically_meaningful_difference?: number
  unit?: string
  endpoint_name?: string
  reference: string
}

export interface RateBenchmark {
  control_rate: number
  treatment_effect: number
  effect_type: 'absolute' | 'relative_reduction' | 'hazard_ratio' | 'rate_ratio'
  reference: string
}

export interface PhaseBenchmark {
  power: number
  alpha: number
  dropout_rate: number
  typical_n_per_arm: number
  typical_duration_weeks?: number
  continuous?: EndpointBenchmark
  binary?: RateBenchmark
  time_to_event?: RateBenchmark
  rate?: RateBenchmark
  visit_window_days?: number
}

export interface IndicationBenchmarks {
  display_name: string
  aliases: string[]
  phase2?: PhaseBenchmark
  phase3?: PhaseBenchmark
}

export const CLINICAL_BENCHMARKS: Record<string, IndicationBenchmarks> = {
  'multiple_sclerosis': {
    display_name: 'Relapsing Remitting Multiple Sclerosis',
    aliases: ['RRMS', 'MS', 'relapsing MS', 'relapsing-remitting multiple sclerosis'],
    phase2: {
      power: 0.80, alpha: 0.05, dropout_rate: 0.15, typical_n_per_arm: 75,
      typical_duration_weeks: 24, visit_window_days: 7,
      continuous: { typical_sd: 1.5, clinically_meaningful_difference: 0.5, unit: 'EDSS points', reference: 'Phase 2 MS trials meta-analysis' },
      rate: { control_rate: 0.8, treatment_effect: 0.30, effect_type: 'relative_reduction', reference: 'Historical placebo ARR' }
    },
    phase3: {
      power: 0.90, alpha: 0.05, dropout_rate: 0.15, typical_n_per_arm: 400,
      typical_duration_weeks: 96, visit_window_days: 7,
      continuous: { typical_sd: 15, clinically_meaningful_difference: 5, unit: 'points', reference: 'DEFINE/CONFIRM trials (NCT00420212)' },
      rate: { control_rate: 0.35, treatment_effect: 0.50, effect_type: 'relative_reduction', reference: 'Glatiramer acetate pivotal trials' }
    }
  },
  'type_2_diabetes': {
    display_name: 'Type 2 Diabetes Mellitus',
    aliases: ['T2DM', 'T2D', 'diabetes', 'type 2 diabetes'],
    phase2: {
      power: 0.80, alpha: 0.05, dropout_rate: 0.15, typical_n_per_arm: 75,
      typical_duration_weeks: 12, visit_window_days: 7,
      continuous: { typical_sd: 1.0, clinically_meaningful_difference: 0.4, unit: '%', endpoint_name: 'Change in HbA1c', reference: 'FDA Guidance (2008)' }
    },
    phase3: {
      power: 0.90, alpha: 0.05, dropout_rate: 0.20, typical_n_per_arm: 250,
      typical_duration_weeks: 24, visit_window_days: 7,
      continuous: { typical_sd: 1.2, clinically_meaningful_difference: 0.5, unit: '%', reference: 'FDA Guidance, SGLT2i/GLP-1 trials' },
      binary: { control_rate: 0.30, treatment_effect: 0.20, effect_type: 'absolute', reference: 'HbA1c <7% responders' }
    }
  },
  'hypertension': {
    display_name: 'Hypertension',
    aliases: ['HTN', 'high blood pressure'],
    phase3: {
      power: 0.90, alpha: 0.05, dropout_rate: 0.15, typical_n_per_arm: 200,
      typical_duration_weeks: 12, visit_window_days: 3,
      continuous: { typical_sd: 12, clinically_meaningful_difference: 4, unit: 'mmHg', reference: 'FDA Guidance for Hypertension' }
    }
  },
  'rheumatoid_arthritis': {
    display_name: 'Rheumatoid Arthritis',
    aliases: ['RA', 'arthritis'],
    phase3: {
      power: 0.90, alpha: 0.05, dropout_rate: 0.20, typical_n_per_arm: 200,
      typical_duration_weeks: 24, visit_window_days: 7,
      binary: { control_rate: 0.25, treatment_effect: 0.25, effect_type: 'absolute', reference: 'ACR20 response, JAK inhibitor trials' }
    }
  },
  'major_depressive_disorder': {
    display_name: 'Major Depressive Disorder',
    aliases: ['MDD', 'depression'],
    phase3: {
      power: 0.90, alpha: 0.05, dropout_rate: 0.30, typical_n_per_arm: 150,
      typical_duration_weeks: 8, visit_window_days: 3,
      continuous: { typical_sd: 9, clinically_meaningful_difference: 2.5, unit: 'points', endpoint_name: 'MADRS change', reference: 'FDA Guidance for MDD' }
    }
  },
  'non_small_cell_lung_cancer': {
    display_name: 'Non-Small Cell Lung Cancer',
    aliases: ['NSCLC', 'lung cancer'],
    phase3: {
      power: 0.90, alpha: 0.05, dropout_rate: 0.25, typical_n_per_arm: 300,
      typical_duration_weeks: 104, visit_window_days: 7,
      time_to_event: { control_rate: 6, treatment_effect: 0.70, effect_type: 'hazard_ratio', reference: 'Checkpoint inhibitor trials' }
    }
  },
  'asthma': {
    display_name: 'Asthma',
    aliases: ['bronchial asthma', 'severe asthma'],
    phase3: {
      power: 0.90, alpha: 0.05, dropout_rate: 0.20, typical_n_per_arm: 200,
      typical_duration_weeks: 52, visit_window_days: 7,
      continuous: { typical_sd: 0.4, clinically_meaningful_difference: 0.15, unit: 'L', endpoint_name: 'FEV1 change', reference: 'Biologic asthma trials' },
      rate: { control_rate: 1.5, treatment_effect: 0.50, effect_type: 'rate_ratio', reference: 'Annualized exacerbation rate' }
    }
  },
  'heart_failure': {
    display_name: 'Heart Failure',
    aliases: ['HF', 'CHF', 'HFrEF'],
    phase3: {
      power: 0.90, alpha: 0.05, dropout_rate: 0.20, typical_n_per_arm: 1500,
      typical_duration_weeks: 104, visit_window_days: 14,
      time_to_event: { control_rate: 0.15, treatment_effect: 0.80, effect_type: 'hazard_ratio', reference: 'PARADIGM-HF' }
    }
  }
}

export const DEFAULT_BENCHMARKS: Record<string, PhaseBenchmark> = {
  phase1: { power: 0.80, alpha: 0.05, dropout_rate: 0.10, typical_n_per_arm: 20, visit_window_days: 3 },
  phase2: { power: 0.80, alpha: 0.05, dropout_rate: 0.15, typical_n_per_arm: 75, visit_window_days: 7,
    continuous: { typical_sd: 10, clinically_meaningful_difference: 4, reference: 'Generic Phase 2' } },
  phase3: { power: 0.90, alpha: 0.05, dropout_rate: 0.20, typical_n_per_arm: 200, visit_window_days: 7,
    continuous: { typical_sd: 15, clinically_meaningful_difference: 5, reference: 'Generic Phase 3' } },
  phase4: { power: 0.80, alpha: 0.05, dropout_rate: 0.25, typical_n_per_arm: 500, visit_window_days: 14 }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function findBenchmarksByIndication(indication: string): IndicationBenchmarks | null {
  const norm = indication.toLowerCase().trim()
  
  for (const [key, bm] of Object.entries(CLINICAL_BENCHMARKS)) {
    if (key === norm.replace(/\s+/g, '_')) return bm
    if (bm.display_name.toLowerCase() === norm) return bm
    if (bm.aliases.some(a => a.toLowerCase() === norm || norm.includes(a.toLowerCase()))) return bm
  }
  return null
}

export function getBenchmarksForPhase(indication: string, phase: string): PhaseBenchmark {
  const phaseKey = `phase${phase.toLowerCase().replace(/\D/g, '')}` as 'phase2' | 'phase3'
  const indBm = findBenchmarksByIndication(indication)
  if (indBm?.[phaseKey]) return indBm[phaseKey]!
  return DEFAULT_BENCHMARKS[phaseKey] || DEFAULT_BENCHMARKS.phase3
}

export function calculateSampleSizeContinuous(
  sd: number, effectSize: number, power = 0.90, alpha = 0.05, dropoutRate = 0.15
): { perArm: number; total: number; withDropout: number } {
  const zAlpha = alpha === 0.05 ? 1.96 : 2.576
  const zBeta = power === 0.90 ? 1.28 : 0.84
  const perArm = Math.ceil(2 * sd * sd * Math.pow(zAlpha + zBeta, 2) / (effectSize * effectSize))
  const total = perArm * 2
  const withDropout = Math.ceil(total / (1 - dropoutRate))
  return { perArm, total, withDropout }
}

export function calculateSampleSizeBinary(
  p1: number, p2: number, power = 0.90, alpha = 0.05, dropoutRate = 0.15
): { perArm: number; total: number; withDropout: number } {
  const zAlpha = alpha === 0.05 ? 1.96 : 2.576
  const zBeta = power === 0.90 ? 1.28 : 0.84
  const pBar = (p1 + p2) / 2
  const num = Math.pow(zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2)
  const perArm = Math.ceil(num / Math.pow(p2 - p1, 2))
  const total = perArm * 2
  const withDropout = Math.ceil(total / (1 - dropoutRate))
  return { perArm, total, withDropout }
}

export function generateSampleSizeContext(
  indication: string,
  phase: string,
  targetSampleSize?: number,
  primaryEndpoint?: string
): string {
  const bm = getBenchmarksForPhase(indication, phase)
  const indData = findBenchmarksByIndication(indication)
  
  let ctx = `## Sample Size Assumptions\n\n`
  ctx += `**Source:** ${indData ? indData.display_name + ' benchmarks' : 'Generic Phase ' + phase.replace(/\D/g, '') + ' defaults'}\n\n`
  
  ctx += `### Statistical Parameters\n`
  ctx += `- **Power:** ${(bm.power * 100).toFixed(0)}%\n`
  ctx += `- **Alpha (two-sided):** ${bm.alpha}\n`
  ctx += `- **Expected dropout rate:** ${(bm.dropout_rate * 100).toFixed(0)}%\n\n`
  
  if (bm.continuous) {
    const calc = calculateSampleSizeContinuous(bm.continuous.typical_sd!, bm.continuous.clinically_meaningful_difference!, bm.power, bm.alpha, bm.dropout_rate)
    ctx += `### Continuous Endpoint Assumptions\n`
    ctx += `- **Endpoint:** ${bm.continuous.endpoint_name || primaryEndpoint || 'Primary endpoint'}\n`
    ctx += `- **Expected SD:** ${bm.continuous.typical_sd} ${bm.continuous.unit || 'units'}\n`
    ctx += `- **Clinically meaningful difference:** ${bm.continuous.clinically_meaningful_difference} ${bm.continuous.unit || 'units'}\n`
    ctx += `- **Reference:** ${bm.continuous.reference}\n`
    ctx += `- **Calculated N per arm:** ${calc.perArm}\n`
    ctx += `- **Total with dropout:** ${calc.withDropout}\n\n`
  }
  
  if (bm.binary) {
    const p2 = bm.binary.effect_type === 'absolute' ? bm.binary.control_rate + bm.binary.treatment_effect : bm.binary.control_rate * (1 - bm.binary.treatment_effect)
    const calc = calculateSampleSizeBinary(bm.binary.control_rate, p2, bm.power, bm.alpha, bm.dropout_rate)
    ctx += `### Binary Endpoint Assumptions\n`
    ctx += `- **Control rate:** ${(bm.binary.control_rate * 100).toFixed(0)}%\n`
    ctx += `- **Treatment effect:** ${(bm.binary.treatment_effect * 100).toFixed(0)}% ${bm.binary.effect_type}\n`
    ctx += `- **Reference:** ${bm.binary.reference}\n`
    ctx += `- **Calculated N per arm:** ${calc.perArm}\n\n`
  }
  
  if (bm.rate) {
    ctx += `### Rate Endpoint Assumptions\n`
    ctx += `- **Control rate:** ${bm.rate.control_rate} events/year\n`
    ctx += `- **Expected ${bm.rate.effect_type}:** ${bm.rate.treatment_effect}\n`
    ctx += `- **Reference:** ${bm.rate.reference}\n\n`
  }
  
  if (bm.time_to_event) {
    ctx += `### Time-to-Event Assumptions\n`
    ctx += `- **Expected hazard ratio:** ${bm.time_to_event.treatment_effect}\n`
    ctx += `- **Reference:** ${bm.time_to_event.reference}\n\n`
  }
  
  if (targetSampleSize) {
    ctx += `### Protocol-Specified Sample Size\n`
    ctx += `- **Target total N:** ${targetSampleSize}\n`
    ctx += `- **Per arm (1:1):** ${Math.round(targetSampleSize / 2)}\n\n`
  }
  
  if (bm.visit_window_days) {
    ctx += `### Visit Windows\n`
    ctx += `- **Standard window:** ±${bm.visit_window_days} days\n`
    ctx += `- **Typical duration:** ${bm.typical_duration_weeks || 24} weeks\n\n`
  }
  
  ctx += `---\n*Verify assumptions with biostatistician before finalization.*\n`
  return ctx
}

export function generateVisitWindowsTable(visitSchedule: string, windowDays = 7): string {
  const visits = visitSchedule.split(',').map(v => v.trim())
  let table = `| Visit | Target Day | Window |\n|-------|------------|--------|\n`
  
  for (const visit of visits) {
    const weekMatch = visit.match(/week\s*(\d+)/i)
    const monthMatch = visit.match(/month\s*(\d+)/i)
    
    if (visit.toLowerCase().includes('screening')) {
      table += `| Screening | -28 to -1 | N/A |\n`
    } else if (visit.toLowerCase().includes('baseline') || visit.toLowerCase().includes('week 0')) {
      table += `| Baseline (Day 1) | 1 | N/A |\n`
    } else if (weekMatch) {
      const week = parseInt(weekMatch[1])
      const day = week * 7
      table += `| Week ${week} | Day ${day} | ±${windowDays} days |\n`
    } else if (monthMatch) {
      const month = parseInt(monthMatch[1])
      const day = month * 30
      table += `| Month ${month} | Day ${day} | ±${windowDays * 2} days |\n`
    } else if (visit.toLowerCase().includes('follow')) {
      table += `| Follow-up | +30 days | ±${windowDays} days |\n`
    }
  }
  return table
}
