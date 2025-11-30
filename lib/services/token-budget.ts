/**
 * Token Budget Calculator
 * 
 * ⚠️ NOTE: TOKEN BUDGETING IS DISABLED
 * 
 * As of 2025-11-29, token budgeting has been removed from document generation.
 * The model now decides output length based on:
 * - Section complexity and regulatory requirements
 * - Available data richness
 * - Clinical documentation standards
 * 
 * This file is kept for:
 * - Section metadata (titles, IDs)
 * - Data source configuration (which sources to include)
 * - Priority hints for context building
 * 
 * The targetTokens, targetPages, completionTokens fields are NO LONGER USED
 * for limiting output. max_completion_tokens is set to 64000 globally.
 * 
 * Version: 2.0.0
 * Date: 2025-11-29
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SectionConfig {
  sectionId: string
  sectionTitle: string
  targetPages: number
  targetTokens: number
  contextTokens: number
  completionTokens: number
  reasoning_effort: 'none' | 'minimal' | 'low' | 'medium' | 'high'
  verbosity: 'low' | 'medium' | 'high'
  dataSources: string[]
  priority: string[]
  chunking?: {
    enabled: boolean
    chunkSize: number
    chunks: string[]
  }
}

export interface TokenBudget {
  total: number
  prompt: number
  completion: number
  context: {
    knowledgeGraph: number
    clinicalTrials: number
    safetyData: number
    fdaLabels: number
    literature: number
    ragReferences: number
    studyDesign: number
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Token estimation: 1 page ≈ 500 words ≈ 650-700 tokens
const TOKENS_PER_PAGE = 675

// GPT-5.1 constraints
const MAX_COMPLETION_TOKENS = 16000
const MAX_PROMPT_TOKENS = 128000

// ============================================================================
// SECTION CONFIGURATIONS
// ============================================================================

/**
 * IB (Investigator's Brochure) Section Configurations
 */
export const IB_SECTION_CONFIGS: Record<string, SectionConfig> = {
  'ib_title_page': {
    sectionId: 'ib_title_page',
    sectionTitle: 'Title Page',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 500,
    completionTokens: 700,
    reasoning_effort: 'minimal',
    verbosity: 'low',
    dataSources: ['knowledgeGraph'],
    priority: ['compound_name', 'sponsor', 'version']
  },
  
  'ib_toc': {
    sectionId: 'ib_toc',
    sectionTitle: 'Table of Contents',
    targetPages: 1,
    targetTokens: 500,
    contextTokens: 300,
    completionTokens: 500,
    reasoning_effort: 'minimal',
    verbosity: 'low',
    dataSources: [],
    priority: []
  },
  
  'ib_summary': {
    sectionId: 'ib_summary',
    sectionTitle: 'Summary',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 3000,
    completionTokens: 2000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'fdaLabels'],
    priority: ['chemistry', 'moa', 'indications', 'safety_overview']
  },
  
  'ib_introduction': {
    sectionId: 'ib_introduction',
    sectionTitle: 'Introduction',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 2000,
    completionTokens: 1400,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'fdaLabels'],
    priority: ['compound_name', 'class', 'indication', 'development_status']
  },
  
  'ib_physical_chemical': {
    sectionId: 'ib_physical_chemical',
    sectionTitle: 'Physical and Chemical Properties',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 2000,
    completionTokens: 1400,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph'],
    priority: ['chemistry', 'structure', 'properties']
  },
  
  'ib_nonclinical': {
    sectionId: 'ib_nonclinical',
    sectionTitle: 'Nonclinical Studies',
    targetPages: 5,
    targetTokens: 3400,
    contextTokens: 4000,
    completionTokens: 3400,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'fdaLabels', 'literature'],
    priority: ['pharmacology', 'toxicology', 'carcinogenicity']
  },
  
  'ib_pharmacodynamics': {
    sectionId: 'ib_pharmacodynamics',
    sectionTitle: 'Pharmacodynamics',
    targetPages: 6,
    targetTokens: 4000,
    contextTokens: 5000,
    completionTokens: 4000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'fdaLabels', 'literature'],
    priority: ['moa', 'target', 'pathway', 'dose_response']
  },
  
  'ib_pharmacokinetics': {
    sectionId: 'ib_pharmacokinetics',
    sectionTitle: 'Pharmacokinetics',
    targetPages: 10,
    targetTokens: 6750,
    contextTokens: 8000,
    completionTokens: 6750,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'fdaLabels', 'literature'],
    priority: ['absorption', 'distribution', 'metabolism', 'excretion', 'special_populations', 'ddi']
  },
  
  'ib_toxicology': {
    sectionId: 'ib_toxicology',
    sectionTitle: 'Toxicology',
    targetPages: 8,
    targetTokens: 5400,
    contextTokens: 6000,
    completionTokens: 5400,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'fdaLabels'],
    priority: ['acute_tox', 'repeat_dose', 'genotoxicity', 'carcinogenicity', 'reproductive']
  },
  
  'ib_clinical_studies': {
    sectionId: 'ib_clinical_studies',
    sectionTitle: 'Effects in Humans / Clinical Studies',
    targetPages: 40,
    targetTokens: 27000,
    contextTokens: 12000,
    completionTokens: 15000, // Max per chunk
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'clinicalTrials', 'fdaLabels', 'literature'],
    priority: ['phase3_pivotal', 'phase2_studies', 'phase1_studies', 'integrated_efficacy', 'integrated_safety'],
    chunking: {
      enabled: true,
      chunkSize: 7000,
      chunks: ['phase1', 'phase2', 'phase3_part1', 'phase3_part2', 'integrated']
    }
  },
  
  'ib_safety': {
    sectionId: 'ib_safety',
    sectionTitle: 'Safety and Tolerability',
    targetPages: 18,
    targetTokens: 12000,
    contextTokens: 10000,
    completionTokens: 12000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'safetyData', 'fdaLabels', 'clinicalTrials'],
    priority: ['common_aes', 'serious_aes', 'deaths', 'warnings', 'contraindications', 'ddi'],
    chunking: {
      enabled: true,
      chunkSize: 6000,
      chunks: ['overview_common_aes', 'serious_aes_deaths', 'warnings_contraindications']
    }
  }
}

