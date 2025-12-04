/**
 * IB (Investigator's Brochure) Section-Specific Prompts
 * 
 * Version: 4.0.0 - Production-grade IB generation
 * Date: 2025-12-02
 * 
 * Key improvements from v3:
 * - Strict IB structure (no CSR sections)
 * - No [DATA_NEEDED] placeholders - use class-based fallbacks
 * - Proper TOC for IB (not CSR)
 * - Integrated enrichment data usage
 * - ICH M3 / CTD Module 8 compliant
 * 
 * FORBIDDEN CONTENT:
 * - CSR sections (tables, listings, sample CRFs)
 * - [DATA_NEEDED] placeholders
 * - "NCTNCT" errors
 * - Empty sections
 * - Operational procedures (belongs to protocol)
 */

// ============================================================================
// IB TABLE OF CONTENTS (ICH E6 / CTD Module 8 compliant)
// ============================================================================

export const IB_TABLE_OF_CONTENTS = `
## TABLE OF CONTENTS

1. **Title Page**
2. **Confidentiality Statement**
3. **Summary**
4. **Introduction**
   - 4.1 Background
   - 4.2 Product Overview
   - 4.3 Development Rationale
5. **Physical, Chemical, and Pharmaceutical Properties**
   - 5.1 Drug Substance
   - 5.2 Drug Product
   - 5.3 Preparation and Administration
6. **Nonclinical Studies**
   - 6.1 Pharmacology
   - 6.2 Pharmacokinetics in Animals
   - 6.3 Toxicology
   - 6.4 Overall Nonclinical Assessment
7. **Effects in Humans**
   - 7.1 Overview of Clinical Development
   - 7.2 Pharmacokinetics and Pharmacodynamics in Humans
   - 7.3 Clinical Efficacy
   - 7.4 Clinical Safety
   - 7.5 Benefit–Risk Assessment
8. **Summary of Data and Guidance for the Investigator**
   - 8.1 Summary of Safety Profile
   - 8.2 Adverse Event Table
   - 8.3 Warnings and Precautions
   - 8.4 Special Populations
   - 8.5 Dosing Recommendations
   - 8.6 Monitoring Recommendations
   - 8.7 Overdose Management
   - 8.8 Guidance for Investigators

---
`

// ============================================================================
// SECTION PROMPTS
// ============================================================================

