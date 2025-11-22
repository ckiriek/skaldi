/**
 * Complete SAP Generator
 */

import type { StatisticalAnalysisPlan, Endpoint, SampleSizeResult } from '../types'
import { mapMultipleEndpoints } from '../endpoint_mapping/mapping_rules'
import { generateAnalysisSets } from './analysis_sets'

export function generateCompleteSAP(params: {
  studyTitle: string
  endpoints: Endpoint[]
  sampleSize: SampleSizeResult
}): StatisticalAnalysisPlan {
  const { studyTitle, endpoints, sampleSize } = params
  
  const mappings = mapMultipleEndpoints(endpoints)
  const analysisSets = generateAnalysisSets({
    studyDesign: 'parallel',
    primaryEndpointType: 'efficacy',
  })

  return {
    studyTitle,
    version: '1.0',
    dateCreated: new Date().toISOString(),
    endpoints,
    sampleSize,
    analysisSets,
    statisticalMethods: mappings.map(m => m.statisticalMethod),
    missingDataStrategy: {
      primaryMethod: 'MMRM',
      sensitivityAnalyses: ['LOCF', 'MI'],
      assumptions: ['Missing at Random (MAR)'],
      justification: 'MMRM is recommended for repeated measures',
    },
  }
}

export * from './analysis_sets'
export * from './statistical_methods'
export * from './sections'