/**
 * Protocol Section Configurations
 */
export const PROTOCOL_SECTION_CONFIGS: Record<string, SectionConfig> = {
  'protocol_title_page': {
    sectionId: 'protocol_title_page',
    sectionTitle: 'Title Page',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 500,
    completionTokens: 700,
    reasoning_effort: 'minimal',
    verbosity: 'low',
    dataSources: ['knowledgeGraph', 'studyDesign'],
    priority: ['protocol_title', 'protocol_number', 'sponsor']
  },
  
  'protocol_synopsis': {
    sectionId: 'protocol_synopsis',
    sectionTitle: 'Synopsis',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 3000,
    completionTokens: 2000,
    reasoning_effort: 'high' as const,
    verbosity: 'high' as const,
    dataSources: ['knowledgeGraph', 'studyDesign', 'clinicalTrials'],
    priority: ['objectives', 'design', 'population', 'endpoints', 'sample_size']
  },
  
  'protocol_introduction': {
    sectionId: 'protocol_introduction',
    sectionTitle: 'Introduction',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 3000,
    completionTokens: 2000,
    reasoning_effort: 'high' as const,
    verbosity: 'high' as const,
    dataSources: ['studyDesign', 'knowledgeGraph', 'fdaLabels', 'literature'],  // studyDesign FIRST for compound/indication/phase/sponsor
    priority: ['background', 'rationale', 'indication']
  },
  
  'protocol_objectives': {
    sectionId: 'protocol_objectives',
    sectionTitle: 'Study Objectives and Endpoints',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 2500,
    completionTokens: 2000,
    reasoning_effort: 'high' as const,
    verbosity: 'high' as const,
    dataSources: ['studyDesign', 'clinicalTrials'],
    priority: ['primary_objective', 'primary_endpoint', 'secondary_objectives', 'secondary_endpoints']
  },
  
  'protocol_study_design': {
    sectionId: 'protocol_study_design',
    sectionTitle: 'Study Design',
    targetPages: 5,
    targetTokens: 3400,
    contextTokens: 4000,
    completionTokens: 3400,
    reasoning_effort: 'high' as const,
    verbosity: 'high' as const,
    dataSources: ['studyDesign', 'clinicalTrials'],
    priority: ['design_type', 'blinding', 'randomization', 'arms', 'duration']
  },
  
  'protocol_population': {
    sectionId: 'protocol_population',
    sectionTitle: 'Study Population',
    targetPages: 4,
    targetTokens: 2700,
    contextTokens: 3500,
    completionTokens: 2700,
    reasoning_effort: 'high' as const,
    verbosity: 'high' as const,
    dataSources: ['studyDesign', 'clinicalTrials'],
    priority: ['inclusion', 'exclusion', 'sample_size']
  },
  
  'protocol_treatments': {
    sectionId: 'protocol_treatments',
    sectionTitle: 'Study Treatments',
    targetPages: 4,
    targetTokens: 2700,
    contextTokens: 3500,
    completionTokens: 2700,
    reasoning_effort: 'high' as const,
    verbosity: 'high' as const,
    dataSources: ['knowledgeGraph', 'studyDesign', 'fdaLabels'],
    priority: ['investigational_product', 'dosing', 'administration', 'comparator']
  },
  
  'protocol_procedures': {
    sectionId: 'protocol_procedures',
    sectionTitle: 'Study Procedures',
    targetPages: 18,
    targetTokens: 12000,
    contextTokens: 10000,
    completionTokens: 12000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'clinicalTrials'],
    priority: ['schedule_of_assessments', 'screening', 'treatment', 'follow_up'],
    chunking: {
      enabled: true,
      chunkSize: 6000,
      chunks: ['screening', 'treatment_visits', 'follow_up']
    }
  },
  
  'protocol_safety': {
    sectionId: 'protocol_safety',
    sectionTitle: 'Safety Assessments',
    targetPages: 6,
    targetTokens: 4000,
    contextTokens: 5000,
    completionTokens: 4000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'knowledgeGraph', 'safetyData', 'clinicalTrials'],  // studyDesign for compound context
    priority: ['adverse_events', 'safety_monitoring', 'stopping_rules']
  },
  
  'protocol_statistics': {
    sectionId: 'protocol_statistics',
    sectionTitle: 'Statistical Considerations',
    targetPages: 10,
    targetTokens: 6750,
    contextTokens: 7000,
    completionTokens: 6750,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'clinicalTrials'],
    priority: ['sample_size', 'analysis_populations', 'statistical_methods', 'interim_analysis']
  },
  
  'protocol_ethics': {
    sectionId: 'protocol_ethics',
    sectionTitle: 'Ethical and Regulatory Considerations',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 4000,
    completionTokens: 2000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign'],  // CRITICAL: Need study design for sponsor, phase, etc.
    priority: ['irb_approval', 'informed_consent', 'gcp_compliance']
  },
  
  // Additional sections from document_structure migration
  'protocol_eligibility_criteria': {
    sectionId: 'protocol_eligibility_criteria',
    sectionTitle: 'Selection of Study Population',
    targetPages: 4,
    targetTokens: 2700,
    contextTokens: 3500,
    completionTokens: 2700,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'clinicalTrials', 'fdaLabels'],
    priority: ['inclusion_criteria', 'exclusion_criteria', 'withdrawal_criteria']
  },
  
  'protocol_schedule_of_assessments': {
    sectionId: 'protocol_schedule_of_assessments',
    sectionTitle: 'Schedule of Assessments',
    targetPages: 6,
    targetTokens: 4000,
    contextTokens: 5000,
    completionTokens: 4000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'clinicalTrials'],
    priority: ['visit_schedule', 'assessments', 'procedures_by_visit']
  },
  
  'protocol_safety_monitoring': {
    sectionId: 'protocol_safety_monitoring',
    sectionTitle: 'Safety Monitoring and Reporting',
    targetPages: 5,
    targetTokens: 3400,
    contextTokens: 4500,
    completionTokens: 3400,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'safetyData', 'fdaLabels', 'clinicalTrials'],
    priority: ['ae_definitions', 'sae_reporting', 'dsmb', 'stopping_rules']
  }
}

