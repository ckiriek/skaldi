/**
 * Core Statistical Types for Skaldi Statistics Engine
 * Aligned with ICH E9 and regulatory standards
 */

// ============================================================================
// Endpoint Types
// ============================================================================

export type EndpointDataType = 
  | 'continuous'
  | 'binary'
  | 'time_to_event'
  | 'ordinal'
  | 'count'

export type HypothesisType = 
  | 'superiority'
  | 'non_inferiority'
  | 'equivalence'

export type TestSidedness = 'one_sided' | 'two_sided'

export interface Endpoint {
  id: string
  name: string
  description: string
  type: 'primary' | 'secondary' | 'exploratory'
  dataType: EndpointDataType
  variable: string
  hypothesis: HypothesisType
  sided: TestSidedness
  covariates?: string[]
  stratificationFactors?: string[]
}

// ============================================================================
// Sample Size Types
// ============================================================================

export interface SampleSizeParameters {
  // Core parameters
  power: number // 0-1, typically 0.80 or 0.90
  alpha: number // 0-1, typically 0.05
  effectSize: number // depends on endpoint type
  
  // Study design
  numberOfArms: number
  allocationRatio?: number[] // e.g., [1, 1] for 1:1, [2, 1] for 2:1
  
  // Adjustments
  dropoutRate?: number // 0-1
  interimAnalyses?: number
  multipleComparisons?: number
  
  // Endpoint-specific
  endpointType: EndpointDataType
  standardDeviation?: number // for continuous
  eventRate?: number // for binary or time-to-event
  hazardRatio?: number // for time-to-event
  nonInferiorityMargin?: number
}

export interface SampleSizeResult {
  totalSampleSize: number
  sampleSizePerArm: number[]
  power: number
  alpha: number
  effectSize: number
  method: string
  assumptions: string[]
  adjustments: {
    dropout?: number
    interim?: number
    multiplicity?: number
  }
}

// ============================================================================
// Statistical Test Types
// ============================================================================

export type StatisticalTest =
  // Continuous
  | 't_test'
  | 'anova'
  | 'ancova'
  | 'mann_whitney'
  | 'kruskal_wallis'
  | 'wilcoxon_signed_rank'
  | 'paired_t_test'
  // Binary
  | 'chi_square'
  | 'fisher_exact'
  | 'mcnemar'
  | 'cochran_mantel_haenszel'
  // Time-to-event
  | 'log_rank'
  | 'cox_regression'
  | 'kaplan_meier'
  // Mixed models
  | 'mmrm'
  | 'glmm'

export interface StatisticalMethod {
  test: StatisticalTest
  description: string
  assumptions: string[]
  covariates?: string[]
  stratificationFactors?: string[]
  missingDataMethod?: MissingDataMethod
}

// ============================================================================
// Analysis Set Types
// ============================================================================

export type AnalysisSetType = 'FAS' | 'ITT' | 'PP' | 'SAF' | 'mITT'

export interface AnalysisSet {
  type: AnalysisSetType
  name: string
  abbreviation: string
  description: string
  inclusionCriteria: string[]
  exclusionCriteria: string[]
  primaryUse: 'primary_efficacy' | 'primary_safety' | 'supportive_efficacy' | 'all_safety' | 'sensitivity_analysis' | 'pharmacokinetics'
  icheCompliance: string
}

// ============================================================================
// Missing Data Types
// ============================================================================

export type MissingDataMethod =
  | 'complete_case'
  | 'LOCF' // Last Observation Carried Forward
  | 'BOCF' // Baseline Observation Carried Forward
  | 'WOCF' // Worst Observation Carried Forward
  | 'MMRM' // Mixed Model Repeated Measures
  | 'MI' // Multiple Imputation
  | 'PMM' // Pattern Mixture Model

export interface MissingDataStrategy {
  primaryMethod: MissingDataMethod
  sensitivityAnalyses: MissingDataMethod[]
  assumptions: string[]
  justification: string
}

// ============================================================================
// Multiplicity Adjustment Types
// ============================================================================

export type MultiplicityMethod =
  | 'bonferroni'
  | 'holm'
  | 'hochberg'
  | 'hommel'
  | 'benjamini_hochberg'
  | 'benjamini_yekutieli'
  | 'sidak'
  | 'dunnett'

export interface MultiplicityAdjustment {
  method: MultiplicityMethod
  numberOfComparisons: number
  adjustedAlpha: number
  familyWiseErrorRate: number
}

// ============================================================================
// Interim Analysis Types
// ============================================================================

export type BoundaryType = 'obrien_fleming' | 'pocock' | 'haybittle_peto' | 'custom'

export interface InterimAnalysis {
  numberOfInterims: number
  timingFractions: number[] // e.g., [0.5, 0.75, 1.0]
  boundaryType: BoundaryType
  alphaSpendingFunction?: string
  stoppingRules: {
    efficacy?: number[]
    futility?: number[]
  }
}

// ============================================================================
// Subgroup Analysis Types
// ============================================================================

export interface SubgroupAnalysis {
  factor: string
  levels: string[]
  preSpecified: boolean
  testForInteraction: boolean
  adjustForMultiplicity: boolean
}

// ============================================================================
// Statistical Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  code: string
  message: string
  field: string
  severity: 'critical' | 'high'
}

export interface ValidationWarning {
  code: string
  message: string
  field: string
  recommendation: string
}

// ============================================================================
// SAP Structure Types
// ============================================================================

export interface StatisticalAnalysisPlan {
  studyTitle: string
  version: string
  dateCreated: string
  
  studyDesign?: {
    type: 'parallel' | 'crossover' | 'factorial' | 'adaptive'
    arms: number
    randomizationRatio: number[]
    stratificationFactors: string[]
    blinding: 'open' | 'single' | 'double' | 'triple'
  }
  
  sampleSize: SampleSizeResult
  
  endpoints: Endpoint[]
  
  analysisSets: AnalysisSet[]
  
  statisticalMethods: StatisticalMethod[]
  
  missingDataStrategy?: MissingDataStrategy
  
  missingData: MissingDataStrategy
  
  multiplicityAdjustment?: MultiplicityAdjustment
  
  interimAnalysis?: InterimAnalysis
  
  subgroupAnalyses?: SubgroupAnalysis[]
  
  sensitivityAnalyses: {
    name: string
    description: string
    method: string
  }[]
}

// ============================================================================
// Distribution Types
// ============================================================================

export interface Distribution {
  name: string
  parameters: Record<string, number>
  mean: number
  variance: number
  pdf: (x: number) => number
  cdf: (x: number) => number
  quantile: (p: number) => number
}
