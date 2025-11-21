/**
 * Endpoints Validation Rules
 * 
 * Validates consistency of primary and secondary endpoints
 */

import type { StructuredDocument, DocumentSection } from '../../document_store/types'
import type { ValidationRule, ValidationIssue } from '../types'

/**
 * Check that primary endpoint is defined and consistent
 */
export const primaryEndpointRule: ValidationRule = {
  rule_id: 'PRIMARY_ENDPOINT',
  name: 'Primary Endpoint Consistency',
  description: 'Ensures primary endpoint is defined in objectives and matches across sections',
  severity: 'error',
  enabled: true,

  async check(document: StructuredDocument): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []

    // Find sections that should mention endpoints
    const objectivesSection = findSection(document, ['objectives', 'objective', 'obj'])
    const endpointsSection = findSection(document, ['endpoints', 'endpoint', 'outcomes'])
    const statisticsSection = findSection(document, ['statistics', 'statistical', 'analysis'])

    // Check if primary endpoint is mentioned
    const sections = [objectivesSection, endpointsSection, statisticsSection].filter(Boolean)
    
    if (sections.length === 0) {
      return issues // No relevant sections found
    }

    // Extract primary endpoint mentions
    const primaryMentions: Array<{ section: DocumentSection; blockId: string; text: string }> = []

    for (const section of sections) {
      if (!section) continue

      for (const block of section.blocks) {
        const text = block.text.toLowerCase()
        if (text.includes('primary endpoint') || text.includes('primary outcome')) {
          primaryMentions.push({
            section,
            blockId: block.block_id,
            text: block.text
          })
        }
      }
    }

    // If no primary endpoint found, that's an error
    if (primaryMentions.length === 0) {
      issues.push({
        issue_id: `PRIMARY_ENDPOINT_MISSING_${Date.now()}`,
        rule_id: 'PRIMARY_ENDPOINT',
        severity: 'error',
        message: 'Primary endpoint not defined. All clinical documents must specify a primary endpoint.',
        locations: sections.map(s => ({
          section_id: s!.section_id,
          block_id: s!.blocks[0]?.block_id || 'UNKNOWN'
        })),
        metadata: {
          expected_sections: ['objectives', 'endpoints', 'statistics']
        }
      })
    }

    // Check consistency across sections
    if (primaryMentions.length > 1) {
      // Extract endpoint descriptions
      const descriptions = primaryMentions.map(m => {
        const match = m.text.match(/primary (?:endpoint|outcome)[:\s]+([^.]+)/i)
        return match ? match[1].trim().toLowerCase() : ''
      })

      // Check if all descriptions are similar
      const unique = [...new Set(descriptions)]
      if (unique.length > 1 && unique.some(d => d.length > 0)) {
        issues.push({
          issue_id: `PRIMARY_ENDPOINT_INCONSISTENT_${Date.now()}`,
          rule_id: 'PRIMARY_ENDPOINT',
          severity: 'warning',
          message: 'Primary endpoint definition varies across sections. Ensure consistent wording.',
          locations: primaryMentions.map(m => ({
            section_id: m.section.section_id,
            block_id: m.blockId
          })),
          metadata: {
            found_definitions: descriptions
          }
        })
      }
    }

    return issues
  }
}

/**
 * Helper: Find section by possible IDs
 */
function findSection(document: StructuredDocument, possibleIds: string[]): DocumentSection | null {
  for (const section of document.sections) {
    const sectionIdLower = section.section_id.toLowerCase()
    if (possibleIds.some(id => sectionIdLower.includes(id))) {
      return section
    }
  }
  return null
}
