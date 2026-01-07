// Study Design Engine v2.3 - Component Adapter
// Converts engine output to format expected by StudyDesignSuggestion component

import {
  StudyDesignOutput as EngineOutput,
  DesignPattern,
  RegulatoryPathway,
  PrimaryObjective
} from './types'

import { generateStudyDesign as engineGenerateStudyDesign, DESIGN_PATTERNS } from './engine'

// Component-expected output format (legacy compatibility)
export interface ComponentStudyDesignOutput {
  regulatoryPathway: string
  primaryObjective: string
  designPattern: string | null
  designSummary: {
    structure: string
    randomization: string
    blinding: string
    comparator: string
    typicalN: string
  } | null
  phaseLabel: string | null
  designName: string | null
  designType: 'crossover_2x2' | 'crossover_replicate' | 'parallel' | 'adaptive' | 'observational'
  arms: number
  periods: number
  sequences: number
  blinding: 'open-label' | 'single-blind' | 'double-blind'
  comparatorType: string
  comparatorDescription: string
  population: {
    type: 'healthy_volunteers' | 'patients'
    description: string
    sampleSizeRange: { min: number; max: number; recommended: number }
    sampleSizeRationale: string
  }
  duration: {
    screeningDays: number
    treatmentDays: number
    washoutDays: number
    followUpDays: number
    totalWeeks: number
  }
  dosing: {
    regimen: 'single-dose' | 'multiple-dose' | 'steady-state'
    description: string
  }
  conditions: {
    fasting: boolean
    fed: boolean
    fedDescription?: string
  }
  sampling: {
    schedule: string[]
    totalSamples: number
    rationale: string
  }
  endpoints: {
    primary: string[]
    secondary: string[]
  }
  acceptanceCriteria: {
    criterion: string
    margin: string
    description: string
  }
  regulatoryBasis: string[]
  regulatoryRationale: string
  warnings: string[]
  confidence: number
  decisionTrace: Array<{ step: string; action?: string; result: string }>
}

// Map pattern structure to legacy design type
function mapDesignType(structure: string, patternId: string | null): ComponentStudyDesignOutput['designType'] {
  if (!patternId) return 'parallel'
  
  if (patternId === 'PK_CROSSOVER_BE') return 'crossover_2x2'
  if (patternId === 'PK_CROSSOVER_BE_REPLICATE') return 'crossover_replicate'
  if (patternId === 'OBSERVATIONAL_REGISTRY') return 'observational'
  if (patternId.includes('ADAPTIVE') || patternId.includes('SEAMLESS')) return 'adaptive'
  
  if (structure === 'crossover') return 'crossover_2x2'
  if (structure === 'observational') return 'observational'
  
  return 'parallel'
}

// Map blinding to legacy format
function mapBlinding(blinding: string): 'open-label' | 'single-blind' | 'double-blind' {
  if (blinding === 'double_blind') return 'double-blind'
  if (blinding === 'single_blind') return 'single-blind'
  return 'open-label'
}

// Get pattern details for extended output
function getPatternDetails(patternId: string | null): DesignPattern | null {
  if (!patternId) return null
  return DESIGN_PATTERNS[patternId] || null
}

// Build sampling schedule based on half-life
function buildSamplingSchedule(halfLife: number, objective: string): string[] {
  if (!['pk_equivalence', 'pk_similarity', 'pk_safety'].includes(objective)) {
    return []
  }
  
  if (halfLife <= 4) {
    return ['0', '0.25', '0.5', '0.75', '1', '1.5', '2', '2.5', '3', '4', '6', '8', '12h']
  } else if (halfLife <= 12) {
    return ['0', '0.5', '1', '1.5', '2', '3', '4', '6', '8', '12', '24h']
  } else {
    return ['0', '0.5', '1', '2', '3', '4', '6', '8', '12', '24', '36', '48', '72h']
  }
}

// Build population description
function buildPopulationDescription(
  type: 'healthy_volunteers' | 'patients',
  indication?: string,
  pathway?: string
): string {
  if (type === 'healthy_volunteers') {
    return 'Healthy adult volunteers, 18-55 years, BMI 18.5-30 kg/m², non-smokers or light smokers'
  }
  if (indication) {
    return `Adult patients with ${indication}, meeting protocol-defined inclusion/exclusion criteria`
  }
  if (pathway === 'post_marketing') {
    return 'Real-world patient population receiving treatment per standard clinical practice'
  }
  return 'Adult patients meeting protocol-defined inclusion/exclusion criteria'
}

