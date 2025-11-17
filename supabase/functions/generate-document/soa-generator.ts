/**
 * SOA GENERATOR - Schedule of Activities auto-generation
 * Based on ICH E6 (R2) Good Clinical Practice
 */

/**
 * Study Visit definition
 */
export interface StudyVisit {
  id: string
  label: string
  day?: number | string
  window?: string
  period: 'screening' | 'baseline' | 'treatment' | 'followup' | 'eos'
}

/**
 * Procedure definition
 */
export interface Procedure {
  id: string
  label: string
  category: 'efficacy' | 'safety' | 'other'
}

/**
 * Schedule of Activities
 */
export interface SOA {
  visits: StudyVisit[]
  procedures: Procedure[]
  matrix: Record<string, Record<string, string>>
}

/**
 * Build SOA from synopsis/project data
 * This is a template-based approach - can be customized per indication/phase
 */
export function buildSOAFromSynopsis(context: any): SOA {
  const phase = context.project?.phase || 'Phase 2'
  const indication = context.project?.indication || ''
  
  // Default visits structure (can be customized based on phase/indication)
  const visits: StudyVisit[] = [
    {
      id: 'SCR',
      label: 'Screening',
      day: '-14 to 0',
      period: 'screening',
    },
    {
      id: 'D0',
      label: 'Day 0 / Randomization',
      day: 0,
      period: 'baseline',
    },
    {
      id: 'W1',
      label: 'Week 1',
      day: 7,
      window: '±2 days',
      period: 'treatment',
    },
    {
      id: 'W2',
      label: 'Week 2',
      day: 14,
      window: '±2 days',
      period: 'treatment',
    },
    {
      id: 'W4',
      label: 'Week 4',
      day: 28,
      window: '±3 days',
      period: 'treatment',
    },
    {
      id: 'W8',
      label: 'Week 8',
      day: 56,
      window: '±3 days',
      period: 'treatment',
    },
    {
      id: 'W12',
      label: 'Week 12',
      day: 84,
      window: '±3 days',
      period: 'followup',
    },
    {
      id: 'EOS',
      label: 'End of Study',
      day: 'Week 12 or Early Termination',
      period: 'eos',
    },
  ]

  // Standard procedures (ICH E6 compliant)
  const procedures: Procedure[] = [
    { id: 'informed_consent', label: 'Informed Consent', category: 'other' },
    { id: 'inclusion_exclusion', label: 'Inclusion/Exclusion Criteria', category: 'other' },
    { id: 'demographics', label: 'Demographics', category: 'other' },
    { id: 'medical_history', label: 'Medical History', category: 'other' },
    { id: 'physical_exam', label: 'Physical Examination', category: 'safety' },
    { id: 'vital_signs', label: 'Vital Signs', category: 'safety' },
    { id: 'ecg', label: 'ECG (12-lead)', category: 'safety' },
    { id: 'labs_hematology', label: 'Hematology', category: 'safety' },
    { id: 'labs_chemistry', label: 'Clinical Chemistry', category: 'safety' },
    { id: 'labs_urinalysis', label: 'Urinalysis', category: 'safety' },
    { id: 'pregnancy_test', label: 'Pregnancy Test (WOCBP)', category: 'safety' },
    { id: 'efficacy_primary', label: 'Primary Efficacy Assessment', category: 'efficacy' },
    { id: 'efficacy_secondary', label: 'Secondary Efficacy Assessments', category: 'efficacy' },
    { id: 'qol', label: 'Quality of Life Questionnaire', category: 'efficacy' },
    { id: 'pk_sampling', label: 'PK Blood Sampling', category: 'other' },
    { id: 'ae_collection', label: 'Adverse Events Collection', category: 'safety' },
    { id: 'concomitant_meds', label: 'Concomitant Medications', category: 'other' },
    { id: 'drug_dispense', label: 'Study Drug Dispensing', category: 'other' },
    { id: 'drug_accountability', label: 'Drug Accountability', category: 'other' },
  ]

  // Initialize matrix
  const matrix: Record<string, Record<string, string>> = {}
  for (const proc of procedures) {
    matrix[proc.id] = {}
    for (const visit of visits) {
      matrix[proc.id][visit.id] = ''
    }
  }

  // Fill matrix with standard pattern
  // X = required, O = optional, blank = not done

  // Informed consent - screening only
  matrix['informed_consent']['SCR'] = 'X'

  // Inclusion/Exclusion - screening and baseline
  matrix['inclusion_exclusion']['SCR'] = 'X'
  matrix['inclusion_exclusion']['D0'] = 'X'

  // Demographics - screening
  matrix['demographics']['SCR'] = 'X'

  // Medical history - screening
  matrix['medical_history']['SCR'] = 'X'

  // Physical exam - screening, baseline, EOS
  matrix['physical_exam']['SCR'] = 'X'
  matrix['physical_exam']['D0'] = 'X'
  matrix['physical_exam']['EOS'] = 'X'

  // Vital signs - all visits
  for (const visit of visits) {
    matrix['vital_signs'][visit.id] = 'X'
  }

  // ECG - screening, baseline, W4, W8, EOS
  matrix['ecg']['SCR'] = 'X'
  matrix['ecg']['D0'] = 'X'
  matrix['ecg']['W4'] = 'X'
  matrix['ecg']['W8'] = 'X'
  matrix['ecg']['EOS'] = 'X'

  // Labs - screening, baseline, W4, W8, W12, EOS
  const labVisits = ['SCR', 'D0', 'W4', 'W8', 'W12', 'EOS']
  for (const visit of labVisits) {
    matrix['labs_hematology'][visit] = 'X'
    matrix['labs_chemistry'][visit] = 'X'
    matrix['labs_urinalysis'][visit] = 'X'
  }

  // Pregnancy test - screening, baseline, EOS (for WOCBP)
  matrix['pregnancy_test']['SCR'] = 'X'
  matrix['pregnancy_test']['D0'] = 'X'
  matrix['pregnancy_test']['EOS'] = 'X'

  // Efficacy assessments - baseline through follow-up
  const efficacyVisits = ['D0', 'W1', 'W2', 'W4', 'W8', 'W12', 'EOS']
  for (const visit of efficacyVisits) {
    matrix['efficacy_primary'][visit] = 'X'
    matrix['efficacy_secondary'][visit] = 'X'
  }

  // QoL - baseline, W4, W8, W12, EOS
  matrix['qol']['D0'] = 'X'
  matrix['qol']['W4'] = 'X'
  matrix['qol']['W8'] = 'X'
  matrix['qol']['W12'] = 'X'
  matrix['qol']['EOS'] = 'X'

  // PK sampling - baseline, W1, W2, W4 (optional, depends on study)
  matrix['pk_sampling']['D0'] = 'O'
  matrix['pk_sampling']['W1'] = 'O'
  matrix['pk_sampling']['W2'] = 'O'
  matrix['pk_sampling']['W4'] = 'O'

  // AE collection - from baseline onwards
  for (const visit of visits) {
    if (visit.period !== 'screening') {
      matrix['ae_collection'][visit.id] = 'X'
    }
  }

  // Concomitant meds - all visits
  for (const visit of visits) {
    matrix['concomitant_meds'][visit.id] = 'X'
  }

  // Drug dispense - baseline
  matrix['drug_dispense']['D0'] = 'X'

  // Drug accountability - treatment and follow-up visits
  matrix['drug_accountability']['W1'] = 'X'
  matrix['drug_accountability']['W2'] = 'X'
  matrix['drug_accountability']['W4'] = 'X'
  matrix['drug_accountability']['W8'] = 'X'
  matrix['drug_accountability']['EOS'] = 'X'

  return { visits, procedures, matrix }
}

