/**
 * Unit Tests: Cross-Document Rules
 * Test validation rules
 */

import {
  ibProtocolObjectiveMismatch,
  ibProtocolPopulationDrift,
  ibProtocolDoseInconsistent,
} from '@/lib/engine/crossdoc/rules/ib_protocol_rules'

import {
  primaryEndpointDrift,
  testMismatch,
  sampleSizeDriverMismatch,
} from '@/lib/engine/crossdoc/rules/protocol_sap_rules'

import {
  globalPurposeDrift,
  globalPopulationIncoherent,
} from '@/lib/engine/crossdoc/rules/global_rules'

import type { CrossDocRuleContext } from '@/lib/engine/crossdoc/types'

describe('IB-Protocol Rules', () => {
  describe('ibProtocolObjectiveMismatch', () => {
    it('should detect mismatched primary objectives', async () => {
      const ctx: CrossDocRuleContext = {
        bundle: {
          ib: {
            id: 'ib_1',
            objectives: [
              { id: 'ib_obj_1', type: 'primary', description: 'Objective A' },
            ],
          } as any,
          protocol: {
            id: 'prot_1',
            objectives: [
              { id: 'prot_obj_1', type: 'primary', description: 'Objective B' },
            ],
          } as any,
        },
        alignments: {
          objectives: [
            {
              ibObjective: { id: 'ib_obj_1', type: 'primary', description: 'Objective A' },
              protocolObjective: { id: 'prot_obj_1', type: 'primary', description: 'Objective B' },
              type: 'primary',
              score: 0.3,
              aligned: false,
            },
          ],
          endpoints: [],
          doses: [],
          populations: [],
          visits: [],
        },
      }

      const issues = await ibProtocolObjectiveMismatch(ctx)
      
      expect(issues.length).toBe(1)
      expect(issues[0].code).toBe('IB_PROTOCOL_OBJECTIVE_MISMATCH')
      expect(issues[0].severity).toBe('critical')
    })

    it('should pass when objectives are aligned', async () => {
      const ctx: CrossDocRuleContext = {
        bundle: {
          ib: {
            id: 'ib_1',
            objectives: [
              { id: 'ib_obj_1', type: 'primary', description: 'To evaluate efficacy' },
            ],
          } as any,
          protocol: {
            id: 'prot_1',
            objectives: [
              { id: 'prot_obj_1', type: 'primary', description: 'To evaluate efficacy' },
            ],
          } as any,
        },
        alignments: {
          objectives: [
            {
              ibObjective: { id: 'ib_obj_1', type: 'primary', description: 'To evaluate efficacy' },
              protocolObjective: { id: 'prot_obj_1', type: 'primary', description: 'To evaluate efficacy' },
              type: 'primary',
              score: 1.0,
              aligned: true,
            },
          ],
          endpoints: [],
          doses: [],
          populations: [],
          visits: [],
        },
      }

      const issues = await ibProtocolObjectiveMismatch(ctx)
      expect(issues.length).toBe(0)
    })
  })

  describe('ibProtocolDoseInconsistent', () => {
    it('should detect missing doses in Protocol', async () => {
      const ctx: CrossDocRuleContext = {
        bundle: {
          ib: {
            id: 'ib_1',
            dosingInformation: [
              { dose: '10 mg', route: 'oral', frequency: 'once daily' },
              { dose: '20 mg', route: 'oral', frequency: 'once daily' },
            ],
          } as any,
          protocol: {
            id: 'prot_1',
            arms: [
              { id: 'arm_1', dose: '10mg', route: 'oral', frequency: 'QD' },
            ],
          } as any,
        },
        alignments: {
          objectives: [],
          endpoints: [],
          doses: [
            {
              ibDose: { dose: '10 mg', route: 'oral', frequency: 'once daily' },
              protocolArm: { id: 'arm_1', dose: '10mg', route: 'oral', frequency: 'QD' },
              score: 0.9,
              aligned: true,
            },
            {
              ibDose: { dose: '20 mg', route: 'oral', frequency: 'once daily' },
              protocolArm: null,
              score: 0,
              aligned: false,
            },
          ],
          populations: [],
          visits: [],
        },
      }

      const issues = await ibProtocolDoseInconsistent(ctx)
      
      expect(issues.length).toBe(1)
      expect(issues[0].code).toBe('IB_PROTOCOL_DOSE_INCONSISTENT')
      expect(issues[0].severity).toBe('error')
    })
  })
})

