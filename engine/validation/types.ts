/**
 * Validation Engine Types
 * 
 * Types for validation results, issues, and suggestions
 */

import type { BlockLocation } from '../document_store/types'

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  issue_id: string
  rule_id: string
  severity: ValidationSeverity
  message: string
  locations: BlockLocation[]
  suggestions?: ValidationSuggestion[]
  metadata?: Record<string, any>
}

export interface ValidationSuggestion {
  suggestion_id: string
  description: string
  block_id: string
  original_text: string
  suggested_text: string
  confidence: number // 0-1
  auto_applicable: boolean
}

export interface ValidationResult {
  document_id: string
  timestamp: string
  errors: number
  warnings: number
  info: number
  issues: ValidationIssue[]
  metadata?: {
    rules_checked: string[]
    duration_ms: number
    [key: string]: any
  }
}

// ============================================================================
// RULE TYPES
// ============================================================================

export interface ValidationRule {
  rule_id: string
  name: string
  description: string
  severity: ValidationSeverity
  enabled: boolean
  check: (document: any) => Promise<ValidationIssue[]>
}

export interface RuleResult {
  rule_id: string
  issues: ValidationIssue[]
  duration_ms: number
}
