/**
 * Document Structure Validation Rules
 */

import type { StructuredDocument } from '../../document_store/types'
import type { ValidationRule, ValidationIssue } from '../types'

export const requiredSectionsRule: ValidationRule = {
  rule_id: 'REQUIRED_SECTIONS',
  name: 'Required Sections Present',
  description: 'Ensures all required sections are present',
  severity: 'error',
  enabled: true,

  async check(document: StructuredDocument): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []

    // Define required sections by document type
    const requiredSections: Record<string, string[]> = {
      'Protocol': ['synopsis', 'objectives', 'design', 'population', 'endpoints', 'statistics'],
      'IB': ['summary', 'pharmacology', 'toxicology', 'clinical', 'references'],
      'ICF': ['introduction', 'procedures', 'risks', 'benefits', 'confidentiality', 'consent'],
      'CSR': ['synopsis', 'introduction', 'objectives', 'methods', 'results', 'conclusions']
    }

    const required = requiredSections[document.type] || []
    const presentSections = document.sections.map(s => s.section_id.toLowerCase())

    for (const reqSection of required) {
      const found = presentSections.some(s => s.includes(reqSection))
      
      if (!found) {
        issues.push({
          issue_id: `SECTION_MISSING_${reqSection}_${Date.now()}`,
          rule_id: 'REQUIRED_SECTIONS',
          severity: 'error',
          message: `Required section missing: ${reqSection}`,
          locations: [],
          metadata: {
            missing_section: reqSection,
            document_type: document.type
          }
        })
      }
    }

    return issues
  }
}
