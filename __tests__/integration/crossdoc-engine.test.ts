/**
 * Integration Tests: Cross-Document Engine
 * Test full engine with realistic document bundles
 */

import { CrossDocEngine } from '@/lib/engine/crossdoc'
import type { CrossDocBundle } from '@/lib/engine/crossdoc/types'

describe('CrossDocEngine Integration', () => {
  let engine: CrossDocEngine

  beforeEach(() => {
    engine = CrossDocEngine.createDefault()
  })

  describe('Realistic Document Bundle - Aligned', () => {
    it('should pass validation for well-aligned documents', async () => {
      const bundle: CrossDocBundle = {
        ib: {
          id: 'ib_001',
          version: '1.0',
          objectives: [
            {
              id: 'ib_obj_1',
              type: 'primary',
              description: 'To evaluate the efficacy of Drug X in reducing HbA1c levels in patients with type 2 diabetes',
            },
            {
              id: 'ib_obj_2',
              type: 'secondary',
              description: 'To assess the safety and tolerability of Drug X',
            },
          ],
          mechanismOfAction: 'Drug X is a DPP-4 inhibitor that enhances glucose-dependent insulin secretion',
          targetPopulation: 'Adults aged 18-75 years with type 2 diabetes mellitus and inadequate glycemic control',
          keyRisks: ['Hypoglycemia', 'Gastrointestinal disturbances'],
          dosingInformation: [
            { dose: '100 mg', route: 'oral', frequency: 'once daily' },
            { dose: '200 mg', route: 'oral', frequency: 'once daily' },
          ],
        },
        protocol: {
          id: 'prot_001',
          version: '1.0',
          objectives: [
            {
              id: 'prot_obj_1',
              type: 'primary',
              description: 'To evaluate the efficacy of Drug X in reducing HbA1c levels in patients with type 2 diabetes',
            },
            {
              id: 'prot_obj_2',
              type: 'secondary',
              description: 'To assess the safety and tolerability of Drug X',
            },
          ],
          endpoints: [
            {
              id: 'ep_1',
              type: 'primary',
              name: 'Change in HbA1c',
              description: 'Change from baseline in HbA1c at week 24',
              dataType: 'continuous',
            },
            {
              id: 'ep_2',
              type: 'secondary',
              name: 'Adverse events',
              description: 'Incidence of adverse events',
              dataType: 'binary',
            },
          ],
          arms: [
            { id: 'arm_1', name: 'Drug X 100mg', dose: '100mg', route: 'oral', frequency: 'QD' },
            { id: 'arm_2', name: 'Drug X 200mg', dose: '200mg', route: 'oral', frequency: 'QD' },
            { id: 'arm_3', name: 'Placebo', dose: 'placebo', route: 'oral', frequency: 'QD' },
          ],
          visitSchedule: ['Screening', 'Baseline', 'Week 4', 'Week 12', 'Week 24'],
          inclusionCriteria: [
            'Adults aged 18-75 years',
            'Type 2 diabetes mellitus',
            'HbA1c 7.0-10.0%',
          ],
          exclusionCriteria: [
            'Type 1 diabetes',
            'Severe renal impairment',
          ],
          analysisPopulations: ['FAS', 'PP', 'Safety'],
        },
        sap: {
          id: 'sap_001',
          version: '1.0',
          primaryEndpoints: [
            {
              id: 'sap_ep_1',
              name: 'Change in HbA1c',
              description: 'Change from baseline in HbA1c at week 24',
            },
          ],
          secondaryEndpoints: [
            {
              id: 'sap_ep_2',
              name: 'Adverse events',
              description: 'Incidence of adverse events',
            },
          ],
          statisticalTests: [
            { endpointId: 'ep_1', test: 'ANCOVA' },
            { endpointId: 'ep_2', test: 'Chi-square test' },
          ],
          analysisPopulations: ['FAS', 'PP', 'Safety'],
          sampleSize: 300,
          sampleSizeJustification: 'Based on primary endpoint (HbA1c change)',
        },
      }

      const result = await engine.run(bundle)

      expect(result).toBeDefined()
      expect(result.issues).toBeDefined()
      expect(result.summary).toBeDefined()
      
      // Should have minimal or no critical issues
      expect(result.summary.critical).toBe(0)
      
      // Total issues should be low
      expect(result.summary.total).toBeLessThan(5)
    })
  })

  describe('Realistic Document Bundle - Misaligned', () => {
    it('should detect multiple issues in misaligned documents', async () => {
      const bundle: CrossDocBundle = {
        ib: {
          id: 'ib_002',
          objectives: [
            {
              id: 'ib_obj_1',
              type: 'primary',
              description: 'To evaluate efficacy in reducing blood pressure',
            },
          ],
          dosingInformation: [
            { dose: '50 mg', route: 'oral', frequency: 'twice daily' },
          ],
        },
        protocol: {
          id: 'prot_002',
          objectives: [
            {
              id: 'prot_obj_1',
              type: 'primary',
              description: 'To evaluate efficacy in reducing cholesterol levels', // MISMATCH
            },
          ],
          endpoints: [
            {
              id: 'ep_1',
              type: 'primary',
              name: 'LDL-C change',
              description: 'Change in LDL cholesterol',
              dataType: 'continuous',
            },
          ],
          arms: [
            { id: 'arm_1', name: 'Treatment', dose: '100mg', route: 'oral', frequency: 'QD' }, // DOSE MISMATCH
          ],
        },
        sap: {
          id: 'sap_002',
          primaryEndpoints: [
            {
              id: 'sap_ep_1',
              name: 'Blood pressure change', // ENDPOINT MISMATCH
              description: 'Change in systolic BP',
            },
          ],
          statisticalTests: [
            { endpointId: 'ep_1', test: 'Chi-square test' }, // TEST MISMATCH (should be ANCOVA for continuous)
          ],
        },
      }

      const result = await engine.run(bundle)

      expect(result.summary.total).toBeGreaterThan(0)
      
      // Should detect critical issues
      expect(result.summary.critical).toBeGreaterThan(0)
      
      // Should detect specific issues
      const issueCodes = result.issues.map(i => i.code)
      
      expect(issueCodes).toContain('IB_PROTOCOL_OBJECTIVE_MISMATCH')
      expect(issueCodes).toContain('PRIMARY_ENDPOINT_DRIFT')
      expect(issueCodes).toContain('IB_PROTOCOL_DOSE_INCONSISTENT')
      expect(issueCodes).toContain('TEST_MISMATCH')
    })
  })

  describe('Performance', () => {
    it('should complete validation in under 3 seconds', async () => {
      const bundle: CrossDocBundle = {
        protocol: {
          id: 'prot_perf',
          objectives: [
            { id: 'obj_1', type: 'primary', description: 'Primary objective' },
          ],
          endpoints: [
            { id: 'ep_1', type: 'primary', name: 'Primary EP', description: 'Primary endpoint', dataType: 'continuous' },
          ],
          arms: [
            { id: 'arm_1', dose: '10mg', route: 'oral', frequency: 'QD' },
          ],
        },
        sap: {
          id: 'sap_perf',
          primaryEndpoints: [
            { id: 'sap_ep_1', name: 'Primary EP', description: 'Primary endpoint' },
          ],
          statisticalTests: [
            { endpointId: 'ep_1', test: 'ANCOVA' },
          ],
        },
      }

      const startTime = Date.now()
      await engine.run(bundle)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(3000) // 3 seconds
    })
  })

  describe('Auto-fix Suggestions', () => {
    it('should provide auto-fix suggestions for fixable issues', async () => {
      const bundle: CrossDocBundle = {
        protocol: {
          id: 'prot_003',
          endpoints: [
            {
              id: 'ep_1',
              type: 'primary',
              name: 'HbA1c change',
              description: 'Change from baseline in HbA1c',
              dataType: 'continuous',
            },
          ],
        },
        sap: {
          id: 'sap_003',
          primaryEndpoints: [
            {
              id: 'sap_ep_1',
              name: 'Blood pressure', // MISMATCH - auto-fixable
              description: 'Change in BP',
            },
          ],
          statisticalTests: [
            { endpointId: 'ep_1', test: 'Chi-square test' }, // WRONG TEST - auto-fixable
          ],
        },
      }

      const result = await engine.run(bundle)

      const autoFixableIssues = result.issues.filter(issue =>
        issue.suggestions?.some(s => s.autoFixable)
      )

      expect(autoFixableIssues.length).toBeGreaterThan(0)
      
      // Verify suggestions have patches
      autoFixableIssues.forEach(issue => {
        const autoFixSuggestion = issue.suggestions?.find(s => s.autoFixable)
        expect(autoFixSuggestion).toBeDefined()
        expect(autoFixSuggestion?.patches).toBeDefined()
        expect(autoFixSuggestion!.patches.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty bundle gracefully', async () => {
      const bundle: CrossDocBundle = {}

      const result = await engine.run(bundle)

      expect(result).toBeDefined()
      expect(result.issues).toBeDefined()
      expect(result.summary.total).toBe(0)
    })

    it('should handle single document', async () => {
      const bundle: CrossDocBundle = {
        protocol: {
          id: 'prot_single',
          objectives: [
            { id: 'obj_1', type: 'primary', description: 'Objective' },
          ],
        },
      }

      const result = await engine.run(bundle)

      expect(result).toBeDefined()
      // Should not crash, but may have warnings about missing documents
    })

    it('should handle documents with missing fields', async () => {
      const bundle: CrossDocBundle = {
        protocol: {
          id: 'prot_incomplete',
          objectives: [],
          endpoints: [],
        },
        sap: {
          id: 'sap_incomplete',
          primaryEndpoints: [],
        },
      }

      const result = await engine.run(bundle)

      expect(result).toBeDefined()
      // Should detect missing data
      expect(result.summary.total).toBeGreaterThan(0)
    })
  })
})
