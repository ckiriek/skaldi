/**
 * QC Validator Service
 * 
 * Responsible for:
 * 1. Loading regulatory rules from DB
 * 2. Running validation checks on generated content
 * 3. Returning structured validation results
 */

import { createClient } from '@/lib/supabase/server'

export interface ValidationRule {
  id: string
  rule_type: 'presence' | 'consistency' | 'terminology' | 'custom'
  rule_definition: Record<string, any>
  logic_expression?: string
  severity: 'error' | 'warning' | 'info'
  error_message: string
}

export interface ValidationResult {
  passed: boolean
  issues: Array<{
    section_id?: string
    rule_id: string
    severity: 'error' | 'warning' | 'info'
    message: string
  }>
}

export class QCValidator {
  /**
   * Validate generated document sections
   */
  async validate(
    documentType: string,
    sections: Record<string, string>
  ): Promise<ValidationResult> {
    console.log(`🔍 QC Validator: Starting validation for ${documentType}`)

    const supabase = await createClient()

    // Normalize to lowercase to match database convention
    const normalizedType = documentType.toLowerCase()

    // 1. Fetch rules for this document type
    const { data: rules, error } = await supabase
      .from('regulatory_rules')
      .select('*')
      .eq('document_type_id', normalizedType)

    if (error) {
      console.error('Error fetching rules:', error)
      return {
        passed: false,
        issues: [{
          rule_id: 'system',
          severity: 'error',
          message: 'Failed to load validation rules'
        }]
      }
    }

    if (!rules || rules.length === 0) {
      console.log('⚠️ No validation rules defined for this document type')
      return { passed: true, issues: [] }
    }

    // 2. Run each rule
    const issues: ValidationResult['issues'] = []

    for (const rule of rules) {
      const ruleIssues = this.applyRule(rule, sections)
      issues.push(...ruleIssues)
    }

    // 3. Determine overall pass/fail
    const hasErrors = issues.some(i => i.severity === 'error')

    console.log(`✅ QC Validator: Found ${issues.length} issues (${hasErrors ? 'FAILED' : 'PASSED'})`)

    return {
      passed: !hasErrors,
      issues
    }
  }

  /**
   * Apply a single validation rule
   */
  private applyRule(
    rule: any,
    sections: Record<string, string>
  ): ValidationResult['issues'] {
    const issues: ValidationResult['issues'] = []

    switch (rule.rule_type) {
      case 'presence':
        // Check if required section exists and is not empty
        const targetSection = rule.rule_definition?.target
        if (targetSection) {
          const content = sections[targetSection]
          if (!content || content.trim().length === 0) {
            issues.push({
              section_id: targetSection,
              rule_id: rule.id,
              severity: rule.severity,
              message: rule.error_message || `Required section "${targetSection}" is missing or empty`
            })
          }
        }
        break

      case 'consistency':
        // Check consistency between sections (e.g., objectives match endpoints)
        // This is complex - for now, just log
        console.log(`⚠️ Consistency check not yet implemented for rule ${rule.id}`)
        break

      case 'terminology':
        // Check for forbidden terms or required terms
        // Placeholder
        console.log(`⚠️ Terminology check not yet implemented for rule ${rule.id}`)
        break

      case 'custom':
        // Execute custom logic_expression
        if (rule.logic_expression) {
          try {
            // Very basic eval (DANGEROUS in production - use sandboxed VM)
            // For now, just check length as example
            if (rule.logic_expression.includes('length')) {
              const targetSection = rule.section_id
              if (targetSection && sections[targetSection]) {
                const content = sections[targetSection]
                const minLength = 100 // Extract from expression in real impl
                if (content.length < minLength) {
                  issues.push({
                    section_id: targetSection,
                    rule_id: rule.id,
                    severity: rule.severity,
                    message: rule.error_message || `Section too short`
                  })
                }
              }
            }
          } catch (error) {
            console.error(`Error executing custom rule ${rule.id}:`, error)
          }
        }
        break
    }

    return issues
  }
}

// Export singleton
export const qcValidator = new QCValidator()