/**
 * CSR (Clinical Study Report) Section Configurations
 */
export const CSR_SECTION_CONFIGS: Record<string, SectionConfig> = {
  'csr_synopsis': {
    sectionId: 'csr_synopsis',
    sectionTitle: 'Synopsis',
    targetPages: 5,
    targetTokens: 3400,
    contextTokens: 4000,
    completionTokens: 3400,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'studyDesign', 'clinicalTrials'],
    priority: ['study_design', 'results', 'conclusions']
  },
  
  'csr_efficacy': {
    sectionId: 'csr_efficacy',
    sectionTitle: 'Efficacy Results',
    targetPages: 30,
    targetTokens: 20000,
    contextTokens: 12000,
    completionTokens: 15000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['clinicalTrials', 'studyDesign'],
    priority: ['primary_endpoint', 'secondary_endpoints', 'subgroup_analyses'],
    chunking: {
      enabled: true,
      chunkSize: 7500,
      chunks: ['primary_endpoint', 'secondary_endpoints', 'subgroups']
    }
  },
  
  'csr_safety': {
    sectionId: 'csr_safety',
    sectionTitle: 'Safety Results',
    targetPages: 25,
    targetTokens: 17000,
    contextTokens: 12000,
    completionTokens: 15000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['safetyData', 'clinicalTrials'],
    priority: ['aes', 'saes', 'deaths', 'lab_abnormalities'],
    chunking: {
      enabled: true,
      chunkSize: 7000,
      chunks: ['overview_aes', 'saes_deaths', 'labs_vitals']
    }
  }
}

/**
 * ICF (Informed Consent Form) Section Configurations
 * Note: No token budgeting - all sections get max tokens (100000 context, 64000 completion)
 * ICF uses patient-friendly language at 8th grade reading level
 */
