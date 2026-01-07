// Study Design Engine v2.3 - Data-Driven Architecture
// Per VP CRO spec: deterministic, auditable, no safe defaults

import {
  RegulatoryPathway,
  PrimaryObjective,
  DesignPattern,
  GuardrailRule,
  DecisionTraceEntry,
  StudyDesignOutput,
  DesignSummary,
  DrugCharacteristics,
  GuardrailSeverity,
  GuardrailAction
} from './types'

import {
  ENGINE_VERSIONS,
  DESIGN_PATTERNS,
  GUARDRAIL_RULES,
  FALLBACK_ORDER,
  getPattern,
  getFallbackOrder,
  getVersionStringWithHash
} from './config-loader'

// ============================================================================
// STEP 1: INFER REGULATORY PATHWAY
// ============================================================================

export function inferRegulatoryPathway(
  productType: 'generic' | 'innovator' | 'hybrid',
  compoundName: string,
  stageHint?: string
): RegulatoryPathway {
  // Check for biosimilar indicators
  const biosimilarIndicators = [
    'biosimilar', 'similar biologic', 'proposed biosimilar',
    'adalimumab', 'infliximab', 'rituximab', 'trastuzumab', 'bevacizumab',
    'etanercept', 'filgrastim', 'pegfilgrastim', 'epoetin', 'insulin'
  ]
  
  const lowerCompound = compoundName.toLowerCase()
  const lowerStage = (stageHint || '').toLowerCase()
  
  if (biosimilarIndicators.some(ind => lowerCompound.includes(ind) || lowerStage.includes(ind))) {
    return 'biosimilar'
  }
  
  // Check for post-marketing
  if (lowerStage.includes('post-marketing') || lowerStage.includes('phase 4') || lowerStage.includes('registry')) {
    return 'post_marketing'
  }
  
  // Map product type to pathway
  const pathwayMap: Record<string, RegulatoryPathway> = {
    'generic': 'generic',
    'innovator': 'innovator',
    'hybrid': 'hybrid'
  }
  
  return pathwayMap[productType] || 'innovator'
}

// ============================================================================
// STEP 2: INFER PRIMARY OBJECTIVE
// ============================================================================

export function inferPrimaryObjective(
  pathway: RegulatoryPathway,
  stageHint?: string
): PrimaryObjective {
  const lowerStage = (stageHint || '').toLowerCase()
  
  // Stage-based inference
  if (lowerStage.includes('phase 1') || lowerStage.includes('fih') || lowerStage.includes('first-in-human')) {
    return 'pk_safety'
  }
  if (lowerStage.includes('phase 2') || lowerStage.includes('dose') || lowerStage.includes('proof of concept')) {
    return 'dose_selection'
  }
  if (lowerStage.includes('phase 3') || lowerStage.includes('pivotal') || lowerStage.includes('confirmatory')) {
    return pathway === 'biosimilar' ? 'clinical_equivalence' : 'confirmatory_efficacy'
  }
  if (lowerStage.includes('phase 4') || lowerStage.includes('post-marketing')) {
    return 'long_term_safety'
  }
  
  // Pathway-based defaults
  const defaultObjectives: Record<RegulatoryPathway, PrimaryObjective> = {
    'innovator': 'pk_safety',
    'generic': 'pk_equivalence',
    'biosimilar': 'pk_similarity',
    'hybrid': 'pk_equivalence',
    'post_marketing': 'long_term_safety'
  }
  
  return defaultObjectives[pathway]
}

// ============================================================================
// STEP 3: SELECT DESIGN PATTERN (Deterministic Filtering)
// ============================================================================

interface PatternSelectionResult {
  pattern: DesignPattern | null
  patternId: string | null
  candidatesCount: number
  selectionReason: string
}

