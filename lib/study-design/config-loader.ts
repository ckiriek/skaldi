// Study Design Engine - Config Loader
// Loads YAML configs and provides typed access

import {
  DesignPattern,
  GuardrailRule,
  EngineVersions,
  RegulatoryPathway,
  PrimaryObjective
} from './types'

// Static configs loaded at build time
// In production, these would be loaded from YAML files
// For now, we embed them as constants for client-side compatibility

export const ENGINE_VERSIONS: EngineVersions = {
  engineVersion: "2.3",
  patternsVersion: "1.0",
  guardrailsVersion: "1.0",
  fallbackVersion: "2.0"
}

export const FALLBACK_ORDER: Record<string, string[]> = {
  // Innovator pathways
  "innovator:pk_safety": ["SAD", "MAD"],
  "innovator:dose_selection": [
    "DOSE_RANGING_PARALLEL",
    "ADAPTIVE_DOSE_FINDING",
    "SEAMLESS_PHASE_2_3"
  ],
  "innovator:confirmatory_efficacy": [
    "CONFIRMATORY_RCT_SUPERIORITY",
    "EVENT_DRIVEN_CONFIRMATORY"
  ],
  
  // Generic pathways
  "generic:pk_equivalence": [
    "PK_CROSSOVER_BE",
    "PK_CROSSOVER_BE_REPLICATE"
  ],
  
  // Biosimilar pathways
  "biosimilar:pk_similarity": ["PK_PARALLEL_SIMILARITY"],
  "biosimilar:clinical_equivalence": ["CONFIRMATORY_RCT_EQUIVALENCE"],
  
  // Post-marketing pathways
  "post_marketing:long_term_safety": ["OBSERVATIONAL_REGISTRY"],
  "post_marketing:effectiveness": ["OBSERVATIONAL_REGISTRY"],
  
  // Hybrid - explicit human decision
  "hybrid:pk_equivalence": ["HUMAN_DECISION_REQUIRED"],
  "hybrid:confirmatory_efficacy": [
    "CONFIRMATORY_RCT_SUPERIORITY",
    "HUMAN_DECISION_REQUIRED"
  ]
}

