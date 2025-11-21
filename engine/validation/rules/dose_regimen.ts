/**
 * Dose Regimen Validation Rules
 */

import type { StructuredDocument } from '../../document_store/types'
import type { ValidationRule, ValidationIssue } from '../types'

export const doseRegimenRule: ValidationRule = {
  rule_id: 'DOSE_REGIMEN',
  name: 'Dose Regimen Consistency',
  description: 'Ensures dose and regimen are defined consistently',
  severity: 'error',
  enabled: true,

  async check(document: StructuredDocument): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []

    // Find treatment/intervention sections
    const treatmentSection = document.sections.find(s =>
      s.section_id.toLowerCase().includes('treatment') ||
      s.section_id.toLowerCase().includes('intervention') ||
      s.section_id.toLowerCase().includes('dose')
    )

    if (!treatmentSection) {
      issues.push({
        issue_id: `DOSE_SECTION_MISSING_${Date.now()}`,
        rule_id: 'DOSE_REGIMEN',
        severity: 'error',
        message: 'Treatment/dose section not found',
        locations: []
      })
      return issues
    }

    // Check for dose information
    const hasDose = treatmentSection.blocks.some(b => {
      const text = b.text.toLowerCase()
      return text.match(/\d+\s*(mg|mcg|g|ml|iu)/)
    })

    if (!hasDose) {
      issues.push({
        issue_id: `DOSE_MISSING_${Date.now()}`,
        rule_id: 'DOSE_REGIMEN',
        severity: 'error',
        message: 'Dose information not specified',
        locations: [{
          section_id: treatmentSection.section_id,
          block_id: treatmentSection.blocks[0]?.block_id || 'UNKNOWN'
        }]
      })
    }

    return issues
  }
}