export const ICF_SECTION_CONFIGS: Record<string, SectionConfig> = {
  'icf_title': {
    sectionId: 'icf_title',
    sectionTitle: 'Title and Introduction',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'studyDesign', 'relatedDocuments'],
    priority: ['study_title', 'compound_name', 'indication', 'sponsor']
  },
  
  'icf_purpose': {
    sectionId: 'icf_purpose',
    sectionTitle: 'Purpose of the Study',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'studyDesign', 'fdaLabels', 'relatedDocuments'],
    priority: ['indication', 'mechanism_of_action', 'objectives']
  },
  
  'icf_procedures': {
    sectionId: 'icf_procedures',
    sectionTitle: 'Study Procedures',
    targetPages: 4,
    targetTokens: 2700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['visits', 'procedures', 'assessments', 'duration']
  },
  
  'icf_duration': {
    sectionId: 'icf_duration',
    sectionTitle: 'Duration of Participation',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['study_duration', 'treatment_duration', 'follow_up']
  },
  
  'icf_risks': {
    sectionId: 'icf_risks',
    sectionTitle: 'Risks and Discomforts',
    targetPages: 4,
    targetTokens: 2700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'safetyData', 'fdaLabels', 'relatedDocuments'],
    priority: ['adverse_events', 'serious_risks', 'pregnancy_risks', 'unknown_risks']
  },
  
  'icf_benefits': {
    sectionId: 'icf_benefits',
    sectionTitle: 'Potential Benefits',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'studyDesign', 'relatedDocuments'],
    priority: ['potential_benefits', 'no_guarantee']
  },
  
  'icf_alternatives': {
    sectionId: 'icf_alternatives',
    sectionTitle: 'Alternative Treatments',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['fdaLabels', 'knowledgeGraph'],
    priority: ['approved_treatments', 'standard_of_care']
  },
  
  'icf_confidentiality': {
    sectionId: 'icf_confidentiality',
    sectionTitle: 'Confidentiality',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign'],
    priority: ['data_protection', 'hipaa', 'record_access']
  },
  
  'icf_compensation': {
    sectionId: 'icf_compensation',
    sectionTitle: 'Compensation and Costs',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign'],
    priority: ['payment', 'costs', 'injury_compensation']
  },
  
  'icf_voluntary': {
    sectionId: 'icf_voluntary',
    sectionTitle: 'Voluntary Participation',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign'],
    priority: ['voluntary', 'withdrawal_rights', 'no_penalty']
  },
  
  'icf_contacts': {
    sectionId: 'icf_contacts',
    sectionTitle: 'Contact Information',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign'],
    priority: ['investigator', 'irb', 'emergency']
  },
  
  'icf_signature': {
    sectionId: 'icf_signature',
    sectionTitle: 'Signature Page',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign'],
    priority: ['consent_statement', 'signatures']
  }
}

/**
 * Synopsis Section Configurations
 * Note: No token budgeting - all sections get max tokens (100000 context, 16000 completion)
 */
export const SYNOPSIS_SECTION_CONFIGS: Record<string, SectionConfig> = {
  'synopsis_title': {
    sectionId: 'synopsis_title',
    sectionTitle: 'Title',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'studyDesign'],
    priority: ['compound_name', 'indication', 'phase', 'sponsor']
  },
  
  'synopsis_rationale': {
    sectionId: 'synopsis_rationale',
    sectionTitle: 'Rationale',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'fdaLabels', 'literature', 'clinicalTrials'],
    priority: ['epidemiology', 'moa', 'unmet_need']
  },
  
  'synopsis_objectives': {
    sectionId: 'synopsis_objectives',
    sectionTitle: 'Objectives',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'knowledgeGraph'],
    priority: ['primary_objective', 'secondary_objectives']
  },
  
  'synopsis_design': {
    sectionId: 'synopsis_design',
    sectionTitle: 'Study Design',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'clinicalTrials'],
    priority: ['design_type', 'randomization', 'blinding', 'arms', 'duration']
  },
  
  'synopsis_population': {
    sectionId: 'synopsis_population',
    sectionTitle: 'Study Population',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'fdaLabels', 'clinicalTrials'],
    priority: ['inclusion', 'exclusion', 'sample_size']
  },
  
  'synopsis_treatments': {
    sectionId: 'synopsis_treatments',
    sectionTitle: 'Study Treatments',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'fdaLabels', 'knowledgeGraph'],
    priority: ['dosing', 'formulation', 'comparator']
  },
  
  'synopsis_endpoints': {
    sectionId: 'synopsis_endpoints',
    sectionTitle: 'Endpoints',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'clinicalTrials', 'knowledgeGraph'],
    priority: ['primary_endpoint', 'secondary_endpoints', 'safety_endpoints']
  },
  
  'synopsis_statistics': {
    sectionId: 'synopsis_statistics',
    sectionTitle: 'Statistical Methods',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'clinicalTrials'],
    priority: ['sample_size', 'primary_analysis', 'populations']
  }
}

/**
 * SPC (Summary of Product Characteristics) Section Configurations
 * Note: No token budgeting - all sections get max tokens
 */