export function selectDesignPattern(
  pathway: RegulatoryPathway,
  objective: PrimaryObjective,
  drugChars: DrugCharacteristics
): PatternSelectionResult {
  // Filter by allowed_pathways and allowed_objectives
  const candidates = Object.values(DESIGN_PATTERNS).filter(p =>
    p.allowed_pathways.includes(pathway) &&
    p.allowed_objectives.includes(objective)
  )
  
  if (candidates.length === 0) {
    return {
      pattern: null,
      patternId: null,
      candidatesCount: 0,
      selectionReason: 'No patterns match pathway + objective'
    }
  }
  
  // Apply drug characteristics preferences
  let ranked = [...candidates]
  
  // Boost patterns that prefer current drug characteristics
  if (drugChars.isHVD) {
    ranked = ranked.map(p => ({
      ...p,
      _boost: p.drug_characteristics?.prefer_if?.isHVD ? -10 : 0
    }))
  }
  
  // Penalize patterns that should avoid current drug characteristics
  ranked = ranked.map(p => {
    let penalty = 0
    if (drugChars.halfLife && p.drug_characteristics?.avoid_if?.halfLifeHours_gte) {
      if (drugChars.halfLife >= p.drug_characteristics.avoid_if.halfLifeHours_gte) {
        penalty += 20
      }
    }
    return { ...p, _penalty: penalty }
  })
  
  // Sort by: priority (lower = better), then specificity_score (higher = better)
  ranked.sort((a, b) => {
    const aScore = a.priority + ((a as any)._penalty || 0) - ((a as any)._boost || 0)
    const bScore = b.priority + ((b as any)._penalty || 0) - ((b as any)._boost || 0)
    if (aScore !== bScore) return aScore - bScore
    return b.specificity_score - a.specificity_score
  })
  
  const selected = ranked[0]
  let reason = `Selected ${selected.id} (priority=${selected.priority}, specificity=${selected.specificity_score})`
  
  if (drugChars.isHVD && selected.drug_characteristics?.prefer_if?.isHVD) {
    reason += ' [boosted by HVD rule]'
  }
  
  return {
    pattern: selected,
    patternId: selected.id,
    candidatesCount: candidates.length,
    selectionReason: reason
  }
}

// ============================================================================
// STEP 3.5: APPLY GUARDRAILS
// ============================================================================

interface GuardrailCheckResult {
  passed: boolean
  severity?: GuardrailSeverity
  action?: GuardrailAction
  ruleId?: string
  message?: string
  traceNote?: string
  fallbackPatterns?: string[]
}

export function checkGuardrails(
  pattern: DesignPattern,
  pathway: RegulatoryPathway,
  objective: PrimaryObjective,
  drugChars: DrugCharacteristics
): GuardrailCheckResult[] {
  const results: GuardrailCheckResult[] = []
  
  for (const rule of GUARDRAIL_RULES) {
    let matches = true
    
    // Check pathway match
    if (rule.match.pathway && !rule.match.pathway.includes(pathway)) {
      matches = false
    }
    
    // Check objective match
    if (rule.match.objective && !rule.match.objective.includes(objective)) {
      matches = false
    }
    
    // Check pattern ID match
    if (rule.match.patternId && !rule.match.patternId.includes(pattern.id)) {
      matches = false
    }
    
    // Check pattern ID NOT match
    if (rule.match.patternId_not && rule.match.patternId_not.includes(pattern.id)) {
      matches = false
    }
    
    // Check structure match
    if (rule.match.structure && !rule.match.structure.includes(pattern.summary.structure)) {
      matches = false
    }
    
    // Check blinding match
    if (rule.match.blinding && !rule.match.blinding.includes(pattern.summary.blinding)) {
      matches = false
    }
    
    // Check pattern tags match
    if (rule.match.patternTags) {
      const hasTag = rule.match.patternTags.some(tag => pattern.tags.includes(tag))
      if (!hasTag) matches = false
    }
    
    // Check constraints
    if (rule.match.constraints_requires_interim !== undefined) {
      if (pattern.constraints.requires_interim !== rule.match.constraints_requires_interim) {
        matches = false
      }
    }
    
    // Check N range ratio
    if (rule.match.n_range_ratio_gt) {
      const ratio = pattern.typical_n_range.max / pattern.typical_n_range.min
      if (ratio <= rule.match.n_range_ratio_gt) {
        matches = false
      }
    }
    
    // Check drug characteristics
    if (rule.match.drug_isHVD !== undefined && drugChars.isHVD !== rule.match.drug_isHVD) {
      matches = false
    }
    if (rule.match.drug_isNTI !== undefined && drugChars.isNTI !== rule.match.drug_isNTI) {
      matches = false
    }
    if (rule.match.drug_halfLifeHours_gte !== undefined) {
      if (!drugChars.halfLife || drugChars.halfLife < rule.match.drug_halfLifeHours_gte) {
        matches = false
      }
    }
    
    if (matches) {
      results.push({
        passed: rule.severity === 'SOFT_WARNING',
        severity: rule.severity,
        action: rule.action,
        ruleId: rule.id,
        message: rule.message,
        traceNote: rule.trace_note,
        fallbackPatterns: rule.fallback_hint?.patterns
      })
    }
  }
  
  // If no rules matched, all passed
  if (results.length === 0) {
    return [{ passed: true }]
  }
  
  return results
}

