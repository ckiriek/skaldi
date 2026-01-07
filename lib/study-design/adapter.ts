// Study Design Engine v2.3 - Component Adapter
// Converts engine output to format expected by StudyDesignSuggestion component

import {
  StudyDesignOutput as EngineOutput,
  DesignPattern,
  RegulatoryPathway,
  PrimaryObjective,
  StructuredRationale,
  StructuredWarning
} from './types'

import { generateStudyDesign as engineGenerateStudyDesign, DESIGN_PATTERNS } from './engine'
import { generateConfigHash } from './config-loader'

// Structured warning for Audit Drawer
export interface AuditWarning {
  severity: 'HARD' | 'SOFT'
  message: string
  implication?: string
  ruleId?: string
}

// Structured rationale for Audit Drawer
export interface AuditRationale {
  what: string
  why: string
  regulatory: string
  assumptions: string[]
  notes: string[]
  fallbackNote?: string
}

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
  
  // Audit Drawer fields (per VP CRO spec)
  structuredRationale: AuditRationale
  structuredWarnings: AuditWarning[]
  isHumanDecisionRequired: boolean
  configHash: string
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

// Parse rationale string into structured format for Audit Drawer
function parseRationale(
  rationale: string,
  pattern: DesignPattern | null,
  drugChars?: { isHVD?: boolean; isNTI?: boolean; halfLife?: number },
  pathway?: string
): AuditRationale {
  // Default structure
  const result: AuditRationale = {
    what: '',
    why: '',
    regulatory: '',
    assumptions: [],
    notes: []
  }
  
  // Parse WHAT/WHY/REG from rationale string
  const whatMatch = rationale.match(/WHAT:\s*([^W]+?)(?=WHY:|$)/i)
  const whyMatch = rationale.match(/WHY:\s*([^R]+?)(?=REG:|$)/i)
  const regMatch = rationale.match(/REG:\s*([^A]+?)(?=Assumptions:|Note:|$)/i)
  const assumptionsMatch = rationale.match(/Assumptions:\s*(.+?)(?=Note:|$)/i)
  const noteMatch = rationale.match(/Note:\s*(.+)$/i)
  
  if (whatMatch) result.what = whatMatch[1].trim()
  if (whyMatch) result.why = whyMatch[1].trim()
  if (regMatch) result.regulatory = regMatch[1].trim()
  if (assumptionsMatch) {
    result.assumptions = assumptionsMatch[1].split(';').map(s => s.trim()).filter(Boolean)
  }
  if (noteMatch) {
    result.fallbackNote = noteMatch[1].trim()
  }
  
  // Use pattern rationale if parsing failed
  if (!result.what && pattern) {
    result.what = pattern.rationale.what
    result.why = pattern.rationale.why
    result.regulatory = pattern.rationale.reg
    result.assumptions = pattern.rationale.assumptions || []
  }
  
  // Add drug characteristic notes
  if (drugChars?.isHVD && pathway === 'generic') {
    result.notes.push('HVD detected - replicate design preferred to estimate within-subject variability.')
  }
  if (drugChars?.isNTI && pathway === 'generic') {
    result.notes.push('NTI drug - tightened BE limits (90.00-111.11%) applied per FDA guidance.')
  }
  if (drugChars?.halfLife && drugChars.halfLife >= 24) {
    result.notes.push(`Long half-life (${drugChars.halfLife}h) - washout period may be operationally challenging.`)
  }
  
  return result
}

// Convert warnings to structured format for Audit Drawer
function parseWarnings(warnings: string[]): AuditWarning[] {
  return warnings.map(warning => {
    // Detect HARD warnings
    const isHard = warning.includes('HUMAN_DECISION_REQUIRED') ||
                   warning.includes('HARD_STOP') ||
                   warning.includes('blocked') ||
                   warning.includes('not valid') ||
                   warning.includes('not applicable')
    
    // Extract rule ID if present
    const ruleMatch = warning.match(/GR-\d+/)
    
    // Determine implication
    let implication: string | undefined
    if (warning.includes('HUMAN_DECISION_REQUIRED')) {
      implication = 'Manual review required before proceeding'
    } else if (warning.includes('bias risk')) {
      implication = 'Potential bias in efficacy assessment'
    } else if (warning.includes('operational')) {
      implication = 'Operational complexity may increase'
    } else if (warning.includes('tightened')) {
      implication = 'Stricter acceptance criteria apply'
    }
    
    return {
      severity: isHard ? 'HARD' : 'SOFT',
      message: warning,
      implication,
      ruleId: ruleMatch?.[0]
    }
  })
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
  
  // Parse structured data for Audit Drawer
  const structuredRationale = parseRationale(
    engineOutput.regulatoryRationale,
    pattern,
    drugChars,
    engineOutput.regulatoryPathway
  )
  const structuredWarnings = parseWarnings(engineOutput.warnings)
  const isHumanDecisionRequired = engineOutput.warnings.some(w => w.includes('HUMAN_DECISION_REQUIRED')) ||
                                   engineOutput.designPattern === null
  const configHash = generateConfigHash()
  
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
    decisionTrace: engineOutput.decisionTrace,
    
    // Audit Drawer fields
    structuredRationale,
    structuredWarnings,
    isHumanDecisionRequired,
    configHash
  }
}