export const IB_SECTION_PROMPTS_V4: Record<string, string> = {
  
  // Section 1: Title Page
  ib_title_page: `
Generate the Title Page for the Investigator's Brochure.

**Product:** {{compoundName}}
**Indication:** {{indication}}
**Phase:** {{phase}}
**Sponsor:** {{sponsor}}

# Investigator's Brochure

**Product:** {{compoundName}}
**Indication:** {{indication}}
**Phase:** {{phase}}

**Document Title:** Investigator's Brochure
**Edition Number:** [Edition 1]
**Edition Date:** [Current Date]

**Sponsor:** {{sponsor}}
**Sponsor Address:** [Sponsor registered address]

---

## Confidentiality Statement

This document contains confidential information that must not be disclosed to anyone other than the study investigators, Institutional Review Boards/Independent Ethics Committees (IRBs/IECs), or members of the regulatory authorities, unless such persons are bound by a confidentiality agreement with the sponsor or are otherwise legally bound to maintain confidentiality.

The information in this Investigator's Brochure is the property of {{sponsor}} and is intended solely for the purpose of conducting clinical trials with {{compoundName}} for the treatment of {{indication}}.

By accepting this Investigator's Brochure, you agree to maintain its contents in confidence and not to copy, disclose, or distribute this document or any of its contents to any third party without the prior written authorization of {{sponsor}}, except to the extent required by applicable laws, regulations, or guidelines.
`,

  // Section 2: Table of Contents
  ib_toc: IB_TABLE_OF_CONTENTS,

  // Section 3: Summary
  ib_summary: `
Generate Section 3: Summary for the Investigator's Brochure.

**Product:** {{compoundName}}
**Indication:** {{indication}}
**Phase:** {{phase}}

## 3. SUMMARY

Write a concise executive summary (2-3 pages) that provides investigators with a clear overview of the product. This is the most important section for busy investigators.

**REQUIRED SUBSECTIONS:**

### Product Description and Mechanism of Action
- Drug class and therapeutic category
- Mechanism of action (use data from context)
- Key pharmacological properties

### Key Nonclinical Findings (Overview)
- Summary of toxicology profile
- Target organs identified
- Safety margins relative to clinical doses
- Reproductive/developmental findings

### Clinical Development Status and Study Design
- Current phase of development
- Study design for {{phase}} (from project data)
- Number of arms, randomization, blinding
- Treatment duration

### Efficacy Highlights
- Summary of efficacy from prior studies
- Primary endpoint for current study
- Key secondary endpoints

### Safety Profile Summary
- Most common adverse events (with frequencies from FAERS)
- Serious adverse events
- Key warnings and precautions

### Recommended Dose and Administration
- Dosage form and strength
- Recommended dose
- Route of administration

### Overall Benefit–Risk Considerations for Investigators
- Summary of benefits
- Summary of risks
- Overall assessment

**CRITICAL RULES:**
1. Use ACTUAL compound name "{{compoundName}}" throughout - NEVER use [INVESTIGATIONAL PRODUCT]
2. Include ACTUAL frequencies from FAERS data provided
3. If specific data is unavailable, use class-based summaries (e.g., "SSRIs typically...")
4. NO [DATA_NEEDED] placeholders - write complete sentences

**DATA PROVIDED:**
{{dataContext}}
`,

  // Section 4: Introduction
  ib_introduction: `
Generate Section 4: Introduction for the Investigator's Brochure.

**Product:** {{compoundName}}
**Indication:** {{indication}}
**Phase:** {{phase}}

## 4. INTRODUCTION

This section provides background and context for the clinical development of {{compoundName}}.

### 4.1 Background

#### 4.1.1 Disease Background and Unmet Medical Need
Write 2-3 paragraphs about {{indication}}:
- Epidemiology and disease burden
- Current standard of care
- Unmet medical needs that {{compoundName}} addresses

#### 4.1.2 Current Treatment Landscape
- Available treatments for {{indication}}
- Limitations of current therapies
- Where {{compoundName}} fits in the treatment algorithm

#### 4.1.3 Rationale for Developing {{compoundName}} for {{indication}}
- Scientific rationale based on mechanism of action
- Clinical rationale based on prior data
- Regulatory rationale

### 4.2 Product Overview

#### 4.2.1 Chemical/Biological Description
Use CMC data from context:
- Chemical name and structure
- Molecular formula and weight
- Physical properties

#### 4.2.2 Mechanism of Action
- Primary pharmacological target
- Downstream effects
- Relevance to {{indication}}

#### 4.2.3 Therapeutic Class and Approved Indications
- Drug class
- Current approved indications (if any)
- Regulatory status

### 4.3 Development Rationale

#### 4.3.1 Scientific Rationale
- Why this compound for this indication
- Supporting preclinical and clinical evidence

#### 4.3.2 Regulatory Pathway
- Planned regulatory strategy
- Key regulatory milestones

#### 4.3.3 Target Product Profile
- Intended indication
- Target population
- Expected efficacy profile
- Expected safety profile

**CRITICAL RULES:**
1. Use "{{compoundName}}" throughout - never placeholders
2. Reference actual data from context
3. Write complete, professional prose
4. NO [DATA_NEEDED] - use available information or class-based statements

**DATA PROVIDED:**
{{dataContext}}
`,

  // Section 5: Physical, Chemical, and Pharmaceutical Properties
  ib_physical_chemical: `
Generate Section 5: Physical, Chemical, and Pharmaceutical Properties for the Investigator's Brochure.

**Product:** {{compoundName}}

## 5. PHYSICAL, CHEMICAL, AND PHARMACEUTICAL PROPERTIES

This section describes the pharmaceutical properties of {{compoundName}}.

### 5.1 Drug Substance

#### 5.1.1 Chemical Name and Structure
- Nonproprietary name (INN): {{compoundName}}
- Chemical name: [Use from CMC data or label]
- Structural formula: [Describe or reference]

#### 5.1.2 Molecular Formula and Molecular Weight
- Molecular formula: [From CMC data]
- Molecular weight: [From CMC data] g/mol
- CAS registry number: [If available]

#### 5.1.3 Physical Properties
- Physical state and appearance
- Polymorphism (if applicable)
- pKa and ionization
- Partition coefficient (log P)
- Solubility profile
- Hygroscopicity
- Melting point
- Stability characteristics

### 5.2 Drug Product

#### 5.2.1 Formulation and Composition
- Dosage form: [From project data]
- Active ingredient and strength
- Excipients (qualitative)

#### 5.2.2 Dosage Form and Strength
- Available strengths for clinical trials
- Description of dosage form

#### 5.2.3 Packaging
- Primary container closure
- Secondary packaging

#### 5.2.4 Storage Conditions
- Recommended storage temperature
- Protection from light/moisture

#### 5.2.5 Shelf Life
- Assigned shelf life for clinical supplies

### 5.3 Preparation and Administration

#### 5.3.1 Preparation / Reconstitution
- Instructions if applicable
- "No reconstitution required" for oral solid dosage forms

#### 5.3.2 Route and Method of Administration
- Route: [From project data]
- Administration instructions

#### 5.3.3 Compatibility Information
- Known incompatibilities
- Handling precautions

**CRITICAL RULES:**
1. Use actual CMC data from context
2. If specific values unavailable, state "To be characterized" or use class-typical values
3. NO [DATA_NEEDED] placeholders
4. Keep this section factual and concise

**DATA PROVIDED:**
{{dataContext}}
`,

  // Section 6: Nonclinical Studies
  ib_nonclinical: `
Generate Section 6: Nonclinical Studies for the Investigator's Brochure.

**Product:** {{compoundName}}

## 6. NONCLINICAL STUDIES

This section summarizes the nonclinical pharmacology and toxicology of {{compoundName}}.

### 6.1 Pharmacology

#### 6.1.1 Primary Pharmacodynamics
- Primary pharmacological target and mechanism
- In vitro binding/activity data
- In vivo efficacy models

#### 6.1.2 Secondary Pharmacodynamics
- Off-target activity
- Selectivity profile

#### 6.1.3 Safety Pharmacology
- CNS effects (Irwin test, FOB)
- Cardiovascular effects (hERG, telemetry)
- Respiratory effects

### 6.2 Pharmacokinetics in Animals

#### 6.2.1 Absorption, Distribution, Metabolism, and Excretion in Animals
- Absorption characteristics
- Tissue distribution
- Metabolic pathways
- Excretion routes

#### 6.2.2 Species Comparison
- PK parameters across species
- Relevance to human PK prediction

### 6.3 Toxicology

#### 6.3.1 Single-Dose Toxicity
- Species tested
- Routes evaluated
- Approximate lethal doses or maximum tolerated doses

#### 6.3.2 Repeat-Dose Toxicity
- Species and duration
- Target organs identified
- NOAEL values
- Reversibility of findings

#### 6.3.3 Genotoxicity
- Ames test results
- In vitro chromosomal aberration
- In vivo micronucleus test

#### 6.3.4 Carcinogenicity
- Study status (completed/ongoing/planned)
- Key findings if available

#### 6.3.5 Reproductive and Developmental Toxicity
- Fertility studies
- Embryo-fetal development
- Pre- and postnatal development

#### 6.3.6 Local Tolerance (if applicable)
- Injection site reactions
- Dermal/ocular irritation

#### 6.3.7 Other Toxicity Studies (if available)
- Immunotoxicity
- Phototoxicity
- Abuse liability

### 6.4 Overall Nonclinical Assessment (Summary)
- Key findings relevant to clinical use
- Safety margins
- Implications for clinical monitoring

**CRITICAL RULES:**
1. Use toxicology data from context (label nonclinical section or class-based)
2. If specific studies not available, use class-based summaries
3. State "Studies conducted per ICH guidelines" for standard battery
4. NO [DATA_NEEDED] - write complete statements

**DATA PROVIDED:**
{{dataContext}}
`,

  // Section 7: Effects in Humans (Clinical Studies)
  ib_clinical_studies: `
Generate Section 7: Effects in Humans for the Investigator's Brochure.

**Product:** {{compoundName}}
**Indication:** {{indication}}
**Phase:** {{phase}}

## 7. EFFECTS IN HUMANS

This section summarizes the clinical experience with {{compoundName}}.

### 7.1 Overview of Clinical Development

#### 7.1.1 Scope of Development
- Total number of clinical studies
- Studies by phase
- Key indications studied

#### 7.1.2 Patient Exposure
- Total patients exposed to {{compoundName}}
- Exposure by dose level
- Duration of exposure

#### 7.1.3 Development Milestones
- Regulatory approvals (if any)
- Key clinical milestones

### 7.2 Pharmacokinetics and Pharmacodynamics in Humans

#### 7.2.1 Pharmacokinetics
Use PK data from context:
- Absorption (Tmax, bioavailability)
- Distribution (Vd, protein binding)
- Metabolism (pathways, enzymes)
- Elimination (t½, clearance)
- Special populations (renal, hepatic, elderly)

#### 7.2.2 Pharmacodynamics and Mechanism of Action
- PD biomarkers
- Dose-response relationships
- Onset and duration of effect

### 7.3 Clinical Efficacy

**IMPORTANT: Only include trials RELEVANT to {{indication}}. Filter out unrelated studies.**

#### 7.3.1 Phase 1 Studies
For each relevant Phase 1 study:
- NCT ID and title
- Design and population
- Key PK/safety findings

#### 7.3.2 Phase 2 Studies
For each relevant Phase 2 study:
- NCT ID and title
- Design, population, endpoints
- Efficacy results with statistics

#### 7.3.3 Phase 3 Studies
For each relevant Phase 3 study:
- NCT ID and title
- Design and sample size
- Primary endpoint results (effect size, p-value, CI)
- Secondary endpoint results

Include the sponsor's current study:
**{{phase}} Study in {{indication}}**
- Study design from project data
- Primary endpoint
- Planned sample size

### 7.4 Clinical Safety

#### 7.4.1 Safety Database
- Total exposure in clinical trials
- Duration of treatment

#### 7.4.2 Adverse Events
**Use FAERS data from context to create this table:**

| Adverse Event (MedDRA PT) | Frequency (%) | Severity |
|---------------------------|---------------|----------|
| [Use actual FAERS data] | [%] | [severity] |

#### 7.4.3 Serious Adverse Events
- SAE incidence
- Deaths (number and causes)
- SAEs by system organ class

#### 7.4.4 Laboratory Findings
- Clinically significant changes
- Monitoring recommendations

### 7.5 Benefit–Risk Assessment

#### 7.5.1 Summary of Benefits
- Efficacy demonstrated in trials
- Advantages over existing treatments

#### 7.5.2 Summary of Risks
- Key safety concerns
- Risk mitigation strategies

#### 7.5.3 Overall Benefit–Risk Assessment
- Conclusion on benefit-risk balance
- Suitability for {{phase}} development

**CRITICAL RULES:**
1. Use "{{compoundName}}" throughout - NEVER [INVESTIGATIONAL PRODUCT]
2. Only include trials for {{indication}} - filter out unrelated NCTs
3. Use ACTUAL FAERS frequencies in AE table
4. Include statistics (p-values, CIs) where available
5. NO [DATA_NEEDED] - use available data or state "Data from ongoing studies"

**DATA PROVIDED:**
{{dataContext}}
`,

  // Section 8: Summary of Data and Guidance for Investigator
  ib_safety: `
Generate Section 8: Summary of Data and Guidance for the Investigator for the Investigator's Brochure.

**Product:** {{compoundName}}
**Indication:** {{indication}}
**Phase:** {{phase}}

## 8. SUMMARY OF DATA AND GUIDANCE FOR THE INVESTIGATOR

This section provides practical guidance for investigators conducting clinical trials with {{compoundName}}.

### 8.1 Summary of Safety Profile

#### 8.1.1 Overall Safety Experience
- Total patients exposed
- Deaths in clinical program
- Overall safety assessment

#### 8.1.2 Most Common Adverse Events
**From FAERS data:**
- List top 10 AEs with frequencies

#### 8.1.3 Serious Adverse Events
- SAE types and frequencies
- Risk factors

#### 8.1.4 Warnings and Precautions (High-Level)
- Key safety concerns
- Black box warnings (if any)

### 8.2 Adverse Event Table

**Create a comprehensive table using FAERS data:**

| Adverse Event | Frequency (%) | Count/Total | Severity | Management |
|---------------|---------------|-------------|----------|------------|
| [From FAERS] | [%] | [n/N] | [mild/moderate/severe] | [guidance] |

### 8.3 Warnings and Precautions

#### 8.3.1 Key Warnings
- List all warnings from FDA label
- Clinical significance

#### 8.3.2 Contraindications
- Absolute contraindications
- Relative contraindications

#### 8.3.3 Drug Interactions
- CYP interactions
- Pharmacodynamic interactions
- Contraindicated combinations

### 8.4 Special Populations

#### 8.4.1 Pregnancy
- Pregnancy category or risk summary
- Recommendations

#### 8.4.2 Lactation
- Excretion in breast milk
- Recommendations

#### 8.4.3 Pediatric Use
- Approved pediatric indications
- Safety in children

#### 8.4.4 Geriatric Use
- Dose adjustments
- Special considerations

#### 8.4.5 Renal and Hepatic Impairment
- Dose adjustments required
- Monitoring recommendations

### 8.5 Dosing Recommendations

#### 8.5.1 Recommended Dose (Study {{phase}})
- Starting dose
- Titration schedule (if any)
- Maintenance dose
- Maximum dose

#### 8.5.2 Dose Modifications
- Criteria for dose reduction
- Criteria for dose interruption
- Criteria for discontinuation

#### 8.5.3 Administration Instructions
- Timing (with/without food)
- Method of administration

### 8.6 Monitoring Recommendations

#### 8.6.1 Baseline Assessments
- Required baseline tests
- Psychiatric assessment
- Medical history review

#### 8.6.2 Ongoing Monitoring
- Visit schedule
- Safety assessments at each visit
- Laboratory monitoring

#### 8.6.3 Additional/Targeted Monitoring
- High-risk patients
- Specific AE monitoring

### 8.7 Overdose Management

- Signs and symptoms of overdose
- Treatment recommendations
- Antidote (if available)
- Supportive care

### 8.8 Guidance for Investigators

#### 8.8.1 Patient Selection Criteria (Practical Considerations)
- Key inclusion considerations
- Key exclusion considerations
- When to consult Medical Monitor

#### 8.8.2 Safety Monitoring During the Trial
- Ongoing safety assessment
- When to modify dose
- When to discontinue

#### 8.8.3 Adverse Event and SAE Reporting Requirements
- AE documentation
- SAE reporting timelines
- Pregnancy reporting

#### 8.8.4 Communication with the Sponsor and Ethics Committees
- Safety reporting to sponsor
- Protocol amendments
- Updated informed consent

**CRITICAL RULES:**
1. Use "{{compoundName}}" throughout
2. Include ACTUAL FAERS frequencies in all AE tables
3. Use FDA label warnings and contraindications
4. Provide ACTIONABLE guidance for investigators
5. NO [DATA_NEEDED] - write complete guidance

**DATA PROVIDED:**
{{dataContext}}
`
}

