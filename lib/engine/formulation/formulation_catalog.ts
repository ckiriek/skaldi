/**
 * Phase H.1: Formulation Catalog
 * 
 * Controlled vocabularies for dosage forms, routes, and formulation-specific indications
 */

import type { DosageForm, Route, FormulationIndicationMap, NormalizationRule } from './types'

/**
 * Dosage form synonyms and mappings
 */
export const DOSAGE_FORM_SYNONYMS: Record<string, DosageForm> = {
  // Tablets
  'tab': 'tablet',
  'tabs': 'tablet',
  'tableta': 'tablet',
  'таблетка': 'tablet',
  'film coated': 'film-coated tablet',
  'filmcoated': 'film-coated tablet',
  'fc tablet': 'film-coated tablet',
  
  // Capsules
  'cap': 'capsule',
  'caps': 'capsule',
  'капсула': 'capsule',
  
  // Vaginal forms
  'vaginal pessary': 'vaginal suppository',
  'pessary': 'vaginal suppository',
  'vaginal supp': 'vaginal suppository',
  'вагинальные свечи': 'vaginal suppository',
  'вагинальный крем': 'vaginal cream',
  'вагинальный гель': 'vaginal gel',
  
  // Injections
  'inj': 'injection',
  'injectable': 'injection',
  'инъекция': 'injection',
  'sc injection': 'subcutaneous injection',
  'im injection': 'intramuscular injection',
  'iv infusion': 'IV infusion',
  
  // Inhalation
  'inhaler': 'metered-dose inhaler',
  'mdi': 'metered-dose inhaler',
  'dpi': 'inhalation powder',
  'nebulizer': 'nebulizer solution',
  
  // Topical
  'oint': 'ointment',
  'мазь': 'ointment',
  'крем': 'cream',
  'гель': 'gel',
  
  // Ophthalmic
  'eye drop': 'eye drops',
  'eyedrops': 'eye drops',
  'opth solution': 'ophthalmic solution',
  'ophthalmic sol': 'ophthalmic solution',
  'eye solution': 'ophthalmic solution',
  'глазные капли': 'eye drops',
  
  // Nasal
  'nose spray': 'nasal spray',
  'nasal sol': 'nasal spray',
  'назальный спрей': 'nasal spray',
}

/**
 * Route synonyms and mappings
 */
export const ROUTE_SYNONYMS: Record<string, Route> = {
  // Oral
  'po': 'oral',
  'per os': 'oral',
  'by mouth': 'oral',
  'перорально': 'oral',
  
  // IV
  'iv': 'intravenous',
  'i.v.': 'intravenous',
  'внутривенно': 'intravenous',
  
  // IM
  'im': 'intramuscular',
  'i.m.': 'intramuscular',
  'внутримышечно': 'intramuscular',
  
  // SC
  'sc': 'subcutaneous',
  's.c.': 'subcutaneous',
  'subq': 'subcutaneous',
  'подкожно': 'subcutaneous',
  
  // Vaginal
  'intravaginal': 'vaginal',
  'pv': 'vaginal',
  'per vagina': 'vaginal',
  'вагинально': 'vaginal',
  
  // Topical
  'top': 'topical',
  'external': 'topical',
  'наружно': 'topical',
  
  // Ophthalmic
  'opth': 'ophthalmic',
  'eye': 'ophthalmic',
  'в глаза': 'ophthalmic',
  
  // Intranasal
  'nasal': 'intranasal',
  'nose': 'intranasal',
  'в нос': 'intranasal',
  
  // Rectal
  'pr': 'rectal',
  'per rectum': 'rectal',
  'ректально': 'rectal',
  
  // Inhalation
  'inh': 'inhalation',
  'inhaled': 'inhalation',
  'ингаляционно': 'inhalation',
}

/**
 * Unit normalization rules
 */
export const UNIT_NORMALIZATIONS: Record<string, { target: string; multiplier: number }> = {
  // Weight
  'g': { target: 'mg', multiplier: 1000 },
  'mcg': { target: 'mcg', multiplier: 1 },
  'μg': { target: 'mcg', multiplier: 1 },
  'ug': { target: 'mcg', multiplier: 1 },
  'mg': { target: 'mg', multiplier: 1 },
  'мг': { target: 'mg', multiplier: 1 }, // Russian
  
  // Volume concentration
  'g/ml': { target: 'mg/ml', multiplier: 1000 },
  'mcg/ml': { target: 'mcg/ml', multiplier: 1 },
  'mg/ml': { target: 'mg/ml', multiplier: 1 },
  'iu/ml': { target: 'IU/ml', multiplier: 1 },
  'units/ml': { target: 'IU/ml', multiplier: 1 },
  
  // IU
  'iu': { target: 'IU', multiplier: 1 },
  'IU': { target: 'IU', multiplier: 1 },
  'units': { target: 'IU', multiplier: 1 },
  'u': { target: 'IU', multiplier: 1 },
  
  // Percentage
  '%': { target: '%', multiplier: 1 },
}

/**
 * Common chemical salts to strip for INN extraction
 */
export const CHEMICAL_SALTS = [
  'hydrochloride',
  'hydrobromide',
  'sulfate',
  'phosphate',
  'sodium',
  'potassium',
  'calcium',
  'magnesium',
  'acetate',
  'citrate',
  'maleate',
  'fumarate',
  'succinate',
  'tartrate',
  'mesylate',
  'besylate',
  'erbumine',
  'arginine',
  'lysine',
  'tromethamine',
]

/**
 * Manufacturer terms to strip
 */
export const MANUFACTURER_TERMS = [
  'pharma',
  'pharmaceuticals',
  'labs',
  'laboratories',
  'inc',
  'ltd',
  'gmbh',
  'ag',
  'sa',
  'corp',
  'corporation',
  'company',
]

