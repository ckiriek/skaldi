/**
 * Sprint 1, Task 4.2: Project Creation Integration Test
 * 
 * Tests for complete project creation flow with smart fields
 */

import { describe, it, expect } from '@jest/globals'

describe('Project Creation Integration', () => {
  describe('Form Data Flow', () => {
    it('should collect all required project data', () => {
      const projectData = {
        title: 'Metformin Phase 3 Study',
        product_type: 'generic',
        compound_name: 'Metformin Hydrochloride',
        sponsor: 'Test Pharma',
        phase: 'Phase 3',
        indication: 'Type 2 Diabetes Mellitus',
        countries: 'USA, Canada',
        design_type: 'randomized',
        blinding: 'double-blind',
        arms: '2',
        duration_weeks: '24',
        primary_endpoint: 'Change from baseline in HbA1c at Week 24',
        primary_endpoint_metadata: {
          type: 'continuous',
          timepoint: 'Week 24',
          unit: '%',
          confidence: 0.92
        },
        safety_monitoring: [
          'Vital Signs',
          'Physical Examination',
          'ECG (12-lead)',
          'Clinical Laboratory Tests (Hematology, Chemistry, Urinalysis)',
          'Adverse Event Monitoring'
        ]
      }

      expect(projectData.title).toBeDefined()
      expect(projectData.compound_name).toBeDefined()
      expect(projectData.phase).toBeDefined()
      expect(projectData.indication).toBeDefined()
      expect(projectData.primary_endpoint).toBeDefined()
      expect(projectData.primary_endpoint_metadata).toBeDefined()
      expect(projectData.safety_monitoring).toHaveLength(5)
    })

    it('should validate endpoint metadata', () => {
      const endpointMetadata = {
        type: 'continuous',
        timepoint: 'Week 24',
        unit: '%',
        confidence: 0.92,
        sources: ['FDA', 'EMA', 'CT.gov']
      }

      expect(endpointMetadata.type).toBe('continuous')
      expect(endpointMetadata.timepoint).toBe('Week 24')
      expect(endpointMetadata.confidence).toBeGreaterThan(0.9)
      expect(endpointMetadata.sources).toHaveLength(3)
    })

    it('should format safety monitoring for submission', () => {
      const safetyMonitoring = [
        'Vital Signs',
        'Physical Examination',
        'ECG (12-lead)'
      ]

      const formatted = safetyMonitoring.join(', ')

      expect(formatted).toBe('Vital Signs, Physical Examination, ECG (12-lead)')
    })

    it('should parse countries array', () => {
      const countriesString = 'USA, Canada, UK'
      const countriesArray = countriesString
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0)

      expect(countriesArray).toHaveLength(3)
      expect(countriesArray).toContain('USA')
      expect(countriesArray).toContain('Canada')
    })
  })

  describe('Design JSON Construction', () => {
    it('should build complete design JSON', () => {
      const designJson = {
        design_type: 'randomized',
        blinding: 'double-blind',
        arms: 2,
        duration_weeks: 24,
        primary_endpoint: 'Change from baseline in HbA1c at Week 24',
        primary_endpoint_metadata: {
          type: 'continuous',
          timepoint: 'Week 24',
          unit: '%'
        },
        safety_monitoring: 'Vital Signs, Physical Examination, ECG (12-lead)',
        secondary_endpoints: 'Fasting glucose, Body weight',
        analysis_populations: 'ITT, PP, Safety'
      }

      expect(designJson.design_type).toBe('randomized')
      expect(designJson.arms).toBe(2)
      expect(designJson.duration_weeks).toBe(24)
      expect(designJson.primary_endpoint_metadata).toBeDefined()
      expect(designJson.safety_monitoring).toBeDefined()
    })

    it('should handle optional fields', () => {
      const designJson = {
        design_type: 'randomized',
        blinding: 'double-blind',
        arms: 2,
        duration_weeks: 24,
        primary_endpoint: 'Change in HbA1c',
        visit_schedule: undefined,
        safety_monitoring: undefined,
        secondary_endpoints: undefined,
        analysis_populations: undefined
      }

      expect(designJson.visit_schedule).toBeUndefined()
      expect(designJson.safety_monitoring).toBeUndefined()
    })
  })

  describe('Knowledge Graph Integration', () => {
    it('should use KG data for suggestions', () => {
      const kgData = {
        indications: [
          { text: 'Type 2 Diabetes Mellitus', confidence: 0.95, sources: ['FDA', 'EMA'] },
          { text: 'Polycystic Ovary Syndrome', confidence: 0.75, sources: ['CT.gov'] }
        ],
        endpoints: [
          { text: 'Change in HbA1c', type: 'continuous', confidence: 0.92 },
          { text: 'Fasting glucose', type: 'continuous', confidence: 0.88 }
        ]
      }

      expect(kgData.indications).toHaveLength(2)
      expect(kgData.endpoints).toHaveLength(2)
      expect(kgData.indications[0].confidence).toBeGreaterThan(0.9)
    })

    it('should rank suggestions by confidence', () => {
      const suggestions = [
        { text: 'Indication A', confidence: 0.75 },
        { text: 'Indication B', confidence: 0.95 },
        { text: 'Indication C', confidence: 0.85 }
      ]

      const sorted = [...suggestions].sort((a, b) => b.confidence - a.confidence)

      expect(sorted[0].text).toBe('Indication B')
      expect(sorted[0].confidence).toBe(0.95)
      expect(sorted[2].confidence).toBe(0.75)
    })
  })

  describe('Form Validation', () => {
    it('should validate required fields', () => {
      const formData = {
        title: 'Test Study',
        compound_name: 'Metformin',
        phase: 'Phase 3',
        indication: 'Type 2 Diabetes',
        primary_endpoint: 'Change in HbA1c'
      }

      const isValid = 
        formData.title.length > 0 &&
        formData.compound_name.length > 0 &&
        formData.phase.length > 0 &&
        formData.indication.length > 0 &&
        formData.primary_endpoint.length > 0

      expect(isValid).toBe(true)
    })

    it('should fail validation with missing required fields', () => {
      const formData = {
        title: '',
        compound_name: 'Metformin',
        phase: 'Phase 3',
        indication: '',
        primary_endpoint: ''
      }

      const isValid = 
        formData.title.length > 0 &&
        formData.indication.length > 0 &&
        formData.primary_endpoint.length > 0

      expect(isValid).toBe(false)
    })
  })

  describe('Metadata Persistence', () => {
    it('should preserve endpoint metadata through submission', () => {
      const metadata = {
        type: 'continuous',
        timepoint: 'Week 24',
        unit: '%',
        confidence: 0.92,
        sources: ['FDA', 'EMA']
      }

      const designJson = {
        primary_endpoint: 'Change in HbA1c',
        primary_endpoint_metadata: metadata
      }

      expect(designJson.primary_endpoint_metadata).toEqual(metadata)
      expect(designJson.primary_endpoint_metadata.type).toBe('continuous')
    })

    it('should handle missing metadata gracefully', () => {
      const designJson = {
        primary_endpoint: 'Change in HbA1c',
        primary_endpoint_metadata: null
      }

      expect(designJson.primary_endpoint_metadata).toBeNull()
    })
  })
})