// ============================================================================
// STEP 3.5b: APPLY FALLBACK
// ============================================================================

interface FallbackResult {
  pattern: DesignPattern | null
  patternId: string | null
  warning: string
  triedPatterns: string[]
  isHumanDecisionRequired: boolean
}

export function applyFallback(
  pathway: RegulatoryPathway,
  objective: PrimaryObjective,
  drugChars: DrugCharacteristics,
  blockedPatternId: string,
  specificPatterns?: string[]
): FallbackResult {
  const triedPatterns: string[] = [blockedPatternId]
  
  // Get fallback order
  const fallbackList = specificPatterns?.length 
    ? specificPatterns 
    : getFallbackOrder(pathway, objective)
  
  for (const candidateId of fallbackList) {
    if (candidateId === 'HUMAN_DECISION_REQUIRED') {
      return {
        pattern: null,
        patternId: null,
        warning: `[HUMAN_DECISION_REQUIRED] No valid pattern for ${pathway}/${objective}. Tried: ${triedPatterns.join(', ')}.`,
        triedPatterns,
        isHumanDecisionRequired: true
      }
    }
    
    if (triedPatterns.includes(candidateId)) continue
    
    const candidate = getPattern(candidateId)
    if (!candidate) continue
    
    // Check if candidate passes guardrails
    const checks = checkGuardrails(candidate, pathway, objective, drugChars)
    const hardStop = checks.find(c => c.severity === 'HARD_STOP' && c.action !== 'WARN')
    
    if (!hardStop) {
      return {
        pattern: candidate,
        patternId: candidateId,
        warning: `Fallback to ${candidateId} (after trying: ${triedPatterns.join(', ')}).`,
        triedPatterns: [...triedPatterns, candidateId],
        isHumanDecisionRequired: false
      }
    }
    
    triedPatterns.push(candidateId)
  }
  
  // No valid fallback found
  return {
    pattern: null,
    patternId: null,
    warning: `[HUMAN_DECISION_REQUIRED] No valid fallback found for ${pathway}/${objective}. Tried: ${triedPatterns.join(', ')}.`,
    triedPatterns,
    isHumanDecisionRequired: true
  }
}

// ============================================================================
// STEP 4: DERIVE PHASE LABEL
// ============================================================================

export function derivePhaseLabel(
  pathway: RegulatoryPathway,
  objective: PrimaryObjective,
  patternId: string | null
): string | null {
  if (!patternId) return null
  
  // Pattern-based mapping
  if (patternId === 'SAD' || patternId === 'MAD') return 'Phase 1'
  if (patternId === 'PK_CROSSOVER_BE' || patternId === 'PK_CROSSOVER_BE_REPLICATE') return 'BE Study'
  if (patternId === 'PK_PARALLEL_SIMILARITY') return 'PK Similarity Study'
  if (patternId === 'OBSERVATIONAL_REGISTRY') return 'Phase 4 / Registry'
  
  // Objective-based mapping
  const phaseMap: Record<PrimaryObjective, string> = {
    'pk_safety': 'Phase 1',
    'pk_equivalence': 'BE Study',
    'pk_similarity': 'PK Similarity Study',
    'dose_selection': 'Phase 2',
    'confirmatory_efficacy': 'Phase 3',
    'clinical_equivalence': 'Phase 3',
    'long_term_safety': 'Phase 4',
    'effectiveness': 'Phase 4'
  }
  
  return phaseMap[objective] || 'Unassigned'
}

// ============================================================================
// STEP 5: BUILD REGULATORY RATIONALE (3-layer format)
// ============================================================================