export const SPC_SECTION_CONFIGS: Record<string, SectionConfig> = {
  'spc_name': {
    sectionId: 'spc_name',
    sectionTitle: 'Name of the Medicinal Product',
    targetPages: 1,
    targetTokens: 200,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'minimal',
    verbosity: 'low',
    dataSources: ['knowledgeGraph', 'fdaLabels'],
    priority: ['product_name', 'strength', 'form']
  },
  
  'spc_composition': {
    sectionId: 'spc_composition',
    sectionTitle: 'Qualitative and Quantitative Composition',
    targetPages: 1,
    targetTokens: 500,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'medium',
    dataSources: ['knowledgeGraph', 'fdaLabels'],
    priority: ['active_substance', 'excipients']
  },
  
  'spc_pharmaceutical_form': {
    sectionId: 'spc_pharmaceutical_form',
    sectionTitle: 'Pharmaceutical Form',
    targetPages: 1,
    targetTokens: 300,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'minimal',
    verbosity: 'low',
    dataSources: ['knowledgeGraph', 'fdaLabels'],
    priority: ['form', 'description']
  },
  
  'spc_indications': {
    sectionId: 'spc_indications',
    sectionTitle: 'Therapeutic Indications',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['knowledgeGraph', 'fdaLabels'],
    priority: ['indications', 'population']
  },
  
  'spc_posology': {
    sectionId: 'spc_posology',
    sectionTitle: 'Posology and Method of Administration',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['fdaLabels', 'knowledgeGraph'],
    priority: ['dosing', 'special_populations', 'administration']
  },
  
  'spc_contraindications': {
    sectionId: 'spc_contraindications',
    sectionTitle: 'Contraindications',
    targetPages: 1,
    targetTokens: 500,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'medium',
    dataSources: ['fdaLabels'],
    priority: ['contraindications']
  },
  
  'spc_warnings': {
    sectionId: 'spc_warnings',
    sectionTitle: 'Special Warnings and Precautions',
    targetPages: 4,
    targetTokens: 2700,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['fdaLabels', 'safetyData'],
    priority: ['warnings', 'precautions', 'monitoring']
  },
  
  'spc_interactions': {
    sectionId: 'spc_interactions',
    sectionTitle: 'Interaction with Other Medicinal Products',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['fdaLabels', 'knowledgeGraph'],
    priority: ['pk_interactions', 'pd_interactions']
  },
  
  'spc_fertility': {
    sectionId: 'spc_fertility',
    sectionTitle: 'Fertility, Pregnancy and Lactation',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['fdaLabels'],
    priority: ['pregnancy', 'lactation', 'fertility']
  },
  
  'spc_driving': {
    sectionId: 'spc_driving',
    sectionTitle: 'Effects on Ability to Drive',
    targetPages: 1,
    targetTokens: 300,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'minimal',
    verbosity: 'low',
    dataSources: ['fdaLabels', 'safetyData'],
    priority: ['driving_effects']
  },
  
  'spc_undesirable_effects': {
    sectionId: 'spc_undesirable_effects',
    sectionTitle: 'Undesirable Effects',
    targetPages: 4,
    targetTokens: 2700,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['fdaLabels', 'safetyData', 'clinicalTrials'],
    priority: ['adverse_reactions', 'frequencies']
  },
  
  'spc_overdose': {
    sectionId: 'spc_overdose',
    sectionTitle: 'Overdose',
    targetPages: 1,
    targetTokens: 500,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'medium',
    dataSources: ['fdaLabels'],
    priority: ['symptoms', 'management']
  },
  
  'spc_pharmacodynamics': {
    sectionId: 'spc_pharmacodynamics',
    sectionTitle: 'Pharmacodynamic Properties',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['fdaLabels', 'knowledgeGraph', 'clinicalTrials'],
    priority: ['moa', 'pd_effects', 'clinical_efficacy']
  },
  
  'spc_pharmacokinetics': {
    sectionId: 'spc_pharmacokinetics',
    sectionTitle: 'Pharmacokinetic Properties',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['fdaLabels', 'knowledgeGraph'],
    priority: ['absorption', 'distribution', 'metabolism', 'elimination']
  },
  
  'spc_preclinical': {
    sectionId: 'spc_preclinical',
    sectionTitle: 'Preclinical Safety Data',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'high',
    verbosity: 'medium',
    dataSources: ['fdaLabels'],
    priority: ['toxicology', 'carcinogenicity', 'reproductive']
  },
  
  'spc_pharmaceutical_particulars': {
    sectionId: 'spc_pharmaceutical_particulars',
    sectionTitle: 'Pharmaceutical Particulars',
    targetPages: 2,
    targetTokens: 1000,
    contextTokens: 100000,
    completionTokens: 16000,
    reasoning_effort: 'medium',
    verbosity: 'medium',
    dataSources: ['fdaLabels', 'knowledgeGraph'],
    priority: ['excipients', 'shelf_life', 'storage', 'packaging']
  }
}

/**
 * SAP (Statistical Analysis Plan) Section Configurations
 * Note: No token budgeting - all sections get max tokens (100000 context, 64000 completion)
 * SAP follows ICH E9 guidelines for statistical analysis plans
 */