describe('Protocol-SAP Rules', () => {
  describe('primaryEndpointDrift', () => {
    it('should detect mismatched primary endpoints', async () => {
      const ctx: CrossDocRuleContext = {
        bundle: {
          protocol: {
            id: 'prot_1',
            endpoints: [
              { id: 'ep_1', type: 'primary', name: 'HbA1c change', description: 'Change in HbA1c' },
            ],
          } as any,
          sap: {
            id: 'sap_1',
            primaryEndpoints: [
              { id: 'sap_ep_1', name: 'Blood pressure', description: 'Change in BP' },
            ],
          } as any,
        },
        alignments: {
          objectives: [],
          endpoints: [
            {
              protocolEndpoint: { id: 'ep_1', type: 'primary', name: 'HbA1c change', description: 'Change in HbA1c' },
              sapEndpoint: { id: 'sap_ep_1', name: 'Blood pressure', description: 'Change in BP' },
              csrEndpoint: null,
              score: 0.2,
              aligned: false,
            },
          ],
          doses: [],
          populations: [],
          visits: [],
        },
      }

      const issues = await primaryEndpointDrift(ctx)
      
      expect(issues.length).toBe(1)
      expect(issues[0].code).toBe('PRIMARY_ENDPOINT_DRIFT')
      expect(issues[0].severity).toBe('critical')
      expect(issues[0].suggestions).toBeDefined()
      expect(issues[0].suggestions![0].autoFixable).toBe(true)
    })

    it('should pass when primary endpoints match', async () => {
      const ctx: CrossDocRuleContext = {
        bundle: {
          protocol: {
            id: 'prot_1',
            endpoints: [
              { id: 'ep_1', type: 'primary', name: 'HbA1c change', description: 'Change in HbA1c' },
            ],
          } as any,
          sap: {
            id: 'sap_1',
            primaryEndpoints: [
              { id: 'sap_ep_1', name: 'HbA1c change', description: 'Change in HbA1c' },
            ],
          } as any,
        },
        alignments: {
          objectives: [],
          endpoints: [
            {
              protocolEndpoint: { id: 'ep_1', type: 'primary', name: 'HbA1c change', description: 'Change in HbA1c' },
              sapEndpoint: { id: 'sap_ep_1', name: 'HbA1c change', description: 'Change in HbA1c' },
              csrEndpoint: null,
              score: 1.0,
              aligned: true,
            },
          ],
          doses: [],
          populations: [],
          visits: [],
        },
      }

      const issues = await primaryEndpointDrift(ctx)
      expect(issues.length).toBe(0)
    })
  })

  describe('testMismatch', () => {
    it('should detect inappropriate statistical test', async () => {
      const ctx: CrossDocRuleContext = {
        bundle: {
          protocol: {
            id: 'prot_1',
            endpoints: [
              { id: 'ep_1', type: 'primary', name: 'HbA1c', dataType: 'continuous' },
            ],
          } as any,
          sap: {
            id: 'sap_1',
            statisticalTests: [
              { endpointId: 'ep_1', test: 'Chi-square test' }, // Wrong for continuous
            ],
          } as any,
        },
        alignments: {
          objectives: [],
          endpoints: [],
          doses: [],
          populations: [],
          visits: [],
        },
      }

      const issues = await testMismatch(ctx)
      
      expect(issues.length).toBeGreaterThan(0)
      expect(issues[0].code).toBe('TEST_MISMATCH')
      expect(issues[0].severity).toBe('error')
    })
  })
})

describe('Global Rules', () => {
  describe('globalPurposeDrift', () => {
    it('should detect inconsistent study purpose', async () => {
      const ctx: CrossDocRuleContext = {
        bundle: {
          ib: { id: 'ib_1' } as any,
          protocol: { id: 'prot_1' } as any,
          sap: { id: 'sap_1' } as any,
        },
        alignments: {
          objectives: [
            {
              ibObjective: { id: 'ib_obj_1', type: 'primary', description: 'Purpose A' },
              protocolObjective: { id: 'prot_obj_1', type: 'primary', description: 'Purpose B' },
              type: 'primary',
              score: 0.3,
              aligned: false,
            },
          ],
          endpoints: [],
          doses: [],
          populations: [],
          visits: [],
        },
      }

      const issues = await globalPurposeDrift(ctx)
      
      expect(issues.length).toBe(1)
      expect(issues[0].code).toBe('GLOBAL_PURPOSE_DRIFT')
      expect(issues[0].severity).toBe('critical')
    })
  })

  describe('globalPopulationIncoherent', () => {
    it('should detect missing population definition', async () => {
      const ctx: CrossDocRuleContext = {
        bundle: {
          ib: {
            id: 'ib_1',
            targetPopulation: 'Short description',
          } as any,
          protocol: {
            id: 'prot_1',
            inclusionCriteria: [],
          } as any,
        },
        alignments: {
          objectives: [],
          endpoints: [],
          doses: [],
          populations: [],
          visits: [],
        },
      }

      const issues = await globalPopulationIncoherent(ctx)
      
      expect(issues.length).toBeGreaterThan(0)
      expect(issues[0].code).toBe('GLOBAL_POPULATION_INCOHERENT')
    })
  })
})