// Canonical patterns from patterns.yaml
export const DESIGN_PATTERNS: Record<string, DesignPattern> = {
  SAD: {
    id: "SAD",
    version: "1.0",
    title: "Single Ascending Dose",
    allowed_pathways: ["innovator"],
    allowed_objectives: ["pk_safety"],
    summary: {
      structure: "sequential_cohorts",
      randomization: "optional",
      blinding: "single_blind",
      arms: 2,
      comparator: "placebo",
      key_features: ["dose escalation", "sentinel dosing optional"]
    },
    typical_n_range: { min: 24, max: 48, unit: "subjects" },
    constraints: {
      requires_interim: false,
      supports_interim: false,
      requires_event_driven: false,
      allows_crossover: false,
      allows_superiority: false,
      requires_equivalence_or_ni: false
    },
    tags: ["regulatory_standard"],
    rationale: {
      what: "Selected design: SAD with sequential cohorts and placebo control.",
      why: "This design is appropriate for first-in-human assessment of safety, tolerability, and initial PK under controlled exposure escalation.",
      reg: "This aligns with standard early clinical development expectations for FIH programs.",
      assumptions: ["Assumes no prior human safety signals requiring modified escalation."]
    },
    priority: 10,
    specificity_score: 90
  },

  MAD: {
    id: "MAD",
    version: "1.0",
    title: "Multiple Ascending Dose",
    allowed_pathways: ["innovator"],
    allowed_objectives: ["pk_safety"],
    summary: {
      structure: "sequential_cohorts",
      randomization: "optional",
      blinding: "single_blind",
      arms: 2,
      comparator: "placebo",
      key_features: ["repeat dosing", "accumulation assessment"]
    },
    typical_n_range: { min: 40, max: 80, unit: "subjects" },
    constraints: {
      requires_interim: false,
      supports_interim: false,
      requires_event_driven: false,
      allows_crossover: false,
      allows_superiority: false,
      requires_equivalence_or_ni: false
    },
    tags: ["regulatory_standard"],
    rationale: {
      what: "Selected design: MAD with sequential cohorts and placebo control.",
      why: "Repeated dosing supports assessment of safety and PK at steady-state and characterization of exposure-related effects.",
      reg: "This aligns with standard early-phase expectations prior to dose selection.",
      assumptions: ["Assumes dose escalation rules and stopping criteria are pre-specified."]
    },
    priority: 11,
    specificity_score: 88
  },

  DOSE_RANGING_PARALLEL: {
    id: "DOSE_RANGING_PARALLEL",
    version: "1.0",
    title: "Parallel Dose-Ranging",
    allowed_pathways: ["innovator"],
    allowed_objectives: ["dose_selection"],
    summary: {
      structure: "parallel",
      randomization: "required",
      blinding: "double_blind",
      arms: "variable",
      comparator: "placebo_or_active",
      key_features: ["dose-response", "multiple dose arms"]
    },
    typical_n_range: { min: 100, max: 300, unit: "patients" },
    constraints: {
      requires_interim: false,
      supports_interim: true,
      requires_event_driven: false,
      allows_crossover: false,
      allows_superiority: false,
      requires_equivalence_or_ni: false,
      min_arms: 3,
      max_arms: 6
    },
    tags: ["standard_of_care"],
    rationale: {
      what: "Selected design: randomized, double-blind, parallel dose-ranging trial.",
      why: "Parallel dose-ranging supports dose-response characterization and selection of doses for confirmatory testing.",
      reg: "This is a widely accepted approach for Phase 2 dose selection across FDA and EMA programs.",
      assumptions: ["Assumes endpoints are sensitive enough to differentiate doses within feasible sample sizes."]
    },
    priority: 20,
    specificity_score: 75
  },

  ADAPTIVE_DOSE_FINDING: {
    id: "ADAPTIVE_DOSE_FINDING",
    version: "1.0",
    title: "Adaptive Dose-Finding",
    allowed_pathways: ["innovator"],
    allowed_objectives: ["dose_selection"],
    summary: {
      structure: "parallel",
      randomization: "required",
      blinding: "double_blind",
      arms: "variable",
      comparator: "placebo_or_active",
      key_features: ["interim analysis", "adaptive allocation or dropping arms"]
    },
    typical_n_range: { min: 120, max: 300, unit: "patients", note: "depends on adaptive algorithm and endpoint variance" },
    constraints: {
      requires_interim: true,
      supports_interim: true,
      requires_event_driven: false,
      allows_crossover: false,
      allows_superiority: false,
      requires_equivalence_or_ni: false,
      min_arms: 3,
      max_arms: 8
    },
    tags: ["adaptive"],
    rationale: {
      what: "Selected design: randomized, double-blind adaptive dose-finding trial with interim analysis.",
      why: "Adaptive dose-finding can improve efficiency by concentrating allocation and decisions using pre-specified interim rules.",
      reg: "Adaptive designs are acceptable when interim analyses and type I error control are pre-specified.",
      assumptions: ["Assumes interim analysis plan and adaptation rules are locked before first patient in."]
    },
    priority: 25,
    specificity_score: 80
  },

  SEAMLESS_PHASE_2_3: {
    id: "SEAMLESS_PHASE_2_3",
    version: "1.0",
    title: "Seamless Phase 2/3",
    allowed_pathways: ["innovator"],
    allowed_objectives: ["dose_selection", "confirmatory_efficacy"],
    summary: {
      structure: "parallel",
      randomization: "required",
      blinding: "double_blind",
      arms: "variable",
      comparator: "placebo_or_active",
      key_features: ["dose selection + confirmatory", "interim gate", "inferential continuity"]
    },
    typical_n_range: { min: 300, max: 800, unit: "patients", note: "program dependent" },
    constraints: {
      requires_interim: true,
      supports_interim: true,
      requires_event_driven: false,
      allows_crossover: false,
      allows_superiority: true,
      requires_equivalence_or_ni: false
    },
    tags: ["seamless", "adaptive"],
    rationale: {
      what: "Selected design: randomized, double-blind seamless Phase 2/3 trial with interim gate.",
      why: "A seamless approach can combine dose selection and confirmatory assessment while maintaining pre-specified inferential controls.",
      reg: "Acceptable when transition criteria, interim analysis, and multiplicity control are prospectively defined.",
      assumptions: ["Assumes operational readiness to run a combined program without protocol fragmentation."]
    },
    priority: 40,
    specificity_score: 60
  },

  CONFIRMATORY_RCT_SUPERIORITY: {
    id: "CONFIRMATORY_RCT_SUPERIORITY",
    version: "1.0",
    title: "Confirmatory RCT - Superiority",
    allowed_pathways: ["innovator"],
    allowed_objectives: ["confirmatory_efficacy"],
    summary: {
      structure: "parallel",
      randomization: "required",
      blinding: "double_blind",
      arms: 2,
      comparator: "placebo_or_active",
      key_features: ["pre-specified hypothesis", "multiplicity control as needed"]
    },
    typical_n_range: { min: 300, max: 3000, unit: "patients", note: "endpoint/event-rate dependent" },
    constraints: {
      requires_interim: false,
      supports_interim: true,
      requires_event_driven: false,
      allows_crossover: false,
      allows_superiority: true,
      requires_equivalence_or_ni: false
    },
    tags: ["standard_of_care"],
    rationale: {
      what: "Selected design: randomized, double-blind, parallel-group confirmatory RCT (superiority).",
      why: "This design provides the strongest basis for causal efficacy inference under controlled bias and confounding.",
      reg: "This aligns with standard confirmatory evidence expectations for FDA and EMA approvals.",
      assumptions: ["Assumes clinically meaningful effect size and validated endpoints."]
    },
    priority: 30,
    specificity_score: 70
  },

  EVENT_DRIVEN_CONFIRMATORY: {
    id: "EVENT_DRIVEN_CONFIRMATORY",
    version: "1.0",
    title: "Event-Driven Confirmatory Trial",
    allowed_pathways: ["innovator"],
    allowed_objectives: ["confirmatory_efficacy"],
    summary: {
      structure: "parallel",
      randomization: "required",
      blinding: "double_blind",
      arms: 2,
      comparator: "placebo_or_active",
      key_features: ["time-to-event endpoint", "event-driven power", "DSMB recommended"]
    },
    typical_n_range: { min: 500, max: 3000, unit: "patients", note: "depends on event rate and follow-up" },
    constraints: {
      requires_interim: false,
      supports_interim: true,
      requires_event_driven: true,
      allows_crossover: false,
      allows_superiority: true,
      requires_equivalence_or_ni: false
    },
    tags: ["event_driven", "standard_of_care"],
    rationale: {
      what: "Selected design: randomized, double-blind event-driven confirmatory trial (time-to-event).",
      why: "Event-driven powering ensures adequate statistical information for time-to-event endpoints.",
      reg: "This is consistent with common confirmatory standards in CV outcomes and oncology programs.",
      assumptions: ["Assumes event definition and adjudication are pre-specified and operationalized."]
    },
    priority: 31,
    specificity_score: 72
  },

  PK_CROSSOVER_BE: {
    id: "PK_CROSSOVER_BE",
    version: "1.0",
    title: "2x2 Crossover Bioequivalence",
    allowed_pathways: ["generic"],
    allowed_objectives: ["pk_equivalence"],
    summary: {
      structure: "crossover",
      randomization: "required",
      blinding: "open_label",
      arms: 2,
      comparator: "reference",
      key_features: ["2x2 crossover", "fasting/fed as required", "90% CI for AUC/Cmax"]
    },
    typical_n_range: { min: 24, max: 48, unit: "subjects" },
    constraints: {
      requires_interim: false,
      supports_interim: false,
      requires_event_driven: false,
      allows_crossover: true,
      allows_superiority: false,
      requires_equivalence_or_ni: true
    },
    tags: ["be", "regulatory_standard"],
    drug_characteristics: {
      avoid_if: { halfLifeHours_gte: 24 }
    },
    rationale: {
      what: "Selected design: randomized, open-label, 2x2 crossover BE study.",
      why: "A crossover BE design is the regulatory standard to demonstrate PK equivalence between test and reference.",
      reg: "This meets typical FDA ANDA expectations under 505(j) when applicable.",
      assumptions: ["Assumes reference product is available and washout is feasible."]
    },
    priority: 5,
    specificity_score: 95
  },

  PK_CROSSOVER_BE_REPLICATE: {
    id: "PK_CROSSOVER_BE_REPLICATE",
    version: "1.0",
    title: "Replicate Crossover BE (HVD-friendly)",
    allowed_pathways: ["generic"],
    allowed_objectives: ["pk_equivalence"],
    summary: {
      structure: "crossover",
      randomization: "required",
      blinding: "open_label",
      arms: 2,
      comparator: "reference",
      key_features: ["replicate design", "within-subject variability", "scaled BE where applicable"]
    },
    typical_n_range: { min: 32, max: 60, unit: "subjects", note: "often used when variability is high" },
    constraints: {
      requires_interim: false,
      supports_interim: false,
      requires_event_driven: false,
      allows_crossover: true,
      allows_superiority: false,
      requires_equivalence_or_ni: true
    },
    tags: ["be", "regulatory_standard"],
    drug_characteristics: {
      prefer_if: { isHVD: true }
    },
    rationale: {
      what: "Selected design: randomized, open-label replicate crossover BE study.",
      why: "A replicate design can improve robustness for highly variable drugs by estimating within-subject variability.",
      reg: "This aligns with common regulatory approaches for HVD scenarios where scaled BE may be applicable.",
      assumptions: ["Assumes replicate design and analysis plan are pre-specified."]
    },
    priority: 6,
    specificity_score: 92
  },

  PK_PARALLEL_SIMILARITY: {
    id: "PK_PARALLEL_SIMILARITY",
    version: "1.0",
    title: "Comparative PK Similarity (Parallel)",
    allowed_pathways: ["biosimilar"],
    allowed_objectives: ["pk_similarity"],
    summary: {
      structure: "parallel",
      randomization: "required",
      blinding: "open_label",
      arms: 2,
      comparator: "reference",
      key_features: ["comparative PK", "immunogenicity monitoring"]
    },
    typical_n_range: { min: 150, max: 250, unit: "subjects" },
    constraints: {
      requires_interim: false,
      supports_interim: false,
      requires_event_driven: false,
      allows_crossover: false,
      allows_superiority: false,
      requires_equivalence_or_ni: true
    },
    tags: ["biosimilar_only", "regulatory_standard"],
    rationale: {
      what: "Selected design: randomized, open-label, parallel-group comparative PK similarity study.",
      why: "Parallel comparative PK is appropriate for biologics where crossover is impractical and immunogenicity must be monitored.",
      reg: "This follows biosimilar development expectations for PK similarity as part of totality of evidence.",
      assumptions: ["Assumes reference product sourcing (US/EU) is aligned with target jurisdiction."]
    },
    priority: 7,
    specificity_score: 93
  },

  CONFIRMATORY_RCT_EQUIVALENCE: {
    id: "CONFIRMATORY_RCT_EQUIVALENCE",
    version: "1.0",
    title: "Clinical Equivalence / Non-Inferiority RCT",
    allowed_pathways: ["biosimilar"],
    allowed_objectives: ["clinical_equivalence"],
    summary: {
      structure: "parallel",
      randomization: "required",
      blinding: "double_blind",
      arms: 2,
      comparator: "reference",
      key_features: ["equivalence or NI margin", "sensitive endpoint", "immunogenicity assessment"]
    },
    typical_n_range: { min: 300, max: 800, unit: "patients" },
    constraints: {
      requires_interim: false,
      supports_interim: true,
      requires_event_driven: false,
      allows_crossover: false,
      allows_superiority: false,
      requires_equivalence_or_ni: true
    },
    tags: ["biosimilar_only", "regulatory_standard"],
    rationale: {
      what: "Selected design: randomized, double-blind, parallel clinical equivalence/NI trial versus reference.",
      why: "Equivalence or non-inferiority designs are required to demonstrate no clinically meaningful differences versus the reference product.",
      reg: "This aligns with FDA/EMA biosimilar frameworks focusing on totality of evidence, not superiority.",
      assumptions: ["Assumes equivalence/NI margins and endpoint sensitivity are justified and pre-specified."]
    },
    priority: 12,
    specificity_score: 85
  },

  OBSERVATIONAL_REGISTRY: {
    id: "OBSERVATIONAL_REGISTRY",
    version: "1.0",
    title: "Observational Registry / RWE",
    allowed_pathways: ["post_marketing"],
    allowed_objectives: ["long_term_safety", "effectiveness"],
    summary: {
      structure: "observational",
      randomization: "none",
      blinding: "none",
      arms: "variable",
      comparator: "none",
      key_features: ["non-interventional", "long-term follow-up", "real-world endpoints"]
    },
    typical_n_range: { min: 1000, max: 10000, unit: "patients" },
    constraints: {
      requires_interim: false,
      supports_interim: false,
      requires_event_driven: false,
      allows_crossover: false,
      allows_superiority: false,
      requires_equivalence_or_ni: false
    },
    tags: ["rwe", "regulatory_standard"],
    rationale: {
      what: "Selected design: post-marketing observational registry (RWE).",
      why: "Observational designs support long-term safety surveillance and real-world effectiveness assessment without interventional assignment.",
      reg: "This aligns with common post-authorization commitments and pharmacovigilance expectations.",
      assumptions: ["Assumes data sources, follow-up, and confounding controls are specified."]
    },
    priority: 3,
    specificity_score: 90
  }
}