export const SAP_SECTION_CONFIGS: Record<string, SectionConfig> = {
  'sap_title_page': {
    sectionId: 'sap_title_page',
    sectionTitle: 'Title Page',
    targetPages: 1,
    targetTokens: 500,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['protocol_number', 'compound_name', 'sponsor', 'version']
  },
  
  'sap_toc': {
    sectionId: 'sap_toc',
    sectionTitle: 'Table of Contents',
    targetPages: 1,
    targetTokens: 500,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'medium',
    verbosity: 'medium',
    dataSources: ['studyDesign'],
    priority: ['sections']
  },
  
  'sap_introduction': {
    sectionId: 'sap_introduction',
    sectionTitle: 'Introduction',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['purpose', 'scope', 'related_documents']
  },
  
  'sap_objectives_endpoints': {
    sectionId: 'sap_objectives_endpoints',
    sectionTitle: 'Study Objectives and Endpoints',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments', 'knowledgeGraph'],
    priority: ['primary_objective', 'primary_endpoint', 'secondary_endpoints', 'derivation_rules']
  },
  
  'sap_study_design': {
    sectionId: 'sap_study_design',
    sectionTitle: 'Study Design Overview',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments', 'clinicalTrials'],
    priority: ['design_type', 'randomization', 'blinding', 'sample_size']
  },
  
  'sap_analysis_populations': {
    sectionId: 'sap_analysis_populations',
    sectionTitle: 'Analysis Populations',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['itt', 'mitt', 'pp', 'safety_population']
  },
  
  'sap_statistical_methods': {
    sectionId: 'sap_statistical_methods',
    sectionTitle: 'Statistical Methods',
    targetPages: 4,
    targetTokens: 2700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments', 'clinicalTrials'],
    priority: ['general_methods', 'missing_data', 'multiplicity', 'covariates']
  },
  
  'sap_primary_analysis': {
    sectionId: 'sap_primary_analysis',
    sectionTitle: 'Analysis of Primary Endpoint',
    targetPages: 4,
    targetTokens: 2700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments', 'clinicalTrials'],
    priority: ['primary_model', 'sensitivity_analyses', 'supportive_analyses']
  },
  
  'sap_secondary_analysis': {
    sectionId: 'sap_secondary_analysis',
    sectionTitle: 'Analysis of Secondary Endpoints',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['key_secondary', 'other_secondary', 'methods_by_type']
  },
  
  'sap_safety_analysis': {
    sectionId: 'sap_safety_analysis',
    sectionTitle: 'Safety Analyses',
    targetPages: 4,
    targetTokens: 2700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'safetyData', 'fdaLabels', 'relatedDocuments'],
    priority: ['adverse_events', 'laboratory', 'vital_signs', 'exposure']
  },
  
  'sap_interim_analysis': {
    sectionId: 'sap_interim_analysis',
    sectionTitle: 'Interim Analysis',
    targetPages: 2,
    targetTokens: 1400,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['timing', 'alpha_spending', 'stopping_rules', 'dsmb']
  },
  
  'sap_changes_from_protocol': {
    sectionId: 'sap_changes_from_protocol',
    sectionTitle: 'Changes from Protocol',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'medium',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['deviations', 'rationale']
  },
  
  'sap_references': {
    sectionId: 'sap_references',
    sectionTitle: 'References',
    targetPages: 1,
    targetTokens: 700,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'medium',
    verbosity: 'medium',
    dataSources: ['literature'],
    priority: ['ich_guidelines', 'statistical_methods']
  },
  
  'sap_appendices': {
    sectionId: 'sap_appendices',
    sectionTitle: 'Appendices',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'medium',
    verbosity: 'high',
    dataSources: ['studyDesign'],
    priority: ['abbreviations', 'programming_specs', 'mock_tlf']
  }
}

/**
 * CRF (eCRF Specification) Section Configurations
 * CDISC CDASH compliant eCRF specification
 */
