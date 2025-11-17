/**
 * PROMPT BUILDER V2 - Specialized prompts for each document type
 * Based on ICH E6 (R2), ICH E8 (R1), ICH E3, FDA 21 CFR Part 50
 */

import { buildSOAFromSynopsis, renderSOAAsMarkdown } from './soa-generator.ts'

/**
 * Synopsis Prompt v2 - Protocol Synopsis (ICH E6/E8)
 */
export function promptSynopsisV2(c: any): string {
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

Use evidence ONLY for: typical sample sizes, common duration, common endpoints, design norms, scientific rationale.

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

/**
 * Protocol Prompt v2 - Full Clinical Trial Protocol (ICH E6 Section 6)
 */
export function promptProtocolV2(c: any): string {
  const evidenceSummary = c.evidenceSummaryForSynopsis || {}
  
  // Generate SOA table
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
${evidenceSummary.typicalSampleSize ? `- Sample size range: ${evidenceSummary.typicalSampleSize.min}-${evidenceSummary.typicalSampleSize.max}` : ''}
${evidenceSummary.phases?.length ? `- Phases in evidence: ${evidenceSummary.phases.join(', ')}` : ''}

Use evidence ONLY for designing a realistic and feasible protocol. DO NOT copy or fabricate numerical results.

## MANDATORY RULES
1. COMPOUND NAME: Always use "${c.compoundName}"
2. SPONSOR NAME: Always use "${c.sponsor}"
3. NO PLACEHOLDERS: If unknown, state "To be defined prior to first patient enrollment"
4. NO RESULTS

## REQUIRED PROTOCOL STRUCTURE (ICH E6 Section 6)
1. TITLE PAGE AND PROTOCOL SYNOPSIS
2. TABLE OF CONTENTS
3. LIST OF ABBREVIATIONS
4. INTRODUCTION
5. STUDY OBJECTIVES AND ENDPOINTS
6. STUDY DESIGN
7. STUDY POPULATION
8. STUDY TREATMENTS
9. STUDY PROCEDURES AND ASSESSMENTS
   - Include the following Schedule of Activities table in Section 9:

${soaMarkdown}

10. SAFETY MONITORING
11. STATISTICAL CONSIDERATIONS
12. QUALITY CONTROL AND QUALITY ASSURANCE
13. ETHICAL AND REGULATORY CONSIDERATIONS
14. STUDY ADMINISTRATION
15. REFERENCES

Generate the complete Protocol in Markdown with precise, operational, audit-ready style.

IMPORTANT: Use the Schedule of Activities table provided above in Section 9. Do not modify the table structure.`
}

/**
 * IB Prompt v2 - Investigator's Brochure (ICH E6 Section 7)
 */
export function promptIBV2(c: any): string {
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

## EVIDENCE USE POLICY
From PubMed (${evidenceSummary.publicationCount || 0} publications): Summarize pharmacology, mechanism, nonclinical data, human PK/PD, safety profile qualitatively.
From safety data (${evidenceSummary.safetyDataCount || 0} sources): Describe known or class-related risks.
${evidenceSummary.phases?.length ? `From trials in phases: ${evidenceSummary.phases.join(', ')}` : ''}

You MUST:
- Keep descriptions qualitative unless you have concrete values from publications
- Avoid inventing AE percentages, hazard ratios, p-values
- If not supported by evidence, write "Not adequately characterized in available data"

## MANDATORY STRUCTURE (ICH E6 Section 7)
1. TITLE PAGE
2. TABLE OF CONTENTS
3. SUMMARY
4. INTRODUCTION
5. PHYSICAL, CHEMICAL, AND PHARMACEUTICAL PROPERTIES AND FORMULATION
6. NONCLINICAL STUDIES
7. EFFECTS IN HUMANS
8. SUMMARY AND GUIDANCE FOR THE INVESTIGATOR
9. REFERENCES

Generate the complete IB in Markdown with clear distinction between nonclinical and clinical information.`
}

/**
 * ICF Prompt v2 - Informed Consent Form (FDA 21 CFR 50)
 */
export function promptICFV2(c: any): string {
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
5. RISKS AND DISCOMFORTS
6. POSSIBLE BENEFITS
7. ALTERNATIVES TO PARTICIPATION
8. CONFIDENTIALITY
9. COSTS AND PAYMENTS
10. IN CASE OF INJURY
11. YOUR RIGHTS
12. CONTACT INFORMATION
13. CONSENT AND SIGNATURES

## LANGUAGE AND STYLE RULES
- Use "you" and "your", not "the subject"
- Avoid medical jargon
- No statistics, no p-values
- Be transparent about risks and uncertainty
- Emphasize voluntariness and right to withdraw

Generate the complete ICF in Markdown.`
}
