/**
 * Validator Profiles
 * 
 * JSON rulesets for different document types.
 * Each profile defines validation rules specific to document type.
 * 
 * @module lib/validation/profiles
 */

// ============================================================================
// VALIDATION RULE TYPES
// ============================================================================

export interface ValidationRule {
  id: string
  name: string
  description: string
  severity: 'error' | 'warning' | 'info'
  category: 'completeness' | 'consistency' | 'compliance' | 'quality'
  check: (document: any) => ValidationResult
}

export interface ValidationResult {
  passed: boolean
  message?: string
  details?: any
  suggestions?: string[]
}

export interface ValidationProfile {
  document_type: string
  version: string
  rules: ValidationRule[]
  required_sections: string[]
  optional_sections: string[]
  metadata: {
    regulatory_standard?: string
    last_updated: string
    author: string
  }
}

// ============================================================================
// IB (INVESTIGATOR'S BROCHURE) PROFILE
// ============================================================================

export const IB_PROFILE: ValidationProfile = {
  document_type: 'IB',
  version: '1.0.0',
  required_sections: [
    'title_page',
    'table_of_contents',
    'summary',
    'introduction',
    'physical_chemical_pharmaceutical',
    'nonclinical_studies',
    'pharmacokinetics_metabolism',
    'pharmacodynamics',
    'clinical_studies',
    'adverse_events',
    'references',
  ],
  optional_sections: [
    'appendices',
    'abbreviations',
  ],
  rules: [
    {
      id: 'ib_001',
      name: 'Title Page Complete',
      description: 'Title page must include product name, sponsor, and date',
      severity: 'error',
      category: 'completeness',
      check: (doc) => {
        const hasTitle = doc.sections?.title_page?.content?.includes('product')
        const hasDate = doc.sections?.title_page?.content?.includes('date')
        return {
          passed: hasTitle && hasDate,
          message: hasTitle && hasDate ? 'Title page complete' : 'Title page missing required information',
          suggestions: !hasTitle ? ['Add product name'] : !hasDate ? ['Add document date'] : [],
        }
      },
    },
    {
      id: 'ib_002',
      name: 'Summary Present',
      description: 'Document must include executive summary',
      severity: 'error',
      category: 'completeness',
      check: (doc) => {
        const hasSummary = doc.sections?.summary?.content?.length > 100
        return {
          passed: hasSummary,
          message: hasSummary ? 'Summary present' : 'Summary missing or too short',
          suggestions: ['Add comprehensive summary (min 100 words)'],
        }
      },
    },
    {
      id: 'ib_003',
      name: 'Nonclinical Data',
      description: 'Must include nonclinical pharmacology and toxicology',
      severity: 'error',
      category: 'completeness',
      check: (doc) => {
        const hasNonclinical = doc.sections?.nonclinical_studies?.content?.length > 0
        return {
          passed: hasNonclinical,
          message: hasNonclinical ? 'Nonclinical data present' : 'Nonclinical data missing',
          suggestions: ['Add pharmacology studies', 'Add toxicology studies'],
        }
      },
    },
    {
      id: 'ib_004',
      name: 'Evidence References',
      description: 'All claims must be supported by evidence references',
      severity: 'warning',
      category: 'quality',
      check: (doc) => {
        const content = JSON.stringify(doc.sections)
        const evidenceCount = (content.match(/\[EV-\d{3}\]/g) || []).length
        const passed = evidenceCount >= 10
        return {
          passed,
          message: `Found ${evidenceCount} evidence references`,
          details: { evidence_count: evidenceCount },
          suggestions: evidenceCount < 10 ? ['Add more evidence references'] : [],
        }
      },
    },
  ],
  metadata: {
    regulatory_standard: 'ICH E6(R2)',
    last_updated: '2025-11-11',
    author: 'Asetria Validation Team',
  },
}

// ============================================================================
// PROTOCOL PROFILE
// ============================================================================

