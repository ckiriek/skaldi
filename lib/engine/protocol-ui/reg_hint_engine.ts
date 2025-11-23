/**
 * Phase H.UI v3: Regulatory Hints Engine
 * 
 * Provides regulatory and quality hints for protocol sections
 */

import type { ProtocolSectionId } from './section_schema'

export interface RegHint {
  id: string
  sectionId: ProtocolSectionId
  severity: 'info' | 'warning' | 'critical'
  message: string
  suggestion?: string
  ruleId?: string
}

/**
 * Generate regulatory hints for a section
 */
export function generateRegHints(
  sectionId: ProtocolSectionId,
  sectionText: string,
  projectData?: any
): RegHint[] {
  const hints: RegHint[] = []
  
  // Get section-specific rules
  const rules = SECTION_RULES[sectionId] || []
  
  for (const rule of rules) {
    const hint = rule.check(sectionText, projectData)
    if (hint) {
      hints.push({
        id: `hint-${sectionId}-${rule.id}`,
        sectionId,
        severity: rule.severity,
        message: hint.message,
        suggestion: hint.suggestion,
        ruleId: rule.id
      })
    }
  }
  
  return hints
}

/**
 * Rule definition
 */
interface Rule {
  id: string
  severity: 'info' | 'warning' | 'critical'
  check: (text: string, projectData?: any) => { message: string; suggestion?: string } | null
}

/**
 * Section-specific rules
 */
const SECTION_RULES: Record<ProtocolSectionId, Rule[]> = {
  'objectives': [
    {
      id: 'obj-primary-defined',
      severity: 'critical',
      check: (text) => {
        if (!text.toLowerCase().includes('primary objective')) {
          return {
            message: 'Primary objective must be explicitly stated',
            suggestion: 'Add a clear statement of the primary objective'
          }
        }
        return null
      }
    }
  ],
  'endpoints': [
    {
      id: 'ep-primary-defined',
      severity: 'critical',
      check: (text) => {
        if (!text.toLowerCase().includes('primary endpoint')) {
          return {
            message: 'Primary endpoint must be explicitly defined',
            suggestion: 'Define the primary endpoint with measurement method and timepoint'
          }
        }
        return null
      }
    },
    {
      id: 'ep-timepoint',
      severity: 'warning',
      check: (text) => {
        const hasTimepoint = /week|day|month|year/i.test(text)
        if (!hasTimepoint) {
          return {
            message: 'Endpoint timepoint should be specified',
            suggestion: 'Add timepoint (e.g., "at Week 24")'
          }
        }
        return null
      }
    }
  ],
  'eligibility': [
    {
      id: 'elig-inclusion',
      severity: 'critical',
      check: (text) => {
        if (!text.toLowerCase().includes('inclusion')) {
          return {
            message: 'Inclusion criteria must be specified',
            suggestion: 'Add inclusion criteria section'
          }
        }
        return null
      }
    },
    {
      id: 'elig-exclusion',
      severity: 'critical',
      check: (text) => {
        if (!text.toLowerCase().includes('exclusion')) {
          return {
            message: 'Exclusion criteria must be specified',
            suggestion: 'Add exclusion criteria section'
          }
        }
        return null
      }
    }
  ],
  'safety_assessments': [
    {
      id: 'safety-ae-reporting',
      severity: 'critical',
      check: (text) => {
        const hasAE = text.toLowerCase().includes('adverse event')
        if (!hasAE) {
          return {
            message: 'Adverse event reporting must be described',
            suggestion: 'Add AE/SAE reporting procedures'
          }
        }
        return null
      }
    },
    {
      id: 'safety-sae',
      severity: 'warning',
      check: (text) => {
        const hasSAE = text.toLowerCase().includes('serious adverse event')
        if (!hasSAE) {
          return {
            message: 'SAE reporting should be explicitly mentioned',
            suggestion: 'Add SAE definition and reporting timeline'
          }
        }
        return null
      }
    }
  ],
  'statistics': [
    {
      id: 'stats-sample-size',
      severity: 'critical',
      check: (text) => {
        const hasSampleSize = /sample size|sample calculation/i.test(text)
        if (!hasSampleSize) {
          return {
            message: 'Sample size calculation must be included',
            suggestion: 'Add sample size justification with assumptions'
          }
        }
        return null
      }
    },
    {
      id: 'stats-alpha',
      severity: 'warning',
      check: (text) => {
        const hasAlpha = /alpha|type i error|significance level/i.test(text)
        if (!hasAlpha) {
          return {
            message: 'Type I error rate (alpha) should be specified',
            suggestion: 'Specify alpha level (typically 0.05)'
          }
        }
        return null
      }
    }
  ],
  // Default empty rules for other sections
  'title': [],
  'synopsis': [],
  'study_design': [],
  'study_population': [],
  'treatments': [],
  'study_flow': [],
  'efficacy_assessments': [],
  'admin': [],
  'ethics': [],
  'icf_summary': []
}
