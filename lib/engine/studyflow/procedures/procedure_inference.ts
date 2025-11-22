/**
 * Procedure Inference
 * Automatically infers required procedures based on endpoints
 */

import type { Procedure, ProcedureId, EndpointId } from '../types'
import { getProceduresForEndpoint, getProcedureById } from './procedure_catalog'
import { randomUUID } from 'crypto'

/**
 * Endpoint type to procedure mapping rules
 */
const ENDPOINT_PROCEDURE_RULES: Record<string, string[]> = {
  // Diabetes
  diabetes: ['proc_hba1c', 'proc_fasting_glucose', 'proc_cbc', 'proc_alt', 'proc_ast', 'proc_creatinine'],
  glycemic_control: ['proc_hba1c', 'proc_fasting_glucose'],
  
  // Cardiovascular
  hypertension: ['proc_blood_pressure', 'proc_heart_rate', 'proc_ecg_12lead', 'proc_cbc', 'proc_creatinine'],
  cardiovascular: ['proc_blood_pressure', 'proc_heart_rate', 'proc_ecg_12lead', 'proc_chest_xray'],
  dyslipidemia: ['proc_ldl_cholesterol', 'proc_hdl_cholesterol', 'proc_triglycerides', 'proc_alt', 'proc_ast'],
  
  // Obesity
  obesity: ['proc_body_weight', 'proc_bmi', 'proc_waist_circumference', 'proc_blood_pressure'],
  weight_loss: ['proc_body_weight', 'proc_bmi'],
  
  // Renal
  renal_function: ['proc_creatinine', 'proc_egfr', 'proc_bun', 'proc_urinalysis'],
  
  // Hepatic
  hepatotoxicity: ['proc_alt', 'proc_ast', 'proc_bilirubin_total', 'proc_cbc'],
  
  // Hematology
  anemia: ['proc_hemoglobin', 'proc_cbc'],
  
  // Safety (general)
  safety: ['proc_vital_signs', 'proc_physical_exam', 'proc_cbc', 'proc_alt', 'proc_ast', 'proc_creatinine', 'proc_ae_assessment', 'proc_conmed_review'],
  
  // PK/PD
  pharmacokinetics: ['proc_pk_blood_draw'],
  pharmacodynamics: ['proc_pd_biomarker'],
  
  // Quality of Life
  quality_of_life: ['proc_sf36', 'proc_eq5d'],
  
  // Pain
  pain: ['proc_vas_pain'],
  
  // Mental Health
  depression: ['proc_beck_depression'],
  cognition: ['proc_mmse'],
  
  // Respiratory
  respiratory: ['proc_oxygen_saturation', 'proc_chest_xray'],
  
  // Bone
  osteoporosis: ['proc_dexa_scan'],
}

/**
 * Infer procedures from endpoint
 */
export function inferProceduresFromEndpoint(
  endpointId: EndpointId,
  endpointName: string,
  endpointType: 'primary' | 'secondary' | 'exploratory'
): Procedure[] {
  const procedures: Procedure[] = []
  
  // Determine endpoint category from name
  const categories = detectEndpointCategories(endpointName)
  
  // Get procedure IDs for each category
  const procedureIds = new Set<string>()
  
  categories.forEach(category => {
    const ids = ENDPOINT_PROCEDURE_RULES[category] || []
    ids.forEach(id => procedureIds.add(id))
  })

  // Convert to Procedure objects
  procedureIds.forEach(procId => {
    const catalogEntry = getProcedureById(procId)
    if (catalogEntry) {
      procedures.push({
        id: procId,
        name: catalogEntry.name,
        category: catalogEntry.category,
        linkedEndpoints: [endpointId],
        required: endpointType === 'primary', // Primary endpoints = required procedures
        metadata: catalogEntry.metadata,
      })
    }
  })

  return procedures
}

/**
 * Detect endpoint categories from name
 */
function detectEndpointCategories(endpointName: string): string[] {
  const lower = endpointName.toLowerCase()
  const categories: string[] = []

  // Diabetes
  if (lower.includes('hba1c') || lower.includes('glyc') || lower.includes('диабет')) {
    categories.push('diabetes', 'glycemic_control')
  }
  if (lower.includes('glucose') || lower.includes('глюкоз')) {
    categories.push('glycemic_control')
  }

  // Cardiovascular
  if (lower.includes('blood pressure') || lower.includes('bp') || lower.includes('давлен')) {
    categories.push('hypertension', 'cardiovascular')
  }
  if (lower.includes('cholesterol') || lower.includes('ldl') || lower.includes('hdl') || lower.includes('холестерин')) {
    categories.push('dyslipidemia', 'cardiovascular')
  }
  if (lower.includes('heart') || lower.includes('cardiac') || lower.includes('сердеч')) {
    categories.push('cardiovascular')
  }

  // Obesity
  if (lower.includes('weight') || lower.includes('bmi') || lower.includes('вес') || lower.includes('ожирен')) {
    categories.push('obesity', 'weight_loss')
  }

  // Renal
  if (lower.includes('renal') || lower.includes('kidney') || lower.includes('creatinine') || lower.includes('почечн')) {
    categories.push('renal_function')
  }

  // Hepatic
  if (lower.includes('liver') || lower.includes('hepat') || lower.includes('alt') || lower.includes('ast') || lower.includes('печен')) {
    categories.push('hepatotoxicity')
  }

  // Pain
  if (lower.includes('pain') || lower.includes('анальгез') || lower.includes('бол')) {
    categories.push('pain')
  }

  // Quality of Life
  if (lower.includes('quality of life') || lower.includes('qol') || lower.includes('качество жизни')) {
    categories.push('quality_of_life')
  }

  // PK/PD
  if (lower.includes('pharmacokinetic') || lower.includes('pk') || lower.includes('фармакокинет')) {
    categories.push('pharmacokinetics')
  }
  if (lower.includes('pharmacodynamic') || lower.includes('pd') || lower.includes('фармакодинам')) {
    categories.push('pharmacodynamics')
  }

  // Always add safety for any endpoint
  categories.push('safety')

  return [...new Set(categories)] // Remove duplicates
}