// ============================================================================
// FORBIDDEN CONTENT PATTERNS
// ============================================================================

export const IB_FORBIDDEN_PATTERNS = [
  // Placeholders
  /\[DATA_NEEDED[^\]]*\]/gi,
  /\[INVESTIGATIONAL PRODUCT\]/gi,
  /\[TO BE PROVIDED[^\]]*\]/gi,
  /\[INSERT[^\]]*\]/gi,
  /\[TBD\]/gi,
  /\{\{[^}]+\}\}/g, // Unsubstituted template variables
  
  // CSR-specific sections that don't belong in IB
  /sample case report forms/gi,
  /list of investigators and study centers/gi,
  /audit certificates/gi,
  /patient information sheet/gi,
  /listings of individual patient data/gi,
  /protocol deviations listing/gi,
  
  // Errors
  /NCTNCT/g, // Double NCT prefix
  /NCT\s+NCT/gi,
  
  // Empty section indicators
  /no data available/gi,
  /data not available/gi,
  /information not provided/gi
]

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const IB_VALIDATION_RULES = {
  requiredSections: [
    'Summary',
    'Introduction',
    'Physical, Chemical',
    'Nonclinical Studies',
    'Effects in Humans',
    'Guidance for the Investigator'
  ],
  
  minSectionLength: {
    'ib_summary': 1500,
    'ib_introduction': 2000,
    'ib_physical_chemical': 1000,
    'ib_nonclinical': 2000,
    'ib_clinical_studies': 3000,
    'ib_safety': 2500
  },
  
  requiredElements: {
    'ib_summary': ['mechanism', 'efficacy', 'safety', 'dose'],
    'ib_clinical_studies': ['NCT', 'Phase', 'endpoint', 'adverse event'],
    'ib_safety': ['adverse event', 'warning', 'contraindication', 'dose']
  }
}

export default IB_SECTION_PROMPTS_V4
