import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info'
  message: string
  location?: string
  requirement?: string
}

interface ValidationResult {
  passed: boolean
  score: number
  issues: ValidationIssue[]
  summary: {
    errors: number
    warnings: number
    info: number
  }
}

interface GenerateRequest {
  projectId: string
  documentType: 'IB' | 'Protocol' | 'ICF' | 'Synopsis' | 'SAP' | 'CRF'
  userId: string
}

/**
 * REGULATORY CORE v1 - Centralized regulatory rules and validation patterns
 * Based on ICH E6 (R2), ICH E8 (R1), ICH E3, FDA 21 CFR Part 50
 */
const REGULATORY_CORE = {
  documentTypes: {
    SYNOPSIS: {
      requiredSections: [
        '1. SYNOPSIS HEADER',
        '2. STUDY RATIONALE',
        '3. STUDY OBJECTIVES',
        '4. STUDY DESIGN',
        '5. ENDPOINTS',
        '6. STUDY POPULATION',
        '7. TREATMENTS',
        '8. ASSESSMENTS',
        '9. STATISTICAL CONSIDERATIONS',
        '10. STUDY CONDUCT AND MONITORING',
      ],
      allowResults: false,
      allowQualitativeSafetyFromEvidence: true,
      allowQuantitativeOutcomes: false,
    },
    PROTOCOL: {
      requiredSections: [
        '1. TITLE PAGE AND PROTOCOL SYNOPSIS',
        '2. TABLE OF CONTENTS',
        '3. LIST OF ABBREVIATIONS',
        '4. INTRODUCTION',
        '5. STUDY OBJECTIVES AND ENDPOINTS',
        '6. STUDY DESIGN',
        '7. STUDY POPULATION',
        '8. STUDY TREATMENTS',
        '9. STUDY PROCEDURES AND ASSESSMENTS',
        '10. SAFETY MONITORING',
        '11. STATISTICAL CONSIDERATIONS',
        '12. QUALITY CONTROL AND QUALITY ASSURANCE',
        '13. ETHICAL AND REGULATORY CONSIDERATIONS',
        '14. STUDY ADMINISTRATION',
        '15. REFERENCES',
      ],
      allowResults: false,
      allowQualitativeSafetyFromEvidence: true,
      allowQuantitativeOutcomes: false,
    },
    IB: {
      requiredSections: [
        '3. SUMMARY',
        '4. INTRODUCTION',
        '5. PHYSICAL, CHEMICAL, AND PHARMACEUTICAL PROPERTIES AND FORMULATION',
        '6. NONCLINICAL STUDIES',
        '7. EFFECTS IN HUMANS',
        '8. SUMMARY AND GUIDANCE FOR THE INVESTIGATOR',
        '9. REFERENCES',
      ],
      allowResults: true,
      allowQualitativeSafetyFromEvidence: true,
      allowQuantitativeOutcomes: true,
    },
    ICF: {
      requiredSections: [
        '1. TITLE PAGE',
        '2. INTRODUCTION AND INVITATION',
        '3. PURPOSE OF THE STUDY',
        '4. WHAT WILL HAPPEN IF YOU TAKE PART',
        '5. RISKS AND DISCOMFORTS',
        '6. POSSIBLE BENEFITS',
        '7. ALTERNATIVES TO PARTICIPATION',
        '8. CONFIDENTIALITY',
        '9. COSTS AND PAYMENTS',
        '10. IN CASE OF INJURY',
        '11. YOUR RIGHTS',
        '12. CONTACT INFORMATION',
        '13. CONSENT AND SIGNATURES',
      ],
      allowResults: false,
      allowQualitativeSafetyFromEvidence: true,
      allowQuantitativeOutcomes: false,
    },
  },

  placeholders: [
    /\[Insert[^\]]*\]/gi,
    /\[TBD\]/gi,
    /\[To be determined\]/gi,
    /\[Placeholder\]/gi,
    /Investigational Compound(?! \w)/g,
    /Sponsor Name/g,
    /\[Sponsor\]/gi,
  ],

  forbiddenResultPatterns: [
    /p\s*=\s*[0-9\.]+/gi,
    /p-value/gi,
    /hazard ratio/gi,
    /HR\s*[0-9\.]+/gi,
    /confidence interval/gi,
    /CI\s*\(?[0-9]/gi,
    /odds ratio/gi,
    /OR\s*[0-9\.]+/gi,
    /risk ratio/gi,
    /RR\s*[0-9\.]+/gi,
    /AE[s]?:?\s*[0-9]{1,3}%/gi,
    /serious adverse event[s]?/gi,
    /death[s]?:?\s*[0-9]/gi,
    /median\s+[a-z ]+:\s*[0-9]/gi,
    /mean\s+[a-z ]+:\s*[0-9]/gi,
  ],

  forbiddenLanguage: [
    /demonstrate (efficacy|safety)/gi,
    /prove/gi,
    /ensure/gi,
    /guarantee/gi,
    /confirm/gi,
    /establish (superiority|efficacy)/gi,
    /expected to improve/gi,
    /will improve/gi,
    /will reduce/gi,
    /will show/gi,
    /likely to result/gi,
    /anticipated to/gi,
    /adequate power/gi,
    /powered to/gi,
    /detect a difference/gi,
    /detect treatment effect/gi,
    /robust/gi,
    /strong/gi,
    /significant benefit/gi,
    /meaningful benefit/gi,
  ],
} as const

// ============================================================================
// SOA GENERATOR - Schedule of Activities
// ============================================================================

interface StudyVisit {
  id: string
  label: string
  day?: number | string
  window?: string
  period: 'screening' | 'baseline' | 'treatment' | 'followup' | 'eos'
}

interface Procedure {
  id: string
  label: string
  category: 'efficacy' | 'safety' | 'other'
}

interface SOA {
  visits: StudyVisit[]
  procedures: Procedure[]
  matrix: Record<string, Record<string, string>>
}

function buildSOAFromSynopsis(context: any): SOA {
  const visits: StudyVisit[] = [
    { id: 'SCR', label: 'Screening', day: '-14 to 0', period: 'screening' },
    { id: 'D0', label: 'Day 0 / Randomization', day: 0, period: 'baseline' },
    { id: 'W1', label: 'Week 1', day: 7, window: '±2 days', period: 'treatment' },
    { id: 'W2', label: 'Week 2', day: 14, window: '±2 days', period: 'treatment' },
    { id: 'W4', label: 'Week 4', day: 28, window: '±3 days', period: 'treatment' },
    { id: 'W8', label: 'Week 8', day: 56, window: '±3 days', period: 'treatment' },
    { id: 'W12', label: 'Week 12', day: 84, window: '±3 days', period: 'followup' },
    { id: 'EOS', label: 'End of Study', day: 'Week 12 or Early Termination', period: 'eos' },
  ]

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

  const matrix: Record<string, Record<string, string>> = {}
  for (const proc of procedures) {
    matrix[proc.id] = {}
    for (const visit of visits) {
      matrix[proc.id][visit.id] = ''
    }
  }

  // Fill matrix
  matrix['informed_consent']['SCR'] = 'X'
  matrix['inclusion_exclusion']['SCR'] = 'X'
  matrix['inclusion_exclusion']['D0'] = 'X'
  matrix['demographics']['SCR'] = 'X'
  matrix['medical_history']['SCR'] = 'X'
  matrix['physical_exam']['SCR'] = 'X'
  matrix['physical_exam']['D0'] = 'X'
  matrix['physical_exam']['EOS'] = 'X'
  
  for (const visit of visits) {
    matrix['vital_signs'][visit.id] = 'X'
  }
  
  matrix['ecg']['SCR'] = 'X'
  matrix['ecg']['D0'] = 'X'
  matrix['ecg']['W4'] = 'X'
  matrix['ecg']['W8'] = 'X'
  matrix['ecg']['EOS'] = 'X'
  
  const labVisits = ['SCR', 'D0', 'W4', 'W8', 'W12', 'EOS']
  for (const visit of labVisits) {
    matrix['labs_hematology'][visit] = 'X'
    matrix['labs_chemistry'][visit] = 'X'
    matrix['labs_urinalysis'][visit] = 'X'
  }
  
  matrix['pregnancy_test']['SCR'] = 'X'
  matrix['pregnancy_test']['D0'] = 'X'
  matrix['pregnancy_test']['EOS'] = 'X'
  
  const efficacyVisits = ['D0', 'W1', 'W2', 'W4', 'W8', 'W12', 'EOS']
  for (const visit of efficacyVisits) {
    matrix['efficacy_primary'][visit] = 'X'
    matrix['efficacy_secondary'][visit] = 'X'
  }
  
  matrix['qol']['D0'] = 'X'
  matrix['qol']['W4'] = 'X'
  matrix['qol']['W8'] = 'X'
  matrix['qol']['W12'] = 'X'
  matrix['qol']['EOS'] = 'X'
  
  matrix['pk_sampling']['D0'] = 'O'
  matrix['pk_sampling']['W1'] = 'O'
  matrix['pk_sampling']['W2'] = 'O'
  matrix['pk_sampling']['W4'] = 'O'
  
  for (const visit of visits) {
    if (visit.period !== 'screening') {
      matrix['ae_collection'][visit.id] = 'X'
    }
  }
  
  for (const visit of visits) {
    matrix['concomitant_meds'][visit.id] = 'X'
  }
  
  matrix['drug_dispense']['D0'] = 'X'
  matrix['drug_accountability']['W1'] = 'X'
  matrix['drug_accountability']['W2'] = 'X'
  matrix['drug_accountability']['W4'] = 'X'
  matrix['drug_accountability']['W8'] = 'X'
  matrix['drug_accountability']['EOS'] = 'X'

  return { visits, procedures, matrix }
}