export const PROTOCOL_PROFILE: ValidationProfile = {
  document_type: 'Protocol',
  version: '1.0.0',
  required_sections: [
    'title_page',
    'synopsis',
    'introduction',
    'objectives',
    'study_design',
    'study_population',
    'treatment',
    'assessments',
    'statistical_methods',
    'ethics',
    'data_management',
  ],
  optional_sections: [
    'appendices',
    'references',
  ],
  rules: [
    {
      id: 'protocol_001',
      name: 'Primary Endpoint Defined',
      description: 'Primary endpoint must be clearly defined',
      severity: 'error',
      category: 'completeness',
      check: (doc) => {
        const hasEndpoint = doc.sections?.objectives?.content?.toLowerCase().includes('primary endpoint')
        return {
          passed: hasEndpoint,
          message: hasEndpoint ? 'Primary endpoint defined' : 'Primary endpoint not found',
          suggestions: ['Define primary endpoint in objectives section'],
        }
      },
    },
    {
      id: 'protocol_002',
      name: 'Sample Size Justified',
      description: 'Sample size must include statistical justification',
      severity: 'error',
      category: 'compliance',
      check: (doc) => {
        const content = doc.sections?.statistical_methods?.content || ''
        const hasJustification = content.includes('power') || content.includes('sample size')
        return {
          passed: hasJustification,
          message: hasJustification ? 'Sample size justified' : 'Sample size justification missing',
          suggestions: ['Add power analysis', 'Add sample size calculation'],
        }
      },
    },
  ],
  metadata: {
    regulatory_standard: 'ICH E6(R2) Section 6',
    last_updated: '2025-11-11',
    author: 'Asetria Validation Team',
  },
}

// ============================================================================
// CSR (CLINICAL STUDY REPORT) PROFILE
// ============================================================================

export const CSR_PROFILE: ValidationProfile = {
  document_type: 'CSR',
  version: '1.0.0',
  required_sections: [
    'title_page',
    'synopsis',
    'introduction',
    'objectives',
    'methods',
    'results',
    'discussion',
    'conclusions',
    'tables_figures',
    'appendices',
  ],
  optional_sections: [
    'references',
  ],
  rules: [
    {
      id: 'csr_001',
      name: 'Results Complete',
      description: 'Results must include primary and secondary endpoints',
      severity: 'error',
      category: 'completeness',
      check: (doc) => {
        const content = doc.sections?.results?.content || ''
        const hasPrimary = content.includes('primary')
        const hasSecondary = content.includes('secondary')
        return {
          passed: hasPrimary && hasSecondary,
          message: hasPrimary && hasSecondary ? 'Results complete' : 'Results incomplete',
          suggestions: !hasPrimary ? ['Add primary endpoint results'] : ['Add secondary endpoint results'],
        }
      },
    },
    {
      id: 'csr_002',
      name: 'Safety Data',
      description: 'Must include comprehensive safety data',
      severity: 'error',
      category: 'completeness',
      check: (doc) => {
        const content = doc.sections?.results?.content || ''
        const hasSafety = content.includes('adverse') || content.includes('safety')
        return {
          passed: hasSafety,
          message: hasSafety ? 'Safety data present' : 'Safety data missing',
          suggestions: ['Add adverse events section', 'Add safety analysis'],
        }
      },
    },
  ],
  metadata: {
    regulatory_standard: 'ICH E3',
    last_updated: '2025-11-11',
    author: 'Asetria Validation Team',
  },
}

// ============================================================================
// PROFILE REGISTRY
// ============================================================================

export const VALIDATION_PROFILES: Record<string, ValidationProfile> = {
  IB: IB_PROFILE,
  Protocol: PROTOCOL_PROFILE,
  CSR: CSR_PROFILE,
}

/**
 * Get validation profile for document type
 */
export function getValidationProfile(documentType: string): ValidationProfile | null {
  return VALIDATION_PROFILES[documentType] || null
}

/**
 * Validate document against profile
 */
export function validateDocument(document: any, profile: ValidationProfile): {
  passed: boolean
  errors: ValidationResult[]
  warnings: ValidationResult[]
  info: ValidationResult[]
  score: number
} {
  const results = profile.rules.map(rule => ({
    rule,
    result: rule.check(document),
  }))

  const errors = results.filter(r => r.rule.severity === 'error' && !r.result.passed)
  const warnings = results.filter(r => r.rule.severity === 'warning' && !r.result.passed)
  const info = results.filter(r => r.rule.severity === 'info' && !r.result.passed)

  const totalRules = profile.rules.length
  const passedRules = results.filter(r => r.result.passed).length
  const score = (passedRules / totalRules) * 100

  return {
    passed: errors.length === 0,
    errors: errors.map(e => e.result),
    warnings: warnings.map(w => w.result),
    info: info.map(i => i.result),
    score,
  }
}
