/**
 * Endpoint-Procedure Mapping
 * Maps endpoints to required and recommended procedures
 */

import type { EndpointProcedureMap, EndpointId, ProcedureId, Procedure } from '../types'
import { inferProceduresFromEndpoint } from '../procedures/procedure_inference'

/**
 * Create endpoint-procedure map
 */
export function createEndpointProcedureMap(
  endpointId: EndpointId,
  endpointName: string,
  endpointType: 'primary' | 'secondary' | 'exploratory'
): EndpointProcedureMap {
  // Infer procedures
  const procedures = inferProceduresFromEndpoint(endpointId, endpointName, endpointType)

  // Split into required and recommended
  const requiredProcedures = procedures
    .filter(p => p.required)
    .map(p => p.id)

  const recommendedProcedures = procedures
    .filter(p => !p.required)
    .map(p => p.id)

  // Determine timing based on endpoint type
  const timing = determineEndpointTiming(endpointName, endpointType)

  return {
    endpointId,
    endpointName,
    endpointType,
    requiredProcedures,
    recommendedProcedures,
    timing,
  }
}

/**
 * Determine endpoint timing requirements
 */
function determineEndpointTiming(
  endpointName: string,
  endpointType: 'primary' | 'secondary' | 'exploratory'
): EndpointProcedureMap['timing'] {
  const lower = endpointName.toLowerCase()

  // Primary endpoints: baseline + treatment + follow-up
  if (endpointType === 'primary') {
    return {
      baseline: true,
      treatment: true,
      followUp: true,
    }
  }

  // Safety endpoints: all visits
  if (lower.includes('safety') || lower.includes('adverse') || lower.includes('tolerability')) {
    return {
      baseline: true,
      treatment: true,
      followUp: true,
    }
  }

  // PK/PD: specific visits
  if (lower.includes('pk') || lower.includes('pharmacokinetic')) {
    return {
      baseline: false,
      treatment: true,
      followUp: false,
    }
  }

  // Quality of life: baseline + end
  if (lower.includes('quality of life') || lower.includes('qol')) {
    return {
      baseline: true,
      treatment: false,
      followUp: true,
    }
  }

  // Default: baseline + treatment
  return {
    baseline: true,
    treatment: true,
    followUp: false,
  }
}

/**
 * Create maps for multiple endpoints
 */
export function createEndpointProcedureMaps(
  endpoints: Array<{
    id: EndpointId
    name: string
    type: 'primary' | 'secondary' | 'exploratory'
  }>
): EndpointProcedureMap[] {
  return endpoints.map(ep =>
    createEndpointProcedureMap(ep.id, ep.name, ep.type)
  )
}

/**
 * Merge endpoint-procedure maps
 */
export function mergeEndpointProcedureMaps(
  maps: EndpointProcedureMap[]
): {
  allRequiredProcedures: ProcedureId[]
  allRecommendedProcedures: ProcedureId[]
  byEndpoint: EndpointProcedureMap[]
} {
  const requiredSet = new Set<ProcedureId>()
  const recommendedSet = new Set<ProcedureId>()

  maps.forEach(map => {
    map.requiredProcedures.forEach(p => requiredSet.add(p))
    map.recommendedProcedures.forEach(p => recommendedSet.add(p))
  })

  return {
    allRequiredProcedures: Array.from(requiredSet),
    allRecommendedProcedures: Array.from(recommendedSet),
    byEndpoint: maps,
  }
}

/**
 * Get procedures for endpoint at specific visit
 */
export function getProceduresForEndpointAtVisit(
  map: EndpointProcedureMap,
  visitType: 'screening' | 'baseline' | 'treatment' | 'follow_up' | 'end_of_treatment' | 'unscheduled'
): ProcedureId[] {
  const procedures: ProcedureId[] = []

  // Check timing requirements
  if (visitType === 'baseline' && map.timing.baseline) {
    procedures.push(...map.requiredProcedures)
  } else if (visitType === 'treatment' && map.timing.treatment) {
    procedures.push(...map.requiredProcedures)
  } else if ((visitType === 'follow_up' || visitType === 'end_of_treatment') && map.timing.followUp) {
    procedures.push(...map.requiredProcedures)
  }

  return procedures
}

/**
 * Validate endpoint-procedure mapping
 */
