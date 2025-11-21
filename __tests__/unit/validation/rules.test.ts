/**
 * Unit Tests: Validation Rules
 * 
 * Tests individual validation rules through ValidationEngine
 */

import { describe, it, expect } from '@jest/globals'
import { ValidationEngine } from '@/engine/validation'
import { primaryEndpointRule } from '@/engine/validation/rules/endpoints'
import { inclusionCriteriaRule, exclusionCriteriaRule } from '@/engine/validation/rules/criteria'
import { doseRegimenRule } from '@/engine/validation/rules/dose_regimen'
import { requiredSectionsRule } from '@/engine/validation/rules/structure'
import type { StructuredDocument } from '@/engine/document_store/types'

describe('UNIT-VAL: Validation Rules', () => {
  
  describe('UNIT-VAL-01: Structure Rule', () => {
    it('should error when required section is missing', async () => {
      const doc: StructuredDocument = {
        document_id: 'test-1',
        type: 'Protocol',
        sections: [
          {
            section_id: 'INTRO',
            title: 'Introduction',
            order_index: 0,
            blocks: [
              { block_id: 'INTRO_P1', type: 'paragraph', text: 'Test intro' }
            ]
          }
        ],
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const engine = new ValidationEngine()
      engine.registerRule(requiredSectionsRule)
      const result = await engine.runValidation(doc)

      expect(result.errors).toBeGreaterThan(0)
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.issues[0].severity).toBe('error')
    })

    it('should pass when all required sections present', async () => {
      const doc: StructuredDocument = {
        document_id: 'test-2',
        type: 'Protocol',
        sections: [
          { section_id: 'OBJECTIVES', title: 'Objectives', order_index: 0, blocks: [{ block_id: 'OBJ_P1', type: 'paragraph', text: 'Primary objective' }] },
          { section_id: 'DESIGN', title: 'Study Design', order_index: 1, blocks: [{ block_id: 'DES_P1', type: 'paragraph', text: 'Randomized' }] },
          { section_id: 'POPULATION', title: 'Population', order_index: 2, blocks: [{ block_id: 'POP_P1', type: 'paragraph', text: 'Adults' }] },
          { section_id: 'ENDPOINTS', title: 'Endpoints', order_index: 3, blocks: [{ block_id: 'END_P1', type: 'paragraph', text: 'Primary endpoint' }] },
          { section_id: 'STATISTICS', title: 'Statistics', order_index: 4, blocks: [{ block_id: 'STAT_P1', type: 'paragraph', text: 'Analysis' }] }
        ],
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const engine = new ValidationEngine()
      engine.registerRule(requiredSectionsRule)
      const result = await engine.runValidation(doc)

      expect(result.errors).toBe(0)
      expect(result.issues.length).toBe(0)
    })
  })

  describe('UNIT-VAL-02: Endpoint Consistency', () => {
    it('should error when primary endpoint missing', async () => {
      const doc: StructuredDocument = {
        document_id: 'test-3',
        type: 'Protocol',
        sections: [
          {
            section_id: 'OBJECTIVES',
            title: 'Objectives',
            blocks: [
              { block_id: 'OBJ_P1', type: 'paragraph', text: 'To evaluate safety' }
            ]
          }
        ],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const result = await primaryEndpointRule.validate(doc)

      expect(result.passed).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
    })

    it('should pass when primary endpoint present', async () => {
      const doc: StructuredDocument = {
        document_id: 'test-4',
        type: 'Protocol',
        sections: [
          {
            section_id: 'OBJECTIVES',
            title: 'Objectives',
            blocks: [
              { block_id: 'OBJ_P1', type: 'paragraph', text: 'The primary endpoint is change in HbA1c' }
            ]
          },
          {
            section_id: 'ENDPOINTS',
            title: 'Endpoints',
            blocks: [
              { block_id: 'END_P1', type: 'paragraph', text: 'Primary endpoint: change in HbA1c from baseline' }
            ]
          }
        ],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const result = await primaryEndpointRule.validate(doc)

      expect(result.passed).toBe(true)
      expect(result.issues.length).toBe(0)
    })
  })

  describe('UNIT-VAL-03: Inclusion Criteria', () => {
    it('should error when inclusion criteria missing', async () => {
      const doc: StructuredDocument = {
        document_id: 'test-5',
        type: 'Protocol',
        sections: [
          {
            section_id: 'ELIGIBILITY',
            title: 'Eligibility',
            blocks: [
              { block_id: 'ELIG_P1', type: 'paragraph', text: 'Patients will be screened' }
            ]
          }
        ],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const result = await inclusionCriteriaRule.validate(doc)

      expect(result.passed).toBe(false)
      expect(result.issues[0].severity).toBe('error')
    })

    it('should pass when inclusion criteria present', async () => {
      const doc: StructuredDocument = {
        document_id: 'test-6',
        type: 'Protocol',
        sections: [
          {
            section_id: 'ELIGIBILITY',
            title: 'Eligibility',
            blocks: [
              { block_id: 'ELIG_P1', type: 'paragraph', text: 'Inclusion criteria: Age 18-65 years, diagnosed with Type 2 Diabetes' }
            ]
          }
        ],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const result = await inclusionCriteriaRule.validate(doc)

      expect(result.passed).toBe(true)
    })
  })

  describe('UNIT-VAL-04: Dose Regimen', () => {
    it('should error when dose information missing', async () => {
      const doc: StructuredDocument = {
        document_id: 'test-7',
        type: 'Protocol',
        sections: [
          {
            section_id: 'TREATMENT',
            title: 'Treatment',
            blocks: [
              { block_id: 'TREAT_P1', type: 'paragraph', text: 'Patients will receive study drug' }
            ]
          }
        ],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const result = await doseRegimenRule.validate(doc)

      expect(result.passed).toBe(false)
    })

    it('should pass when dose information present', async () => {
      const doc: StructuredDocument = {
        document_id: 'test-8',
        type: 'Protocol',
        sections: [
          {
            section_id: 'TREATMENT',
            title: 'Treatment',
            blocks: [
              { block_id: 'TREAT_P1', type: 'paragraph', text: 'Patients will receive 10mg once daily' }
            ]
          }
        ],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const result = await doseRegimenRule.validate(doc)

      expect(result.passed).toBe(true)
    })
  })

  describe('UNIT-VAL-05: Exclusion Criteria', () => {
    it('should warn when exclusion criteria missing', async () => {
      const doc: StructuredDocument = {
        document_id: 'test-9',
        type: 'Protocol',
        sections: [
          {
            section_id: 'ELIGIBILITY',
            title: 'Eligibility',
            blocks: [
              { block_id: 'ELIG_P1', type: 'paragraph', text: 'Patients will be screened' }
            ]
          }
        ],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const result = await exclusionCriteriaRule.validate(doc)

      expect(result.passed).toBe(false)
      expect(result.issues[0].severity).toBe('warning')
    })
  })
})
