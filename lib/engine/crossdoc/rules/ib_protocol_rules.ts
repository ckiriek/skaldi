/**
 * IB-Protocol Cross-Document Rules
 * Validate consistency between Investigator's Brochure and Protocol
 */

import type { CrossDocRuleContext, CrossDocIssue } from '../types'

/**
 * Rule: Primary objective must align between IB and Protocol
 */
export async function ibProtocolObjectiveMismatch(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle, alignments } = ctx

  if (!bundle.ib || !bundle.protocol) return issues

  // Check primary objective alignment
  const primaryLinks = alignments.objectives.filter(link => link.type === 'primary')
  const alignedPrimary = primaryLinks.filter(link => link.aligned)

  if (primaryLinks.length > 0 && alignedPrimary.length === 0) {
    issues.push({
      code: 'IB_PROTOCOL_OBJECTIVE_MISMATCH',
      severity: 'error',
      category: 'IB_PROTOCOL',
      message: 'Primary objective differs between IB and Protocol',
      details: 'The primary study objective described in the Investigator\'s Brochure does not match the primary objective stated in the Protocol. This inconsistency may cause confusion during study conduct and regulatory review.',
      locations: [
        { documentType: 'IB', sectionId: 'OBJECTIVES' },
        { documentType: 'PROTOCOL', sectionId: 'OBJECTIVES' },
      ],
      suggestions: [
        {
          id: 'ALIGN_PRIMARY_OBJECTIVE',
          label: 'Align Protocol primary objective with IB',
          autoFixable: false,
          patches: [],
        },
      ],
    })
  }

  // Check for low similarity in aligned objectives
  alignedPrimary.forEach(link => {
    if (link.similarityScore < 0.7) {
      issues.push({
        code: 'IB_PROTOCOL_OBJECTIVE_LOW_SIMILARITY',
        severity: 'warning',
        category: 'IB_PROTOCOL',
        message: `Primary objective similarity is low (${(link.similarityScore * 100).toFixed(0)}%)`,
        details: 'While the primary objectives are considered aligned, their wording differs significantly. Consider using more consistent language.',
        locations: [
          { documentType: 'IB', sectionId: 'OBJECTIVES', blockId: link.ibObjectiveId },
          { documentType: 'PROTOCOL', sectionId: 'OBJECTIVES', blockId: link.protocolObjectiveId },
        ],
      })
    }
  })

  return issues
}

/**
 * Rule: Target population must be consistent
 */
export async function ibProtocolPopulationDrift(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  if (!bundle.ib || !bundle.protocol) return issues

  const ibPopulation = bundle.ib.targetPopulation
  const protocolCriteria = [
    ...(bundle.protocol.inclusionCriteria || []),
    ...(bundle.protocol.exclusionCriteria || []),
  ].join(' ')

  if (!ibPopulation || protocolCriteria.length === 0) return issues

  // Check if IB population description is reflected in Protocol criteria
  const ibWords = ibPopulation.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const protocolWords = protocolCriteria.toLowerCase().split(/\s+/)
  
  const matchedWords = ibWords.filter(word => protocolWords.includes(word))
  const matchRatio = matchedWords.length / ibWords.length

  if (matchRatio < 0.3) {
    issues.push({
      code: 'IB_PROTOCOL_POPULATION_DRIFT',
      severity: 'warning',
      category: 'IB_PROTOCOL',
      message: 'Target population description differs significantly between IB and Protocol',
      details: `Only ${(matchRatio * 100).toFixed(0)}% of key terms from IB target population are found in Protocol inclusion/exclusion criteria. Ensure the study population is consistently defined.`,
      locations: [
        { documentType: 'IB', sectionId: 'TARGET_POPULATION' },
        { documentType: 'PROTOCOL', sectionId: 'ELIGIBILITY_CRITERIA' },
      ],
    })
  }

  return issues
}