export function validateEndpointProcedureMap(
  map: EndpointProcedureMap,
  availableProcedures: Procedure[]
): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if all required procedures exist
  map.requiredProcedures.forEach(procId => {
    const exists = availableProcedures.some(p => p.id === procId)
    if (!exists) {
      errors.push(`Required procedure ${procId} not found in available procedures`)
    }
  })

  // Check if all recommended procedures exist
  map.recommendedProcedures.forEach(procId => {
    const exists = availableProcedures.some(p => p.id === procId)
    if (!exists) {
      warnings.push(`Recommended procedure ${procId} not found in available procedures`)
    }
  })

  // Check if endpoint has at least one procedure
  if (map.requiredProcedures.length === 0 && map.recommendedProcedures.length === 0) {
    warnings.push(`Endpoint "${map.endpointName}" has no associated procedures`)
  }

  // Check timing
  if (!map.timing.baseline && !map.timing.treatment && !map.timing.followUp) {
    errors.push(`Endpoint "${map.endpointName}" has no timing requirements`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Get endpoint-procedure map summary
 */
export function getEndpointProcedureMapSummary(
  maps: EndpointProcedureMap[]
): {
  totalEndpoints: number
  primaryEndpoints: number
  secondaryEndpoints: number
  exploratoryEndpoints: number
  totalRequiredProcedures: number
  totalRecommendedProcedures: number
  averageRequiredPerEndpoint: number
  averageRecommendedPerEndpoint: number
  endpointsWithBaseline: number
  endpointsWithTreatment: number
  endpointsWithFollowUp: number
} {
  const totalEndpoints = maps.length
  const primaryEndpoints = maps.filter(m => m.endpointType === 'primary').length
  const secondaryEndpoints = maps.filter(m => m.endpointType === 'secondary').length
  const exploratoryEndpoints = maps.filter(m => m.endpointType === 'exploratory').length

  const allRequired = new Set<ProcedureId>()
  const allRecommended = new Set<ProcedureId>()
  
  maps.forEach(map => {
    map.requiredProcedures.forEach(p => allRequired.add(p))
    map.recommendedProcedures.forEach(p => allRecommended.add(p))
  })

  const totalRequiredProcedures = allRequired.size
  const totalRecommendedProcedures = allRecommended.size

  const totalRequiredCount = maps.reduce((sum, m) => sum + m.requiredProcedures.length, 0)
  const totalRecommendedCount = maps.reduce((sum, m) => sum + m.recommendedProcedures.length, 0)

  const averageRequiredPerEndpoint = totalEndpoints > 0 ? totalRequiredCount / totalEndpoints : 0
  const averageRecommendedPerEndpoint = totalEndpoints > 0 ? totalRecommendedCount / totalEndpoints : 0

  const endpointsWithBaseline = maps.filter(m => m.timing.baseline).length
  const endpointsWithTreatment = maps.filter(m => m.timing.treatment).length
  const endpointsWithFollowUp = maps.filter(m => m.timing.followUp).length

  return {
    totalEndpoints,
    primaryEndpoints,
    secondaryEndpoints,
    exploratoryEndpoints,
    totalRequiredProcedures,
    totalRecommendedProcedures,
    averageRequiredPerEndpoint,
    averageRecommendedPerEndpoint,
    endpointsWithBaseline,
    endpointsWithTreatment,
    endpointsWithFollowUp,
  }
}

/**
 * Find missing procedures for endpoint
 */
export function findMissingProceduresForEndpoint(
  map: EndpointProcedureMap,
  actualProcedures: ProcedureId[]
): {
  missingRequired: ProcedureId[]
  missingRecommended: ProcedureId[]
} {
  const missingRequired = map.requiredProcedures.filter(
    p => !actualProcedures.includes(p)
  )

  const missingRecommended = map.recommendedProcedures.filter(
    p => !actualProcedures.includes(p)
  )

  return {
    missingRequired,
    missingRecommended,
  }
}

/**
 * Get procedure coverage for endpoints
 */
export function getProcedureCoverageForEndpoints(
  maps: EndpointProcedureMap[],
  actualProcedures: ProcedureId[]
): {
  endpointId: EndpointId
  endpointName: string
  requiredCoverage: number
  recommendedCoverage: number
  missingRequired: number
  missingRecommended: number
}[] {
  return maps.map(map => {
    const missing = findMissingProceduresForEndpoint(map, actualProcedures)

    const requiredCoverage = map.requiredProcedures.length > 0
      ? ((map.requiredProcedures.length - missing.missingRequired.length) / map.requiredProcedures.length) * 100
      : 100

    const recommendedCoverage = map.recommendedProcedures.length > 0
      ? ((map.recommendedProcedures.length - missing.missingRecommended.length) / map.recommendedProcedures.length) * 100
      : 100

    return {
      endpointId: map.endpointId,
      endpointName: map.endpointName,
      requiredCoverage,
      recommendedCoverage,
      missingRequired: missing.missingRequired.length,
      missingRecommended: missing.missingRecommended.length,
    }
  })
}
