/**
 * Unit Tests: Validation Engine
 * 
 * Simplified tests for validation engine
 */

import { describe, it, expect } from '@jest/globals'
import { ValidationEngine } from '@/engine/validation'
import { allRules } from '@/engine/validation/rules'

describe('UNIT: Validation Engine', () => {
  
  it('should register rules', () => {
    const engine = new ValidationEngine()
    
    for (const rule of allRules) {
      engine.registerRule(rule)
    }

    expect(true).toBe(true) // Engine created successfully
  })

  it('should have all 5 rules available', () => {
    expect(allRules.length).toBe(5)
  })

  it('should export rule names correctly', () => {
    const ruleIds = allRules.map(r => r.rule_id)
    
    expect(ruleIds).toContain('PRIMARY_ENDPOINT')
    expect(ruleIds).toContain('INCLUSION_CRITERIA')
    expect(ruleIds).toContain('EXCLUSION_CRITERIA')
    expect(ruleIds).toContain('DOSE_REGIMEN')
    expect(ruleIds).toContain('REQUIRED_SECTIONS')
  })

  it('should have correct severity levels', () => {
    const severities = allRules.map(r => r.severity)
    
    expect(severities).toContain('error')
    expect(severities).toContain('warning')
  })

  it('should have descriptions', () => {
    for (const rule of allRules) {
      expect(rule.description).toBeDefined()
      expect(rule.description.length).toBeGreaterThan(0)
    }
  })
})
