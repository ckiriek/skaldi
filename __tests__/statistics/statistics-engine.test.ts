/**
 * Statistics Engine Integration Tests
 * Test complete workflow: sample size → endpoint mapping → SAP generation
 */

import {
  // Sample Size
  calculateSampleSize,
  calculateContinuousSampleSize,
  calculateBinarySampleSize,
  calculateSurvivalSampleSize,
  cohensD,
  riskRatio,
  
  // Endpoint Mapping
  mapEndpointToTest,
  mapMultipleEndpoints,
  classifyEndpoint,
  selectStatisticalTest,
  
  // SAP Generation
  generateCompleteSAP,
  generateAnalysisSets,
  
  // Validation
  validateSampleSizeParameters,
  validateEndpoint,
  checkSampleSizeEndpointConsistency,
  
  // Types
  type Endpoint,
  type SampleSizeParameters,
} from '@/lib/engine/statistics'

describe('Statistics Engine - Complete Integration', () => {
  
  // ============================================================================
  // Sample Size Calculations
  // ============================================================================
  
  describe('Sample Size Calculations', () => {
    test('Continuous endpoint (t-test) - 90% power', () => {
      const result = calculateContinuousSampleSize({
        meanDifference: 0.5,
        standardDeviation: 1.0,
        power: 0.90,
        alpha: 0.05,
        sided: 'two_sided',
      })

      expect(result.totalSampleSize).toBeGreaterThan(0)
      expect(result.power).toBe(0.90)
      expect(result.alpha).toBe(0.05)
      expect(result.method).toBe('two_sample_t_test')
      expect(result.sampleSizePerArm).toHaveLength(2)
      
      // Expected: ~170 per arm for Cohen's d = 0.5, power = 90%
      expect(result.sampleSizePerArm[0]).toBeGreaterThan(160)
      expect(result.sampleSizePerArm[0]).toBeLessThan(180)
    })

    test('Binary endpoint (two-proportion) - 80% power', () => {
      const result = calculateBinarySampleSize({
        proportionControl: 0.30,
        proportionTreatment: 0.45,
        power: 0.80,
        alpha: 0.05,
        sided: 'two_sided',
      })

      expect(result.totalSampleSize).toBeGreaterThan(0)
      expect(result.method).toBe('two_proportion_test')
      
      // Expected: ~150-200 per arm for 15% absolute difference
      expect(result.sampleSizePerArm[0]).toBeGreaterThan(140)
      expect(result.sampleSizePerArm[0]).toBeLessThan(210)
    })

    test('Survival endpoint (log-rank) - 90% power', () => {
      const result = calculateSurvivalSampleSize({
        hazardRatio: 0.70,
        medianSurvivalControl: 12,
        accrualPeriod: 12,
        followUpPeriod: 12,
        power: 0.90,
        alpha: 0.05,
        sided: 'two_sided',
      })

      expect(result.totalSampleSize).toBeGreaterThan(0)
      expect(result.method).toBe('log_rank_test')
      expect(result.assumptions).toContain('Proportional hazards')
    })

    test('Sample size with dropout adjustment', () => {
      const params: SampleSizeParameters = {
        power: 0.90,
        alpha: 0.05,
        effectSize: 0.5,
        numberOfArms: 2,
        endpointType: 'continuous',
        standardDeviation: 1.0,
        dropoutRate: 0.15,
      }

      const result = calculateSampleSize(params)

      expect(result.adjustments?.dropout).toBe(0.15)
      expect(result.totalSampleSize).toBeGreaterThan(0)
      
      // With 15% dropout, sample size should be inflated
      const baseSize = calculateContinuousSampleSize({
        meanDifference: 0.5,
        standardDeviation: 1.0,
        power: 0.90,
        alpha: 0.05,
        sided: 'two_sided',
      }).totalSampleSize

      expect(result.totalSampleSize).toBeGreaterThan(baseSize)
    })
  })

  // ============================================================================
  // Effect Size Calculations
  // ============================================================================
  
  describe('Effect Size Calculations', () => {
    test('Cohen\'s d calculation', () => {
      const d = cohensD(7.5, 7.0, 1.0)
      expect(d).toBe(0.5)
    })

    test('Risk ratio calculation', () => {
      const rr = riskRatio(0.30, 0.45)
      expect(rr).toBeCloseTo(1.5, 2)
    })
  })

  // ============================================================================
  // Endpoint Mapping
  // ============================================================================
  
  describe('Endpoint Mapping', () => {
    test('Map continuous endpoint to ANCOVA', () => {
      const endpoint: Endpoint = {
        id: '1',
        name: 'Change in HbA1c from Baseline',
        description: 'Change from baseline to Week 12 in HbA1c',
        type: 'primary',
        dataType: 'continuous',
        variable: 'hba1c_change',
        hypothesis: 'superiority',
        sided: 'two_sided',
        covariates: ['baseline_hba1c', 'age'],
      }

      const mapping = mapEndpointToTest(endpoint)

      expect(mapping.statisticalMethod.test).toBe('ancova')
      expect(mapping.testSelection.requiresCovariates).toBe(true)
      expect(mapping.validation.valid).toBe(true)
    })

    test('Map binary endpoint to chi-square', () => {
      const endpoint: Endpoint = {
        id: '2',
        name: 'Response Rate',
        description: 'Proportion of patients achieving HbA1c < 7%',
        type: 'primary',
        dataType: 'binary',
        variable: 'response',
        hypothesis: 'superiority',
        sided: 'two_sided',
      }

      const mapping = mapEndpointToTest(endpoint)

      expect(mapping.statisticalMethod.test).toBe('chi_square')
      expect(mapping.validation.valid).toBe(true)
    })

    test('Map survival endpoint to log-rank', () => {
      const endpoint: Endpoint = {
        id: '3',
        name: 'Overall Survival',
        description: 'Time from randomization to death from any cause',
        type: 'primary',
        dataType: 'time_to_event',
        variable: 'os_time',
        hypothesis: 'superiority',
        sided: 'two_sided',
      }

      const mapping = mapEndpointToTest(endpoint)

      expect(mapping.statisticalMethod.test).toBe('log_rank')
      expect(mapping.classification.subtype).toBe('overall_survival')
    })

    test('Map multiple endpoints', () => {
      const endpoints: Endpoint[] = [
        {
          id: '1',
          name: 'Change in HbA1c',
          description: 'Primary efficacy endpoint',
          type: 'primary',
          dataType: 'continuous',
          variable: 'hba1c_change',
          hypothesis: 'superiority',
          sided: 'two_sided',
          covariates: ['baseline_hba1c'],
        },
        {
          id: '2',
          name: 'Response Rate',
          description: 'Secondary endpoint',
          type: 'secondary',
          dataType: 'binary',
          variable: 'response',
          hypothesis: 'superiority',
          sided: 'two_sided',
        },
      ]

      const mappings = mapMultipleEndpoints(endpoints)

      expect(mappings).toHaveLength(2)
      expect(mappings[0].statisticalMethod.test).toBe('ancova')
      expect(mappings[1].statisticalMethod.test).toBe('chi_square')
    })
  })

  // ============================================================================
  // SAP Generation
  // ============================================================================
  
  describe('SAP Generation', () => {
    test('Generate analysis sets', () => {
      const sets = generateAnalysisSets({
        studyDesign: 'parallel',
        primaryEndpointType: 'efficacy',
      })

      expect(sets.length).toBeGreaterThan(0)
      
      const fasSet = sets.find(s => s.abbreviation === 'FAS')
      expect(fasSet).toBeDefined()
      expect(fasSet?.name).toContain('Full Analysis Set')
      
      const safSet = sets.find(s => s.abbreviation === 'SAF')
      expect(safSet).toBeDefined()
      expect(safSet?.primaryUse).toContain('safety')
    })

    test('Generate complete SAP', () => {
      const primaryEndpoint: Endpoint = {
        id: '1',
        name: 'Change in HbA1c from Baseline',
        description: 'Change from baseline to Week 12',
        type: 'primary',
        dataType: 'continuous',
        variable: 'hba1c_change',
        hypothesis: 'superiority',
        sided: 'two_sided',
        covariates: ['baseline_hba1c'],
      }

      const sampleSize = calculateContinuousSampleSize({
        meanDifference: 0.5,
        standardDeviation: 1.0,
        power: 0.90,
        alpha: 0.05,
        sided: 'two_sided',
      })

      const sap = generateCompleteSAP({
        studyTitle: 'AST-101 Phase 2 Trial',
        endpoints: [primaryEndpoint],
        sampleSize,
      })

      expect(sap.studyTitle).toBe('AST-101 Phase 2 Trial')
      expect(sap.version).toBeDefined()
      expect(sap.endpoints).toHaveLength(1)
      expect(sap.analysisSets.length).toBeGreaterThan(0)
      expect(sap.statisticalMethods.length).toBeGreaterThan(0)
      expect(sap.missingDataStrategy).toBeDefined()
    })
  })

  // ============================================================================
  // Validation
  // ============================================================================
  
  describe('Validation', () => {
    test('Validate sample size parameters - valid', () => {
      const params: SampleSizeParameters = {
        power: 0.90,
        alpha: 0.05,
        effectSize: 0.5,
        numberOfArms: 2,
        endpointType: 'continuous',
        standardDeviation: 1.0,
      }

      const validation = validateSampleSizeParameters(params)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    test('Validate sample size parameters - low power warning', () => {
      const params: SampleSizeParameters = {
        power: 0.70,
        alpha: 0.05,
        effectSize: 0.5,
        numberOfArms: 2,
        endpointType: 'continuous',
        standardDeviation: 1.0,
      }

      const validation = validateSampleSizeParameters(params)

      expect(validation.valid).toBe(true)
      expect(validation.warnings.length).toBeGreaterThan(0)
      expect(validation.warnings[0].code).toBe('SUBOPTIMAL_POWER')
    })

    test('Validate endpoint', () => {
      const endpoint: Endpoint = {
        id: '1',
        name: 'Change in HbA1c',
        description: 'Primary efficacy endpoint measuring change from baseline',
        type: 'primary',
        dataType: 'continuous',
        variable: 'hba1c_change',
        hypothesis: 'superiority',
        sided: 'two_sided',
      }

      const validation = validateEndpoint(endpoint)

      expect(validation.valid).toBe(true)
    })

    test('Check sample size and endpoint consistency', () => {
      const params: SampleSizeParameters = {
        power: 0.90,
        alpha: 0.05,
        effectSize: 0.5,
        numberOfArms: 2,
        endpointType: 'continuous',
        standardDeviation: 1.0,
      }

      const endpoint: Endpoint = {
        id: '1',
        name: 'Change in HbA1c',
        description: 'Primary endpoint',
        type: 'primary',
        dataType: 'continuous',
        variable: 'hba1c_change',
        hypothesis: 'superiority',
        sided: 'two_sided',
      }

      const validation = checkSampleSizeEndpointConsistency(
        calculateSampleSize(params),
        [endpoint]
      )

      expect(validation.valid).toBe(true)
    })
  })

  // ============================================================================
  // End-to-End Workflow
  // ============================================================================
  
  describe('End-to-End Workflow', () => {
    test('Complete workflow: sample size → mapping → SAP', () => {
      // Step 1: Define endpoint
      const endpoint: Endpoint = {
        id: '1',
        name: 'Change in HbA1c from Baseline to Week 12',
        description: 'Mean change from baseline in HbA1c (%) at Week 12',
        type: 'primary',
        dataType: 'continuous',
        variable: 'hba1c_change',
        hypothesis: 'superiority',
        sided: 'two_sided',
        covariates: ['baseline_hba1c', 'age', 'sex'],
      }

      // Step 2: Calculate sample size
      const sampleSize = calculateSampleSize({
        power: 0.90,
        alpha: 0.05,
        effectSize: 0.5,
        numberOfArms: 2,
        endpointType: 'continuous',
        standardDeviation: 1.0,
        dropoutRate: 0.15,
      })

      expect(sampleSize.totalSampleSize).toBeGreaterThan(0)

      // Step 3: Map endpoint to statistical test
      const mapping = mapEndpointToTest(endpoint)

      expect(mapping.statisticalMethod.test).toBe('ancova')
      expect(mapping.validation.valid).toBe(true)

      // Step 4: Generate SAP
      const sap = generateCompleteSAP({
        studyTitle: 'AST-101: A Phase 2, Randomized, Double-Blind Study',
        endpoints: [endpoint],
        sampleSize,
      })

      expect(sap.studyTitle).toContain('AST-101')
      expect(sap.endpoints).toHaveLength(1)
      expect(sap.sampleSize.totalSampleSize).toBe(sampleSize.totalSampleSize)
      expect(sap.analysisSets.length).toBeGreaterThan(3)
      expect(sap.statisticalMethods.length).toBeGreaterThan(0)

      // Verify analysis sets
      const fas = sap.analysisSets.find(s => s.abbreviation === 'FAS')
      const saf = sap.analysisSets.find(s => s.abbreviation === 'SAF')
      
      expect(fas).toBeDefined()
      expect(saf).toBeDefined()

      // Verify statistical method
      expect(sap.statisticalMethods[0].test).toBe('ancova')
      expect(sap.statisticalMethods[0].covariates).toContain('baseline_hba1c')

      console.log('✅ End-to-end workflow successful!')
      console.log(`   Sample size: ${sampleSize.totalSampleSize}`)
      console.log(`   Statistical test: ${mapping.statisticalMethod.test}`)
      console.log(`   Analysis sets: ${sap.analysisSets.length}`)
    })
  })
})
