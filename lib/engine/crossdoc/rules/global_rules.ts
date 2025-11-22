/**
 * Global Cross-Document Rules
 * Validate consistency across all documents
 */

import type { CrossDocRuleContext, CrossDocIssue } from '../types'

/**
 * Rule: Study purpose must be consistent across all documents
 */
export async function globalPurposeDrift(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle, alignments } = ctx

  // Check if primary objectives are aligned across IB, Protocol, SAP
  const objectiveLinks = alignments.objectives.filter(link => link.type === 'primary')
  const unalignedObjectives = objectiveLinks.filter(link => !link.aligned)

  if (unalignedObjectives.length > 0) {
    issues.push({
      code: 'GLOBAL_PURPOSE_DRIFT',
      severity: 'critical',
      category: 'GLOBAL',
      message: 'Study purpose is not consistent across documents',
      details: 'The primary objective/purpose of the study must be consistently stated in all key documents (IB, Protocol, SAP, ICF, CSR). Inconsistencies may cause regulatory concerns.',
      locations: [
        { documentType: 'IB', sectionId: 'OBJECTIVES' },
        { documentType: 'PROTOCOL', sectionId: 'OBJECTIVES' },
        { documentType: 'SAP', sectionId: 'OBJECTIVES' },
      ],
    })
  }

  return issues
}

/**
 * Rule: Target population must be coherent across documents
 */
export async function globalPopulationIncoherent(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  const hasIbPopulation = bundle.ib?.targetPopulation && bundle.ib.targetPopulation.length > 50
  const hasProtocolCriteria = (bundle.protocol?.inclusionCriteria?.length || 0) > 0
  const hasSapPopulations = (bundle.sap?.analysisPopulations?.length || 0) > 0

  // Check if population is defined somewhere
  if (!hasIbPopulation && !hasProtocolCriteria) {
    issues.push({
      code: 'GLOBAL_POPULATION_INCOHERENT',
      severity: 'error',
      category: 'GLOBAL',
      message: 'Target population not adequately defined',
      details: 'The study population must be clearly defined in the IB and Protocol with specific inclusion/exclusion criteria.',
      locations: [
        { documentType: 'IB', sectionId: 'TARGET_POPULATION' },
        { documentType: 'PROTOCOL', sectionId: 'ELIGIBILITY_CRITERIA' },
      ],
    })
  }

  // Check SAP has analysis populations if Protocol has criteria
  if (hasProtocolCriteria && !hasSapPopulations) {
    issues.push({
      code: 'GLOBAL_ANALYSIS_POPULATIONS_MISSING',
      severity: 'warning',
      category: 'GLOBAL',
      message: 'Analysis populations not defined in SAP',
      details: 'The SAP should define analysis populations (FAS, PP, Safety) based on the Protocol eligibility criteria.',
      locations: [
        { documentType: 'PROTOCOL', sectionId: 'ELIGIBILITY_CRITERIA' },
        { documentType: 'SAP', sectionId: 'ANALYSIS_SETS' },
      ],
    })
  }

  return issues
}

/**
 * Rule: Document versioning and consistency
 */
export async function globalVersionInconsistent(
  ctx: CrossDocRuleContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  const { bundle } = ctx

  // Check if documents have version information
  const docs = [
    { type: 'IB', doc: bundle.ib },
    { type: 'PROTOCOL', doc: bundle.protocol },
    { type: 'SAP', doc: bundle.sap },
    { type: 'ICF', doc: bundle.icf },
    { type: 'CSR', doc: bundle.csr },
  ]

  const docsWithoutVersion = docs.filter(d => d.doc && !d.doc.version)

  if (docsWithoutVersion.length > 0) {
    issues.push({
      code: 'GLOBAL_VERSION_MISSING',
      severity: 'info',
      category: 'GLOBAL',
      message: `${docsWithoutVersion.length} document(s) missing version information`,
      details: `Documents without version: ${docsWithoutVersion.map(d => d.type).join(', ')}. All controlled documents should have version numbers for traceability.`,
      locations: docsWithoutVersion.map(d => ({ documentType: d.type as any, sectionId: 'HEADER' })),
    })
  }

  return issues
}

/**
 * All global rules
 */
export const globalRules = [
  globalPurposeDrift,
  globalPopulationIncoherent,
  globalVersionInconsistent,
]