/**
 * Infer procedures from multiple endpoints
 */
export function inferProceduresFromEndpoints(
  endpoints: Array<{
    id: EndpointId
    name: string
    type: 'primary' | 'secondary' | 'exploratory'
  }>
): Procedure[] {
  const allProcedures: Procedure[] = []
  const procedureMap = new Map<string, Procedure>()

  endpoints.forEach(endpoint => {
    const procedures = inferProceduresFromEndpoint(
      endpoint.id,
      endpoint.name,
      endpoint.type
    )

    procedures.forEach(proc => {
      const existing = procedureMap.get(proc.id)
      if (existing) {
        // Merge: add endpoint to linkedEndpoints
        if (!existing.linkedEndpoints) {
          existing.linkedEndpoints = []
        }
        if (!existing.linkedEndpoints.includes(endpoint.id)) {
          existing.linkedEndpoints.push(endpoint.id)
        }
        // If any endpoint is primary, procedure is required
        if (endpoint.type === 'primary') {
          existing.required = true
        }
      } else {
        procedureMap.set(proc.id, proc)
      }
    })
  })

  return Array.from(procedureMap.values())
}

/**
 * Add baseline procedures
 */
export function addBaselineProcedures(): Procedure[] {
  const baselineProcIds = [
    'proc_informed_consent',
    'proc_inclusion_exclusion',
    'proc_vital_signs',
    'proc_physical_exam',
    'proc_cbc',
    'proc_alt',
    'proc_ast',
    'proc_creatinine',
    'proc_urinalysis',
    'proc_ecg_12lead',
    'proc_pregnancy_test_urine', // for WOCBP
  ]

  return baselineProcIds
    .map(id => {
      const catalogEntry = getProcedureById(id)
      if (!catalogEntry) return null

      return {
        id,
        name: catalogEntry.name,
        category: catalogEntry.category,
        required: true,
        metadata: catalogEntry.metadata,
      }
    })
    .filter((p): p is Procedure => p !== null)
}

/**
 * Add screening procedures
 */
export function addScreeningProcedures(): Procedure[] {
  const screeningProcIds = [
    'proc_informed_consent',
    'proc_inclusion_exclusion',
    'proc_vital_signs',
    'proc_physical_exam',
    'proc_cbc',
    'proc_alt',
    'proc_ast',
    'proc_creatinine',
    'proc_urinalysis',
    'proc_ecg_12lead',
    'proc_pregnancy_test_urine',
  ]

  return screeningProcIds
    .map(id => {
      const catalogEntry = getProcedureById(id)
      if (!catalogEntry) return null

      return {
        id,
        name: catalogEntry.name,
        category: catalogEntry.category,
        required: true,
        metadata: catalogEntry.metadata,
      }
    })
    .filter((p): p is Procedure => p !== null)
}

/**
 * Add safety monitoring procedures
 */
export function addSafetyMonitoringProcedures(): Procedure[] {
  const safetyProcIds = [
    'proc_ae_assessment',
    'proc_conmed_review',
    'proc_vital_signs',
    'proc_physical_exam',
  ]

  return safetyProcIds
    .map(id => {
      const catalogEntry = getProcedureById(id)
      if (!catalogEntry) return null

      return {
        id,
        name: catalogEntry.name,
        category: catalogEntry.category,
        required: true,
        metadata: catalogEntry.metadata,
      }
    })
    .filter((p): p is Procedure => p !== null)
}

/**
 * Add end-of-treatment procedures
 */
export function addEOTProcedures(): Procedure[] {
  const eotProcIds = [
    'proc_vital_signs',
    'proc_physical_exam',
    'proc_cbc',
    'proc_alt',
    'proc_ast',
    'proc_creatinine',
    'proc_ae_assessment',
    'proc_drug_accountability',
  ]

  return eotProcIds
    .map(id => {
      const catalogEntry = getProcedureById(id)
      if (!catalogEntry) return null

      return {
        id,
        name: catalogEntry.name,
        category: catalogEntry.category,
        required: true,
        metadata: catalogEntry.metadata,
      }
    })
    .filter((p): p is Procedure => p !== null)
}

/**
 * Get inference summary
 */
export function getInferenceSummary(procedures: Procedure[]): {
  total: number
  required: number
  optional: number
  byCategory: Record<string, number>
  linkedToEndpoints: number
} {
  const byCategory: Record<string, number> = {}
  let linkedToEndpoints = 0

  procedures.forEach(proc => {
    byCategory[proc.category] = (byCategory[proc.category] || 0) + 1
    if (proc.linkedEndpoints && proc.linkedEndpoints.length > 0) {
      linkedToEndpoints++
    }
  })

  return {
    total: procedures.length,
    required: procedures.filter(p => p.required).length,
    optional: procedures.filter(p => !p.required).length,
    byCategory,
    linkedToEndpoints,
  }
}
