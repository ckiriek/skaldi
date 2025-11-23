/**
 * Phase H.3: Procedure Normalizer
 * 
 * Normalizes clinical procedures and assessments
 */

import type { NormalizedProcedure } from '../types'

// Common LOINC codes for clinical procedures (simplified mapping)
const LOINC_MAPPINGS: Record<string, string> = {
  // Vital signs
  'blood pressure': '85354-9',
  'heart rate': '8867-4',
  'pulse': '8867-4',
  'temperature': '8310-5',
  'respiratory rate': '9279-1',
  'weight': '29463-7',
  'height': '8302-2',
  'bmi': '39156-5',
  
  // Laboratory
  'complete blood count': '58410-2',
  'cbc': '58410-2',
  'hemoglobin': '718-7',
  'hematocrit': '4544-3',
  'white blood cell count': '6690-2',
  'wbc': '6690-2',
  'platelet count': '777-3',
  'glucose': '2345-7',
  'hba1c': '4548-4',
  'creatinine': '2160-0',
  'alt': '1742-6',
  'ast': '1920-8',
  'total cholesterol': '2093-3',
  'ldl': '18262-6',
  'hdl': '2085-9',
  'triglycerides': '2571-8',
  
  // Imaging
  'ecg': '11524-6',
  'electrocardiogram': '11524-6',
  'chest x-ray': '30746-2',
  'ct scan': '24627-2',
  'mri': '24558-9',
  
  // Other
  'physical examination': '29545-1',
  'vital signs': '85353-1',
  'adverse event assessment': '75326-9'
}

// Procedure categories
const PROCEDURE_CATEGORIES: Record<string, string> = {
  'blood pressure': 'vital_signs',
  'heart rate': 'vital_signs',
  'pulse': 'vital_signs',
  'temperature': 'vital_signs',
  'respiratory rate': 'vital_signs',
  'weight': 'vital_signs',
  'height': 'vital_signs',
  'bmi': 'vital_signs',
  
  'complete blood count': 'laboratory',
  'cbc': 'laboratory',
  'hemoglobin': 'laboratory',
  'hematocrit': 'laboratory',
  'glucose': 'laboratory',
  'hba1c': 'laboratory',
  'creatinine': 'laboratory',
  'alt': 'laboratory',
  'ast': 'laboratory',
  'cholesterol': 'laboratory',
  
  'ecg': 'diagnostic',
  'electrocardiogram': 'diagnostic',
  'x-ray': 'imaging',
  'ct scan': 'imaging',
  'mri': 'imaging',
  'ultrasound': 'imaging',
  
  'physical examination': 'clinical_assessment',
  'adverse event': 'safety_assessment',
  'concomitant medication': 'medication_review'
}

// Common synonyms
const PROCEDURE_SYNONYMS: Record<string, string[]> = {
  'blood pressure': ['bp', 'systolic/diastolic'],
  'heart rate': ['hr', 'pulse rate'],
  'complete blood count': ['cbc', 'full blood count', 'fbc'],
  'electrocardiogram': ['ecg', 'ekg'],
  'hemoglobin': ['hb', 'hgb'],
  'white blood cell count': ['wbc', 'leukocyte count'],
  'hba1c': ['glycated hemoglobin', 'glycohemoglobin'],
  'alt': ['alanine aminotransferase', 'sgpt'],
  'ast': ['aspartate aminotransferase', 'sgot']
}

/**
 * Normalize procedure name
 */
export function normalizeProcedure(name: string): NormalizedProcedure {
  if (!name || typeof name !== 'string') {
    return {
      name: '',
      category: 'other',
      synonyms: []
    }
  }
  
  // Clean the name
  const cleaned = cleanProcedureName(name)
  const lower = cleaned.toLowerCase()
  
  // Find LOINC code
  const loincCode = findLoincCode(lower)
  
  // Determine category
  const category = findCategory(lower)
  
  // Find synonyms
  const synonyms = findSynonyms(lower)
  
  return {
    name: cleaned,
    category,
    loincCode,
    synonyms
  }
}

/**
 * Clean procedure name
 */
function cleanProcedureName(name: string): string {
  let cleaned = name.trim()
  
  // Remove common prefixes
  cleaned = cleaned.replace(/^(assessment of|measurement of|evaluation of)\s+/i, '')
  
  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,;:]+$/, '')
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ')
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  
  return cleaned
}

/**
 * Find LOINC code
 */
function findLoincCode(procedureName: string): string | undefined {
  // Direct match
  if (LOINC_MAPPINGS[procedureName]) {
    return LOINC_MAPPINGS[procedureName]
  }
  
  // Partial match
  for (const [key, code] of Object.entries(LOINC_MAPPINGS)) {
    if (procedureName.includes(key) || key.includes(procedureName)) {
      return code
    }
  }
  
  return undefined
}

/**
 * Find category
 */
function findCategory(procedureName: string): string {
  // Direct match
  if (PROCEDURE_CATEGORIES[procedureName]) {
    return PROCEDURE_CATEGORIES[procedureName]
  }
  
  // Partial match
  for (const [key, category] of Object.entries(PROCEDURE_CATEGORIES)) {
    if (procedureName.includes(key)) {
      return category
    }
  }
  
  // Keyword-based categorization
  if (procedureName.includes('lab') || procedureName.includes('blood') || procedureName.includes('serum')) {
    return 'laboratory'
  }
  if (procedureName.includes('vital') || procedureName.includes('sign')) {
    return 'vital_signs'
  }
  if (procedureName.includes('x-ray') || procedureName.includes('scan') || procedureName.includes('imaging')) {
    return 'imaging'
  }
  if (procedureName.includes('examination') || procedureName.includes('assessment')) {
    return 'clinical_assessment'
  }
  if (procedureName.includes('adverse') || procedureName.includes('safety')) {
    return 'safety_assessment'
  }
  
  return 'other'
}

/**
 * Find synonyms
 */
function findSynonyms(procedureName: string): string[] {
  const synonyms: string[] = []
  
  // Direct match
  for (const [key, syns] of Object.entries(PROCEDURE_SYNONYMS)) {
    if (procedureName === key || procedureName.includes(key)) {
      synonyms.push(...syns)
    }
  }
  
  return [...new Set(synonyms)] // Remove duplicates
}

/**
 * Normalize multiple procedures
 */
export function normalizeProcedures(procedures: string[]): NormalizedProcedure[] {
  return procedures.map(normalizeProcedure)
}

/**
 * Merge duplicate procedures
 */
export function mergeProcedures(procedures: NormalizedProcedure[]): NormalizedProcedure[] {
  const merged = new Map<string, NormalizedProcedure>()
  
  for (const procedure of procedures) {
    const key = procedure.name.toLowerCase()
    
    if (!merged.has(key)) {
      merged.set(key, procedure)
    } else {
      // Merge synonyms
      const existing = merged.get(key)!
      const combinedSynonyms = new Set([...existing.synonyms, ...procedure.synonyms])
      merged.set(key, {
        ...existing,
        synonyms: Array.from(combinedSynonyms)
      })
    }
  }
  
  return Array.from(merged.values())
}
