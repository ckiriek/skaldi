/**
 * Analysis Sets Generator
 * Define and generate analysis populations for clinical trials
 */

import type { AnalysisSet } from '../types'

/**
 * Generate standard analysis sets definitions
 */
export function generateAnalysisSets(params: {
  studyDesign: 'parallel' | 'crossover' | 'factorial'
  hasRunIn?: boolean
  hasSafetyFollowUp?: boolean
  primaryEndpointType: 'efficacy' | 'safety'
}): AnalysisSet[] {
  const { studyDesign, hasRunIn = false, hasSafetyFollowUp = false, primaryEndpointType } = params

  const sets: AnalysisSet[] = []

  // 1. Full Analysis Set (FAS) / Intent-to-Treat (ITT)
  sets.push({
    name: 'Full Analysis Set (FAS)',
    abbreviation: 'FAS',
    description: 'All randomized subjects who received at least one dose of study medication, analyzed according to the treatment assigned at randomization (intent-to-treat principle).',
    inclusionCriteria: [
      'Randomized to treatment',
      'Received at least one dose of study medication',
    ],
    exclusionCriteria: [
      'Did not receive any study medication',
    ],
    primaryUse: primaryEndpointType === 'efficacy' ? 'primary_efficacy' : 'supportive_efficacy',
    icheCompliance: 'ICH E9: Primary analysis population for efficacy endpoints',
  })

  // 2. Per-Protocol Set (PPS)
  sets.push({
    name: 'Per-Protocol Set (PPS)',
    abbreviation: 'PPS',
    description: 'Subset of FAS including subjects who completed the study without major protocol deviations that could substantially affect the evaluation of efficacy.',
    inclusionCriteria: [
      'Met all FAS criteria',
      'Completed the study (or reached primary endpoint assessment)',
      'No major protocol deviations',
      'Treatment compliance ≥ 80%',
    ],
    exclusionCriteria: [
      'Major protocol violations affecting efficacy assessment',
      'Treatment compliance < 80%',
      'Prohibited concomitant medication use',
      'Incorrect study medication administration',
    ],
    primaryUse: 'sensitivity_analysis',
    icheCompliance: 'ICH E9: Sensitivity analysis for efficacy endpoints',
  })

  // 3. Safety Analysis Set (SAF)
  sets.push({
    name: 'Safety Analysis Set (SAF)',
    abbreviation: 'SAF',
    description: 'All subjects who received at least one dose of study medication, analyzed according to the treatment actually received.',
    inclusionCriteria: [
      'Received at least one dose of study medication',
    ],
    exclusionCriteria: [
      'Did not receive any study medication',
    ],
    primaryUse: primaryEndpointType === 'safety' ? 'primary_safety' : 'all_safety',
    icheCompliance: 'ICH E9: Primary analysis population for safety endpoints',
  })

  // 4. Modified Intent-to-Treat (mITT) - if run-in period
  if (hasRunIn) {
    sets.push({
      name: 'Modified Intent-to-Treat Set (mITT)',
      abbreviation: 'mITT',
      description: 'All randomized subjects who received at least one dose of study medication during the double-blind treatment period and had at least one post-baseline efficacy assessment.',
      inclusionCriteria: [
        'Randomized to treatment',
        'Received at least one dose during double-blind period',
        'At least one post-baseline efficacy assessment',
      ],
      exclusionCriteria: [
        'Did not receive double-blind medication',
        'No post-baseline efficacy data',
      ],
      primaryUse: 'primary_efficacy',
      icheCompliance: 'ICH E9: Modified ITT for studies with run-in period',
    })
  }

  // 5. Pharmacokinetic Analysis Set (PKS) - if applicable
  sets.push({
    name: 'Pharmacokinetic Analysis Set (PKS)',
    abbreviation: 'PKS',
    description: 'All subjects in the Safety Analysis Set who have evaluable pharmacokinetic data.',
    inclusionCriteria: [
      'Met all SAF criteria',
      'At least one evaluable PK sample',
      'No major PK sampling protocol deviations',
    ],
    exclusionCriteria: [
      'No PK samples collected',
      'All PK samples non-evaluable',
    ],
    primaryUse: 'pharmacokinetics',
    icheCompliance: 'ICH E9: Specialized analysis set for PK endpoints',
  })

  return sets
}

