/**
 * Phase H.3: Normalizers
 * 
 * Export all normalizer modules
 */

export {
  normalizeIndication,
  normalizeIndications,
  mergeIndications
} from './indication_normalizer'

export {
  normalizeEndpoint,
  normalizeEndpoints
} from './endpoint_normalizer'

export {
  normalizeEligibility,
  cleanCriterion,
  categorizeCriterion,
  mergeEligibility
} from './eligibility_normalizer'

export {
  normalizeProcedure,
  normalizeProcedures,
  mergeProcedures
} from './procedure_normalizer'

export type {
  NormalizedIndication,
  NormalizedEndpoint,
  NormalizedEligibility,
  NormalizedProcedure,
  EndpointType
} from '../types'