// Main adapter function
export function generateStudyDesignForComponent(
  productType: 'generic' | 'innovator' | 'hybrid',
  compoundName: string,
  formulation: { dosageForm?: string; route?: string; strength?: string },
  stageHint?: string,
  indication?: string,
  drugChars?: { halfLife?: number; isNTI?: boolean; isHVD?: boolean; hasFoodEffect?: boolean }
): ComponentStudyDesignOutput {
  // Call the new engine
  const engineOutput = engineGenerateStudyDesign(
    productType,
    compoundName,
    formulation,
    stageHint,
    indication,
    drugChars
  )
  
  // Get pattern details
  const pattern = getPatternDetails(engineOutput.designPattern)
  const halfLife = drugChars?.halfLife || 8
  
  // Build sampling schedule
  const samplingSchedule = buildSamplingSchedule(halfLife, engineOutput.primaryObjective)
  
  // Calculate washout for crossover
  const washoutDays = pattern?.summary.structure === 'crossover'
    ? Math.max(Math.ceil(halfLife * 5 / 24), 7)
    : 0
  
  // Determine periods/sequences for crossover
  let periods = 1
  let sequences = 1
  if (pattern?.summary.structure === 'crossover') {
    if (engineOutput.designPattern === 'PK_CROSSOVER_BE_REPLICATE') {
      periods = 4
      sequences = 2
    } else {
      periods = 2
      sequences = 2
    }
  }
  
  // Build acceptance criteria
  let acceptanceCriteria = {
    criterion: 'Standard criteria',
    margin: 'Per protocol',
    description: ''
  }
  
  if (engineOutput.primaryObjective === 'pk_equivalence') {
    if (drugChars?.isNTI) {
      acceptanceCriteria = {
        criterion: 'Average Bioequivalence with Tightened Limits',
        margin: '90% CI of geometric mean ratio within 90.00-111.11%',
        description: 'Tightened limits for narrow therapeutic index drugs per FDA guidance'
      }
    } else if (drugChars?.isHVD) {
      acceptanceCriteria = {
        criterion: 'Reference-Scaled Average Bioequivalence',
        margin: 'Scaled 90% CI based on reference variability',
        description: 'Reference-scaled approach for highly variable drugs per FDA guidance'
      }
    } else {
      acceptanceCriteria = {
        criterion: 'Average Bioequivalence',
        margin: '90% CI of geometric mean ratio within 80.00-125.00%',
        description: 'Standard BE criteria per FDA/EMA guidance'
      }
    }
  } else if (engineOutput.primaryObjective === 'clinical_equivalence') {
    acceptanceCriteria = {
      criterion: 'Clinical Equivalence',
      margin: '95% CI of treatment difference within ±15% equivalence margin',
      description: 'Clinical similarity demonstration per FDA/EMA guidance'
    }
  }
  
  // Build endpoints
  let endpoints = {
    primary: ['Primary efficacy endpoint'],
    secondary: ['Secondary endpoints']
  }
  
  if (engineOutput.primaryObjective === 'pk_equivalence') {
    endpoints = {
      primary: ['AUC0-t', 'AUC0-inf', 'Cmax'],
      secondary: ['Tmax', 'T1/2', 'Kel', 'Safety and tolerability']
    }
  } else if (engineOutput.primaryObjective === 'pk_similarity') {
    endpoints = {
      primary: ['AUC0-inf', 'Cmax'],
      secondary: ['Tmax', 'T1/2', 'Immunogenicity (ADA)', 'Safety profile']
    }
  } else if (engineOutput.primaryObjective === 'pk_safety') {
    endpoints = {
      primary: ['Safety and tolerability', 'PK parameters (AUC, Cmax)'],
      secondary: ['Dose-proportionality', 'Accumulation ratio', 'Time to steady-state']
    }
  }
  
  // Build regulatory basis
  let regulatoryBasis = pattern?.rationale.assumptions || []
  if (engineOutput.regulatoryPathway === 'generic') {
    regulatoryBasis = [
      'FDA Guidance: Bioequivalence Studies with Pharmacokinetic Endpoints (2021)',
      'FDA Guidance: Statistical Approaches to Establishing Bioequivalence (2001)',
      'EMA Guideline on the Investigation of Bioequivalence (2010)'
    ]
  } else if (engineOutput.regulatoryPathway === 'biosimilar') {
    regulatoryBasis = [
      'FDA Guidance: Scientific Considerations in Demonstrating Biosimilarity (2015)',
      'EMA Guideline on Similar Biological Medicinal Products'
    ]
  }
  
  // Determine comparator
  let comparatorType = 'none'
  let comparatorDescription = ''
  if (pattern) {
    const comp = pattern.summary.comparator
    if (comp === 'reference') {
      comparatorType = engineOutput.regulatoryPathway === 'biosimilar' ? 'reference_biologic' : 'reference_drug'
      comparatorDescription = engineOutput.regulatoryPathway === 'biosimilar'
        ? 'US-licensed or EU-approved reference biologic'
        : 'US RLD (Reference Listed Drug)'
    } else if (comp === 'placebo') {
      comparatorType = 'placebo'
      comparatorDescription = 'Matching placebo'
    } else if (comp === 'placebo_or_active') {
      comparatorType = 'active_control'
      comparatorDescription = 'Placebo and/or active comparator per protocol'
    }
  }
  
  // Build conditions
  const conditions = {
    fasting: engineOutput.regulatoryPathway === 'generic' || engineOutput.primaryObjective === 'pk_similarity',
    fed: engineOutput.regulatoryPathway === 'generic' && (drugChars?.hasFoodEffect ?? false),
    fedDescription: 'High-fat, high-calorie meal per FDA guidance'
  }
  
  // Get sample size from pattern or output
  const sampleSize = engineOutput.population?.sampleSizeRange || {
    min: pattern?.typical_n_range.min || 24,
    max: pattern?.typical_n_range.max || 48,
    recommended: Math.round(((pattern?.typical_n_range.min || 24) + (pattern?.typical_n_range.max || 48)) / 2)
  }
  
  // Adjust sample size for NTI
  if (drugChars?.isNTI && engineOutput.regulatoryPathway === 'generic') {
    sampleSize.min = 36
    sampleSize.max = 48
    sampleSize.recommended = 42
  }
  
  // Build duration
  const durationWeeks = pattern?.typical_n_range.unit === 'patients' ? 12 : 4
  
  return {
    regulatoryPathway: engineOutput.regulatoryPathway,
    primaryObjective: engineOutput.primaryObjective,
    designPattern: engineOutput.designPattern,
    designSummary: engineOutput.designSummary,
    phaseLabel: engineOutput.phaseLabel,
    designName: engineOutput.designName,
    designType: mapDesignType(pattern?.summary.structure || 'parallel', engineOutput.designPattern),
    arms: typeof pattern?.summary.arms === 'number' ? pattern.summary.arms : 2,
    periods,
    sequences,
    blinding: mapBlinding(pattern?.summary.blinding || 'open_label'),
    comparatorType,
    comparatorDescription,
    population: {
      type: pattern?.typical_n_range.unit === 'subjects' ? 'healthy_volunteers' : 'patients',
      description: buildPopulationDescription(
        pattern?.typical_n_range.unit === 'subjects' ? 'healthy_volunteers' : 'patients',
        indication,
        engineOutput.regulatoryPathway
      ),
      sampleSizeRange: sampleSize,
      sampleSizeRationale: engineOutput.population?.sampleSizeRationale || `Based on ${engineOutput.designPattern} design requirements`
    },
    duration: {
      screeningDays: 28,
      treatmentDays: durationWeeks * 7,
      washoutDays,
      followUpDays: engineOutput.regulatoryPathway === 'biosimilar' ? 56 : 28,
      totalWeeks: durationWeeks + 8
    },
    dosing: {
      regimen: pattern?.summary.structure === 'crossover' ? 'single-dose' : 'multiple-dose',
      description: `${pattern?.summary.structure === 'crossover' ? 'Single' : 'Multiple'} dose administration of ${compoundName}`
    },
    conditions,
    sampling: {
      schedule: samplingSchedule,
      totalSamples: samplingSchedule.length,
      rationale: samplingSchedule.length > 0 ? 'PK sampling to characterize absorption and elimination' : 'Sparse PK if applicable'
    },
    endpoints,
    acceptanceCriteria,
    regulatoryBasis,
    regulatoryRationale: engineOutput.regulatoryRationale,
    warnings: engineOutput.warnings,
    confidence: engineOutput.confidence,
    decisionTrace: engineOutput.decisionTrace
  }
}