/**
 * Generate analysis set assignment rules
 */
export function generateAssignmentRules(): string {
  return `
## Analysis Set Assignment Rules

### General Principles
1. **Timing of Assignment**: Analysis set membership will be determined and documented before database lock and unblinding.
2. **Independence**: Assignment to analysis sets will be performed independently of treatment allocation and outcome data.
3. **Documentation**: All exclusions from analysis sets will be documented with reasons.

### Hierarchy
- All subjects in PPS are in FAS
- All subjects in FAS are in SAF (with rare exceptions for treatment switches)
- PKS is a subset of SAF

### Protocol Deviations
Major protocol deviations that may affect PPS inclusion:
- Enrollment of ineligible subjects (inclusion/exclusion criteria violations)
- Use of prohibited concomitant medications
- Treatment compliance < 80%
- Incorrect study medication administration
- Missing primary endpoint assessment without valid reason

Minor protocol deviations that do not affect analysis set membership:
- Administrative errors
- Minor visit window deviations (< 7 days)
- Missing secondary endpoint assessments
- Laboratory sample collection timing variations

### Treatment Compliance
- Compliance calculated as: (Number of doses taken / Number of doses prescribed) × 100%
- Compliance ≥ 80% required for PPS inclusion
- Compliance assessed over the entire treatment period
`
}

/**
 * Generate analysis set summary table
 */
export function generateAnalysisSetTable(sets: AnalysisSet[]): string {
  let table = `
| Analysis Set | Abbreviation | Primary Use | ICH E9 Compliance |
|--------------|--------------|-------------|-------------------|
`

  sets.forEach(set => {
    table += `| ${set.name} | ${set.abbreviation} | ${set.primaryUse.replace(/_/g, ' ')} | ${set.icheCompliance} |\n`
  })

  return table
}

/**
 * Generate detailed analysis set descriptions
 */
export function generateDetailedDescriptions(sets: AnalysisSet[]): string {
  let output = '## Analysis Sets - Detailed Definitions\n\n'

  sets.forEach((set, index) => {
    output += `### ${index + 1}. ${set.name} (${set.abbreviation})\n\n`
    output += `**Description**: ${set.description}\n\n`
    
    output += `**Inclusion Criteria**:\n`
    set.inclusionCriteria.forEach(criterion => {
      output += `- ${criterion}\n`
    })
    output += '\n'
    
    output += `**Exclusion Criteria**:\n`
    set.exclusionCriteria.forEach(criterion => {
      output += `- ${criterion}\n`
    })
    output += '\n'
    
    output += `**Primary Use**: ${set.primaryUse.replace(/_/g, ' ')}\n\n`
    output += `**Regulatory Compliance**: ${set.icheCompliance}\n\n`
    output += '---\n\n'
  })

  return output
}

/**
 * Validate analysis sets
 */
export function validateAnalysisSets(sets: AnalysisSet[]): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for required sets
  const abbreviations = sets.map(s => s.abbreviation)
  
  if (!abbreviations.includes('FAS') && !abbreviations.includes('mITT')) {
    errors.push('Either FAS or mITT must be defined as primary efficacy population')
  }

  if (!abbreviations.includes('SAF')) {
    errors.push('Safety Analysis Set (SAF) is required')
  }

  // Check for duplicates
  const uniqueAbbreviations = new Set(abbreviations)
  if (uniqueAbbreviations.size !== abbreviations.length) {
    errors.push('Duplicate analysis set abbreviations found')
  }

  // Check primary use assignments
  const primaryEfficacySets = sets.filter(s => s.primaryUse === 'primary_efficacy')
  if (primaryEfficacySets.length === 0) {
    errors.push('No analysis set designated for primary efficacy analysis')
  } else if (primaryEfficacySets.length > 1) {
    warnings.push('Multiple analysis sets designated for primary efficacy - ensure this is intentional')
  }

  const primarySafetySets = sets.filter(s => s.primaryUse === 'primary_safety' || s.primaryUse === 'all_safety')
  if (primarySafetySets.length === 0) {
    errors.push('No analysis set designated for safety analysis')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