/**
 * Formulation-specific indication mappings
 */
export const FORMULATION_INDICATION_MAPS: FormulationIndicationMap[] = [
  // Vaginal forms → Gynecological indications
  {
    dosageForms: ['vaginal suppository', 'vaginal cream', 'vaginal gel', 'vaginal tablet', 'vaginal ring'],
    routes: ['vaginal', 'intravaginal'],
    indications: [
      'Bacterial Vaginosis',
      'Trichomonas Vaginalis',
      'Vulvovaginal Candidiasis',
      'Vaginitis',
      'Mixed Vaginal Infections',
      'Vaginal Atrophy',
      'Cervicitis',
    ],
    category: 'gynecological',
  },
  
  // Ophthalmic forms → Eye conditions
  {
    dosageForms: ['ophthalmic solution', 'ophthalmic ointment', 'eye drops'],
    routes: ['ophthalmic'],
    indications: [
      'Bacterial Conjunctivitis',
      'Keratitis',
      'Blepharitis',
      'Corneal Ulcer',
      'Ocular Inflammation',
      'Dry Eye Syndrome',
      'Glaucoma',
    ],
    category: 'ophthalmic',
  },
  
  // Inhalation forms → Respiratory conditions
  {
    dosageForms: ['inhalation powder', 'inhalation solution', 'metered-dose inhaler', 'nebulizer solution'],
    routes: ['inhalation'],
    indications: [
      'Asthma',
      'Chronic Obstructive Pulmonary Disease (COPD)',
      'Bronchospasm',
      'Cystic Fibrosis',
      'Chronic Bronchitis',
      'Emphysema',
    ],
    category: 'respiratory',
  },
  
  // Topical forms → Dermatological conditions
  {
    dosageForms: ['cream', 'ointment', 'gel', 'lotion', 'foam'],
    routes: ['topical'],
    indications: [
      'Atopic Dermatitis',
      'Psoriasis',
      'Eczema',
      'Acne Vulgaris',
      'Rosacea',
      'Fungal Skin Infections',
      'Bacterial Skin Infections',
      'Contact Dermatitis',
    ],
    category: 'dermatological',
  },
  
  // Nasal forms → Nasal/sinus conditions
  {
    dosageForms: ['nasal spray', 'nasal drops', 'nasal gel'],
    routes: ['intranasal'],
    indications: [
      'Allergic Rhinitis',
      'Nasal Congestion',
      'Sinusitis',
      'Rhinorrhea',
      'Seasonal Allergies',
    ],
    category: 'other',
  },
  
  // Rectal forms → GI/local conditions
  {
    dosageForms: ['rectal suppository', 'rectal cream', 'enema'],
    routes: ['rectal'],
    indications: [
      'Hemorrhoids',
      'Anal Fissures',
      'Proctitis',
      'Ulcerative Colitis (distal)',
      'Constipation',
    ],
    category: 'gastrointestinal',
  },
]

/**
 * Normalization rules for text cleaning
 */
export const NORMALIZATION_RULES: NormalizationRule[] = [
  // Strip manufacturer terms
  ...MANUFACTURER_TERMS.map(term => ({
    pattern: new RegExp(`\\b${term}\\b`, 'gi'),
    replacement: '',
    type: 'manufacturer' as const,
  })),
  
  // Strip common brand indicators
  { pattern: /\b(brand|trademark|tm|®|©)\b/gi, replacement: '', type: 'brand' },
  
  // Normalize whitespace
  { pattern: /\s+/g, replacement: ' ', type: 'synonym' },
  
  // Remove parentheses content (often brand names)
  { pattern: /\([^)]*\)/g, replacement: '', type: 'brand' },
  
  // Normalize hyphens
  { pattern: /[-–—]/g, replacement: '-', type: 'synonym' },
]

/**
 * Common INN patterns (for extraction)
 */
export const INN_PATTERNS = {
  // Ends with common suffixes
  antibiotics: /-cillin$|-mycin$|-cycline$|-oxacin$/i,
  antivirals: /-vir$/i,
  statins: /-statin$/i,
  betaBlockers: /-olol$/i,
  aceInhibitors: /-pril$/i,
  arbs: /-sartan$/i,
  diuretics: /-ide$/i,
  ppiProtonPumpInhibitors: /-prazole$/i,
}

/**
 * Get formulation-specific indications
 */
export function getFormulationIndications(
  dosageForm: DosageForm | null,
  route: Route | null
): string[] {
  if (!dosageForm && !route) return []
  
  for (const map of FORMULATION_INDICATION_MAPS) {
    const formMatches = dosageForm && map.dosageForms.includes(dosageForm)
    const routeMatches = route && map.routes.includes(route)
    
    if (formMatches || routeMatches) {
      return map.indications
    }
  }
  
  return []
}

/**
 * Check if formulation is local (non-systemic)
 */
export function isLocalFormulation(
  dosageForm: DosageForm | null,
  route: Route | null
): boolean {
  const localForms: DosageForm[] = [
    'vaginal suppository',
    'vaginal cream',
    'vaginal gel',
    'vaginal tablet',
    'vaginal ring',
    'ophthalmic solution',
    'ophthalmic ointment',
    'eye drops',
    'cream',
    'ointment',
    'gel',
    'lotion',
    'foam',
    'nasal spray',
    'nasal drops',
    'nasal gel',
    'rectal suppository',
    'rectal cream',
  ]
  
  const localRoutes: Route[] = [
    'vaginal',
    'intravaginal',
    'ophthalmic',
    'topical',
    'intranasal',
    'rectal',
  ]
  
  return (
    (dosageForm !== null && localForms.includes(dosageForm)) ||
    (route !== null && localRoutes.includes(route))
  )
}
