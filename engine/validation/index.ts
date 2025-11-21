/**
 * Validation Engine
 * 
 * Main validation orchestrator that runs all rules
 */

import type { StructuredDocument } from '../document_store/types'
import type { ValidationResult, ValidationRule, ValidationIssue } from './types'

export class ValidationEngine {
  private rules: ValidationRule[] = []

  constructor() {
    // Rules will be registered in C0.4
  }

  /**
   * Register a validation rule
   */
  registerRule(rule: ValidationRule): void {
    this.rules.push(rule)
  }

  /**
   * Run all validation rules on a document
   */
  async runValidation(document: StructuredDocument): Promise<ValidationResult> {
    const startTime = Date.now()
    const allIssues: ValidationIssue[] = []
    const rulesChecked: string[] = []

    console.log(`🔍 Running validation on document ${document.document_id}`)
    console.log(`   Rules to check: ${this.rules.length}`)

    // Run each rule
    for (const rule of this.rules) {
      if (!rule.enabled) {
        console.log(`   ⏭️  Skipping disabled rule: ${rule.rule_id}`)
        continue
      }

      try {
        console.log(`   ▶️  Checking rule: ${rule.rule_id}`)
        const ruleStartTime = Date.now()
        
        const issues = await rule.check(document)
        
        const ruleDuration = Date.now() - ruleStartTime
        console.log(`   ✅ Rule ${rule.rule_id}: ${issues.length} issues (${ruleDuration}ms)`)
        
        allIssues.push(...issues)
        rulesChecked.push(rule.rule_id)
      } catch (error) {
        console.error(`   ❌ Rule ${rule.rule_id} failed:`, error)
        // Continue with other rules
      }
    }

    // Calculate summary
    const errors = allIssues.filter(i => i.severity === 'error').length
    const warnings = allIssues.filter(i => i.severity === 'warning').length
    const info = allIssues.filter(i => i.severity === 'info').length

    const duration = Date.now() - startTime

    const result: ValidationResult = {
      document_id: document.document_id,
      timestamp: new Date().toISOString(),
      errors,
      warnings,
      info,
      issues: allIssues,
      metadata: {
        rules_checked: rulesChecked,
        duration_ms: duration
      }
    }

    console.log(`✅ Validation complete: ${errors} errors, ${warnings} warnings, ${info} info (${duration}ms)`)

    return result
  }

  /**
   * Get all registered rules
   */
  getRules(): ValidationRule[] {
    return this.rules
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.rule_id === ruleId)
    if (rule) {
      rule.enabled = enabled
    }
  }
}

export * from './types'