export const CRF_SECTION_CONFIGS: Record<string, SectionConfig> = {
  'crf_title_page': {
    sectionId: 'crf_title_page',
    sectionTitle: 'eCRF Specification Title Page',
    targetPages: 1,
    targetTokens: 500,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'medium',
    verbosity: 'medium',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['protocol_number', 'compound_name', 'sponsor']
  },
  'crf_toc': {
    sectionId: 'crf_toc',
    sectionTitle: 'Table of Contents',
    targetPages: 1,
    targetTokens: 400,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'low',
    verbosity: 'medium',
    dataSources: ['studyDesign'],
    priority: ['sections']
  },
  'crf_introduction': {
    sectionId: 'crf_introduction',
    sectionTitle: 'Introduction and Purpose',
    targetPages: 2,
    targetTokens: 1200,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'medium',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['purpose', 'standards', 'conventions']
  },
  'crf_study_overview': {
    sectionId: 'crf_study_overview',
    sectionTitle: 'Study Design Overview',
    targetPages: 2,
    targetTokens: 1200,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['design', 'arms', 'duration']
  },
  'crf_visit_schedule': {
    sectionId: 'crf_visit_schedule',
    sectionTitle: 'Visit Schedule and Windows',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments', 'studyFlow'],
    priority: ['visits', 'windows', 'forms_matrix']
  },
  'crf_screening_forms': {
    sectionId: 'crf_screening_forms',
    sectionTitle: 'Screening Visit Forms',
    targetPages: 4,
    targetTokens: 2500,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['consent', 'eligibility', 'labs']
  },
  'crf_baseline_forms': {
    sectionId: 'crf_baseline_forms',
    sectionTitle: 'Baseline Visit Forms',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['randomization', 'first_dose', 'baseline_efficacy']
  },
  'crf_treatment_forms': {
    sectionId: 'crf_treatment_forms',
    sectionTitle: 'Treatment Visit Forms',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['exposure', 'compliance', 'efficacy']
  },
  'crf_unscheduled_forms': {
    sectionId: 'crf_unscheduled_forms',
    sectionTitle: 'Unscheduled Visit Forms',
    targetPages: 1,
    targetTokens: 800,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'medium',
    verbosity: 'medium',
    dataSources: ['studyDesign'],
    priority: ['reason', 'safety_forms']
  },
  'crf_followup_forms': {
    sectionId: 'crf_followup_forms',
    sectionTitle: 'Follow-up Visit Forms',
    targetPages: 2,
    targetTokens: 1200,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['disposition', 'ae_followup']
  },
  'crf_demographics': {
    sectionId: 'crf_demographics',
    sectionTitle: 'Demographics (DM)',
    targetPages: 2,
    targetTokens: 1200,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign'],
    priority: ['cdash_dm', 'codelists']
  },
  'crf_medical_history': {
    sectionId: 'crf_medical_history',
    sectionTitle: 'Medical History (MH)',
    targetPages: 2,
    targetTokens: 1200,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'knowledgeGraph'],
    priority: ['cdash_mh', 'meddra', 'disease_history']
  },
  'crf_concomitant_meds': {
    sectionId: 'crf_concomitant_meds',
    sectionTitle: 'Concomitant Medications (CM)',
    targetPages: 2,
    targetTokens: 1200,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign'],
    priority: ['cdash_cm', 'who_drug', 'prohibited']
  },
  'crf_adverse_events': {
    sectionId: 'crf_adverse_events',
    sectionTitle: 'Adverse Events (AE)',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'safetyData'],
    priority: ['cdash_ae', 'meddra', 'sae', 'causality']
  },
  'crf_exposure': {
    sectionId: 'crf_exposure',
    sectionTitle: 'Study Drug Exposure (EX)',
    targetPages: 2,
    targetTokens: 1200,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['cdash_ex', 'dosing', 'modifications']
  },
  'crf_efficacy': {
    sectionId: 'crf_efficacy',
    sectionTitle: 'Efficacy Assessments (EF)',
    targetPages: 2,
    targetTokens: 1500,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['primary_endpoint', 'instruments', 'timing']
  },
  'crf_laboratory': {
    sectionId: 'crf_laboratory',
    sectionTitle: 'Laboratory Results (LB)',
    targetPages: 2,
    targetTokens: 1200,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign'],
    priority: ['cdash_lb', 'panels', 'ranges']
  },
  'crf_vital_signs': {
    sectionId: 'crf_vital_signs',
    sectionTitle: 'Vital Signs (VS)',
    targetPages: 1,
    targetTokens: 800,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'medium',
    verbosity: 'high',
    dataSources: ['studyDesign'],
    priority: ['cdash_vs', 'parameters']
  },
  'crf_physical_exam': {
    sectionId: 'crf_physical_exam',
    sectionTitle: 'Physical Examination (PE)',
    targetPages: 1,
    targetTokens: 800,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'medium',
    verbosity: 'high',
    dataSources: ['studyDesign'],
    priority: ['cdash_pe', 'systems']
  },
  'crf_edit_checks': {
    sectionId: 'crf_edit_checks',
    sectionTitle: 'Edit Checks and Validation Rules',
    targetPages: 4,
    targetTokens: 2500,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign', 'relatedDocuments'],
    priority: ['date_checks', 'eligibility_checks', 'safety_checks']
  },
  'crf_cdash_mapping': {
    sectionId: 'crf_cdash_mapping',
    sectionTitle: 'CDASH/SDTM Mapping',
    targetPages: 3,
    targetTokens: 2000,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: ['studyDesign'],
    priority: ['domain_mapping', 'usubjid', 'sdtm_conversion']
  },
  'crf_data_dictionary': {
    sectionId: 'crf_data_dictionary',
    sectionTitle: 'Data Dictionary',
    targetPages: 2,
    targetTokens: 1500,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'medium',
    verbosity: 'high',
    dataSources: ['studyDesign'],
    priority: ['codelists', 'dictionaries']
  },
  'crf_appendices': {
    sectionId: 'crf_appendices',
    sectionTitle: 'Appendices',
    targetPages: 2,
    targetTokens: 1000,
    contextTokens: 100000,
    completionTokens: 64000,
    reasoning_effort: 'low',
    verbosity: 'medium',
    dataSources: ['studyDesign'],
    priority: ['abbreviations', 'references']
  }
}

// ============================================================================
// TOKEN BUDGET CALCULATOR CLASS
// ============================================================================