/**
 * Render SOA as Markdown table for inclusion in Protocol
 */
export function renderSOAAsMarkdown(soa: SOA): string {
  // Build header row with visit labels
  const visitHeaders = soa.visits.map(v => {
    if (v.window) {
      return `${v.label}<br/>${v.window}`
    }
    return v.label
  }).join(' | ')
  
  const headerLine = `| Procedure | ${visitHeaders} |`
  const separatorLine = `| --- | ${soa.visits.map(() => '---').join(' | ')} |`

  // Build procedure rows
  const rows: string[] = []
  
  // Group by category
  const categories = {
    other: 'Administrative Procedures',
    safety: 'Safety Assessments',
    efficacy: 'Efficacy Assessments',
  }

  for (const [catKey, catLabel] of Object.entries(categories)) {
    const categoryProcs = soa.procedures.filter(p => p.category === catKey)
    if (categoryProcs.length > 0) {
      rows.push(`| **${catLabel}** | ${soa.visits.map(() => '').join(' | ')} |`)
      
      for (const proc of categoryProcs) {
        const cells = soa.visits.map(v => soa.matrix[proc.id][v.id] || '').join(' | ')
        rows.push(`| ${proc.label} | ${cells} |`)
      }
    }
  }

  return `## Schedule of Activities

${headerLine}
${separatorLine}
${rows.join('\n')}

**Legend:**
- **X** = Required
- **O** = Optional (if applicable)
- Blank = Not performed at this visit
- **WOCBP** = Women of childbearing potential
`
}
