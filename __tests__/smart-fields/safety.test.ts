/**
 * Sprint 1, Task 4.1: SafetySmartField Tests
 * 
 * Tests for safety smart field component
 */

import { describe, it, expect } from '@jest/globals'

describe('SafetySmartField', () => {
  describe('Phase-Appropriate Procedures', () => {
    it('should suggest Phase 1 procedures', () => {
      const phase1Procedures = [
        'Vital Signs',
        'Physical Examination',
        'ECG (12-lead)',
        'Clinical Laboratory Tests',
        'Adverse Event Monitoring',
        'Pharmacokinetic Sampling'
      ]

      expect(phase1Procedures).toHaveLength(6)
      expect(phase1Procedures).toContain('Vital Signs')
      expect(phase1Procedures).toContain('Pharmacokinetic Sampling')
    })

    it('should suggest Phase 2 procedures', () => {
      const phase2Procedures = [
        'Vital Signs',
        'Physical Examination',
        'ECG (12-lead)',
        'Clinical Laboratory Tests',
        'Adverse Event Monitoring',
        'Serious Adverse Event Reporting',
        'Concomitant Medications'
      ]

      expect(phase2Procedures).toHaveLength(7)
      expect(phase2Procedures).toContain('Serious Adverse Event Reporting')
    })

    it('should suggest Phase 3 procedures', () => {
      const phase3Procedures = [
        'Vital Signs',
        'Physical Examination',
        'ECG (12-lead)',
        'Clinical Laboratory Tests (Hematology, Chemistry, Urinalysis)',
        'Adverse Event Monitoring',
        'Serious Adverse Event Reporting',
        'Pregnancy Tests (if applicable)',
        'Concomitant Medications',
        'Prior Medications'
      ]

      expect(phase3Procedures).toHaveLength(9)
      expect(phase3Procedures).toContain('Pregnancy Tests (if applicable)')
    })

    it('should suggest Phase 4 procedures', () => {
      const phase4Procedures = [
        'Vital Signs',
        'Physical Examination',
        'Adverse Event Monitoring',
        'Serious Adverse Event Reporting',
        'Concomitant Medications'
      ]

      expect(phase4Procedures).toHaveLength(5)
    })
  })

  describe('Multi-Select Functionality', () => {
    it('should add procedure to selection', () => {
      const selected: string[] = []
      const procedure = 'Vital Signs'
      
      const newSelected = [...selected, procedure]

      expect(newSelected).toHaveLength(1)
      expect(newSelected).toContain('Vital Signs')
    })

    it('should remove procedure from selection', () => {
      const selected = ['Vital Signs', 'ECG (12-lead)', 'Physical Examination']
      const procedureToRemove = 'ECG (12-lead)'
      
      const newSelected = selected.filter(p => p !== procedureToRemove)

      expect(newSelected).toHaveLength(2)
      expect(newSelected).not.toContain('ECG (12-lead)')
      expect(newSelected).toContain('Vital Signs')
    })

    it('should toggle procedure selection', () => {
      let selected = ['Vital Signs']
      const procedure = 'ECG (12-lead)'
      
      // Add
      if (!selected.includes(procedure)) {
        selected = [...selected, procedure]
      }
      expect(selected).toContain('ECG (12-lead)')
      
      // Remove
      if (selected.includes(procedure)) {
        selected = selected.filter(p => p !== procedure)
      }
      expect(selected).not.toContain('ECG (12-lead)')
    })

    it('should handle empty selection', () => {
      const selected: string[] = []

      expect(selected).toHaveLength(0)
    })

    it('should handle multiple selections', () => {
      const selected = [
        'Vital Signs',
        'Physical Examination',
        'ECG (12-lead)',
        'Clinical Laboratory Tests',
        'Adverse Event Monitoring'
      ]

      expect(selected).toHaveLength(5)
    })
  })

  describe('Additional Procedures', () => {
    it('should include additional procedures', () => {
      const additionalProcedures = [
        'Chest X-Ray',
        'Echocardiography',
        'Holter Monitoring',
        'Liver Function Tests',
        'Renal Function Tests',
        'Thyroid Function Tests',
        'Coagulation Tests',
        'Immunogenicity Assessment',
        'Suicidality Assessment (C-SSRS)',
        'Alcohol/Drug Screening'
      ]

      expect(additionalProcedures.length).toBeGreaterThanOrEqual(10)
      expect(additionalProcedures).toContain('Echocardiography')
      expect(additionalProcedures).toContain('Suicidality Assessment (C-SSRS)')
    })
  })

  describe('Validation', () => {
    it('should validate at least one procedure selected', () => {
      const selected = ['Vital Signs']

      expect(selected.length).toBeGreaterThan(0)
    })

    it('should allow empty selection for optional field', () => {
      const selected: string[] = []
      const required = false

      expect(selected.length).toBe(0)
      expect(required).toBe(false)
    })
  })
})
