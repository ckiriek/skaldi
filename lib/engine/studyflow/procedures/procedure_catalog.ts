/**
 * Procedure Catalog
 * Comprehensive catalog of 150+ clinical procedures
 */

import type { ProcedureCatalogEntry, ProcedureCategory } from '../types'

/**
 * Complete procedure catalog
 */
export const PROCEDURE_CATALOG: ProcedureCatalogEntry[] = [
  // ===== EFFICACY ASSESSMENTS =====
  {
    id: 'proc_hba1c',
    name: 'HbA1c',
    nameRu: 'Гликированный гемоглобин',
    category: 'efficacy',
    synonyms: ['glycated hemoglobin', 'glycohemoglobin', 'A1C', 'гликогемоглобин'],
    standardCode: { system: 'LOINC', code: '4548-4' },
    linkedEndpointTypes: ['diabetes', 'glycemic_control'],
    metadata: { description: 'Glycated hemoglobin test', duration: 5, fasting: false },
  },
  {
    id: 'proc_fasting_glucose',
    name: 'Fasting Plasma Glucose',
    nameRu: 'Глюкоза плазмы натощак',
    category: 'efficacy',
    synonyms: ['FPG', 'fasting blood sugar', 'FBS', 'глюкоза натощак'],
    standardCode: { system: 'LOINC', code: '1558-6' },
    linkedEndpointTypes: ['diabetes', 'glycemic_control'],
    metadata: { duration: 5, fasting: true },
  },
  {
    id: 'proc_blood_pressure',
    name: 'Blood Pressure',
    nameRu: 'Артериальное давление',
    category: 'efficacy',
    synonyms: ['BP', 'systolic BP', 'diastolic BP', 'АД'],
    linkedEndpointTypes: ['hypertension', 'cardiovascular'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_ldl_cholesterol',
    name: 'LDL Cholesterol',
    nameRu: 'Холестерин ЛПНП',
    category: 'efficacy',
    synonyms: ['LDL-C', 'low-density lipoprotein', 'ЛПНП'],
    standardCode: { system: 'LOINC', code: '13457-7' },
    linkedEndpointTypes: ['dyslipidemia', 'cardiovascular'],
    metadata: { duration: 5, fasting: true },
  },
  {
    id: 'proc_hdl_cholesterol',
    name: 'HDL Cholesterol',
    nameRu: 'Холестерин ЛПВП',
    category: 'efficacy',
    synonyms: ['HDL-C', 'high-density lipoprotein', 'ЛПВП'],
    standardCode: { system: 'LOINC', code: '2085-9' },
    linkedEndpointTypes: ['dyslipidemia', 'cardiovascular'],
    metadata: { duration: 5, fasting: true },
  },
  {
    id: 'proc_triglycerides',
    name: 'Triglycerides',
    nameRu: 'Триглицериды',
    category: 'efficacy',
    synonyms: ['TG', 'триглицериды'],
    standardCode: { system: 'LOINC', code: '2571-8' },
    linkedEndpointTypes: ['dyslipidemia'],
    metadata: { duration: 5, fasting: true },
  },
  {
    id: 'proc_body_weight',
    name: 'Body Weight',
    nameRu: 'Масса тела',
    category: 'efficacy',
    synonyms: ['weight', 'вес'],
    linkedEndpointTypes: ['obesity', 'weight_loss'],
    metadata: { duration: 2, fasting: false },
  },
  {
    id: 'proc_bmi',
    name: 'Body Mass Index',
    nameRu: 'Индекс массы тела',
    category: 'efficacy',
    synonyms: ['BMI', 'ИМТ'],
    linkedEndpointTypes: ['obesity'],
    metadata: { duration: 2, fasting: false },
  },
  {
    id: 'proc_waist_circumference',
    name: 'Waist Circumference',
    nameRu: 'Окружность талии',
    category: 'efficacy',
    synonyms: ['waist', 'талия'],
    linkedEndpointTypes: ['obesity', 'metabolic_syndrome'],
    metadata: { duration: 3, fasting: false },
  },

  // ===== SAFETY LABS =====
  {
    id: 'proc_cbc',
    name: 'Complete Blood Count',
    nameRu: 'Общий анализ крови',
    category: 'labs',
    synonyms: ['CBC', 'hemogram', 'ОАК', 'гемограмма'],
    standardCode: { system: 'LOINC', code: '58410-2' },
    linkedEndpointTypes: ['safety'],
    metadata: { duration: 10, fasting: false },
  },
  {
    id: 'proc_hemoglobin',
    name: 'Hemoglobin',
    nameRu: 'Гемоглобин',
    category: 'labs',
    synonyms: ['Hb', 'Hgb', 'Гб'],
    standardCode: { system: 'LOINC', code: '718-7' },
    linkedEndpointTypes: ['safety', 'anemia'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_wbc',
    name: 'White Blood Cell Count',
    nameRu: 'Лейкоциты',
    category: 'labs',
    synonyms: ['WBC', 'leukocytes', 'лейкоциты'],
    standardCode: { system: 'LOINC', code: '6690-2' },
    linkedEndpointTypes: ['safety'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_platelets',
    name: 'Platelet Count',
    nameRu: 'Тромбоциты',
    category: 'labs',
    synonyms: ['PLT', 'тромбоциты'],
    standardCode: { system: 'LOINC', code: '777-3' },
    linkedEndpointTypes: ['safety'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_alt',
    name: 'Alanine Aminotransferase',
    nameRu: 'АЛТ',
    category: 'labs',
    synonyms: ['ALT', 'SGPT', 'АЛаТ'],
    standardCode: { system: 'LOINC', code: '1742-6' },
    linkedEndpointTypes: ['safety', 'hepatotoxicity'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_ast',
    name: 'Aspartate Aminotransferase',
    nameRu: 'АСТ',
    category: 'labs',
    synonyms: ['AST', 'SGOT', 'АСаТ'],
    standardCode: { system: 'LOINC', code: '1920-8' },
    linkedEndpointTypes: ['safety', 'hepatotoxicity'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_bilirubin_total',
    name: 'Total Bilirubin',
    nameRu: 'Билирубин общий',
    category: 'labs',
    synonyms: ['bilirubin', 'билирубин'],
    standardCode: { system: 'LOINC', code: '1975-2' },
    linkedEndpointTypes: ['safety', 'hepatotoxicity'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_creatinine',
    name: 'Serum Creatinine',
    nameRu: 'Креатинин сыворотки',
    category: 'labs',
    synonyms: ['creatinine', 'креатинин'],
    standardCode: { system: 'LOINC', code: '2160-0' },
    linkedEndpointTypes: ['safety', 'renal_function'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_egfr',
    name: 'Estimated GFR',
    nameRu: 'рСКФ',
    category: 'labs',
    synonyms: ['eGFR', 'glomerular filtration rate', 'СКФ'],
    standardCode: { system: 'LOINC', code: '33914-3' },
    linkedEndpointTypes: ['safety', 'renal_function'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_bun',
    name: 'Blood Urea Nitrogen',
    nameRu: 'Мочевина',
    category: 'labs',
    synonyms: ['BUN', 'urea', 'мочевина'],
    standardCode: { system: 'LOINC', code: '3094-0' },
    linkedEndpointTypes: ['safety', 'renal_function'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_urinalysis',
    name: 'Urinalysis',
    nameRu: 'Общий анализ мочи',
    category: 'labs',
    synonyms: ['UA', 'urine test', 'ОАМ'],
    standardCode: { system: 'LOINC', code: '24357-6' },
    linkedEndpointTypes: ['safety'],
    metadata: { duration: 10, fasting: false },
  },

  // ===== VITAL SIGNS =====
  {
    id: 'proc_vital_signs',
    name: 'Vital Signs',
    nameRu: 'Витальные показатели',
    category: 'vital_signs',
    synonyms: ['vitals', 'витальные знаки'],
    linkedEndpointTypes: ['safety'],
    metadata: { duration: 10, fasting: false },
  },
  {
    id: 'proc_heart_rate',
    name: 'Heart Rate',
    nameRu: 'Частота сердечных сокращений',
    category: 'vital_signs',
    synonyms: ['HR', 'pulse', 'ЧСС', 'пульс'],
    linkedEndpointTypes: ['safety', 'cardiovascular'],
    metadata: { duration: 2, fasting: false },
  },
  {
    id: 'proc_respiratory_rate',
    name: 'Respiratory Rate',
    nameRu: 'Частота дыхания',
    category: 'vital_signs',
    synonyms: ['RR', 'ЧД'],
    linkedEndpointTypes: ['safety'],
    metadata: { duration: 2, fasting: false },
  },
  {
    id: 'proc_temperature',
    name: 'Body Temperature',
    nameRu: 'Температура тела',
    category: 'vital_signs',
    synonyms: ['temp', 'температура'],
    linkedEndpointTypes: ['safety'],
    metadata: { duration: 2, fasting: false },
  },
  {
    id: 'proc_oxygen_saturation',
    name: 'Oxygen Saturation',
    nameRu: 'Сатурация кислорода',
    category: 'vital_signs',
    synonyms: ['SpO2', 'pulse oximetry', 'сатурация'],
    linkedEndpointTypes: ['safety', 'respiratory'],
    metadata: { duration: 2, fasting: false },
  },

  // ===== PHYSICAL EXAM =====
  {
    id: 'proc_physical_exam',
    name: 'Physical Examination',
    nameRu: 'Физикальный осмотр',
    category: 'physical_exam',
    synonyms: ['PE', 'physical', 'осмотр'],
    linkedEndpointTypes: ['safety'],
    metadata: { duration: 20, fasting: false },
  },
  {
    id: 'proc_neurological_exam',
    name: 'Neurological Examination',
    nameRu: 'Неврологический осмотр',
    category: 'physical_exam',
    synonyms: ['neuro exam', 'неврологический'],
    linkedEndpointTypes: ['safety', 'neurology'],
    metadata: { duration: 15, fasting: false },
  },

  // ===== ECG =====
  {
    id: 'proc_ecg_12lead',
    name: '12-Lead ECG',
    nameRu: 'ЭКГ 12 отведений',
    category: 'ecg',
    synonyms: ['ECG', 'EKG', 'electrocardiogram', 'ЭКГ'],
    standardCode: { system: 'LOINC', code: '11524-6' },
    linkedEndpointTypes: ['safety', 'cardiovascular'],
    metadata: { duration: 10, fasting: false },
  },
  {
    id: 'proc_holter_monitoring',
    name: 'Holter Monitoring',
    nameRu: 'Холтеровское мониторирование',
    category: 'ecg',
    synonyms: ['24h ECG', 'Holter', 'холтер'],
    linkedEndpointTypes: ['cardiovascular'],
    metadata: { duration: 1440, fasting: false },
  },

  // ===== IMAGING =====
  {
    id: 'proc_chest_xray',
    name: 'Chest X-Ray',
    nameRu: 'Рентген грудной клетки',
    category: 'imaging',
    synonyms: ['CXR', 'chest radiograph', 'рентген ОГК'],
    linkedEndpointTypes: ['safety', 'respiratory'],
    metadata: { duration: 15, fasting: false },
  },
  {
    id: 'proc_ct_scan',
    name: 'CT Scan',
    nameRu: 'Компьютерная томография',
    category: 'imaging',
    synonyms: ['computed tomography', 'КТ'],
    linkedEndpointTypes: ['efficacy', 'safety'],
    metadata: { duration: 30, fasting: false },
  },
  {
    id: 'proc_mri',
    name: 'MRI',
    nameRu: 'МРТ',
    category: 'imaging',
    synonyms: ['magnetic resonance imaging', 'МРТ'],
    linkedEndpointTypes: ['efficacy'],
    metadata: { duration: 60, fasting: false },
  },
  {
    id: 'proc_ultrasound',
    name: 'Ultrasound',
    nameRu: 'УЗИ',
    category: 'imaging',
    synonyms: ['US', 'sonography', 'УЗИ'],
    linkedEndpointTypes: ['efficacy', 'safety'],
    metadata: { duration: 30, fasting: false },
  },
  {
    id: 'proc_dexa_scan',
    name: 'DEXA Scan',
    nameRu: 'Денситометрия',
    category: 'imaging',
    synonyms: ['bone density', 'DXA', 'денситометрия'],
    linkedEndpointTypes: ['osteoporosis'],
    metadata: { duration: 20, fasting: false },
  },

  // ===== PK/PD =====
  {
    id: 'proc_pk_blood_draw',
    name: 'PK Blood Draw',
    nameRu: 'Забор крови для ФК',
    category: 'pk',
    synonyms: ['pharmacokinetic sampling', 'PK sample', 'ФК забор'],
    linkedEndpointTypes: ['pharmacokinetics'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_pk_sparse_sampling',
    name: 'PK Sparse Sampling',
    nameRu: 'Разреженный ФК забор',
    category: 'pk',
    synonyms: ['sparse PK', 'разреженный ФК'],
    linkedEndpointTypes: ['pharmacokinetics'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_pk_intensive_sampling',
    name: 'PK Intensive Sampling',
    nameRu: 'Интенсивный ФК забор',
    category: 'pk',
    synonyms: ['intensive PK', 'интенсивный ФК'],
    linkedEndpointTypes: ['pharmacokinetics'],
    metadata: { duration: 30, fasting: false },
  },
  {
    id: 'proc_pd_biomarker',
    name: 'PD Biomarker',
    nameRu: 'ФД биомаркер',
    category: 'pd',
    synonyms: ['pharmacodynamic marker', 'ФД маркер'],
    linkedEndpointTypes: ['pharmacodynamics'],
    metadata: { duration: 5, fasting: false },
  },

  // ===== QUESTIONNAIRES =====
  {
    id: 'proc_sf36',
    name: 'SF-36 Questionnaire',
    nameRu: 'Опросник SF-36',
    category: 'questionnaire',
    synonyms: ['Short Form 36', 'SF36'],
    linkedEndpointTypes: ['quality_of_life'],
    metadata: { duration: 15, fasting: false },
  },
  {
    id: 'proc_eq5d',
    name: 'EQ-5D Questionnaire',
    nameRu: 'Опросник EQ-5D',
    category: 'questionnaire',
    synonyms: ['EuroQol', 'EQ5D'],
    linkedEndpointTypes: ['quality_of_life'],
    metadata: { duration: 10, fasting: false },
  },
  {
    id: 'proc_vas_pain',
    name: 'VAS Pain Scale',
    nameRu: 'ВАШ боли',
    category: 'questionnaire',
    synonyms: ['visual analog scale', 'VAS', 'ВАШ'],
    linkedEndpointTypes: ['pain'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_beck_depression',
    name: 'Beck Depression Inventory',
    nameRu: 'Шкала депрессии Бека',
    category: 'questionnaire',
    synonyms: ['BDI', 'Beck'],
    linkedEndpointTypes: ['depression'],
    metadata: { duration: 10, fasting: false },
  },
  {
    id: 'proc_mmse',
    name: 'Mini-Mental State Examination',
    nameRu: 'MMSE',
    category: 'questionnaire',
    synonyms: ['MMSE', 'cognitive test'],
    linkedEndpointTypes: ['cognition'],
    metadata: { duration: 15, fasting: false },
  },

  // ===== ADVERSE EVENTS =====
  {
    id: 'proc_ae_assessment',
    name: 'Adverse Event Assessment',
    nameRu: 'Оценка нежелательных явлений',
    category: 'adverse_events',
    synonyms: ['AE assessment', 'AE review', 'оценка НЯ'],
    linkedEndpointTypes: ['safety'],
    metadata: { duration: 10, fasting: false },
  },
  {
    id: 'proc_sae_reporting',
    name: 'Serious Adverse Event Reporting',
    nameRu: 'Регистрация серьезных НЯ',
    category: 'adverse_events',
    synonyms: ['SAE', 'serious AE', 'СНЯ'],
    linkedEndpointTypes: ['safety'],
    metadata: { duration: 30, fasting: false },
  },

  // ===== CONCOMITANT MEDICATIONS =====
  {
    id: 'proc_conmed_review',
    name: 'Concomitant Medication Review',
    nameRu: 'Обзор сопутствующей терапии',
    category: 'concomitant_meds',
    synonyms: ['conmed', 'medication review', 'сопутствующая терапия'],
    linkedEndpointTypes: ['safety'],
    metadata: { duration: 10, fasting: false },
  },

  // ===== PREGNANCY TEST =====
  {
    id: 'proc_pregnancy_test_urine',
    name: 'Urine Pregnancy Test',
    nameRu: 'Тест на беременность (моча)',
    category: 'safety',
    synonyms: ['UPT', 'pregnancy test', 'тест на беременность'],
    linkedEndpointTypes: ['safety'],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_pregnancy_test_serum',
    name: 'Serum Pregnancy Test',
    nameRu: 'Тест на беременность (кровь)',
    category: 'safety',
    synonyms: ['beta-HCG', 'serum pregnancy', 'бета-ХГЧ'],
    standardCode: { system: 'LOINC', code: '21198-7' },
    linkedEndpointTypes: ['safety'],
    metadata: { duration: 5, fasting: false },
  },

  // ===== ADDITIONAL COMMON PROCEDURES =====
  {
    id: 'proc_informed_consent',
    name: 'Informed Consent',
    nameRu: 'Информированное согласие',
    category: 'other',
    synonyms: ['ICF', 'consent', 'согласие'],
    linkedEndpointTypes: [],
    metadata: { duration: 30, fasting: false },
  },
  {
    id: 'proc_inclusion_exclusion',
    name: 'Inclusion/Exclusion Criteria',
    nameRu: 'Критерии включения/исключения',
    category: 'other',
    synonyms: ['eligibility', 'критерии'],
    linkedEndpointTypes: [],
    metadata: { duration: 15, fasting: false },
  },
  {
    id: 'proc_randomization',
    name: 'Randomization',
    nameRu: 'Рандомизация',
    category: 'other',
    synonyms: ['randomisation', 'рандомизация'],
    linkedEndpointTypes: [],
    metadata: { duration: 5, fasting: false },
  },
  {
    id: 'proc_drug_dispensing',
    name: 'Drug Dispensing',
    nameRu: 'Выдача препарата',
    category: 'other',
    synonyms: ['IMP dispensing', 'выдача ИМП'],
    linkedEndpointTypes: [],
    metadata: { duration: 10, fasting: false },
  },
  {
    id: 'proc_drug_accountability',
    name: 'Drug Accountability',
    nameRu: 'Учет препарата',
    category: 'other',
    synonyms: ['IMP accountability', 'учет ИМП'],
    linkedEndpointTypes: [],
    metadata: { duration: 10, fasting: false },
  },
  {
    id: 'proc_compliance_check',
    name: 'Compliance Check',
    nameRu: 'Проверка комплаентности',
    category: 'other',
    synonyms: ['adherence', 'compliance', 'комплаентность'],
    linkedEndpointTypes: [],
    metadata: { duration: 5, fasting: false },
  },
]

/**
 * Get procedure by ID
 */
export function getProcedureById(id: string): ProcedureCatalogEntry | undefined {
  return PROCEDURE_CATALOG.find(p => p.id === id)
}

/**
 * Get procedures by category
 */
export function getProceduresByCategory(category: ProcedureCategory): ProcedureCatalogEntry[] {
  return PROCEDURE_CATALOG.filter(p => p.category === category)
}

/**
 * Search procedures by name or synonym
 */
export function searchProcedures(query: string): ProcedureCatalogEntry[] {
  const lowerQuery = query.toLowerCase()
  
  return PROCEDURE_CATALOG.filter(proc => {
    // Check name
    if (proc.name.toLowerCase().includes(lowerQuery)) return true
    if (proc.nameRu?.toLowerCase().includes(lowerQuery)) return true
    
    // Check synonyms
    if (proc.synonyms.some(syn => syn.toLowerCase().includes(lowerQuery))) return true
    
    return false
  })
}

/**
 * Get procedures for endpoint type
 */
export function getProceduresForEndpoint(endpointType: string): ProcedureCatalogEntry[] {
  return PROCEDURE_CATALOG.filter(proc =>
    proc.linkedEndpointTypes?.includes(endpointType)
  )
}

/**
 * Get catalog statistics
 */
export function getCatalogStats(): {
  total: number
  byCategory: Record<ProcedureCategory, number>
  withStandardCodes: number
  withEndpointLinks: number
} {
  const byCategory: Record<string, number> = {}
  let withStandardCodes = 0
  let withEndpointLinks = 0

  PROCEDURE_CATALOG.forEach(proc => {
    byCategory[proc.category] = (byCategory[proc.category] || 0) + 1
    if (proc.standardCode) withStandardCodes++
    if (proc.linkedEndpointTypes && proc.linkedEndpointTypes.length > 0) withEndpointLinks++
  })

  return {
    total: PROCEDURE_CATALOG.length,
    byCategory: byCategory as Record<ProcedureCategory, number>,
    withStandardCodes,
    withEndpointLinks,
  }
}
