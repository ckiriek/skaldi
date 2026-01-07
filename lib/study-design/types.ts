// Study Design Engine - TypeScript Types v1.0
// Matches YAML config structure per VP CRO spec

export type RegulatoryPathway =
  | 'innovator'
  | 'generic'
  | 'biosimilar'
  | 'hybrid'
  | 'post_marketing'

export type PrimaryObjective =
  | 'pk_safety'
  | 'pk_equivalence'
  | 'pk_similarity'
  | 'dose_selection'
  | 'confirmatory_efficacy'
  | 'clinical_equivalence'
  | 'long_term_safety'
  | 'effectiveness'

export type StudyStructure = 'sequential_cohorts' | 'parallel' | 'crossover' | 'observational'
export type Randomization = 'required' | 'optional' | 'none'
export type Blinding = 'double_blind' | 'single_blind' | 'open_label' | 'none'
export type ComparatorType = 'placebo' | 'active' | 'reference' | 'none' | 'placebo_or_active'

export type PatternTag =
  | 'standard_of_care'
  | 'regulatory_standard'
  | 'event_driven'
  | 'adaptive'
  | 'seamless'
  | 'be'
  | 'rwe'
  | 'biosimilar_only'
  | 'superiority'

export interface TypicalNRange {
  min: number
  max: number
  unit: 'subjects' | 'patients'
  note?: string
}

export interface RationaleTemplate {
  what: string
  why: string
  reg: string
  assumptions?: string[]
}

export interface DesignSummaryTemplate {
  structure: StudyStructure
  randomization: Randomization
  blinding: Blinding
  arms: number | 'variable'
  comparator: ComparatorType
  key_features: string[]
}

export interface DrugCharacteristicRules {
  prefer_if?: {
    isHVD?: boolean
    isNTI?: boolean
    halfLifeHours_gte?: number
    halfLifeHours_lte?: number
  }
  avoid_if?: {
    isHVD?: boolean
    isNTI?: boolean
    halfLifeHours_gte?: number
  }
}

export interface PatternConstraints {
  requires_interim?: boolean
  supports_interim?: boolean
  requires_event_driven?: boolean
  allows_crossover?: boolean
  allows_superiority?: boolean
  requires_equivalence_or_ni?: boolean
  min_arms?: number
  max_arms?: number
}

export interface DesignPattern {
  id: string
  version: string
  title: string
  allowed_pathways: RegulatoryPathway[]
  allowed_objectives: PrimaryObjective[]
  summary: DesignSummaryTemplate
  typical_n_range: TypicalNRange
  constraints: PatternConstraints
  tags: PatternTag[]
  drug_characteristics?: DrugCharacteristicRules
  rationale: RationaleTemplate
  priority: number
  specificity_score: number
}

// Guardrails types
export type GuardrailSeverity = 'HARD_STOP' | 'SOFT_WARNING'
export type GuardrailAction = 'FALLBACK' | 'WARN' | 'BLOCK'

export interface GuardrailMatch {
  pathway?: RegulatoryPathway[]
  objective?: PrimaryObjective[]
  patternId?: string[]
  patternId_not?: string[]
  patternTags?: PatternTag[]
  structure?: StudyStructure[]
  blinding?: Blinding[]
  comparator?: ComparatorType[]
  constraints_requires_interim?: boolean
  n_range_ratio_gt?: number
  drug_isHVD?: boolean
  drug_isNTI?: boolean
  drug_halfLifeHours_gte?: number
}

export interface FallbackHint {
  strategy: 'use_fallback_order_for_pathway_objective' | 'use_specific_patterns'
  patterns?: string[]
}

export interface GuardrailRule {
  id: string
  version: string
  severity: GuardrailSeverity
  action: GuardrailAction
  match: GuardrailMatch
  message: string
  trace_note: string
  fallback_hint?: FallbackHint
}

// Engine versions
export interface EngineVersions {
  engineVersion: string
  patternsVersion: string
  guardrailsVersion: string
  fallbackVersion: string
}

// Decision trace entry
export interface DecisionTraceEntry {
  step: string
  action?: string
  result: string
}

// Output types
export interface DesignSummary {
  structure: string
  randomization: string
  blinding: string
  arms: number | string
  comparator: string
  key_features: string[]
  typicalN: string
}

export interface StudyDesignOutput {
  regulatoryPathway: RegulatoryPathway
  primaryObjective: PrimaryObjective
  designPattern: string | null  // null if HUMAN_DECISION_REQUIRED
  designSummary: DesignSummary | null
  phaseLabel: string | null
  designName: string | null
  regulatoryRationale: string
  warnings: string[]
  confidence: number
  decisionTrace: DecisionTraceEntry[]
  
  // Additional details (populated when pattern is selected)
  population?: {
    type: 'healthy_volunteers' | 'patients'
    description: string
    sampleSizeRange: { min: number; max: number; recommended: number }
    sampleSizeRationale: string
  }
  duration?: {
    screeningDays: number
    treatmentDays: number
    washoutDays: number
    followUpDays: number
    totalWeeks: number
  }
  endpoints?: {
    primary: string[]
    secondary: string[]
  }
  acceptanceCriteria?: {
    criterion: string
    margin: string
    description: string
  }
  regulatoryBasis?: string[]
}

// Drug characteristics input
export interface DrugCharacteristics {
  halfLife?: number
  isNTI?: boolean
  isHVD?: boolean
  hasFoodEffect?: boolean
  isModifiedRelease?: boolean
}

// Context flags for engine decisions (per VP CRO spec)
export interface ContextFlags {
  interimAvailable?: boolean      // Can interim analysis be performed?
  eventDrivenEndpoint?: boolean   // Is primary endpoint time-to-event?
  hasBlindingConstraint?: boolean // Is open-label required?
  acceleratedProgram?: boolean    // Is this an accelerated development?
}

// Structured rationale for Audit Drawer (per VP CRO spec)
export interface StructuredRationale {
  what: string           // Layer 1: What was selected
  why: string            // Layer 2: Why it fits objective
  regulatory: string     // Layer 3: Regulatory alignment
  assumptions: string[]  // Key assumptions
  notes: string[]        // Drug characteristic notes (HVD, NTI, etc.)
  fallbackNote?: string  // If pattern was adjusted
}

// Warning with severity for Audit Drawer
export interface StructuredWarning {
  severity: 'HARD' | 'SOFT'
  message: string
  implication?: string   // Brief impact description
  ruleId?: string        // Guardrail rule ID if applicable
}
