/**
 * Inclusion/Exclusion Criteria Validation Rules
 */

import type { StructuredDocument } from '../../document_store/types'
import type { ValidationRule, ValidationIssue } from '../types'

export const inclusionCriteriaRule: ValidationRule = {
  rule_id: 'INCLUSION_CRITERIA',
  name: 'Inclusion Criteria Presence',
  description: 'Ensures inclusion criteria are defined',
  severity: 'error',
  enabled: true,

  async check(document: StructuredDocument): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []

    // Find eligibility section
    const eligibilitySection = document.sections.find(s =>
      s.section_id.toLowerCase().includes('eligibility') ||
      s.section_id.toLowerCase().includes('criteria') ||
      s.section_id.toLowerCase().includes('population')
    )

    if (!eligibilitySection) {
      issues.push({
        issue_id: `ELIGIBILITY_SECTION_MISSING_${Date.now()}`,
        rule_id: 'INCLUSION_CRITERIA',
        severity: 'error',
        message: 'Eligibility criteria section not found',
        locations: []
      })
      return issues
    }

    // Check for inclusion criteria
    const hasInclusion = eligibilitySection.blocks.some(b =>
      b.text.toLowerCase().includes('inclusion')
    )

    if (!hasInclusion) {
      issues.push({
        issue_id: `INCLUSION_MISSING_${Date.now()}`,
        rule_id: 'INCLUSION_CRITERIA',
        severity: 'error',
        message: 'Inclusion criteria not defined',
        locations: [{
          section_id: eligibilitySection.section_id,
          block_id: eligibilitySection.blocks[0]?.block_id || 'UNKNOWN'
        }]
      })
    }

    return issues
  }
}

export const exclusionCriteriaRule: ValidationRule = {
  rule_id: 'EXCLUSION_CRITERIA',
  name: 'Exclusion Criteria Presence',
  description: 'Ensures exclusion criteria are defined',
  severity: 'warning',
  enabled: true,

  async check(document: StructuredDocument): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []

    const eligibilitySection = document.sections.find(s =>
      s.section_id.toLowerCase().includes('eligibility') ||
      s.section_id.toLowerCase().includes('criteria')
    )

    if (!eligibilitySection) {
      return issues
    }

    const hasExclusion = eligibilitySection.blocks.some(b =>
      b.text.toLowerCase().includes('exclusion')
    )

    if (!hasExclusion) {
      issues.push({
        issue_id: `EXCLUSION_MISSING_${Date.now()}`,
        rule_id: 'EXCLUSION_CRITERIA',
        severity: 'warning',
        message: 'Exclusion criteria not defined',
        locations: [{
          section_id: eligibilitySection.section_id,
          block_id: eligibilitySection.blocks[0]?.block_id || 'UNKNOWN'
        }]
      })
    }

    return issues
  }
}
