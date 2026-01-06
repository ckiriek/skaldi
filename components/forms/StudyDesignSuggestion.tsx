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
// BE Design Rules Engine
// ============================================================================

function generateBEDesign(
  compoundName: string,
  formulation: { dosageForm?: string; route?: string; strength?: string },
  characteristics: DrugCharacteristics
): StudyDesign {
  const isOral = formulation.route?.toUpperCase() === 'ORAL' || 
                 formulation.dosageForm?.toLowerCase().includes('tablet') ||
                 formulation.dosageForm?.toLowerCase().includes('capsule')
  
  const isIR = !characteristics.isModifiedRelease && 
               !formulation.dosageForm?.toLowerCase().includes('extended') &&
               !formulation.dosageForm?.toLowerCase().includes('modified') &&
               !formulation.dosageForm?.toLowerCase().includes('sustained')
  
  const isNTI = characteristics.isNTI || false
  const isHVD = characteristics.isHVD || false
  const hasFoodEffect = characteristics.hasFoodEffect ?? true // Default to requiring fed study
  const halfLife = characteristics.halfLife || 8 // Default 8 hours
  
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
  
  // Warnings
  const warnings: string[] = []
  if (isNTI) {
    warnings.push('Narrow Therapeutic Index drug requires additional safety monitoring and tighter BE limits')
  }
  if (isHVD) {
    warnings.push('Highly Variable Drug may require replicate design and reference-scaled analysis')
  }
  if (hasFoodEffect) {
    warnings.push('Food effect study may be required based on RLD labeling')
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
  
  // Only show for generic products with formulation selected
  if (productType !== 'generic' || !formulation?.dosageForm) {
    return null
  }
  
  // Generate design
  const design = useMemo(() => {
    return generateBEDesign(compoundName, formulation, drugCharacteristics)
  }, [compoundName, formulation, drugCharacteristics])
  
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
          <div className="flex items-center justify-between pt-2">
            <div className="text-[10px] text-muted-foreground">
              Generated based on FDA BE guidance and drug characteristics
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="text-xs"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Design
                  </>
                )}
              </Button>
              {onAcceptDesign && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onAcceptDesign(design)}
                  className="text-xs"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
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