/**
 * Rule: Dosing information must be consistent
 */
export async function ibProtocolDoseInconsistent(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle, alignments } = ctx

  if (!bundle.ib || !bundle.protocol) return issues

  const doseLinks = alignments.doses
  const unalignedDoses = doseLinks.filter(link => !link.aligned)

  // Check for IB doses not found in Protocol
  const orphanedIbDoses = unalignedDoses.filter(link => link.ibDoseId && !link.protocolArmId)
  
  if (orphanedIbDoses.length > 0) {
    issues.push({
      code: 'IB_PROTOCOL_DOSE_INCONSISTENT',
      severity: 'error',
      category: 'IB_PROTOCOL',
      message: `${orphanedIbDoses.length} dose regimen(s) from IB not found in Protocol`,
      details: 'Dosing information described in the Investigator\'s Brochure must be reflected in the Protocol treatment arms. Missing doses may indicate incomplete Protocol design.',
      locations: [
        { documentType: 'IB', sectionId: 'DOSING' },
        { documentType: 'PROTOCOL', sectionId: 'TREATMENT_ARMS' },
      ],
      suggestions: [
        {
          id: 'ADD_MISSING_DOSES',
          label: 'Add missing dose regimens to Protocol',
          autoFixable: false,
          patches: [],
        },
      ],
    })
  }

  // Check for Protocol arms not found in IB
  const orphanedProtocolArms = unalignedDoses.filter(link => link.protocolArmId && !link.ibDoseId)
  
  if (orphanedProtocolArms.length > 0) {
    issues.push({
      code: 'IB_PROTOCOL_DOSE_NOT_IN_IB',
      severity: 'warning',
      category: 'IB_PROTOCOL',
      message: `${orphanedProtocolArms.length} Protocol treatment arm(s) not described in IB`,
      details: 'All treatment regimens used in the Protocol should be supported by information in the Investigator\'s Brochure.',
      locations: [
        { documentType: 'PROTOCOL', sectionId: 'TREATMENT_ARMS' },
        { documentType: 'IB', sectionId: 'DOSING' },
      ],
    })
  }

  return issues
}

/**
 * Rule: Mechanism of action should be referenced
 */
export async function ibProtocolMechanismMissing(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  if (!bundle.ib || !bundle.protocol) return issues

  const ibMechanism = bundle.ib.mechanismOfAction
  
  if (!ibMechanism || ibMechanism.length < 50) {
    issues.push({
      code: 'IB_MECHANISM_INCOMPLETE',
      severity: 'info',
      category: 'IB_PROTOCOL',
      message: 'Mechanism of action not adequately described in IB',
      details: 'The Investigator\'s Brochure should contain a clear description of the drug\'s mechanism of action to support the Protocol rationale.',
      locations: [
        { documentType: 'IB', sectionId: 'MECHANISM_OF_ACTION' },
      ],
    })
  }

  return issues
}

/**
 * Rule: Safety information consistency
 */
export async function ibProtocolSafetyInconsistent(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  if (!bundle.ib || !bundle.protocol) return issues

  const ibRisks = bundle.ib.keyRiskProfile || []
  
  if (ibRisks.length === 0) {
    issues.push({
      code: 'IB_SAFETY_PROFILE_MISSING',
      severity: 'warning',
      category: 'IB_PROTOCOL',
      message: 'Key risk profile not defined in IB',
      details: 'The Investigator\'s Brochure should clearly describe known and potential risks to support Protocol safety assessments and informed consent.',
      locations: [
        { documentType: 'IB', sectionId: 'SAFETY' },
      ],
    })
  }

  return issues
}

/**
 * All IB-Protocol rules
 */
export const ibProtocolRules = [
  ibProtocolObjectiveMismatch,
  ibProtocolPopulationDrift,
  ibProtocolDoseInconsistent,
  ibProtocolMechanismMissing,
  ibProtocolSafetyInconsistent,
]
