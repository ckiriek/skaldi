/**
 * Phase H.UI v3: Protocol Section Schema
 * 
 * Defines structure of protocol sections
 */

export type ProtocolSectionId =
  | 'title'
  | 'synopsis'
  | 'objectives'
  | 'endpoints'
  | 'study_design'
  | 'study_population'
  | 'eligibility'
  | 'treatments'
  | 'study_flow'
  | 'efficacy_assessments'
  | 'safety_assessments'
  | 'statistics'
  | 'admin'
  | 'ethics'
  | 'icf_summary'

export interface ProtocolSectionDefinition {
  id: ProtocolSectionId
  title: string
  required: boolean
  order: number
  dependsOn?: ProtocolSectionId[]
  usesEngines?: Array<'knowledge' | 'stats' | 'studyflow' | 'crossdoc'>
  description?: string
}

export const PROTOCOL_SECTIONS: ProtocolSectionDefinition[] = [
  {
    id: 'title',
    title: 'Title Page',
    required: true,
    order: 1,
    description: 'Protocol title, version, dates'
  },
  {
    id: 'synopsis',
    title: 'Synopsis',
    required: true,
    order: 2,
    usesEngines: ['knowledge', 'stats', 'studyflow'],
    description: 'Brief overview of the study'
  },
  {
    id: 'objectives',
    title: 'Objectives',
    required: true,
    order: 3,
    usesEngines: ['knowledge'],
    description: 'Primary and secondary objectives'
  },
  {
    id: 'endpoints',
    title: 'Endpoints',
    required: true,
    order: 4,
    dependsOn: ['objectives'],
    usesEngines: ['knowledge', 'stats'],
    description: 'Primary, secondary, and exploratory endpoints'
  },
  {
    id: 'study_design',
    title: 'Study Design',
    required: true,
    order: 5,
    usesEngines: ['knowledge', 'stats', 'studyflow'],
    description: 'Design type, blinding, randomization'
  },
  {
    id: 'study_population',
    title: 'Study Population',
    required: true,
    order: 6,
    usesEngines: ['knowledge'],
    description: 'Target population description'
  },
  {
    id: 'eligibility',
    title: 'Eligibility Criteria',
    required: true,
    order: 7,
    dependsOn: ['study_population'],
    usesEngines: ['knowledge'],
    description: 'Inclusion and exclusion criteria'
  },
  {
    id: 'treatments',
    title: 'Treatments',
    required: true,
    order: 8,
    usesEngines: ['knowledge'],
    description: 'Study treatments and dosing'
  },
  {
    id: 'study_flow',
    title: 'Study Flow',
    required: true,
    order: 9,
    dependsOn: ['study_design'],
    usesEngines: ['studyflow', 'crossdoc'],
    description: 'Visit schedule and procedures'
  },
  {
    id: 'efficacy_assessments',
    title: 'Efficacy Assessments',
    required: true,
    order: 10,
    dependsOn: ['endpoints'],
    usesEngines: ['knowledge'],
    description: 'Methods for efficacy evaluation'
  },
  {
    id: 'safety_assessments',
    title: 'Safety Assessments',
    required: true,
    order: 11,
    usesEngines: ['knowledge'],
    description: 'Safety monitoring and AE reporting'
  },
  {
    id: 'statistics',
    title: 'Statistical Considerations',
    required: true,
    order: 12,
    dependsOn: ['endpoints', 'study_design'],
    usesEngines: ['stats', 'crossdoc'],
    description: 'Sample size, analysis plan'
  },
  {
    id: 'admin',
    title: 'Administrative Aspects',
    required: true,
    order: 13,
    description: 'Regulatory, monitoring, data management'
  },
  {
    id: 'ethics',
    title: 'Ethical Considerations',
    required: true,
    order: 14,
    description: 'IRB/IEC, informed consent, confidentiality'
  },
  {
    id: 'icf_summary',
    title: 'ICF Summary',
    required: false,
    order: 15,
    dependsOn: ['ethics'],
    usesEngines: ['crossdoc'],
    description: 'Summary of informed consent form'
  }
]

/**
 * Get section by ID
 */
export function getSection(id: ProtocolSectionId): ProtocolSectionDefinition | undefined {
  return PROTOCOL_SECTIONS.find(s => s.id === id)
}

/**
 * Get sections that use specific engine
 */
export function getSectionsByEngine(engine: 'knowledge' | 'stats' | 'studyflow' | 'crossdoc'): ProtocolSectionDefinition[] {
  return PROTOCOL_SECTIONS.filter(s => s.usesEngines?.includes(engine))
}

/**
 * Get section dependencies
 */
export function getSectionDependencies(id: ProtocolSectionId): ProtocolSectionDefinition[] {
  const section = getSection(id)
  if (!section?.dependsOn) return []
  
  return section.dependsOn
    .map(depId => getSection(depId))
    .filter((s): s is ProtocolSectionDefinition => s !== undefined)
}

/**
 * Check if section is ready (dependencies completed)
 */
export function isSectionReady(
  id: ProtocolSectionId,
  completedSections: Set<ProtocolSectionId>
): boolean {
  const section = getSection(id)
  if (!section) return false
  
  if (!section.dependsOn || section.dependsOn.length === 0) {
    return true
  }
  
  return section.dependsOn.every(depId => completedSections.has(depId))
}