export class TokenBudgetCalculator {
  /**
   * Get section configuration
   */
  getSectionConfig(documentType: string, sectionId: string): SectionConfig | null {
    const configs: Record<string, Record<string, SectionConfig>> = {
      'IB': IB_SECTION_CONFIGS,
      'Protocol': PROTOCOL_SECTION_CONFIGS,
      'CSR': CSR_SECTION_CONFIGS,
      'ICF': ICF_SECTION_CONFIGS,
      'Synopsis': SYNOPSIS_SECTION_CONFIGS,
      'SPC': SPC_SECTION_CONFIGS,
      'SAP': SAP_SECTION_CONFIGS,
      'CRF': CRF_SECTION_CONFIGS
    }
    
    const docConfigs = configs[documentType]
    if (!docConfigs) {
      console.warn(`⚠️  No configs for document type: ${documentType}`)
      return null
    }
    
    const config = docConfigs[sectionId]
    if (!config) {
      console.warn(`⚠️  No config for section: ${sectionId}`)
      return null
    }
    
    return config
  }
  
  /**
   * Calculate token budget for section
   */
  calculateBudget(
    documentType: string,
    sectionId: string,
    dataAvailability?: Record<string, boolean>
  ): TokenBudget {
    const config = this.getSectionConfig(documentType, sectionId)
    
    if (!config) {
      // Default budget
      return {
        total: 8000,
        prompt: 4000,
        completion: 4000,
        context: {
          knowledgeGraph: 600,
          clinicalTrials: 1000,
          safetyData: 800,
          fdaLabels: 800,
          literature: 400,
          ragReferences: 200,
          studyDesign: 200
        }
      }
    }
    
    // Allocate context tokens based on data sources
    const contextBudget = this.allocateContextBudget(
      config.contextTokens,
      config.dataSources,
      dataAvailability
    )
    
    return {
      total: config.contextTokens + config.completionTokens,
      prompt: config.contextTokens,
      completion: config.completionTokens,
      context: contextBudget
    }
  }
  
  /**
   * Allocate context budget across data sources
   */
  private allocateContextBudget(
    totalTokens: number,
    sources: string[],
    availability?: Record<string, boolean>
  ): TokenBudget['context'] {
    const weights: Record<string, number> = {
      knowledgeGraph: 0.15,
      clinicalTrials: 0.25,
      safetyData: 0.20,
      fdaLabels: 0.20,
      literature: 0.10,
      ragReferences: 0.05,
      studyDesign: 0.05
    }
    
    // Filter to only requested sources
    const activeWeights: Record<string, number> = {}
    let totalWeight = 0
    
    sources.forEach(source => {
      if (!availability || availability[source] !== false) {
        activeWeights[source] = weights[source] || 0.1
        totalWeight += activeWeights[source]
      }
    })
    
    // Normalize weights
    Object.keys(activeWeights).forEach(source => {
      activeWeights[source] = activeWeights[source] / totalWeight
    })
    
    // Allocate tokens
    return {
      knowledgeGraph: Math.floor(totalTokens * (activeWeights.knowledgeGraph || 0)),
      clinicalTrials: Math.floor(totalTokens * (activeWeights.clinicalTrials || 0)),
      safetyData: Math.floor(totalTokens * (activeWeights.safetyData || 0)),
      fdaLabels: Math.floor(totalTokens * (activeWeights.fdaLabels || 0)),
      literature: Math.floor(totalTokens * (activeWeights.literature || 0)),
      ragReferences: Math.floor(totalTokens * (activeWeights.ragReferences || 0)),
      studyDesign: Math.floor(totalTokens * (activeWeights.studyDesign || 0))
    }
  }
  
  /**
   * Get all section configs for a document type
   */
  getAllSectionConfigs(documentType: string): SectionConfig[] {
    const configs: Record<string, Record<string, SectionConfig>> = {
      'IB': IB_SECTION_CONFIGS,
      'Protocol': PROTOCOL_SECTION_CONFIGS,
      'CSR': CSR_SECTION_CONFIGS,
      'ICF': ICF_SECTION_CONFIGS,
      'Synopsis': SYNOPSIS_SECTION_CONFIGS,
      'SPC': SPC_SECTION_CONFIGS,
      'SAP': SAP_SECTION_CONFIGS,
      'CRF': CRF_SECTION_CONFIGS
    }
    
    const docConfigs = configs[documentType]
    if (!docConfigs) return []
    
    return Object.values(docConfigs)
  }
  
  /**
   * Calculate total document size
   */
  calculateDocumentSize(documentType: string): {
    totalPages: number
    totalTokens: number
    sections: number
  } {
    const configs = this.getAllSectionConfigs(documentType)
    
    const totalPages = configs.reduce((sum, c) => sum + c.targetPages, 0)
    const totalTokens = configs.reduce((sum, c) => sum + c.targetTokens, 0)
    
    return {
      totalPages,
      totalTokens,
      sections: configs.length
    }
  }
}