// Guardrail rules from guardrails.yaml
export const GUARDRAIL_RULES: GuardrailRule[] = [
  // HARD_STOP rules
  {
    id: "GR-001",
    version: "1.0",
    severity: "HARD_STOP",
    action: "FALLBACK",
    match: {
      objective: ["confirmatory_efficacy"],
      structure: ["crossover"]
    },
    message: "Crossover designs are not acceptable for confirmatory efficacy objectives. Applying fallback.",
    trace_note: "Blocked crossover for confirmatory efficacy - fallback required.",
    fallback_hint: { strategy: "use_fallback_order_for_pathway_objective" }
  },
  {
    id: "GR-002",
    version: "1.0",
    severity: "HARD_STOP",
    action: "FALLBACK",
    match: {
      pathway: ["biosimilar"],
      patternTags: ["superiority"]
    },
    message: "Biosimilar programs cannot use superiority confirmatory patterns. Applying fallback.",
    trace_note: "Blocked superiority in biosimilar pathway - fallback required.",
    fallback_hint: { strategy: "use_fallback_order_for_pathway_objective" }
  },
  {
    id: "GR-003",
    version: "1.0",
    severity: "HARD_STOP",
    action: "BLOCK",
    match: {
      pathway: ["generic"],
      objective: ["confirmatory_efficacy"]
    },
    message: "Generic pathway with confirmatory efficacy objective is not valid. Human decision required.",
    trace_note: "Invalid combination: generic + confirmatory_efficacy - blocked.",
    fallback_hint: { strategy: "use_specific_patterns", patterns: [] }
  },
  {
    id: "GR-004",
    version: "1.0",
    severity: "HARD_STOP",
    action: "BLOCK",
    match: {
      pathway: ["biosimilar"],
      objective: ["dose_selection"]
    },
    message: "Biosimilar pathway with dose selection objective is not applicable. Human decision required.",
    trace_note: "Invalid combination: biosimilar + dose_selection - blocked.",
    fallback_hint: { strategy: "use_specific_patterns", patterns: [] }
  },
  {
    id: "GR-005",
    version: "1.0",
    severity: "HARD_STOP",
    action: "FALLBACK",
    match: {
      pathway: ["post_marketing"],
      structure: ["parallel", "crossover", "sequential_cohorts"]
    },
    message: "Post-marketing pathway requires observational design. Applying fallback.",
    trace_note: "Non-observational design blocked for post-marketing - fallback required.",
    fallback_hint: { strategy: "use_specific_patterns", patterns: ["OBSERVATIONAL_REGISTRY"] }
  },
  {
    id: "GR-006",
    version: "1.0",
    severity: "HARD_STOP",
    action: "FALLBACK",
    match: {
      patternTags: ["adaptive"],
      constraints_requires_interim: true
    },
    message: "Adaptive pattern requires interim analysis plan. If interim is not available, applying fallback.",
    trace_note: "Adaptive pattern requires interim - fallback if interim unavailable.",
    fallback_hint: { strategy: "use_fallback_order_for_pathway_objective" }
  },
  {
    id: "GR-007",
    version: "1.0",
    severity: "HARD_STOP",
    action: "FALLBACK",
    match: {
      pathway: ["innovator"],
      patternId: ["PK_CROSSOVER_BE", "PK_CROSSOVER_BE_REPLICATE"]
    },
    message: "BE crossover design not appropriate for innovator pathway. Applying fallback.",
    trace_note: "Blocked BE design for innovator - fallback required.",
    fallback_hint: { strategy: "use_specific_patterns", patterns: ["SAD"] }
  },
  
  // SOFT_WARNING rules
  {
    id: "GR-101",
    version: "1.0",
    severity: "SOFT_WARNING",
    action: "WARN",
    match: {
      objective: ["confirmatory_efficacy"],
      blinding: ["open_label"]
    },
    message: "Open-label confirmatory trials increase bias risk. Consider blinding or robust mitigation.",
    trace_note: "Soft warning: open-label confirmatory."
  },
  {
    id: "GR-102",
    version: "1.0",
    severity: "SOFT_WARNING",
    action: "WARN",
    match: {
      n_range_ratio_gt: 3
    },
    message: "Wide sample size range indicates higher uncertainty. Consider refining assumptions or endpoints.",
    trace_note: "Soft warning: N range wide (>3x spread)."
  },
  {
    id: "GR-103",
    version: "1.0",
    severity: "SOFT_WARNING",
    action: "WARN",
    match: {
      pathway: ["generic"],
      patternTags: ["be"],
      drug_isHVD: true,
      patternId_not: ["PK_CROSSOVER_BE_REPLICATE"]
    },
    message: "For highly variable drugs, a replicate BE design may be preferred.",
    trace_note: "Soft preference: replicate BE for HVD when applicable."
  },
  {
    id: "GR-104",
    version: "1.0",
    severity: "SOFT_WARNING",
    action: "WARN",
    match: {
      pathway: ["generic"],
      drug_isNTI: true
    },
    message: "Narrow therapeutic index drug detected. Tightened BE limits (90-111%) and additional safety monitoring required.",
    trace_note: "Soft warning: NTI drug - tightened acceptance criteria."
  },
  {
    id: "GR-105",
    version: "1.0",
    severity: "SOFT_WARNING",
    action: "WARN",
    match: {
      pathway: ["generic"],
      drug_halfLifeHours_gte: 24
    },
    message: "Long half-life drug detected. Washout period may be operationally challenging for crossover design.",
    trace_note: "Soft warning: long T1/2 - washout operational risk."
  }
]

// Helper to get pattern by ID
export function getPattern(id: string): DesignPattern | undefined {
  return DESIGN_PATTERNS[id]
}

// Helper to get fallback order for pathway:objective
export function getFallbackOrder(pathway: RegulatoryPathway, objective: PrimaryObjective): string[] {
  const key = `${pathway}:${objective}`
  return FALLBACK_ORDER[key] || ["HUMAN_DECISION_REQUIRED"]
}

// Helper to get version string for trace
export function getVersionString(): string {
  return `engine=${ENGINE_VERSIONS.engineVersion}, patterns=${ENGINE_VERSIONS.patternsVersion}, guardrails=${ENGINE_VERSIONS.guardrailsVersion}, fallback=${ENGINE_VERSIONS.fallbackVersion}`
}
