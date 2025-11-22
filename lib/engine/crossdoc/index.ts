/**
 * Cross-Document Intelligence Engine
 * Main entry point for cross-document validation
 */

export * from './types'
export * from './loaders'
export * from './alignment'
export * from './rules'
export * from './autofix'
export * from './changelog/change_tracker'

import type {
  CrossDocBundle,
  CrossDocIssue,
  CrossDocRule,
  CrossDocRuleContext,
  CrossDocAlignments,
  CrossDocValidationResult,
  CrossDocCategory,
} from './types'

/**
 * Cross-Document Engine
 * Validates consistency across multiple clinical documents
 */
export class CrossDocEngine {
  constructor(private rules: CrossDocRule[]) {}

  /**
   * Create engine with default rules
   */
  static createDefault(): CrossDocEngine {
    const { allCrossDocRules } = require('./rules')
    return new CrossDocEngine(allCrossDocRules)
  }

  /**
   * Run validation on document bundle
   */
  async run(bundle: CrossDocBundle): Promise<CrossDocValidationResult> {
    // Build alignments
    const alignments = await buildAlignments(bundle)

    // Create context
    const ctx: CrossDocRuleContext = { bundle, alignments }

    // Run all rules
    const issues: CrossDocIssue[] = []
    for (const rule of this.rules) {
      try {
        const ruleIssues = await rule(ctx)
        issues.push(...ruleIssues)
      } catch (error) {
        console.error('Rule execution error:', error)
      }
    }

    // Build result
    return buildValidationResult(issues)
  }
}

import { buildAlignments } from './alignment'

/**
 * Build validation result with summary
 */
function buildValidationResult(issues: CrossDocIssue[]): CrossDocValidationResult {
  const summary = {
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    error: issues.filter(i => i.severity === 'error').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
  }

  const byCategory: Record<CrossDocCategory, CrossDocIssue[]> = {
    IB_PROTOCOL: [],
    PROTOCOL_ICF: [],
    PROTOCOL_SAP: [],
    PROTOCOL_CSR: [],
    SAP_CSR: [],
    GLOBAL: [],
  }

  issues.forEach(issue => {
    if (issue.category) {
      byCategory[issue.category].push(issue)
    }
  })

  return {
    issues,
    summary,
    byCategory,
  }
}

/**
 * Version
 */
export const CROSSDOC_ENGINE_VERSION = '1.0.0'