export function buildRegulatoryRationale(
  pattern: DesignPattern | null,
  pathway: RegulatoryPathway,
  objective: PrimaryObjective,
  drugChars: DrugCharacteristics,
  indication?: string,
  fallbackInfo?: string
): string {
  if (!pattern) {
    return `HUMAN_DECISION_REQUIRED: No valid design pattern could be selected for ${pathway} pathway with ${objective} objective. Manual review is needed.`
  }
  
  const layers: string[] = []
  
  // LAYER 1: WHAT
  layers.push(`WHAT: ${pattern.rationale.what}`)
  
  // LAYER 2: WHY
  layers.push(`WHY: ${pattern.rationale.why}`)
  
  // LAYER 3: REGULATORY
  layers.push(`REG: ${pattern.rationale.reg}`)
  
  // Drug characteristics context
  if (drugChars.isHVD && pathway === 'generic') {
    layers.push('Reference-scaled approach applied for highly variable drug (CV >30%).')
  }
  if (drugChars.isNTI && pathway === 'generic') {
    layers.push('Tightened bioequivalence limits (90.00-111.11%) applied for narrow therapeutic index.')
  }
  
  // Indication context
  if (indication && (objective === 'confirmatory_efficacy' || objective === 'clinical_equivalence')) {
    layers.push(`Endpoints selected are appropriate for ${indication}.`)
  }
  
  // Assumptions
  if (pattern.rationale.assumptions?.length) {
    layers.push(`Assumptions: ${pattern.rationale.assumptions.join('; ')}`)
  }
  
  // Fallback trace
  if (fallbackInfo) {
    layers.push(`Note: ${fallbackInfo}`)
  }
  
  return layers.join(' ')
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

export function generateStudyDesign(
  productType: 'generic' | 'innovator' | 'hybrid',
  compoundName: string,
  formulation: { dosageForm?: string; route?: string; strength?: string },
  stageHint?: string,
  indication?: string,
  drugChars?: DrugCharacteristics
): StudyDesignOutput {
  // Initialize decision trace
  const decisionTrace: DecisionTraceEntry[] = []
  
  // Step 0: Record versions with config hash
  decisionTrace.push({
    step: '0. versions',
    result: getVersionStringWithHash()
  })
  
  // Step 1: Infer regulatory pathway
  const pathway = inferRegulatoryPathway(productType, compoundName, stageHint)
  decisionTrace.push({
    step: '1. inferRegulatoryPathway',
    action: `productType=${productType}, stageHint=${stageHint || 'none'}`,
    result: pathway
  })
  
  // Step 2: Infer primary objective
  const objective = inferPrimaryObjective(pathway, stageHint)
  decisionTrace.push({
    step: '2. inferPrimaryObjective',
    action: `pathway=${pathway}, stageHint=${stageHint || 'none'}`,
    result: objective
  })
  
  // Step 2.5: Get drug characteristics
  const chars: DrugCharacteristics = drugChars || {}
  decisionTrace.push({
    step: '2.5. getDrugCharacteristics',
    action: `compound_id=${compoundName.substring(0, 3).toUpperCase()}***`,
    result: `isHVD=${chars.isHVD || false}, isNTI=${chars.isNTI || false}, halfLife=${chars.halfLife || 'unknown'}h`
  })
  
  // Step 3: Select design pattern
  const selection = selectDesignPattern(pathway, objective, chars)
  decisionTrace.push({
    step: '3. selectDesignPattern',
    action: `pathway=${pathway}, objective=${objective}`,
    result: selection.patternId 
      ? `${selection.patternId} (${selection.candidatesCount} candidates) ${selection.selectionReason}`
      : `NO MATCH (${selection.candidatesCount} candidates)`
  })
  
  let pattern = selection.pattern
  let patternId = selection.patternId
  let fallbackInfo: string | undefined
  const warnings: string[] = []
  
  // Step 3.5: Apply guardrails
  if (pattern) {
    const guardrailChecks = checkGuardrails(pattern, pathway, objective, chars)
    const hardStops = guardrailChecks.filter(c => c.severity === 'HARD_STOP' && !c.passed)
    const softWarnings = guardrailChecks.filter(c => c.severity === 'SOFT_WARNING')
    
    // Add soft warnings
    for (const sw of softWarnings) {
      if (sw.message) warnings.push(sw.message)
    }
    
    if (hardStops.length > 0) {
      const firstHardStop = hardStops[0]
      decisionTrace.push({
        step: '3.5. applyGuardrails',
        action: `Check ${patternId} against guardrails`,
        result: `[HARD_STOP] ${firstHardStop.ruleId}: ${firstHardStop.traceNote}`
      })
      
      // Apply fallback
      const fallback = applyFallback(
        pathway,
        objective,
        chars,
        patternId!,
        firstHardStop.fallbackPatterns
      )
      
      pattern = fallback.pattern
      patternId = fallback.patternId
      warnings.unshift(fallback.warning)
      fallbackInfo = `Initial pattern was adjusted due to guardrail: ${firstHardStop.message}`
      
      decisionTrace.push({
        step: '3.5b. applyFallback',
        action: `Tried: ${fallback.triedPatterns.join(', ')}`,
        result: fallback.isHumanDecisionRequired 
          ? 'HUMAN_DECISION_REQUIRED'
          : `Fallback to ${patternId}`
      })
    } else {
      const traceResult = softWarnings.length > 0
        ? `PASSED with ${softWarnings.length} soft warnings`
        : 'PASSED - no violations'
      decisionTrace.push({
        step: '3.5. applyGuardrails',
        action: `Check ${patternId} against guardrails`,
        result: traceResult
      })
    }
  } else {
    // No pattern selected - try fallback order
    const fallback = applyFallback(pathway, objective, chars, 'NONE')
    pattern = fallback.pattern
    patternId = fallback.patternId
    if (fallback.isHumanDecisionRequired) {
      warnings.push(fallback.warning)
    }
    
    decisionTrace.push({
      step: '3.5. applyGuardrails',
      action: 'No initial pattern - trying fallback order',
      result: fallback.isHumanDecisionRequired 
        ? 'HUMAN_DECISION_REQUIRED'
        : `Fallback to ${patternId}`
    })
  }
  
  // Step 4: Derive phase label
  const phaseLabel = derivePhaseLabel(pathway, objective, patternId)
  decisionTrace.push({
    step: '4. derivePhaseLabel',
    action: `patternId=${patternId || 'null'}`,
    result: phaseLabel || 'null'
  })
  
  // Step 5: Build regulatory rationale
  const regulatoryRationale = buildRegulatoryRationale(
    pattern,
    pathway,
    objective,
    chars,
    indication,
    fallbackInfo
  )
  decisionTrace.push({
    step: '5. buildRegulatoryRationale',
    action: 'Build 3-layer rationale (WHAT/WHY/REG)',
    result: `Generated ${regulatoryRationale.length} chars`
  })
  
  // Build design summary
  let designSummary: DesignSummary | null = null
  if (pattern) {
    const nRange = pattern.typical_n_range
    designSummary = {
      structure: pattern.summary.structure,
      randomization: pattern.summary.randomization,
      blinding: pattern.summary.blinding,
      arms: pattern.summary.arms,
      comparator: pattern.summary.comparator,
      key_features: pattern.summary.key_features,
      typicalN: `${nRange.min}-${nRange.max} ${nRange.unit}${nRange.note ? ` (${nRange.note})` : ''}`
    }
  }
  
  // Calculate confidence
  let confidence = 95
  if (!pattern) confidence = 0
  else if (fallbackInfo) confidence -= 15
  if (chars.isHVD) confidence -= 5
  if (chars.isNTI) confidence -= 5
  if (warnings.length > 2) confidence -= 10
  confidence = Math.max(0, Math.min(100, confidence))
  
  // Final trace
  decisionTrace.push({
    step: '6. OUTPUT',
    action: 'Final design selection',
    result: patternId 
      ? `pattern=${patternId}, phase=${phaseLabel}, confidence=${confidence}%`
      : 'HUMAN_DECISION_REQUIRED - no valid pattern'
  })
  
  // Build output
  const output: StudyDesignOutput = {
    regulatoryPathway: pathway,
    primaryObjective: objective,
    designPattern: patternId,
    designSummary,
    phaseLabel,
    designName: pattern?.title || null,
    regulatoryRationale,
    warnings,
    confidence,
    decisionTrace
  }
  
  // Add additional details if pattern selected
  if (pattern) {
    const nRange = pattern.typical_n_range
    output.population = {
      type: nRange.unit === 'subjects' ? 'healthy_volunteers' : 'patients',
      description: `${nRange.unit === 'subjects' ? 'Healthy volunteers' : 'Patients'} meeting inclusion/exclusion criteria`,
      sampleSizeRange: {
        min: nRange.min,
        max: nRange.max,
        recommended: Math.round((nRange.min + nRange.max) / 2)
      },
      sampleSizeRationale: `Based on ${pattern.id} design requirements${nRange.note ? `: ${nRange.note}` : ''}`
    }
    
    output.regulatoryBasis = [pattern.rationale.reg]
  }
  
  return output
}

// Export for testing
export { ENGINE_VERSIONS, DESIGN_PATTERNS, GUARDRAIL_RULES, FALLBACK_ORDER }