function renderSOAAsMarkdown(soa: SOA): string {
  const visitHeaders = soa.visits.map(v => {
    if (v.window) {
      return `${v.label}<br/>${v.window}`
    }
    return v.label
  }).join(' | ')
  
  const headerLine = `| Procedure | ${visitHeaders} |`
  const separatorLine = `| --- | ${soa.visits.map(() => '---').join(' | ')} |`

  const rows: string[] = []
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

// ============================================================================
// PROMPT BUILDERS V2 - Specialized prompts for each document type
// ============================================================================

function promptSynopsisV2(c: any): string {
  const evidenceSummary = c.evidenceSummaryForSynopsis || {}
  return `You are a senior clinical protocol writer with 15+ years of CRO/Pharma experience.
Generate a REGULATORY-COMPLIANT PROTOCOL SYNOPSIS (pre-study), strictly following ICH E6 (R2) and ICH E8 (R1).

⚠️ CRITICAL: This MUST be a PLANNED STUDY synopsis (pre-study document).
This is NOT a Clinical Study Report (CSR) synopsis.
You MUST NOT include any study results, outcomes, or completed data.

## CONTEXT
Study: ${c.projectTitle}
Compound: ${c.compoundName}
Indication: ${c.indication}
Phase: ${c.phase}
Sponsor: ${c.sponsor}
Product Type: ${c.productType}
Countries: ${c.countries?.join(', ') || 'Not specified'}

## EVIDENCE SUMMARY
- Similar trials: ${evidenceSummary.trialCount || 0}
- Publications: ${evidenceSummary.publicationCount || 0}
${evidenceSummary.typicalSampleSize ? `- Typical sample size range: ${evidenceSummary.typicalSampleSize.min}-${evidenceSummary.typicalSampleSize.max} (median: ${evidenceSummary.typicalSampleSize.median})` : ''}
${evidenceSummary.commonInterventionModels?.length ? `- Common intervention models: ${evidenceSummary.commonInterventionModels.join(', ')}` : ''}
${evidenceSummary.commonMasking?.length ? `- Common masking: ${evidenceSummary.commonMasking.join(', ')}` : ''}
${evidenceSummary.phases?.length ? `- Phases in evidence: ${evidenceSummary.phases.join(', ')}` : ''}

${evidenceSummary.exampleTrials?.length ? `### Example Trials (for design reference only):
${evidenceSummary.exampleTrials.slice(0, 3).map((t: any) => `- ${t.nct || 'N/A'}: ${t.title || 'Untitled'}${t.phase ? ` (Phase ${t.phase})` : ''}${t.status ? ` - ${t.status}` : ''}`).join('\n')}` : ''}

${evidenceSummary.examplePublications?.length ? `### Key Publications (for rationale):
${evidenceSummary.examplePublications.slice(0, 3).map((p: any) => `- PMID ${p.pmid || 'N/A'}: ${p.title || 'Untitled'}`).join('\n')}` : ''}

Use evidence ONLY for: typical sample sizes, common duration, common endpoints, design norms, scientific rationale.
Reference specific trials/publications when appropriate (e.g., "Based on NCT12345678..." or "As demonstrated in PMID 12345...").

❌ STRICTLY FORBIDDEN: p-values, HR, CI, OR, AE%, efficacy/safety results, statistical outcomes.

## MANDATORY RULES
1. COMPOUND NAME: Always use "${c.compoundName}"
2. SPONSOR NAME: Always use "${c.sponsor}"
3. NO PLACEHOLDERS
4. NO RESULTS: This is a PLANNED study

## STRUCTURE (ICH E6/E8)
1. SYNOPSIS HEADER
2. STUDY RATIONALE
3. STUDY OBJECTIVES
4. STUDY DESIGN
5. ENDPOINTS
6. STUDY POPULATION
7. TREATMENTS
8. ASSESSMENTS
9. STATISTICAL CONSIDERATIONS
10. STUDY CONDUCT AND MONITORING

Generate the complete Protocol Synopsis now.`
}

function promptProtocolV2(c: any): string {
  const evidenceSummary = c.evidenceSummaryForSynopsis || {}
  const soa = buildSOAFromSynopsis(c)
  const soaMarkdown = renderSOAAsMarkdown(soa)
  
  return `You are a senior clinical protocol writer with extensive experience in Phase ${c.phase} trials.
Generate a full Clinical Trial Protocol that complies with ICH E6 (R2) Section 6 and ICH E8 (R1).

This is a PLANNED protocol. You MUST NOT include study results, p-values, AE frequencies, or conclusions based on outcomes.

## STUDY CONTEXT
Study Title: ${c.projectTitle}
Compound: ${c.compoundName}
Indication: ${c.indication}
Phase: ${c.phase}
Sponsor: ${c.sponsor}
Product Type: ${c.productType}
Countries: ${c.countries?.join(', ') || 'Not specified'}

## EVIDENCE SUMMARY
- Similar trials: ${evidenceSummary.trialCount || 0}
- Publications: ${evidenceSummary.publicationCount || 0}
${evidenceSummary.typicalSampleSize ? `- Sample size range observed in evidence: ${evidenceSummary.typicalSampleSize.min}-${evidenceSummary.typicalSampleSize.max} (median: ${evidenceSummary.typicalSampleSize.median})` : ''}
${evidenceSummary.phases?.length ? `- Phases in evidence: ${evidenceSummary.phases.join(', ')}` : ''}

${evidenceSummary.exampleTrials?.length ? `### Example Trials (for design reference only):
${evidenceSummary.exampleTrials.slice(0, 3).map((t: any) => `- ${t.nct || 'N/A'}: ${t.title || 'Untitled'}${t.phase ? ` (Phase ${t.phase})` : ''}${t.status ? ` - ${t.status}` : ''}`).join('\n')}` : ''}

${evidenceSummary.examplePublications?.length ? `### Key Publications (for rationale and background):
${evidenceSummary.examplePublications.slice(0, 5).map((p: any) => `- PMID ${p.pmid || 'N/A'}: ${p.title || 'Untitled'}`).join('\n')}` : ''}

Use evidence ONLY for designing a realistic and feasible protocol. DO NOT copy or fabricate numerical results.
You SHOULD explicitly reference specific NCT IDs and PMIDs in the Introduction, Rationale, Study Design, Sample Size Justification, and References sections.

## MANDATORY RULES
1. COMPOUND NAME: Always use "${c.compoundName}"
2. SPONSOR NAME: Always use "${c.sponsor}"
3. NO PLACEHOLDERS: If information is not yet finalized, state "To be defined prior to first patient enrollment" (e.g., Principal Investigator name, protocol date), but DO NOT use generic placeholders like "[Insert ...]".
4. NO RESULTS: Do NOT describe observed outcomes, only planned analyses and endpoints.
5. EVIDENCE TRACEABILITY: Include at least one explicit sentence that cites concrete NCT IDs and PMIDs (e.g., "Based on NCT12345678 and NCT23456789...", "As summarized in PMID 30521516...") in the relevant sections.
6. SAFETY OPERATIONALITY: Define clear dose modification, interruption, and discontinuation rules for beta-blocker-specific risks (bradycardia, hypotension, worsening heart failure, bronchospasm, conduction disturbances) with concrete numeric thresholds where appropriate (e.g., HR <50 bpm, symptomatic SBP <90 mmHg).
7. PK DESIGN CLARITY: If pharmacokinetics are assessed, describe PK sampling timepoints, analytes, basic bioanalytical method (e.g., LC-MS/MS), and sample handling/storage conditions (e.g., processing and freezing requirements).
8. STATISTICAL TRANSPARENCY: Describe the sample size rationale, referencing the observed typical sample size range from evidence (if available), and specify which confidence intervals (e.g., 95% CI) will be reported for the primary endpoint.

## REQUIRED PROTOCOL STRUCTURE (ICH E6 Section 6)
1. TITLE PAGE AND PROTOCOL SYNOPSIS
2. TABLE OF CONTENTS
3. LIST OF ABBREVIATIONS
4. INTRODUCTION
   - Include brief background on the indication and compound.
   - Explicitly reference key NCT IDs and PMIDs that informed the design.
5. STUDY OBJECTIVES AND ENDPOINTS
6. STUDY DESIGN
   - Describe overall design (phase, randomization/open-label, arms, duration).
   - Justify design choices using the trials and publications listed above.
7. STUDY POPULATION
8. STUDY TREATMENTS
   - Describe dosing regimen, titration rules, and treatment duration.
9. STUDY PROCEDURES AND ASSESSMENTS
   - Include the following Schedule of Activities table in Section 9:

${soaMarkdown}

10. SAFETY MONITORING
    - Describe AE/SAE collection and reporting.
    - Include explicit dose modification and stopping rules for key safety risks.
11. STATISTICAL CONSIDERATIONS
    - Describe analysis sets (FAS, Safety Set, PK Set if applicable).
    - Provide a sample size rationale referencing the evidence-based sample size range above.
    - Specify the primary analysis approach (descriptive, model-based, etc.) and planned confidence intervals.
12. QUALITY CONTROL AND QUALITY ASSURANCE
13. ETHICAL AND REGULATORY CONSIDERATIONS
14. STUDY ADMINISTRATION
15. REFERENCES
    - List concrete NCT IDs and PMIDs used to inform the protocol.

Generate the complete Protocol in Markdown with precise, operational, audit-ready style suitable for CRO and sponsor review.

IMPORTANT: Use the Schedule of Activities table provided above in Section 9. Do not modify the table structure.`
}

function promptSAPV2(c: any): string {
  const evidenceSummary = c.evidenceSummaryForSynopsis || {}
  return `You are a senior biostatistician in a global CRO.
Generate a Statistical Analysis Plan (SAP) for a Phase ${c.phase} clinical trial.

The SAP MUST be consistent with the clinical trial protocol for "${c.projectTitle}" (${c.compoundName} for ${c.indication}) and follow ICH E6 (R2) and ICH E9 principles.

## STUDY CONTEXT
- Compound: ${c.compoundName}
- Indication: ${c.indication}
- Phase: ${c.phase}
- Sponsor: ${c.sponsor}
- Product Type: ${c.productType}
- Countries: ${c.countries?.join(', ') || 'Not specified'}

## EVIDENCE SUMMARY (FOR CONTEXT ONLY)
- Similar trials: ${evidenceSummary.trialCount || 0}
- Publications: ${evidenceSummary.publicationCount || 0}
${evidenceSummary.typicalSampleSize ? `- Typical sample size range: ${evidenceSummary.typicalSampleSize.min}-${evidenceSummary.typicalSampleSize.max} (median: ${evidenceSummary.typicalSampleSize.median})` : ''}
${evidenceSummary.phases?.length ? `- Phases in evidence: ${evidenceSummary.phases.join(', ')}` : ''}

If appropriate, you may reference key trials and publications in the background and sample size rationale (for example, by NCT ID or PMID), but you MUST NOT invent study results.

## MANDATORY RULES
1. This is a PLANNED SAP. Do NOT describe any observed results.
2. Do NOT present actual p-values, confidence intervals, or effect estimates. You may describe planned methods (for example: "a two-sided 95% confidence interval will be calculated for the mean change in SBP").
3. Align the analysis sets, endpoints, and visit structure with a typical Phase 4, single-arm resistant hypertension protocol (for example: FAS, Safety Set, PK Set; primary endpoint: change from baseline in BP at Week 12).
4. Use clear, technical, audit-ready language suitable for statisticians, regulators, and auditors.

## REQUIRED SAP STRUCTURE
1. TITLE PAGE
2. TABLE OF CONTENTS
3. LIST OF ABBREVIATIONS
4. INTRODUCTION AND STUDY OVERVIEW
   - Brief description of the study, including design (Phase 4, open-label, single-arm), population (resistant hypertension), and primary objective.
5. STUDY OBJECTIVES AND ENDPOINTS
   - List primary and secondary objectives and corresponding endpoints.
6. ANALYSIS POPULATIONS
   - Define Full Analysis Set (FAS), Safety Set, PK Set (if applicable), and any Per-Protocol Set.
7. GENERAL STATISTICAL CONSIDERATIONS
   - Level of significance (if any), confidence intervals to be reported (for example, 95% CI), general conventions (rounding, visit windows, analysis timepoints).
8. DESCRIPTION OF ENDPOINTS
   - Clearly define primary and secondary endpoints (for example, change from baseline in seated SBP/DBP at Week 12, responder rate, PK parameters).
9. PRIMARY EFFICACY ANALYSIS
   - Describe the primary endpoint, primary analysis set, timepoint, summary measures, and planned statistical methods (typically descriptive statistics and 95% CI for mean change).
10. SECONDARY EFFICACY ANALYSES
    - Describe planned analyses for diastolic BP, responder rate, and any other secondary endpoints.
11. SAFETY ANALYSES
    - Describe summaries of AEs and SAEs (by system organ class and preferred term, severity, relationship to study drug), vital signs, laboratory parameters, and ECGs.
12. PHARMACOKINETIC ANALYSES (if applicable)
    - Describe PK parameters (for example, Cmax, Tmax, AUC, t½), analysis set, and methods (for example, non-compartmental analysis).
13. HANDLING OF MISSING DATA AND PROTOCOL DEVIATIONS
    - Describe how missing data will be handled (for example, no imputation, observed cases) and how important protocol deviations will be identified and summarized.
14. SAMPLE SIZE CONSIDERATIONS
    - Provide a qualitative rationale for the planned sample size, optionally referencing typical sample sizes from similar studies (if available from evidenceSummary), without performing a full power calculation.
15. INTERIM ANALYSES
    - State whether any interim analyses are planned (for this type of Phase 4 single-arm study, typically "no interim analyses are planned").
16. TABLES, FIGURES, AND LISTINGS (TFLs)
    - Provide a high-level overview of the planned TFLs (for example, tables for baseline characteristics, primary endpoint summary, AEs; figures for BP change over time; key listings).

Generate the complete SAP in Markdown, ready for internal CRO and sponsor biostatistics review.`
}

function promptCRFV2(c: any): string {
  return `You are a senior clinical data manager in a global CRO.
Generate a Case Report Form (CRF) specification for a Phase ${c.phase} clinical trial.

The CRF MUST be consistent with the clinical trial protocol for "${c.projectTitle}" (${c.compoundName} for ${c.indication}) and aligned with ICH E6 (R2) and CDISC standards.

## STUDY CONTEXT
- Compound: ${c.compoundName}
- Indication: ${c.indication}
- Phase: ${c.phase}
- Sponsor: ${c.sponsor}
- Product Type: ${c.productType}
- Countries: ${c.countries?.join(', ') || 'Not specified'}

## MANDATORY RULES
1. This is a CRF SPECIFICATION (design document), not actual patient data.
2. Do NOT include any patient-specific data or results.
3. Structure the CRF by MODULES (Demographics, Medical History, Vitals, Labs, AEs, etc.) and VISITS (Screening, Day 0, Week 1, 2, 4, 8, 12, EOS).
4. For each module, list the FIELDS with data type (text, number, date, dropdown, checkbox), validation rules (ranges, required), and instructions.
5. Use clear, technical language suitable for data managers, CRAs, and EDC programmers.

## REQUIRED CRF STRUCTURE
1. TITLE PAGE
2. TABLE OF CONTENTS
3. LIST OF ABBREVIATIONS
4. INTRODUCTION
   - Brief description of the study and purpose of the CRF.
5. CRF COMPLETION GUIDELINES
   - General instructions for site staff on how to complete the CRF.
6. VISIT SCHEDULE
   - List all visits (Screening, Day 0, Week 1, 2, 4, 8, 12, EOS) with timepoints and windows.
7. CRF MODULES
   For each module, describe:
   - Module name and purpose
   - Fields (name, data type, validation, required/optional)
   - Instructions for completion
   
   Typical modules for a Phase 4 hypertension study:
   - Demographics (age, sex, race, ethnicity)
   - Medical History (prior conditions, medications)
   - Inclusion/Exclusion Criteria (checklist)
   - Vital Signs (BP, HR, temperature, weight, height)
   - Physical Examination
   - Laboratory Tests (hematology, chemistry, urinalysis)
   - ECG (12-lead)
   - Concomitant Medications
   - Adverse Events
   - Serious Adverse Events
   - Study Drug Accountability
   - Efficacy Assessments (BP measurements)
   - PK Sampling (if applicable)
   - Pregnancy Tests (for WOCBP)
   - End of Study

8. DATA VALIDATION RULES
   - Describe key validation rules (e.g., SBP range 80-250 mmHg, DBP range 40-150 mmHg, date formats, required fields).

9. QUERY MANAGEMENT
   - Describe how data queries will be handled.

Generate the complete CRF specification in Markdown, ready for EDC programming and site training.`
}

function promptIBV2(c: any): string {
  const evidenceSummary = c.evidenceSummaryForIB || {}
  return `You are an expert medical writer specializing in Investigator's Brochures for global clinical trials.
Generate an Investigator's Brochure (IB) aligned with ICH E6 (R2) Section 7.

This IB must summarize existing nonclinical and clinical data for ${c.compoundName}.
It is NOT a protocol and NOT a CSR. Do NOT fabricate data.

## CONTEXT
Compound: ${c.compoundName}
Indication: ${c.indication}
Phase: ${c.phase}
Sponsor: ${c.sponsor}
Product Type: ${c.productType}

## EVIDENCE SUMMARY
- Clinical trials: ${evidenceSummary.trialCount || 0}
- Publications: ${evidenceSummary.publicationCount || 0}
- Safety data sources: ${evidenceSummary.safetyDataCount || 0}
${evidenceSummary.phases?.length ? `- Phases in evidence: ${evidenceSummary.phases.join(', ')}` : ''}

${evidenceSummary.exampleTrials?.length ? `### Example Trials (for context):
${evidenceSummary.exampleTrials.slice(0, 3).map((t: any) => `- ${t.nct || 'N/A'}: ${t.title || 'Untitled'}${t.phase ? ` (Phase ${t.phase})` : ''}`).join('\n')}` : ''}

${evidenceSummary.examplePublications?.length ? `### Key Publications (cite these):
${evidenceSummary.examplePublications.slice(0, 5).map((p: any) => `- PMID ${p.pmid || 'N/A'}: ${p.title || 'Untitled'}`).join('\n')}` : ''}

## EVIDENCE USE POLICY
From PubMed publications: Summarize pharmacology, mechanism, nonclinical data, human PK/PD, safety profile qualitatively.
From safety data: Describe known or class-related risks.
From trials: Reference specific trials when discussing efficacy or safety (e.g., "as demonstrated in NCT12345678").

You MUST:
- Cite specific PMIDs in References section (e.g., "PMID 30521516")
- Reference trials by NCT ID when relevant
- Keep descriptions qualitative unless you have concrete values from publications
- Avoid inventing AE percentages, hazard ratios, p-values
- If not supported by evidence, write "Not adequately characterized in available data"

## MANDATORY STRUCTURE (ICH E6 Section 7)
1. TITLE PAGE (use current date, Version 1.0)
2. TABLE OF CONTENTS
3. SUMMARY
4. INTRODUCTION
5. PHYSICAL, CHEMICAL, AND PHARMACEUTICAL PROPERTIES AND FORMULATION
6. NONCLINICAL STUDIES
7. EFFECTS IN HUMANS
8. SUMMARY AND GUIDANCE FOR THE INVESTIGATOR
9. REFERENCES (cite specific PMIDs and NCT IDs)

## MANDATORY RULES
1. NO PLACEHOLDERS: Use actual dates (current date), Version 1.0, compound name "${c.compoundName}", sponsor "${c.sponsor}"
2. CITE SOURCES: Reference specific PMIDs and NCT IDs in References section
3. QUALITATIVE ONLY: No fabricated quantitative data unless from cited sources

Generate the complete IB in Markdown with clear distinction between nonclinical and clinical information.`
}

function promptICFV2(c: any): string {
  return `You are an expert in writing patient-facing Informed Consent Forms (ICFs) for clinical trials.
Generate an ICF that complies with FDA 21 CFR Part 50 and ICH E6 (R2).

The language MUST be clear, direct, and understandable at approximately 6th to 8th grade reading level.

## CONTEXT
Study Title: ${c.projectTitle}
Drug: ${c.compoundName}
Condition: ${c.indication}
Phase: ${c.phase}
Sponsor: ${c.sponsor}
Countries: ${c.countries?.join(', ') || 'Not specified'}

Assume the study uses a screening period plus a treatment period similar to the Protocol (for example, about 14 weeks total with several clinic visits). When describing visits in the ICF, use a simple, approximate description (for example, "about X months" and "about Y clinic visits"), but DO NOT use placeholders like "[insert duration]".

## USE OF EVIDENCE
You may use evidence ONLY to describe typical, known risks in simple language.
You MUST:
- Avoid technical terms or explain them in everyday language
- NOT include p-values, hazard ratios, or statistical concepts
- Use "common", "uncommon", "rare" instead of exact frequencies

## MANDATORY CONTENT STRUCTURE
1. TITLE PAGE
2. INTRODUCTION AND INVITATION
3. PURPOSE OF THE STUDY
4. WHAT WILL HAPPEN IF YOU TAKE PART
   - Clearly describe approximately how long the study will last (for example, "about 3–4 months") and how many times the person will visit the clinic.
   - Explain in simple terms that there will be blood tests, blood pressure checks, possible heart tracing (ECG), and questions about how the person feels.
5. RISKS AND DISCOMFORTS
   - Describe common, uncommon, and rare side effects of ${c.compoundName} in plain language.
6. POSSIBLE BENEFITS
7. ALTERNATIVES TO PARTICIPATION
8. CONFIDENTIALITY
9. COSTS AND PAYMENTS
10. IN CASE OF INJURY
11. YOUR RIGHTS
12. CONTACT INFORMATION
13. PREGNANCY AND BIRTH CONTROL (if the study involves women who can become pregnant)
   - In simple language, explain that:
     - if someone can become pregnant, they should use reliable birth control while in the study;
     - pregnancy tests may be done before and during the study;
     - if a participant becomes pregnant, they will stop taking the study drug and the study doctor will follow their health and the health of the baby.
14. CONSENT AND SIGNATURES

## LANGUAGE AND STYLE RULES
- Use "you" and "your", not "the subject".
- Avoid medical jargon; explain any necessary medical term in everyday language.
- No statistics, no p-values, no complex numbers.
- Be transparent about risks and uncertainty.
- Emphasize voluntariness and the right to withdraw at any time, without affecting regular medical care.
- DO NOT use placeholder text like "[insert ...]" anywhere in the ICF. If some details (for example, the exact name of the ethics board or phone number) are not known, write that these will be provided in the final version of the form.

Generate the complete ICF in Markdown, ready to be given directly to a patient.`
}

// ============================================================================
// MAIN EDGE FUNCTION
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Generate Document Request Started')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const requestBody = await req.json()
    console.log('📦 Request body:', JSON.stringify(requestBody))
    
    const { projectId, documentType, userId }: GenerateRequest = requestBody
    console.log(`📝 Parsed: projectId=${projectId}, documentType=${documentType}, userId=${userId}`)

    // 1. Fetch project data
    console.log('🔍 Step 1: Fetching project data...')
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError) {
      console.error('❌ Project fetch error:', projectError)
      throw new Error(`Failed to fetch project: ${projectError.message}`)
    }
    console.log('✅ Project fetched successfully')

    // 2. Fetch entities for this project
    const { data: entities, error: entitiesError } = await supabaseClient
      .from('entities_corpus')
      .select('*')
      .eq('project_id', projectId)

    if (entitiesError) throw entitiesError
    
    console.log(`📊 Fetched ${entities?.length || 0} entities`)

    // 3. Fetch enriched data from database
    console.log('🔍 Step 3: Fetching enriched data...')
    const { data: trials, error: trialsError } = await supabaseClient
      .from('trials')
      .select('*')
      .eq('project_id', projectId)
      .limit(20)

    const { data: publications, error: pubsError } = await supabaseClient
      .from('literature')
      .select('*')
      .eq('project_id', projectId)
      .limit(30)

    // Fallback to evidence_sources if no enriched data
    const { data: evidence, error: evidenceError } = await supabaseClient
      .from('evidence_sources')
      .select('*')
      .eq('project_id', projectId)

    if (evidenceError) throw evidenceError
    
    console.log(`📊 Enriched data: ${trials?.length || 0} trials, ${publications?.length || 0} publications`)
    console.log(`📊 Legacy data: ${evidence?.length || 0} evidence sources`)

    // 4. Build context for AI generation
    const context = {
      project: {
        title: project.title,
        compound_name: project.compound_name || 'Investigational Compound',
        indication: project.indication,
        phase: project.phase,
        sponsor: project.sponsor || 'Sponsor Organization',
        countries: project.countries,
        product_type: project.product_type,
        design: project.design_json,
      },
      entities: (entities || []).reduce((acc: Record<string, any>, entity: any) => {
        if (!acc[entity.entity_type]) acc[entity.entity_type] = {}
        acc[entity.entity_type][entity.entity_key] = entity.entity_value
        return acc
      }, {} as Record<string, any>),
      evidence: {
        // Use enriched data if available, fallback to evidence_sources
        clinical_trials: trials && trials.length > 0 
          ? trials.map((t: any) => ({
              nct_id: t.nct_id,
              title: t.title,
              phase: t.phase,
              status: t.status,
              enrollment: t.enrollment,
              design: t.design,
              outcomes: t.outcomes,
              source: t.source || 'ClinicalTrials.gov',
              source_url: t.source_url,
            }))
          : (evidence || []).filter((e: any) => e.source === 'ClinicalTrials.gov'),
        publications: publications && publications.length > 0
          ? publications.map((p: any) => ({
              pmid: p.pmid,
              title: p.title,
              authors: p.authors,
              journal: p.journal,
              publication_date: p.publication_date,
              abstract: p.abstract,
              keywords: p.keywords,
              mesh_terms: p.mesh_terms,
              doi: p.doi,
              source: p.source || 'PubMed',
              source_url: p.source_url,
            }))
          : (evidence || []).filter((e: any) => e.source === 'PubMed'),
        safety_data: (evidence || []).filter((e: any) => e.source === 'openFDA'),
      },
    }

    // 5. Call Azure OpenAI
    console.log('🤖 Step 5: Calling Azure OpenAI...')
    let generatedContent: string
    try {
      generatedContent = await generateWithAI(documentType, context)
      console.log(`✅ Generated ${generatedContent.length} characters`)
    } catch (aiError) {
      console.error('❌ AI generation error:', aiError)
      throw new Error(`AI generation failed: ${aiError instanceof Error ? aiError.message : String(aiError)}`)
    }

    // 6. Validate generated content
    console.log('✅ Step 6: Validating content...')
    const validation = validateGeneratedDocument({
      type: documentType,
      content: generatedContent,
      project: {
        compound_name: context.project.compound_name,
        sponsor: context.project.sponsor,
        indication: context.project.indication,
        phase: context.project.phase,
      }
    })
    console.log(`✅ Validation: ${validation.passed ? 'PASSED' : 'FAILED'} (score: ${validation.score})`)

    // 7. Determine status based on validation
    // Allowed statuses: 'draft', 'review', 'approved', 'outdated'
    const status = validation.passed ? 'draft' : 'review'

    // 8. Create document record with content
    // TODO: Add metadata column to store validation results
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .insert({
        project_id: projectId,
        type: documentType,
        version: 1,
        status,
        created_by: userId,
        content: generatedContent,
      })
      .select()
      .single()

    if (docError) throw docError
    
    // 9. Log validation results
    console.log('Document validation:', {
      passed: validation.passed,
      score: validation.score,
      issues: validation.issues.length,
    })

    // 7. Log audit trail
    await supabaseClient.from('audit_log').insert({
      project_id: projectId,
      document_id: document.id,
      action: 'document_generated',
      diff_json: { document_type: documentType, version: 1 },
      actor_user_id: userId,
    })

    return new Response(
      JSON.stringify({
        success: true,
        document: document,
        content: generatedContent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Generate Document Error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

/**
 * EVIDENCE EXTRACTOR - Structured processing of clinical trial and publication data
 */

interface EvidenceSummary {
  trialCount: number
  publicationCount: number
  safetyDataCount: number
  typicalSampleSize?: { min: number; max: number; median: number }
  phases: string[]
  commonInterventionModels: string[]
  commonMasking: string[]
  exampleTrials: { title: string; nct: string; phase?: string; status?: string }[]
  examplePublications: { title: string; pmid: string }[]
}

/**
 * Extract regulatory-safe evidence summary from raw trial/publication data
 */
function extractRegulatoryEvidence(evidence: {
  clinical_trials: any[]
  publications: any[]
  safety_data: any[]
}): EvidenceSummary {
  const trials = evidence.clinical_trials || []
  const pubs = evidence.publications || []
  const safety = evidence.safety_data || []

  // Extract sample sizes and calculate range
  const enrollments = trials
    .map(t => t.data?.enrollment)
    .filter((n): n is number => typeof n === 'number')
    .sort((a, b) => a - b)

  const typicalSampleSize = enrollments.length
    ? {
        min: enrollments[0],
        max: enrollments[enrollments.length - 1],
        median: enrollments[Math.floor(enrollments.length / 2)],
      }
    : undefined

  // Extract unique phases
  const phasesSet = new Set<string>()
  const interventionModelsSet = new Set<string>()
  const maskingSet = new Set<string>()

  for (const t of trials) {
    if (t.data?.phase) phasesSet.add(t.data.phase)
    if (t.data?.intervention_model) interventionModelsSet.add(t.data.intervention_model)
    if (t.data?.masking) maskingSet.add(t.data.masking)
  }

  // Get example trials (top 3)
  const exampleTrials = trials.slice(0, 3).map(t => ({
    title: t.title || t.data?.brief_summary?.slice(0, 80) || 'Untitled trial',
    nct: t.source_id,
    phase: t.data?.phase,
    status: t.data?.status,
  }))

  // Get example publications (top 3)
  const examplePublications = pubs.slice(0, 3).map(p => ({
    title: p.title || 'Untitled publication',
    pmid: p.source_id,
  }))

  return {
    trialCount: trials.length,
    publicationCount: pubs.length,
    safetyDataCount: safety.length,
    typicalSampleSize,
    phases: Array.from(phasesSet),
    commonInterventionModels: Array.from(interventionModelsSet),
    commonMasking: Array.from(maskingSet),
    exampleTrials,
    examplePublications,
  }
}

/**
 * Get evidence summary optimized for Synopsis/Protocol generation
 */
function getSynopsisEvidenceSummary(e: EvidenceSummary) {
  return {
    trialCount: e.trialCount,
    publicationCount: e.publicationCount,
    typicalSampleSize: e.typicalSampleSize,
    phases: e.phases,
    commonInterventionModels: e.commonInterventionModels,
    commonMasking: e.commonMasking,
    exampleTrials: e.exampleTrials,
  }
}

/**
 * Get evidence summary optimized for IB generation
 */
function getIBEvidenceSummary(e: EvidenceSummary) {
  return {
    publicationCount: e.publicationCount,
    safetyDataCount: e.safetyDataCount,
    examplePublications: e.examplePublications,
    phases: e.phases,
  }
}

/**
 * Generate specialized prompt based on document type
 */
function generatePrompt(documentType: string, context: any): string {
  // Extract structured evidence summary
  const evidenceSummary = extractRegulatoryEvidence(context.evidence)
  
  const promptContext = {
    projectTitle: context.project.title,
    compoundName: context.project.compound_name,
    indication: context.project.indication,
    phase: context.project.phase,
    sponsor: context.project.sponsor,
    productType: context.project.product_type,
    countries: context.project.countries,
    design: context.project.design,
    entities: context.entities,
    clinicalTrials: context.evidence.clinical_trials || [],
    publications: context.evidence.publications || [],
    safetyData: context.evidence.safety_data || [],
    evidenceSummaryForSynopsis: getSynopsisEvidenceSummary(evidenceSummary),
    evidenceSummaryForIB: getIBEvidenceSummary(evidenceSummary),
  }

  const normalizedType = documentType.toUpperCase()

  // Use specialized prompt functions for each document type
  switch (normalizedType) {
    case 'SYNOPSIS':
      return promptSynopsisV2(promptContext)
    case 'PROTOCOL':
      return promptProtocolV2(promptContext)
    case 'IB':
      return promptIBV2(promptContext)
    case 'ICF':
      return promptICFV2(promptContext)
    case 'SAP':
      return promptSAPV2(promptContext)
    case 'CRF':
      return promptCRFV2(promptContext)
    default:
      // Fallback for unknown document types
      return `Generate a ${documentType} document for ${promptContext.projectTitle} (${promptContext.compoundName} for ${promptContext.indication}).`
  }
}

// Old switch statement - keeping for reference, will be removed after testing
function generatePromptOld(documentType: string, context: any): string {
  const promptContext = {
    projectTitle: context.project.title,
    compoundName: context.project.compound_name,
    indication: context.project.indication,
    phase: context.project.phase,
    sponsor: context.project.sponsor,
    productType: context.project.product_type,
    countries: context.project.countries,
    design: context.project.design,
    entities: context.entities,
    clinicalTrials: context.evidence.clinical_trials || [],
    publications: context.evidence.publications || [],
    safetyData: context.evidence.safety_data || []
  }

  switch (documentType.toUpperCase()) {
    case 'IB':
      return `You are an expert medical writer specializing in regulatory documentation for clinical trials. Generate a comprehensive Investigator's Brochure (IB) that complies with ICH E6 (R2) Good Clinical Practice guidelines.

## CONTEXT
**Project:** ${promptContext.projectTitle}
**Compound:** ${promptContext.compoundName}
**Indication:** ${promptContext.indication}
**Phase:** ${promptContext.phase}
**Sponsor:** ${promptContext.sponsor}
**Product Type:** ${promptContext.productType}
**Countries:** ${promptContext.countries?.join(', ') || 'Not specified'}

## AVAILABLE EVIDENCE
**Clinical Trials:** ${promptContext.clinicalTrials.length} similar trials from ClinicalTrials.gov
**Publications:** ${promptContext.publications.length} peer-reviewed articles from PubMed
**Safety Data:** ${promptContext.safetyData.length > 0 ? 'FDA adverse event data available' : 'No FDA data available yet'}

${promptContext.clinicalTrials.length > 0 ? `
**Similar Clinical Trials:**
${promptContext.clinicalTrials.slice(0, 3).map((trial: any) => `
- ${trial.title || trial.data?.title || 'Untitled'}
  NCT ID: ${trial.source_id}
  ${trial.data?.phase ? `Phase: ${trial.data.phase}` : ''}
  ${trial.data?.status ? `Status: ${trial.data.status}` : ''}
`).join('\n')}
` : ''}

${promptContext.publications.length > 0 ? `
**Relevant Publications:**
${promptContext.publications.slice(0, 5).map((pub: any) => `
- ${pub.title || 'Untitled'}
  PMID: ${pub.source_id}
  ${pub.data?.abstract ? pub.data.abstract.substring(0, 200) + '...' : ''}
`).join('\n')}
` : ''}

${promptContext.design?.primary_endpoint ? `
**Primary Endpoint:** ${promptContext.design.primary_endpoint}
` : ''}

## ⚠️ CRITICAL MANDATORY REQUIREMENTS - FAILURE TO COMPLY WILL RESULT IN REJECTION

1. **COMPOUND NAME:** You MUST use "${promptContext.compoundName}" everywhere
   - ❌ NEVER WRITE: "Investigational Compound", "Investigational Product", "[Drug Name]"
   - ✅ ALWAYS WRITE: "${promptContext.compoundName}"
   
2. **SPONSOR NAME:** You MUST use "${promptContext.sponsor}" everywhere
   - ❌ NEVER WRITE: "[Sponsor Name]", "[Insert Sponsor Name]", "Sponsor Organization"
   - ✅ ALWAYS WRITE: "${promptContext.sponsor}"

3. **NO PLACEHOLDERS ALLOWED:**
   - ❌ NEVER use: [Insert...], [TBD], [To be determined], [Placeholder]
   - ✅ If data is missing, write: "Data not yet available"

4. **USE AVAILABLE EVIDENCE:**
   - Reference the ${promptContext.clinicalTrials.length} clinical trials listed above
   - Reference the ${promptContext.publications.length} publications listed above

## STRUCTURE (ICH E6 Section 7) - USE EXACT NUMBERING
Generate the document with the following numbered structure:

1. TITLE PAGE
2. TABLE OF CONTENTS
3. SUMMARY
4. INTRODUCTION
5. PHYSICAL, CHEMICAL, AND PHARMACEUTICAL PROPERTIES AND FORMULATION
   5.1 Physical and Chemical Properties
   5.2 Pharmaceutical Formulation
6. NONCLINICAL STUDIES
   6.1 Nonclinical Pharmacology
       6.1.1 Primary Pharmacodynamics
       6.1.2 Secondary Pharmacodynamics
       6.1.3 Safety Pharmacology
   6.2 Pharmacokinetics and Product Metabolism
       6.2.1 Absorption
       6.2.2 Distribution
       6.2.3 Metabolism
       6.2.4 Excretion
   6.3 Toxicology
       6.3.1 Single-Dose Toxicity
       6.3.2 Repeat-Dose Toxicity
       6.3.3 Genotoxicity
       6.3.4 Carcinogenicity
       6.3.5 Reproductive and Developmental Toxicity
       6.3.6 Local Tolerance
7. EFFECTS IN HUMANS
   7.1 Pharmacokinetics and Product Metabolism in Humans
       7.1.1 Absorption
       7.1.2 Distribution
       7.1.3 Metabolism
       7.1.4 Excretion
       7.1.5 Drug-Drug Interactions
   7.2 Pharmacodynamics and Efficacy in Humans
       7.2.1 Mechanism of Action
       7.2.2 Dose-Response Relationships
       7.2.3 Clinical Efficacy
   7.3 Safety and Tolerability
       7.3.1 Adverse Events
       7.3.2 Serious Adverse Events
       7.3.3 Clinical Laboratory Findings
       7.3.4 Special Populations
8. SUMMARY OF DATA AND GUIDANCE FOR THE INVESTIGATOR
9. REFERENCES

## CRITICAL FORMATTING REQUIREMENTS
- Use EXACT numbering as shown above (1, 2, 3, 4, 5, 5.1, 5.2, 6, 6.1, 6.1.1, etc.)
- Each section must start with: ## [NUMBER] [TITLE] (e.g., ## 5 PHYSICAL, CHEMICAL, AND PHARMACEUTICAL PROPERTIES AND FORMULATION)
- Subsections: ### [NUMBER] [TITLE] (e.g., ### 5.1 Physical and Chemical Properties)
- Sub-subsections: #### [NUMBER] [TITLE] (e.g., #### 6.1.1 Primary Pharmacodynamics)
- Maintain hierarchical numbering throughout
- ICH E6 compliant structure
- Formal, scientific tone
- Comprehensive but concise
- Balanced presentation of benefits and risks

Generate the complete IB in markdown format with proper numbering.`

    case 'PROTOCOL':
      return `You are an expert clinical trial protocol writer. Generate a comprehensive Clinical Trial Protocol that complies with ICH E6 Section 6 requirements.

## CONTEXT
**Project:** ${promptContext.projectTitle}
**Compound:** ${promptContext.compoundName}
**Indication:** ${promptContext.indication}
**Phase:** ${promptContext.phase}
**Sponsor:** ${promptContext.sponsor}
**Product Type:** ${promptContext.productType}
**Countries:** ${promptContext.countries?.join(', ') || 'Not specified'}

## ⚠️ CRITICAL MANDATORY REQUIREMENTS - FAILURE TO COMPLY WILL RESULT IN REJECTION

1. **COMPOUND NAME:** You MUST use "${promptContext.compoundName}" everywhere
   - ❌ NEVER WRITE: "Investigational Compound", "Investigational Product", "[Drug Name]"
   - ✅ ALWAYS WRITE: "${promptContext.compoundName}"
   
2. **SPONSOR NAME:** You MUST use "${promptContext.sponsor}" everywhere
   - ❌ NEVER WRITE: "[Sponsor Name]", "[Insert Sponsor Name]"
   - ✅ ALWAYS WRITE: "${promptContext.sponsor}"

3. **NO PLACEHOLDERS:** Never use [Insert...], [TBD], [To be determined]

## STRUCTURE (ICH E6 Section 6) - USE EXACT NUMBERING
Generate the document with the following numbered structure:

1. TITLE PAGE AND PROTOCOL SYNOPSIS
   1.1 Protocol Title
   1.2 Protocol Number
   1.3 Protocol Synopsis (Tabular Format)
2. TABLE OF CONTENTS
3. LIST OF ABBREVIATIONS
4. INTRODUCTION
   4.1 Background
   4.2 Rationale
   4.3 Risk-Benefit Assessment
5. STUDY OBJECTIVES AND ENDPOINTS
   5.1 Primary Objective
   5.2 Secondary Objectives
   5.3 Primary Endpoint
   5.4 Secondary Endpoints
   5.5 Exploratory Endpoints
6. STUDY DESIGN
   6.1 Overall Study Design and Plan
   6.2 Study Schema/Diagram
   6.3 Randomization and Blinding
   6.4 Study Duration
7. STUDY POPULATION
   7.1 Inclusion Criteria
   7.2 Exclusion Criteria
   7.3 Withdrawal Criteria
   7.4 Screen Failures and Re-screening
8. STUDY TREATMENTS
   8.1 Investigational Product
       8.1.1 Description
       8.1.2 Dosage and Administration
       8.1.3 Packaging and Labeling
   8.2 Concomitant Medications
       8.2.1 Permitted Medications
       8.2.2 Prohibited Medications
   8.3 Compliance Assessment
9. STUDY PROCEDURES AND ASSESSMENTS
   9.1 Schedule of Activities
   9.2 Screening Period
   9.3 Treatment Period
   9.4 Follow-up Period
   9.5 Efficacy Assessments
   9.6 Safety Assessments
       9.6.1 Physical Examinations
       9.6.2 Vital Signs
       9.6.3 Laboratory Assessments
       9.6.4 ECG
   9.7 Pharmacokinetic Assessments
10. SAFETY MONITORING
    10.1 Adverse Event Definitions
    10.2 Adverse Event Reporting
    10.3 Serious Adverse Event Reporting
    10.4 Data Safety Monitoring Board
    10.5 Stopping Rules
11. STATISTICAL CONSIDERATIONS
    11.1 Sample Size Determination
    11.2 Populations for Analysis
    11.3 Statistical Methods
        11.3.1 Primary Endpoint Analysis
        11.3.2 Secondary Endpoint Analysis
        11.3.3 Safety Analysis
    11.4 Interim Analysis
    11.5 Handling of Missing Data
12. QUALITY CONTROL AND QUALITY ASSURANCE
    12.1 Data Management
    12.2 Monitoring
    12.3 Audits
13. ETHICAL AND REGULATORY CONSIDERATIONS
    13.1 Ethical Conduct
    13.2 Informed Consent
    13.3 Confidentiality
    13.4 Protocol Amendments
14. STUDY ADMINISTRATION
    14.1 Investigators and Study Personnel
    14.2 Financing and Insurance
    14.3 Publication Policy
15. REFERENCES
16. APPENDICES

## CRITICAL FORMATTING REQUIREMENTS
- Use EXACT numbering as shown above (1, 2, 3, 4, 4.1, 4.2, 5, 5.1, etc.)
- Each section: ## [NUMBER] [TITLE] (e.g., ## 5 STUDY OBJECTIVES AND ENDPOINTS)
- Subsections: ### [NUMBER] [TITLE] (e.g., ### 5.1 Primary Objective)
- Sub-subsections: #### [NUMBER] [TITLE] (e.g., #### 8.1.1 Description)
- Maintain hierarchical numbering throughout
- ICH E6 Section 6 compliant
- Clear, unambiguous instructions
- Operationally feasible
- Scientifically rigorous

Generate the complete protocol in markdown format with proper numbering.`

    case 'ICF':
      return `You are an expert in creating patient-centered informed consent documents. Generate an Informed Consent Form (ICF) that complies with FDA 21 CFR Part 50 and ICH E6 requirements.

## CONTEXT
**Study:** ${promptContext.projectTitle}
**Drug:** ${promptContext.compoundName}
**Condition:** ${promptContext.indication}
**Phase:** ${promptContext.phase}
**Sponsor:** ${promptContext.sponsor}

## ⚠️ CRITICAL MANDATORY REQUIREMENTS - FAILURE TO COMPLY WILL RESULT IN REJECTION

1. **DRUG NAME:** You MUST use "${promptContext.compoundName}" everywhere
   - ❌ NEVER WRITE: "Investigational Compound", "study drug", "[Drug Name]"
   - ✅ ALWAYS WRITE: "${promptContext.compoundName}"
   
2. **SPONSOR NAME:** You MUST use "${promptContext.sponsor}" everywhere
   - ❌ NEVER WRITE: "[Sponsor Name]", "the sponsor"
   - ✅ ALWAYS WRITE: "${promptContext.sponsor}"

3. **PATIENT-FRIENDLY LANGUAGE:** 6th-8th grade reading level
4. **NO PLACEHOLDERS:** If data missing, write "Your study doctor will discuss this with you"

## STRUCTURE (FDA 21 CFR 50.25) - USE EXACT NUMBERING
Generate the document with the following numbered structure:

1. TITLE PAGE
2. INTRODUCTION AND INVITATION TO PARTICIPATE
   2.1 Study Title
   2.2 Invitation Statement
   2.3 Voluntary Participation
3. WHY IS THIS STUDY BEING DONE?
   3.1 Purpose of the Study
   3.2 Why You Are Being Asked
   3.3 Number of Participants
4. WHAT WILL HAPPEN IF I TAKE PART IN THIS STUDY?
   4.1 Study Duration
   4.2 Study Visits and Procedures
       4.2.1 Screening Visit
       4.2.2 Treatment Visits
       4.2.3 Follow-up Visits
   4.3 Study Drug Information
       4.3.1 How to Take the Study Drug
       4.3.2 What to Avoid
5. WHAT ARE THE RISKS OF THIS STUDY?
   5.1 Known Risks of Study Drug
   5.2 Possible Risks
   5.3 Risks of Study Procedures
   5.4 Reproductive Risks
   5.5 Unknown Risks
6. ARE THERE BENEFITS TO TAKING PART IN THIS STUDY?
   6.1 Possible Benefits to You
   6.2 Benefits to Others
7. WHAT OTHER CHOICES DO I HAVE?
   7.1 Alternative Treatments
   7.2 Choosing Not to Participate
8. WILL MY INFORMATION BE KEPT CONFIDENTIAL?
   8.1 How Your Information Will Be Protected
   8.2 Who May See Your Information
   8.3 Certificate of Confidentiality
9. WHAT ARE THE COSTS?
   9.1 Costs to You
   9.2 Payment for Participation
   9.3 Insurance and Billing
10. WHAT IF I AM INJURED?
    10.1 Medical Care
    10.2 Compensation
11. WHAT ARE MY RIGHTS AS A PARTICIPANT?
    11.1 Voluntary Participation
    11.2 Right to Withdraw
    11.3 New Information
    11.4 Questions and Contacts
12. CONSENT SIGNATURES
    12.1 Participant Signature
    12.2 Person Obtaining Consent
    12.3 Legally Authorized Representative (if applicable)

## CRITICAL FORMATTING REQUIREMENTS
- Use EXACT numbering as shown above (1, 2, 3, 4, 4.1, 4.2, 4.2.1, etc.)
- Each section: ## [NUMBER] [TITLE] (e.g., ## 3 WHY IS THIS STUDY BEING DONE?)
- Subsections: ### [NUMBER] [TITLE] (e.g., ### 3.1 Purpose of the Study)
- Sub-subsections: #### [NUMBER] [TITLE] (e.g., #### 4.2.1 Screening Visit)
- 6th-8th grade reading level
- Patient-friendly language ("you", "your")
- No medical jargon - explain all terms
- Clear explanation of risks/benefits
- Voluntary participation emphasized throughout
- FDA 21 CFR Part 50 compliant

Generate the complete ICF in markdown format with proper numbering.`

    case 'SYNOPSIS':
      return `You are a senior clinical protocol writer with 15+ years of CRO/Pharma experience.
Generate a REGULATORY-COMPLIANT PROTOCOL SYNOPSIS (pre-study), strictly following ICH E6 (R2) and ICH E8 (R1).

⚠️ CRITICAL: This MUST be a PLANNED STUDY synopsis (pre-study document).
This is NOT a Clinical Study Report (CSR) synopsis.
You MUST NOT include any study results, outcomes, or completed data.

## CONTEXT
**Study:** ${promptContext.projectTitle}
**Compound:** ${promptContext.compoundName}
**Indication:** ${promptContext.indication}
**Phase:** ${promptContext.phase}
**Sponsor:** ${promptContext.sponsor}
**Product Type:** ${promptContext.productType}
**Countries:** ${promptContext.countries?.join(', ') || 'Not specified'}

## HOW TO USE EVIDENCE (${promptContext.clinicalTrials.length} trials, ${promptContext.publications.length} publications)

You have access to ClinicalTrials.gov and PubMed data.
Use evidence ONLY for:
✅ Typical sample sizes in Phase ${promptContext.phase}
✅ Common study duration and visit schedules
✅ Common inclusion/exclusion criteria patterns
✅ Common endpoints used in ${promptContext.indication}
✅ Operational feasibility and design norms
✅ Scientific rationale and background

${promptContext.clinicalTrials.length > 0 ? `
**Similar Clinical Trials (for design reference ONLY):**
${promptContext.clinicalTrials.slice(0, 3).map((trial: any) => {
  const data = trial.data || {}
  return `- ${trial.title || data.title || 'Untitled'}
  NCT: ${trial.source_id} | Phase: ${data.phase || 'N/A'} | N=${data.enrollment || 'N/A'}`
}).join('\n')}
` : ''}

${promptContext.publications.length > 0 ? `
**Publications (for rationale ONLY):**
${promptContext.publications.slice(0, 3).map((pub: any) => 
  `- ${pub.title || 'Untitled'} (PMID: ${pub.source_id})`
).join('\n')}
` : ''}

❌ STRICTLY FORBIDDEN - DO NOT GENERATE:
- p-values (p=0.05, p<0.001, etc.)
- Hazard ratios (HR=1.45, etc.)
- Confidence intervals (95% CI: 1.10-1.90)
- Odds ratios (OR=2.3)
- AE percentages (headache 12%, nausea 8%)
- Efficacy results (median time 4.2 days vs 5.8 days)
- Safety results (no SAEs, no deaths)
- Statistical outcomes
- Completed study data
- Any numerical results

This is a PLANNED study. You are describing what WILL BE DONE, not what WAS DONE.

## ⚠️ CRITICAL MANDATORY REQUIREMENTS - FAILURE TO COMPLY WILL RESULT IN REJECTION

1. **COMPOUND NAME:** You MUST use "${promptContext.compoundName}" everywhere
   - ❌ NEVER WRITE: "Investigational Compound", "Investigational Product", "[Drug Name]"
   - ✅ ALWAYS WRITE: "${promptContext.compoundName}"
   
2. **SPONSOR NAME:** You MUST use "${promptContext.sponsor}" everywhere
   - ❌ NEVER WRITE: "[Sponsor Name]", "[Sponsor]", "Sponsor Organization"
   - ✅ ALWAYS WRITE: "${promptContext.sponsor}"

3. **INDICATION:** You MUST use "${promptContext.indication}"
   - ❌ NEVER WRITE: "[Indication]", "Target Disease"
   - ✅ ALWAYS WRITE: "${promptContext.indication}"

4. **NO PLACEHOLDERS ALLOWED:**
   - ❌ NEVER use: [Insert...], [TBD], [To be determined], [Placeholder]
   - ✅ If data is missing, write: "Data not yet available"

**EXAMPLE OF CORRECT FORMAT:**
| 1.5 Sponsor | ${promptContext.sponsor} |
| 1.6 Investigational Product | ${promptContext.compoundName} |
| 1.7 Indication | ${promptContext.indication} |

## STRUCTURE (ICH E6/E8 Protocol Synopsis) - USE EXACT NUMBERING

1. SYNOPSIS HEADER (TABULAR FORMAT)
   1.1 Protocol Title
   1.2 Protocol Number
   1.3 Phase
   1.4 Planned Study Dates
   1.5 Sponsor
   1.6 Investigational Product
   1.7 Indication

2. STUDY RATIONALE
   2.1 Background (disease burden, unmet need, mechanism of action)
   2.2 Rationale for Study Design
   2.3 Rationale for Population

3. STUDY OBJECTIVES
   3.1 Primary Objective
   3.2 Secondary Objectives
   3.3 Exploratory Objectives (if applicable)

4. STUDY DESIGN
   4.1 Overall Design (phase, randomization, blinding, control)
   4.2 Study Schema (screening, treatment, follow-up periods)
   4.3 Randomization and Blinding
   4.4 Study Duration (per subject and total)

5. ENDPOINTS
   5.1 Primary Endpoint
   5.2 Secondary Endpoints
   5.3 Exploratory Endpoints (if applicable)

6. STUDY POPULATION
   6.1 Planned Number of Subjects
   6.2 Key Inclusion Criteria
   6.3 Key Exclusion Criteria
   6.4 Recruitment Feasibility

7. TREATMENTS
   7.1 Investigational Product (${promptContext.compoundName})
   7.2 Dose and Administration
   7.3 Treatment Duration
   7.4 Concomitant Medications

8. ASSESSMENTS
   8.1 Efficacy Assessments (planned measures, no results)
   8.2 Safety Assessments (planned monitoring, no results)
   8.3 Other Assessments (PK, biomarkers, QoL)

9. STATISTICAL CONSIDERATIONS
   9.1 Sample Size Rationale (power calculation)
   9.2 Populations for Analysis (ITT, PP, Safety)
   9.3 General Statistical Approach (planned tests, no results)

10. STUDY CONDUCT AND MONITORING
    10.1 Monitoring Plan
    10.2 Data Handling
    10.3 Quality Assurance

## CRITICAL FORMATTING REQUIREMENTS
- Use EXACT numbering as shown above (1, 2, 3, 4, 4.1, 4.2, etc.)
- Each section: ## [NUMBER] [TITLE] (e.g., ## 2 STUDY OBJECTIVES)
- Subsections: ### [NUMBER] [TITLE] (e.g., ### 2.1 Primary Objective)
- Concise (2-5 pages maximum)
- Tabular format for Section 1 (Synopsis Header)
- Factual presentation, no interpretation
- ICH E3 Section 2 compliant
- Standalone summary - can be read independently

Generate the complete synopsis in markdown format with proper numbering.`

    default:
      return `Generate a ${documentType} document for ${promptContext.projectTitle} (${promptContext.compoundName} for ${promptContext.indication}).`
  }
}

/**
 * Generate document content using Azure OpenAI
 */
async function generateWithAI(documentType: string, context: any): Promise<string> {
  const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
  const azureKey = Deno.env.get('AZURE_OPENAI_API_KEY')
  
  if (!azureEndpoint || !azureKey) {
    // Return structured placeholder if Azure OpenAI not configured
    return generatePlaceholder(documentType, context)
  }
  
  try {
    // Call Azure OpenAI with specialized prompt
    const deployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT_NAME') || 'gpt-4.1'
    const apiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2025-01-01-preview'
    
    const url = `${azureEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
    
    const prompt = generatePrompt(documentType, context)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': azureKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are an expert medical writer specializing in regulatory-compliant clinical trial documentation. You follow ICH E6, ICH E3, FDA 21 CFR, and EMA guidelines. You write in a clear, precise, and scientifically rigorous style.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 8000,
        temperature: 0.3, // Lower temperature for more consistent, factual output
      }),
    })
    
    if (!response.ok) {
      console.error('Azure OpenAI error:', await response.text())
      return generatePlaceholder(documentType, context)
    }
    
    const data = await response.json()
    return data.choices[0]?.message?.content || generatePlaceholder(documentType, context)
    
  } catch (error) {
    console.error('Error calling Azure OpenAI:', error)
    return generatePlaceholder(documentType, context)
  }
}

function generatePlaceholder(documentType: string, context: any): string {
  return `# ${documentType} - ${context.project.title}

## Project Information

**Compound:** ${context.project.compound_name}  
**Indication:** ${context.project.indication}  
**Phase:** ${context.project.phase}  
**Sponsor:** ${context.project.sponsor}  
**Product Type:** ${context.project.product_type}  
**Countries:** ${context.project.countries?.join(', ') || 'Not specified'}

## Available Data

**Entities:** ${Object.keys(context.entities).join(', ') || 'None extracted yet'}  
**Clinical Trials:** ${context.evidence.clinical_trials.length} from ClinicalTrials.gov  
**Publications:** ${context.evidence.publications.length} from PubMed  
**Safety Data:** ${context.evidence.safety_data.length} from openFDA

## Status

This document will be generated using Azure OpenAI when credentials are configured.

**Note:** All project-specific data is available and will be used in generation - no placeholders will be used.`
}

/**
 * Validate generated document
 */
function validateGeneratedDocument(context: {
  type: string
  content: string
  project: {
    compound_name: string
    sponsor: string
    indication: string
    phase: string
  }
}): ValidationResult {
  const issues: ValidationIssue[] = []
  const docType = context.type.toUpperCase()
  const rules = REGULATORY_CORE.documentTypes[docType as keyof typeof REGULATORY_CORE.documentTypes]

  // 1. Check for placeholder text (all document types)
  for (const pattern of REGULATORY_CORE.placeholders) {
    const match = context.content.match(pattern)
    if (match) {
      issues.push({
        severity: 'error',
        message: `Found placeholder text: "${match[0]}"`,
        location: 'Document content',
        requirement: 'All placeholders must be replaced with real data',
      })
    }
  }

  // 2. Check for forbidden result patterns (if document doesn't allow results)
  if (rules && !rules.allowResults) {
    for (const pattern of REGULATORY_CORE.forbiddenResultPatterns) {
      const match = context.content.match(pattern)
      if (match) {
        issues.push({
          severity: 'error',
          message: `Forbidden statistical or outcome pattern: "${match[0]}"`,
          location: 'Document content',
          requirement: 'Pre-study document must not contain study results',
        })
      }
    }
  }

  // 3. Check for forbidden language (all document types)
  for (const pattern of REGULATORY_CORE.forbiddenLanguage) {
    const match = context.content.match(pattern)
    if (match) {
      issues.push({
        severity: 'error',
        message: `Forbidden regulatory phrase detected: "${match[0]}"`,
        location: 'Document content',
        requirement: 'Avoid inferential or promotional language in regulatory documents',
      })
    }
  }

  // 4. Check for required sections (if defined for this document type)
  if (rules && rules.requiredSections) {
    for (const section of rules.requiredSections) {
      if (!context.content.includes(section)) {
        issues.push({
          severity: 'warning',
          message: `Missing or incorrectly formatted section: ${section}`,
          location: 'Document structure',
          requirement: 'Document should follow required regulatory structure',
        })
      }
    }
  }

  // 5. Check for project-specific data usage
  if (!context.content.includes(context.project.compound_name)) {
    issues.push({
      severity: 'error',
      message: `Document does not mention compound "${context.project.compound_name}"`,
      location: 'Document content',
      requirement: 'Must use project-specific compound name',
    })
  }

  if (!context.content.includes(context.project.sponsor)) {
    issues.push({
      severity: 'error',
      message: `Document does not mention sponsor "${context.project.sponsor}"`,
      location: 'Document content',
      requirement: 'Must use project-specific sponsor name',
    })
  }

  if (!context.content.includes(context.project.indication)) {
    issues.push({
      severity: 'warning',
      message: `Document does not mention indication "${context.project.indication}"`,
      location: 'Document content',
      requirement: 'Should reference target indication',
    })
  }

  // 6. Calculate score
  const errors = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const info = issues.filter(i => i.severity === 'info').length

  const score = Math.max(0, 100 - (errors * 20) - (warnings * 5))

  return {
    passed: errors === 0,
    score,
    issues,
    summary: { errors, warnings, info }
  }
}

function getSystemPrompt(documentType: string): string {
  const prompts = {
    IB: `You are an expert medical writer. Generate an Investigator's Brochure strictly aligned to ICH E6 structure.
Include: Title Page, Table of Contents, Summary, Introduction (chemical/pharmaceutical properties), 
Nonclinical Studies (pharmacology, toxicology), Clinical Studies (pharmacokinetics, efficacy, safety), References.
Mark missing data clearly and cite all sources.`,
    
    Protocol: `You are an expert medical writer. Generate a Clinical Trial Protocol following ICH E6 guidelines.
Include: Synopsis, Introduction, Objectives, Study Design, Selection Criteria, Treatment Plan, 
Assessments, Statistics, Ethics, Data Management, References.`,
    
    ICF: `You are an expert medical writer. Generate an Informed Consent Form following ICH-GCP and local regulations.
Include: Study purpose, procedures, risks/benefits, alternatives, confidentiality, voluntary participation, contacts.
Use clear, non-technical language appropriate for patients.`,
    
    Synopsis: `You are an expert medical writer. Generate a Protocol Synopsis.
Include: Study title, phase, objectives, design, population, interventions, endpoints, sample size, duration.
Keep concise (2-3 pages maximum).`,
  }
  
  return prompts[documentType as keyof typeof prompts] || prompts.IB
}
