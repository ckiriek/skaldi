/**
 * Study Design Suggestion Component
 * 
 * Suggests optimal study design based on:
 * - Product type (generic, hybrid, innovator)
 * - Formulation (IR, MR, injectable)
 * - Drug characteristics (NTI, HVD, food effect)
 * - Regulatory guidance (FDA, EMA)
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Beaker, 
  Users, 
  Clock, 
  FlaskConical, 
  Target,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ============================================================================
// Types
// ============================================================================

interface DrugCharacteristics {
  halfLife?: number // hours
  isNTI?: boolean // Narrow Therapeutic Index
  isHVD?: boolean // Highly Variable Drug (CV > 30%)
  hasFoodEffect?: boolean
  isModifiedRelease?: boolean
  bioavailability?: number // percentage
  route?: string
  dosageForm?: string
}

interface StudyDesign {
  designType: 'crossover_2x2' | 'crossover_replicate' | 'parallel' | 'adaptive'
  designName: string
  arms: number
  periods: number
  sequences: number
  blinding: 'open-label' | 'single-blind' | 'double-blind'
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
  warnings: string[]
  confidence: number // 0-100
}

interface StudyDesignSuggestionProps {
  productType: 'generic' | 'innovator' | 'hybrid'
  compoundName: string
  indication?: string
  formulation?: {
    dosageForm?: string
    route?: string
    strength?: string
  }
  phase?: string
  drugCharacteristics?: DrugCharacteristics
  onAcceptDesign?: (design: StudyDesign) => void
}

// ============================================================================
// Known Drug Characteristics Database
// ============================================================================

// Highly Variable Drugs (CV > 30%) - require replicate design or reference-scaled approach
const KNOWN_HVD_DRUGS = new Set([
  'metformin',
  'verapamil',
  'propranolol',
  'carbamazepine',
  'cyclosporine',
  'tacrolimus',
  'sirolimus',
  'ondansetron',
  'naproxen',
  'ibuprofen',
  'diclofenac',
  'piroxicam',
  'nifedipine',
  'felodipine',
  'amlodipine',
  'simvastatin',
  'atorvastatin',
  'lovastatin',
  'pravastatin',
  'rosuvastatin',
  'omeprazole',
  'esomeprazole',
  'lansoprazole',
  'pantoprazole',
  'rabeprazole',
])

// Narrow Therapeutic Index Drugs - require tighter BE limits (90-111%)
const KNOWN_NTI_DRUGS = new Set([
  'warfarin',
  'digoxin',
  'lithium',
  'phenytoin',
  'carbamazepine',
  'valproic acid',
  'theophylline',
  'aminophylline',
  'cyclosporine',
  'tacrolimus',
  'sirolimus',
  'levothyroxine',
  'liothyronine',
])

// Drug-specific half-lives (hours)
const KNOWN_HALF_LIVES: Record<string, number> = {
  'metformin': 6.2,
  'allopurinol': 2, // parent; oxypurinol ~18-30h
  'warfarin': 40,
  'digoxin': 36,
  'atorvastatin': 14,
  'simvastatin': 3,
  'omeprazole': 1,
  'amlodipine': 35,
  'lisinopril': 12,
  'losartan': 2,
  'metoprolol': 3.5,
  'carvedilol': 7,
  'furosemide': 2,
  'hydrochlorothiazide': 10,
  'gabapentin': 6,
  'pregabalin': 6,
  'sertraline': 26,
  'fluoxetine': 72,
  'escitalopram': 27,
  'duloxetine': 12,
  'tramadol': 6,
  'oxycodone': 4.5,
  'morphine': 3,
  'fentanyl': 4,
}

// Check if drug is HVD
function isKnownHVD(compoundName: string): boolean {
  const normalized = compoundName.toLowerCase().trim()
  return KNOWN_HVD_DRUGS.has(normalized)
}

// Check if drug is NTI
function isKnownNTI(compoundName: string): boolean {
  const normalized = compoundName.toLowerCase().trim()
  return KNOWN_NTI_DRUGS.has(normalized)
}

// Get known half-life
function getKnownHalfLife(compoundName: string): number | undefined {
  const normalized = compoundName.toLowerCase().trim()
  return KNOWN_HALF_LIVES[normalized]
}

// ============================================================================
// BE Design Rules Engine (for Generic products)
// ============================================================================

function generateBEDesign(
  compoundName: string,
  formulation: { dosageForm?: string; route?: string; strength?: string },
  characteristics: DrugCharacteristics,
  phase: string = 'Phase 1'
): StudyDesign {
  // For Generic: Phase selection affects study type
  // Phase 1: Standard fasting BE (primary study)
  // Phase 2: Not typical for generics, but could be dose-finding for complex generics
  // Phase 3: Fed study, special populations (renal/hepatic), or additional PK studies
  // Phase 4: Post-marketing surveillance, real-world evidence
  const isPhase1 = phase === 'Phase 1'
  const isPhase3 = phase === 'Phase 3'
  const isPhase4 = phase === 'Phase 4'
  
  const isOral = formulation.route?.toUpperCase() === 'ORAL' || 
                 formulation.dosageForm?.toLowerCase().includes('tablet') ||
                 formulation.dosageForm?.toLowerCase().includes('capsule')
  
  const isIR = !characteristics.isModifiedRelease && 
               !formulation.dosageForm?.toLowerCase().includes('extended') &&
               !formulation.dosageForm?.toLowerCase().includes('modified') &&
               !formulation.dosageForm?.toLowerCase().includes('sustained')
  
  // Use known drug database OR provided characteristics
  const isNTI = characteristics.isNTI || isKnownNTI(compoundName)
  const isHVD = characteristics.isHVD || isKnownHVD(compoundName)
  const hasFoodEffect = characteristics.hasFoodEffect ?? true // Default to requiring fed study
  const halfLife = characteristics.halfLife || getKnownHalfLife(compoundName) || 8 // Use known or default 8h
  
  // Calculate washout period (≥5 half-lives, minimum 7 days)
  const washoutDays = Math.max(Math.ceil(halfLife * 5 / 24), 7)
  
  // Determine design type
  let designType: StudyDesign['designType'] = 'crossover_2x2'
  let designName = 'Randomized, Open-Label, Single-Dose, 2-Treatment, 2-Period, 2-Sequence Crossover'
  let periods = 2
  let sequences = 2
  let arms = 2
  
  if (isHVD) {
    designType = 'crossover_replicate'
    designName = 'Randomized, Open-Label, Single-Dose, 2-Treatment, 4-Period, Replicate Crossover'
    periods = 4
    sequences = 2
  }
  
  if (!isOral) {
    designType = 'crossover_2x2'
    designName = 'Randomized, Open-Label, Single-Dose, 2-Treatment, 2-Period, 2-Sequence Crossover'
  }
  
  // Sample size calculation
  let sampleSizeMin = 24
  let sampleSizeMax = 36
  let sampleSizeRecommended = 30
  let sampleSizeRationale = 'Based on expected intra-subject CV of 20-25% for standard oral formulations'
  
  if (isHVD) {
    sampleSizeMin = 36
    sampleSizeMax = 48
    sampleSizeRecommended = 42
    sampleSizeRationale = 'Increased sample size for highly variable drug (CV >30%) with reference-scaled approach'
  }
  
  if (isNTI) {
    sampleSizeMin = 36
    sampleSizeMax = 48
    sampleSizeRecommended = 42
    sampleSizeRationale = 'Increased sample size for narrow therapeutic index drug with tighter acceptance criteria'
  }
  
  // Sampling schedule based on half-life
  let samplingSchedule: string[] = []
  if (halfLife <= 4) {
    samplingSchedule = ['0', '0.25', '0.5', '0.75', '1', '1.5', '2', '2.5', '3', '4', '6', '8', '12h']
  } else if (halfLife <= 12) {
    samplingSchedule = ['0', '0.5', '1', '1.5', '2', '3', '4', '6', '8', '12', '24h']
  } else {
    samplingSchedule = ['0', '0.5', '1', '2', '3', '4', '6', '8', '12', '24', '36', '48', '72h']
  }
  
  // Acceptance criteria
  let acceptanceCriterion = 'Average Bioequivalence'
  let acceptanceMargin = '90% CI of geometric mean ratio within 80.00-125.00%'
  let acceptanceDescription = 'Standard FDA bioequivalence criteria'
  
  if (isNTI) {
    acceptanceCriterion = 'Average Bioequivalence with Tightened Limits'
    acceptanceMargin = '90% CI of geometric mean ratio within 90.00-111.11%'
    acceptanceDescription = 'Tightened limits for narrow therapeutic index drugs per FDA guidance'
  }
  
  if (isHVD) {
    acceptanceCriterion = 'Reference-Scaled Average Bioequivalence'
    acceptanceMargin = 'Scaled 90% CI with point estimate constraint (0.80-1.25)'
    acceptanceDescription = 'Reference-scaled approach for highly variable drugs (CV >30%)'
  }
  
  // Phase-specific adjustments
  let phaseNote = ''
  if (isPhase1) {
    phaseNote = 'Primary fasting BE study'
  } else if (isPhase3) {
    // Phase 3 for generic = Fed study or special populations
    phaseNote = 'Fed-state BE study or special population PK'
  } else if (isPhase4) {
    // Phase 4 = Post-marketing, different design
    designType = 'parallel'
    designName = 'Post-Marketing Surveillance / Real-World Evidence Study'
    periods = 1
    sampleSizeMin = 100
    sampleSizeMax = 500
    sampleSizeRecommended = 200
    sampleSizeRationale = 'Post-marketing surveillance requires larger sample for safety signal detection'
    phaseNote = 'Post-marketing safety surveillance'
  }
  
  // Warnings
  const warnings: string[] = []
  if (isNTI) {
    warnings.push('Narrow Therapeutic Index drug requires additional safety monitoring and tighter BE limits')
  }
  if (isHVD) {
    warnings.push('Highly Variable Drug may require replicate design and reference-scaled analysis')
  }
  if (hasFoodEffect && !isPhase4) {
    warnings.push('Food effect study may be required based on RLD labeling')
  }
  if (isPhase3) {
    warnings.push('Consider fed-state study if RLD label indicates food effect')
    warnings.push('Special population studies (renal/hepatic impairment) may be required')
  }
  if (isPhase4) {
    warnings.push('Post-marketing study - focus on real-world safety and effectiveness')
  }
  
  return {
    designType,
    designName,
    arms,
    periods,
    sequences,
    blinding: 'open-label',
    population: {
      type: 'healthy_volunteers',
      description: 'Healthy adult volunteers, 18-55 years, BMI 18.5-30 kg/m²',
      sampleSizeRange: { min: sampleSizeMin, max: sampleSizeMax, recommended: sampleSizeRecommended },
      sampleSizeRationale
    },
    duration: {
      screeningDays: 28,
      treatmentDays: periods,
      washoutDays,
      followUpDays: 7,
      totalWeeks: Math.ceil((28 + periods + (periods - 1) * washoutDays + 7) / 7)
    },
    dosing: {
      regimen: 'single-dose',
      description: `Single dose of ${formulation.strength || '[strength]'} ${compoundName} ${formulation.dosageForm || 'tablet'}`
    },
    conditions: {
      fasting: true,
      fed: hasFoodEffect,
      fedDescription: hasFoodEffect ? 'High-fat, high-calorie breakfast per FDA guidance' : undefined
    },
    sampling: {
      schedule: samplingSchedule,
      totalSamples: samplingSchedule.length * 2, // Per period
      rationale: `Sampling schedule designed to capture Cmax and characterize elimination phase (t½ ≈ ${halfLife}h)`
    },
    endpoints: {
      primary: [
        'Cmax (Maximum Plasma Concentration)',
        'AUC0-t (Area Under Curve to Last Measurable Concentration)',
        'AUC0-∞ (Area Under Curve Extrapolated to Infinity)'
      ],
      secondary: [
        'Tmax (Time to Maximum Concentration)',
        't½ (Elimination Half-life)',
        'Kel (Elimination Rate Constant)',
        'λz (Terminal Elimination Rate Constant)'
      ]
    },
    acceptanceCriteria: {
      criterion: acceptanceCriterion,
      margin: acceptanceMargin,
      description: acceptanceDescription
    },
    regulatoryBasis: [
      'FDA Guidance: Bioequivalence Studies With Pharmacokinetic Endpoints for Drugs Submitted Under an ANDA (2021)',
      'FDA Guidance: Statistical Approaches to Establishing Bioequivalence (2001)',
      isHVD ? 'FDA Guidance: Bioequivalence Recommendations for Highly Variable Drugs' : '',
      isNTI ? 'FDA Guidance: Bioequivalence for Narrow Therapeutic Index Drugs' : ''
    ].filter(Boolean),
    warnings,
    confidence: isNTI || isHVD ? 85 : 95
  }
}

// ============================================================================
// Innovator Design Rules Engine
// ============================================================================

function generateInnovatorDesign(
  compoundName: string,
  indication: string | undefined,
  phase: string = 'Phase 2'
): StudyDesign {
  const isPhase1 = phase === 'Phase 1'
  const isPhase2 = phase === 'Phase 2'
  const isPhase3 = phase === 'Phase 3'
  const isPhase4 = phase === 'Phase 4'
  
  let designType: StudyDesign['designType'] = 'parallel'
  let designName = ''
  let arms = 2
  let periods = 1
  let sequences = 1
  let blinding: StudyDesign['blinding'] = 'double-blind'
  let populationType: 'healthy_volunteers' | 'patients' = 'patients'
  let populationDescription = ''
  let sampleSizeMin = 100
  let sampleSizeMax = 300
  let sampleSizeRecommended = 150
  let sampleSizeRationale = ''
  let dosingRegimen: 'single-dose' | 'multiple-dose' | 'steady-state' = 'multiple-dose'
  let durationWeeks = 12
  let primaryEndpoints: string[] = []
  let secondaryEndpoints: string[] = []
  let acceptanceCriterion = ''
  let acceptanceMargin = ''
  let regulatoryBasis: string[] = []
  let warnings: string[] = []
  let confidence = 75
  
  if (isPhase1) {
    // Phase 1: Safety, tolerability, PK, MTD
    designName = 'Randomized, Double-Blind, Placebo-Controlled, Single/Multiple Ascending Dose (SAD/MAD)'
    designType = 'adaptive'
    arms = 2 // Active + Placebo per cohort
    blinding = 'double-blind'
    populationType = 'healthy_volunteers'
    populationDescription = 'Healthy adult volunteers, 18-55 years, for SAD/MAD dose-escalation'
    sampleSizeMin = 24
    sampleSizeMax = 80
    sampleSizeRecommended = 48
    sampleSizeRationale = 'Typical Phase 1 SAD/MAD: 6-8 cohorts × 6-10 subjects per cohort (including placebo)'
    dosingRegimen = 'single-dose'
    durationWeeks = 8
    primaryEndpoints = [
      'Safety and tolerability (AEs, SAEs, vital signs, ECG, laboratory)',
      'Maximum Tolerated Dose (MTD)',
      'Pharmacokinetics (Cmax, AUC, t½, CL, Vd)'
    ]
    secondaryEndpoints = [
      'Dose-proportionality assessment',
      'Preliminary PK/PD relationship',
      'Food effect (if applicable)'
    ]
    acceptanceCriterion = 'Safety Review Committee approval for dose escalation'
    acceptanceMargin = 'No DLTs in ≥6 subjects at dose level'
    regulatoryBasis = [
      'FDA Guidance: Estimating the Maximum Safe Starting Dose in Initial Clinical Trials (2005)',
      'ICH M3(R2): Nonclinical Safety Studies for Human Pharmaceuticals',
      'FDA Guidance: Safety Testing of Drug Metabolites (2020)'
    ]
    warnings = [
      'Sentinel dosing recommended for first-in-human studies',
      'Data Safety Monitoring Board (DSMB) required',
      'Consider adaptive design for dose-escalation efficiency'
    ]
    confidence = 85
    
  } else if (isPhase2) {
    // Phase 2: Efficacy signal, dose-finding
    designName = 'Randomized, Double-Blind, Placebo-Controlled, Parallel-Group, Dose-Ranging'
    designType = 'parallel'
    arms = 4 // Placebo + 3 dose levels
    blinding = 'double-blind'
    populationType = 'patients'
    populationDescription = `Patients with ${indication || '[indication]'}, meeting inclusion criteria`
    sampleSizeMin = 100
    sampleSizeMax = 300
    sampleSizeRecommended = 200
    sampleSizeRationale = 'Phase 2 dose-ranging: ~50 patients per arm × 4 arms for dose-response modeling'
    dosingRegimen = 'multiple-dose'
    durationWeeks = 12
    primaryEndpoints = [
      'Preliminary efficacy endpoint (disease-specific)',
      'Dose-response relationship'
    ]
    secondaryEndpoints = [
      'Safety and tolerability',
      'PK/PD correlation',
      'Biomarker response',
      'Quality of life measures'
    ]
    acceptanceCriterion = 'Statistically significant dose-response'
    acceptanceMargin = 'p < 0.05 for primary endpoint vs placebo'
    regulatoryBasis = [
      'FDA Guidance: Dose-Response Information to Support Drug Registration (1994)',
      'ICH E4: Dose-Response Information to Support Drug Registration',
      'FDA Guidance: Adaptive Designs for Clinical Trials (2019)'
    ]
    warnings = [
      'Consider adaptive design for dose selection',
      'Interim analysis may allow early termination for futility',
      'Biomarker-driven enrichment may improve efficiency'
    ]
    confidence = 70
    
  } else if (isPhase3) {
    // Phase 3: Confirmatory, pivotal
    designName = 'Randomized, Double-Blind, Placebo/Active-Controlled, Parallel-Group, Pivotal'
    designType = 'parallel'
    arms = 2
    blinding = 'double-blind'
    populationType = 'patients'
    populationDescription = `Patients with ${indication || '[indication]'}, broad inclusion for generalizability`
    sampleSizeMin = 300
    sampleSizeMax = 3000
    sampleSizeRecommended = 500
    sampleSizeRationale = 'Pivotal Phase 3: Powered at 90% for clinically meaningful difference, α=0.05 two-sided'
    dosingRegimen = 'multiple-dose'
    durationWeeks = 24
    primaryEndpoints = [
      'Regulatory-accepted primary efficacy endpoint',
      'Clinically meaningful treatment difference'
    ]
    secondaryEndpoints = [
      'Key secondary efficacy endpoints',
      'Safety profile characterization',
      'Patient-reported outcomes (PROs)',
      'Health economics data'
    ]
    acceptanceCriterion = 'Superiority or Non-Inferiority'
    acceptanceMargin = 'p < 0.025 one-sided (or 0.05 two-sided) for primary endpoint'
    regulatoryBasis = [
      'FDA Guidance: Providing Clinical Evidence of Effectiveness for Human Drug and Biological Products (1998)',
      'ICH E9: Statistical Principles for Clinical Trials',
      'ICH E10: Choice of Control Group in Clinical Trials'
    ]
    warnings = [
      'Two adequate and well-controlled trials typically required for NDA',
      'Pre-specify multiplicity adjustment for secondary endpoints',
      'Consider global regulatory requirements (FDA, EMA, PMDA)'
    ]
    confidence = 80
    
  } else if (isPhase4) {
    // Phase 4: Post-marketing
    designName = 'Post-Marketing Observational / Registry Study'
    designType = 'parallel'
    arms = 1
    blinding = 'open-label'
    populationType = 'patients'
    populationDescription = 'Real-world patient population in clinical practice'
    sampleSizeMin = 1000
    sampleSizeMax = 10000
    sampleSizeRecommended = 3000
    sampleSizeRationale = 'Post-marketing: Large sample for rare AE detection (rule of 3: n=3000 for 1/1000 events)'
    dosingRegimen = 'multiple-dose'
    durationWeeks = 52
    primaryEndpoints = [
      'Long-term safety profile',
      'Rare adverse event detection',
      'Real-world effectiveness'
    ]
    secondaryEndpoints = [
      'Drug utilization patterns',
      'Healthcare resource utilization',
      'Patient adherence and persistence',
      'Comparative effectiveness'
    ]
    acceptanceCriterion = 'Safety signal detection'
    acceptanceMargin = 'Descriptive statistics, no formal hypothesis testing'
    regulatoryBasis = [
      'FDA Guidance: Postmarketing Studies and Clinical Trials (2011)',
      'FDA Guidance: Best Practices for Conducting and Reporting Pharmacoepidemiologic Safety Studies (2013)',
      'ICH E2E: Pharmacovigilance Planning'
    ]
    warnings = [
      'May be required as post-marketing commitment (PMC/PMR)',
      'Consider registry-based or EHR-based design',
      'REMS may require additional safety monitoring'
    ]
    confidence = 90
  }
  
  return {
    designType,
    designName,
    arms,
    periods,
    sequences,
    blinding,
    population: {
      type: populationType,
      description: populationDescription,
      sampleSizeRange: { min: sampleSizeMin, max: sampleSizeMax, recommended: sampleSizeRecommended },
      sampleSizeRationale
    },
    duration: {
      screeningDays: 28,
      treatmentDays: durationWeeks * 7,
      washoutDays: 0,
      followUpDays: 28,
      totalWeeks: durationWeeks + 8
    },
    dosing: {
      regimen: dosingRegimen,
      description: `${dosingRegimen === 'single-dose' ? 'Single' : 'Multiple'} dose administration of ${compoundName}`
    },
    conditions: {
      fasting: false,
      fed: false
    },
    sampling: {
      schedule: isPhase1 ? ['Pre-dose', '0.5h', '1h', '2h', '4h', '8h', '12h', '24h', '48h', '72h'] : [],
      totalSamples: isPhase1 ? 10 : 0,
      rationale: isPhase1 ? 'Intensive PK sampling for first-in-human characterization' : 'Sparse PK sampling if applicable'
    },
    endpoints: {
      primary: primaryEndpoints,
      secondary: secondaryEndpoints
    },
    acceptanceCriteria: {
      criterion: acceptanceCriterion,
      margin: acceptanceMargin,
      description: ''
    },
    regulatoryBasis,
    warnings,
    confidence
  }
}

// ============================================================================
// Hybrid/Biosimilar Design Rules Engine
// ============================================================================

function generateHybridDesign(
  compoundName: string,
  formulation: { dosageForm?: string; route?: string; strength?: string },
  phase: string = 'Phase 1'
): StudyDesign {
  const isPhase1 = phase === 'Phase 1'
  const isPhase3 = phase === 'Phase 3'
  
  // Biosimilar typically needs: Comparative PK (Phase 1) + Clinical similarity (Phase 3)
  if (isPhase1) {
    return {
      designType: 'parallel',
      designName: 'Randomized, Double-Blind, 3-Arm Parallel, Comparative PK Study',
      arms: 3, // Biosimilar vs US-reference vs EU-reference
      periods: 1,
      sequences: 3,
      blinding: 'double-blind',
      population: {
        type: 'healthy_volunteers',
        description: 'Healthy adult volunteers, 18-55 years, matched for weight/BMI',
        sampleSizeRange: { min: 150, max: 250, recommended: 200 },
        sampleSizeRationale: 'Powered for PK equivalence with 90% CI within 80-125% for AUC and Cmax'
      },
      duration: {
        screeningDays: 28,
        treatmentDays: 1,
        washoutDays: 0,
        followUpDays: 56,
        totalWeeks: 12
      },
      dosing: {
        regimen: 'single-dose',
        description: `Single dose of ${compoundName} biosimilar vs reference products`
      },
      conditions: {
        fasting: true,
        fed: false
      },
      sampling: {
        schedule: ['Pre-dose', '0.5h', '1h', '2h', '4h', '8h', '12h', '24h', '48h', '72h', '7d', '14d', '21d'],
        totalSamples: 13,
        rationale: 'Intensive PK sampling to characterize absorption and elimination'
      },
      endpoints: {
        primary: [
          'AUC0-∞ ratio (biosimilar/reference) with 90% CI within 80-125%',
          'Cmax ratio (biosimilar/reference) with 90% CI within 80-125%'
        ],
        secondary: [
          'Immunogenicity: Anti-Drug Antibodies (ADA) incidence',
          'Safety and tolerability comparison',
          'PK parameter comparison (t½, CL, Vd)'
        ]
      },
      acceptanceCriteria: {
        criterion: 'PK Biosimilarity',
        margin: '90% CI of geometric mean ratio within 80.00-125.00% for AUC and Cmax',
        description: 'FDA/EMA biosimilar PK equivalence criteria'
      },
      regulatoryBasis: [
        'FDA Guidance: Scientific Considerations in Demonstrating Biosimilarity (2015)',
        'FDA Guidance: Clinical Pharmacology Data to Support Biosimilarity (2016)',
        'EMA Guideline on Similar Biological Medicinal Products (2014)'
      ],
      warnings: [
        'Three-arm design required for global submission (US + EU reference)',
        'Immunogenicity assessment critical for biologics',
        'Consider switching study design for interchangeability'
      ],
      confidence: 85
    }
  } else {
    // Phase 3: Clinical similarity study
    return {
      designType: 'parallel',
      designName: 'Randomized, Double-Blind, Parallel-Group, Clinical Equivalence Study',
      arms: 2,
      periods: 1,
      sequences: 2,
      blinding: 'double-blind',
      population: {
        type: 'patients',
        description: 'Patients with approved indication, on stable background therapy',
        sampleSizeRange: { min: 300, max: 600, recommended: 450 },
        sampleSizeRationale: 'Powered for equivalence margin of ±15% for primary efficacy endpoint'
      },
      duration: {
        screeningDays: 28,
        treatmentDays: 168, // 24 weeks
        washoutDays: 0,
        followUpDays: 28,
        totalWeeks: 28
      },
      dosing: {
        regimen: 'multiple-dose',
        description: `${compoundName} biosimilar vs reference product per approved dosing`
      },
      conditions: {
        fasting: false,
        fed: false
      },
      sampling: {
        schedule: ['Week 0', 'Week 4', 'Week 8', 'Week 12', 'Week 16', 'Week 20', 'Week 24'],
        totalSamples: 7,
        rationale: 'Efficacy and safety assessments at regular intervals'
      },
      endpoints: {
        primary: [
          'Clinical efficacy endpoint (e.g., ACR20 for RA, PASI75 for psoriasis)',
          'Equivalence margin typically ±15%'
        ],
        secondary: [
          'Immunogenicity: ADA incidence and titer',
          'Immunogenicity: Neutralizing antibodies',
          'Safety profile comparison',
          'PK trough concentrations'
        ]
      },
      acceptanceCriteria: {
        criterion: 'Clinical Equivalence',
        margin: '95% CI of treatment difference within ±15% equivalence margin',
        description: 'Clinical similarity demonstration per FDA/EMA guidance'
      },
      regulatoryBasis: [
        'FDA Guidance: Scientific Considerations in Demonstrating Biosimilarity (2015)',
        'FDA Guidance: Considerations in Demonstrating Interchangeability (2019)',
        'EMA Guideline on Similar Biological Medicinal Products Containing Biotechnology-Derived Proteins'
      ],
      warnings: [
        'Sensitive patient population required to detect differences',
        'Immunogenicity follow-up typically 52 weeks',
        'Consider switching sub-study for interchangeability designation'
      ],
      confidence: 80
    }
  }
}

// ============================================================================
// Component
// ============================================================================

export function StudyDesignSuggestion({
  productType,
  compoundName,
  indication,
  formulation,
  phase,
  drugCharacteristics = {},
  onAcceptDesign
}: StudyDesignSuggestionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)
  
  // Check if we should show the component
  // Generic: needs formulation selected
  // Innovator: needs compound name
  // Hybrid: needs formulation selected
  const shouldShow = (
    (productType === 'generic' && !!formulation?.dosageForm) ||
    (productType === 'innovator' && !!compoundName && compoundName.length >= 3) ||
    (productType === 'hybrid' && !!formulation?.dosageForm)
  )
  
  // Generate design based on product type - always call useMemo (React hooks rule)
  const design = useMemo(() => {
    if (!shouldShow) return null
    
    if (productType === 'generic') {
      return generateBEDesign(compoundName, formulation!, drugCharacteristics, phase)
    } else if (productType === 'innovator') {
      return generateInnovatorDesign(compoundName, indication, phase)
    } else if (productType === 'hybrid') {
      return generateHybridDesign(compoundName, formulation!, phase)
    }
    return null
  }, [compoundName, formulation, drugCharacteristics, shouldShow, phase, productType, indication])
  
  // Early return AFTER all hooks
  if (!shouldShow || !design) {
    return null
  }
  
  const handleCopy = async () => {
    const text = `
STUDY DESIGN: ${design.designName}

POPULATION: ${design.population.description}
SAMPLE SIZE: ${design.population.sampleSizeRange.recommended} subjects (range: ${design.population.sampleSizeRange.min}-${design.population.sampleSizeRange.max})

DESIGN:
- ${design.arms} treatments, ${design.periods} periods, ${design.sequences} sequences
- Washout: ${design.duration.washoutDays} days
- Dosing: ${design.dosing.description}
- Conditions: ${design.conditions.fasting ? 'Fasting' : ''}${design.conditions.fed ? ' + Fed' : ''}

SAMPLING: ${design.sampling.schedule.join(', ')}

PRIMARY ENDPOINTS:
${design.endpoints.primary.map(e => `- ${e}`).join('\n')}

ACCEPTANCE CRITERIA:
${design.acceptanceCriteria.criterion}
${design.acceptanceCriteria.margin}

REGULATORY BASIS:
${design.regulatoryBasis.map(r => `- ${r}`).join('\n')}
    `.trim()
    
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-sm text-foreground">Suggested Study Design</div>
            <div className="text-xs text-muted-foreground">
              {design.designType === 'crossover_2x2' ? '2×2 Crossover' : 
               design.designType === 'crossover_replicate' ? 'Replicate Crossover' : 
               design.designType}
              {' • '}
              {design.population.sampleSizeRange.recommended} subjects
              {' • '}
              {design.confidence}% confidence
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              design.confidence >= 90 ? "border-green-500 text-green-600" : "border-yellow-500 text-yellow-600"
            )}
          >
            {design.confidence >= 90 ? 'High Confidence' : 'Review Recommended'}
          </Badge>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Design Title */}
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="text-xs font-medium text-muted-foreground mb-1">Study Design</div>
            <div className="text-sm font-medium text-foreground">{design.designName}</div>
          </div>
          
          {/* Key Parameters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Population */}
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground">Sample Size</span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {design.population.sampleSizeRange.recommended}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Range: {design.population.sampleSizeRange.min}-{design.population.sampleSizeRange.max}
              </div>
            </div>
            
            {/* Design */}
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Beaker className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">Design</span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {design.arms}×{design.periods}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {design.sequences} sequences
              </div>
            </div>
            
            {/* Washout */}
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium text-muted-foreground">Washout</span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {design.duration.washoutDays} days
              </div>
              <div className="text-[10px] text-muted-foreground">
                ≥5 half-lives
              </div>
            </div>
            
            {/* Conditions */}
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground">Conditions</span>
              </div>
              <div className="flex gap-1">
                {design.conditions.fasting && (
                  <Badge variant="secondary" className="text-[10px]">Fasting</Badge>
                )}
                {design.conditions.fed && (
                  <Badge variant="secondary" className="text-[10px]">Fed</Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Sampling Schedule */}
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-muted-foreground">PK Sampling Schedule</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {design.sampling.schedule.map((time, i) => (
                <span 
                  key={i}
                  className="px-2 py-0.5 rounded bg-muted text-xs font-mono"
                >
                  {time}
                </span>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">
              {design.sampling.totalSamples} samples per subject • {design.sampling.rationale}
            </div>
          </div>
          
          {/* Acceptance Criteria */}
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Acceptance Criteria</span>
            </div>
            <div className="text-sm font-medium text-green-800 dark:text-green-300">
              {design.acceptanceCriteria.criterion}
            </div>
            <div className="text-xs text-green-700 dark:text-green-400 mt-1">
              {design.acceptanceCriteria.margin}
            </div>
          </div>
          
          {/* Warnings */}
          {design.warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Considerations</span>
              </div>
              <ul className="space-y-1">
                {design.warnings.map((warning, i) => (
                  <li key={i} className="text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Regulatory Basis */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Regulatory Basis</span>
            </div>
            <ul className="space-y-1">
              {design.regulatoryBasis.map((ref, i) => (
                <li key={i} className="text-[11px] text-blue-700 dark:text-blue-400">
                  {ref}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
            <div className="text-[10px] text-muted-foreground">
              Generated based on FDA BE guidance • {isKnownHVD(compoundName) ? 'HVD detected' : ''} {isKnownNTI(compoundName) ? 'NTI detected' : ''}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="text-xs h-8"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1.5" />
                    Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1.5" />
                    Copy Summary
                  </>
                )}
              </Button>
              {onAcceptDesign && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onAcceptDesign(design)}
                  className="text-xs h-8 bg-primary hover:bg-primary/90"
                >
                  <Sparkles className="h-3 w-3 mr-1.5" />
                  Use This Design
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
