/**
 * IB (Investigator's Brochure) Section-Specific Prompts
 * 
 * Version: 3.0.0 - Simplified, Azure-safe prompts
 * Date: 2025-11-28
 * 
 * Key changes:
 * - Removed aggressive language that triggers Azure content filter
 * - Shortened prompts to prevent model confusion
 * - Clear section boundaries to prevent duplication
 * - Direct data injection without complex instructions
 */

export const IB_SECTION_PROMPTS: Record<string, string> = {
  
  // Section 1: Title Page (usually auto-generated)
  ib_title_page: `
Generate the Title Page for the Investigator's Brochure.

Product: {{compoundName}}
Indication: {{indication}}
Phase: {{phase}}
Sponsor: {{sponsor}}

Include:
- Document title: "Investigator's Brochure"
- Product name
- Edition number and date
- Sponsor name and address
- Confidentiality statement

Keep it to one page.
`,

  // Section 2: Table of Contents
  // NOTE: TOC should ideally be auto-generated from actual document sections
  // This prompt creates a placeholder that will be replaced by actual TOC
  ib_toc: `
## TABLE OF CONTENTS

[This Table of Contents will be automatically generated based on the final document structure and pagination.]

---
`,

  // Section 3: Summary
  ib_summary: `
Generate Section 3: Summary for the Investigator's Brochure.

Product: {{compoundName}}
Indication: {{indication}}
Phase: {{phase}}

## 3. SUMMARY

Write a concise executive summary (1-2 pages) covering:
- Product description and mechanism of action
- Key nonclinical findings
- Clinical development status
- Efficacy highlights
- Safety profile summary
- Recommended dose and administration

Use the data provided below:

{{dataContext}}

Target length: {{targetTokens}} tokens
`,

  // Section 4: Introduction
  ib_introduction: `
Generate Section 4: Introduction for the Investigator's Brochure.

Product: {{compoundName}}
Indication: {{indication}}
Phase: {{phase}}

## 4. INTRODUCTION

Write an introduction (2-3 pages) covering:

### 4.1 Background
- Disease background and unmet medical need
- Current treatment landscape
- Rationale for developing {{compoundName}}

### 4.2 Product Overview
- Chemical/biological description
- Mechanism of action
- Therapeutic class

### 4.3 Development Rationale
- Scientific rationale
- Regulatory pathway
- Target product profile

Use the data provided below:

{{dataContext}}

Target length: {{targetTokens}} tokens
`,

  // Section 5: Physical, Chemical, and Pharmaceutical Properties
  ib_physical_chemical: `
Generate Section 5: Physical, Chemical, and Pharmaceutical Properties for the Investigator's Brochure.

Product: {{compoundName}}

## 5. PHYSICAL, CHEMICAL, AND PHARMACEUTICAL PROPERTIES

### 5.1 Drug Substance
- Chemical name and structure
- Molecular formula and weight
- Physical properties (appearance, solubility, stability)

### 5.2 Drug Product
- Formulation and composition
- Dosage form and strength
- Storage conditions
- Shelf life

### 5.3 Preparation and Administration
- Reconstitution instructions (if applicable)
- Administration route and method
- Compatibility information

Use the data provided below:

{{dataContext}}

Target length: {{targetTokens}} tokens
`,

  // Section 6: Nonclinical Studies
  ib_nonclinical: `
Generate Section 6: Nonclinical Studies for the Investigator's Brochure.

Product: {{compoundName}}

## 6. NONCLINICAL STUDIES

### 6.1 Pharmacology
- Primary pharmacodynamics
- Secondary pharmacodynamics
- Safety pharmacology

### 6.2 Pharmacokinetics in Animals
- Absorption, distribution, metabolism, excretion in animals
- Species comparison

### 6.3 Toxicology
- Single-dose toxicity
- Repeat-dose toxicity
- Genotoxicity
- Carcinogenicity (if available)
- Reproductive toxicity

Use the data provided below:

{{dataContext}}

Target length: {{targetTokens}} tokens
`,

  // Section 7: Effects in Humans (Clinical Studies)
  ib_clinical_studies: `
Generate Section 7: Effects in Humans for the Investigator's Brochure.

Product: {{compoundName}}
Indication: {{indication}}
Phase: {{phase}}

## 7. EFFECTS IN HUMANS

Write this section using the clinical trial data and FDA label information provided below. Use the actual compound name "{{compoundName}}" throughout.

### 7.1 Overview of Clinical Development
- Number of studies conducted
- Total patients exposed
- Development milestones

### 7.2 Pharmacokinetics and Pharmacodynamics in Humans
- Summary of human PK
- PD findings and biomarkers

### 7.3 Clinical Efficacy

#### 7.3.1 Phase 1 Studies
For each study, include: NCT ID, design, population, endpoints, key results.

#### 7.3.2 Phase 2 Studies
For each study, include: NCT ID, design, population, endpoints, efficacy results.

#### 7.3.3 Phase 3 Studies
For each study, include: NCT ID, design, population, primary endpoint, results with statistics.

### 7.4 Clinical Safety

#### 7.4.1 Safety Database
- Total exposure
- Duration of treatment

#### 7.4.2 Adverse Events
Create a table of common adverse events using the FAERS data provided.

| Adverse Event | Frequency | 
|---------------|-----------|
| [Use actual data from context] | [%] |

#### 7.4.3 Serious Adverse Events
- SAE incidence
- Deaths (if any)

#### 7.4.4 Laboratory Findings
- Clinically significant changes

### 7.5 Benefit-Risk Assessment
- Summary of benefits
- Summary of risks
- Overall assessment

DATA PROVIDED:

{{dataContext}}

Target length: {{targetTokens}} tokens
`,

  // Section 11: Summary of Data and Guidance for Investigator
  ib_safety: `
Generate Section 8: Summary of Data and Guidance for the Investigator for the Investigator's Brochure.

Product: {{compoundName}}
Indication: {{indication}}
Phase: {{phase}}

## 8. SUMMARY OF DATA AND GUIDANCE FOR THE INVESTIGATOR

This section provides practical guidance for investigators conducting clinical trials with {{compoundName}}.

### 8.1 Summary of Safety Profile

Using the FAERS and FDA label data provided, summarize:
- Most common adverse events (with frequencies)
- Serious adverse events
- Warnings and precautions from FDA label

### 8.2 Adverse Event Table

Create a table using the actual FAERS data provided:

| Adverse Event | Frequency | Severity | Management |
|---------------|-----------|----------|------------|
| [Use data from context] | [%] | [severity] | [management] |

### 8.3 Warnings and Precautions
- Key warnings from FDA label
- Contraindications
- Drug interactions

### 8.4 Special Populations
- Pregnancy and lactation
- Pediatric use
- Geriatric use
- Renal/hepatic impairment

### 8.5 Dosing Recommendations
- Recommended dose
- Dose modifications
- Administration instructions

### 8.6 Monitoring Recommendations
- Required baseline assessments
- Ongoing monitoring
- Laboratory tests

### 8.7 Overdose Management
- Signs and symptoms
- Treatment recommendations

### 8.8 Guidance for Investigators
- Patient selection criteria
- Safety monitoring during trial
- Reporting requirements

DATA PROVIDED:

{{dataContext}}

Target length: {{targetTokens}} tokens
`
}

export default IB_SECTION_PROMPTS
