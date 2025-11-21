/**
 * E2E Integration Test (Simplified)
 * 
 * Tests basic integration without full workflow
 */

import { describe, it, expect } from '@jest/globals'
import { ValidationEngine } from '@/engine/validation'
import { allRules } from '@/engine/validation/rules'
import { DocumentStore } from '@/engine/document_store'
import type { StructuredDocument } from '@/engine/document_store/types'

describe('E2E: Integration Tests', () => {
  
  it('ValidationEngine can run with all rules', async () => {
    const engine = new ValidationEngine()
    
    for (const rule of allRules) {
      engine.registerRule(rule)
    }

    // Create minimal test document
    const doc: StructuredDocument = {
      document_id: 'test-integration',
      type: 'Protocol',
      sections: [],
      metadata: {}
    }

    const result = await engine.runValidation(doc)

    expect(result).toBeDefined()
    expect(result.document_id).toBe('test-integration')
    expect(typeof result.errors).toBe('number')
    expect(typeof result.warnings).toBe('number')
    expect(Array.isArray(result.issues)).toBe(true)
  })

  it('DocumentStore class exists', () => {
    expect(DocumentStore).toBeDefined()
    expect(typeof DocumentStore).toBe('function')
  })

  it('All validation rules have required properties', () => {
    for (const rule of allRules) {
      expect(rule.rule_id).toBeDefined()
      expect(rule.description).toBeDefined()
      expect(rule.severity).toBeDefined()
      expect(typeof rule.check).toBe('function')
    }
  })

  it('Validation result has correct structure', async () => {
    const engine = new ValidationEngine()
    engine.registerRule(allRules[0])

    const doc: StructuredDocument = {
      document_id: 'test-structure',
      type: 'Protocol',
      sections: [],
      metadata: {}
    }

    const result = await engine.runValidation(doc)

    expect(result).toHaveProperty('document_id')
    expect(result).toHaveProperty('errors')
    expect(result).toHaveProperty('warnings')
    expect(result).toHaveProperty('issues')
    expect(result.metadata).toHaveProperty('duration_ms')
  })
})
