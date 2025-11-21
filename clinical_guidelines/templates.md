# Clinical Document Templates & Generation Status

This document tracks the supported clinical document types, their purpose, and current implementation status in the Skaldi engine.

## 1. Clinical Study Protocol
**Purpose**: The document that describes the objective(s), design, methodology, statistical considerations, and organization of a trial. It is the "instruction manual" for the clinical trial. Complies with ICH E6 (GCP).
**Status**: **Partially Implemented**
-   Prompts exist (`lib/prompts/protocol-prompt.ts`).
-   Reference examples available (`protocol_femilex.md`, etc.).
-   Full template structure needs to be formalized.

## 2. Investigator's Brochure (IB)
**Purpose**: A compilation of the clinical and nonclinical data on the investigational product(s) that is relevant to the study of the investigational product(s) in human subjects. Provides investigators with insights to assess risks/benefits. Complies with ICH E6.
**Status**: **Partially Implemented**
-   Prompts exist (`lib/prompts/ib-prompt.ts`).
-   Reference examples available (`bcd-089_IB.md`).
-   Requires deep integration with non-clinical data sources.

## 3. Clinical Study Report (CSR)
**Purpose**: An "integrated" full report of an individual study of any therapeutic, prophylactic, or diagnostic agent. Complies with ICH E3. This is the final output of the trial.
**Status**: **Planned**
-   No dedicated prompts found in current codebase.
-   Strong reference examples available (`bcd-063_CSR.md`).
-   High complexity; requires robust statistical outputs.

## 4. Informed Consent Form (ICF)
**Purpose**: A document used to provide information to a subject to allow them to make an informed decision about participation in a clinical trial. Must be written in lay language.
**Status**: **Partially Implemented**
-   Prompts exist (`lib/prompts/icf-prompt.ts`).
-   Reference examples available.
-   Needs distinct templates for Adult vs Paediatric populations.

## 5. Protocol Synopsis
**Purpose**: A brief summary (usually 1-5 pages) of the key elements of the protocol. Often generated first to align stakeholders on study design.
**Status**: **Partially Implemented**
-   Prompts exist (`lib/prompts/synopsis-prompt.ts`).
-   Reference available (`synopsis_femoston.md`).

## 6. Product Summary / SPC
**Purpose**: Summary of Product Characteristics or similar high-level product summaries. Used for regulatory labeling or quick reference.
**Status**: **Planned**
-   Reference examples available (`summary_linex.md`).
-   Not yet wired into orchestration.

## 7. Statistical Analysis Plan (SAP)
**Purpose**: A document that contains a more technical and detailed elaboration of the principal features of the analysis described in the protocol.
**Status**: **Planned** (Future)
-   To be added later.

---

# Section Maps (TOC)

## 1. Clinical Study Protocol – Section Map
*Based on ICH E6 and `protocol_femilex.md`*

1.  **Title Page**
    *   Protocol ID, Date, Version
    *   Investigational Product
    *   Sponsor & Medical Expert details
2.  **Signature Pages**
    *   Sponsor Signatures
    *   Investigator Signatures
3.  **Synopsis**
4.  **Table of Contents**
5.  **List of Abbreviations**
6.  **Background Information**
    *   Investigational Product Name & Description
    *   Preclinical & Clinical Data Summary
    *   Risks/Benefits
7.  **Study Objectives and Purpose**
8.  **Study Design**
    *   Type/Design (e.g., double-blind, placebo-controlled)
    *   Randomization & Blinding
    *   Study Treatments & Dosage
    *   Duration of Subject Participation
    *   Discontinuation Criteria
9.  **Selection and Withdrawal of Subjects**
    *   Inclusion Criteria
    *   Exclusion Criteria
    *   Withdrawal Criteria
10. **Treatment of Subjects**
    *   Administered Treatments
    *   Medication Permitted/Not Permitted
11. **Assessment of Efficacy**
    *   Specification of Efficacy Parameters
    *   Methods & Timing
12. **Assessment of Safety**
    *   Specification of Safety Parameters
    *   Adverse Events Reporting
13. **Statistics**
    *   Statistical Methods
    *   Sample Size Determination
    *   Analysis Sets
14. **Ethics**
    *   IEC/IRB
    *   Informed Consent

## 2. Investigator's Brochure (IB) – Section Map
*Based on ICH E6 and `bcd-089_IB.md`*

1.  **Title Page** (Sponsor, Product, Version, Date)
2.  **Confidentiality Statement**
3.  **Table of Contents**
4.  **Summary** (Executive Summary)
5.  **Introduction**
    *   Chemical Name / Generic Name
    *   Pharmacological Class
    *   Rationale for Development
6.  **Physical, Chemical, and Pharmaceutical Properties and Formulation**
7.  **Nonclinical Studies**
    *   Nonclinical Pharmacology
    *   Pharmacokinetics and Product Metabolism in Animals
    *   Toxicology
8.  **Effects in Humans**
    *   Pharmacokinetics and Product Metabolism in Humans
    *   Safety and Efficacy
    *   Marketing Experience
9.  **Summary of Data and Guidance for the Investigator**

## 3. Clinical Study Report (CSR) – Section Map
*Based on ICH E3 and `bcd-063_CSR.md`*

1.  **Title Page**
2.  **Synopsis**
3.  **Table of Contents for the Individual Clinical Study Report**
4.  **List of Abbreviations and Definitions of Terms**
5.  **Ethics**
    *   IEC/IRB
    *   Ethical Conduct of the Study
    *   Patient Information and Consent
6.  **Investigators and Study Administrative Structure**
7.  **Introduction**
8.  **Study Objectives**
9.  **Investigational Plan**
    *   Overall Study Design and Plan
    *   Discussion of Study Design
    *   Selection of Study Population (Inclusion/Exclusion)
    *   Treatments
    *   Efficacy and Safety Variables
    *   Data Quality Assurance
    *   Statistical Methods
10. **Study Patients**
    *   Disposition of Patients
    *   Protocol Deviations
11. **Efficacy Evaluation**
    *   Data Sets Analyzed
    *   Demographic and Other Baseline Characteristics
    *   Measurements of Treatment Compliance
    *   Efficacy Results and Tabulations
12. **Safety Evaluation**
    *   Adverse Events
    *   Deaths, Other Serious Adverse Events
    *   Clinical Laboratory Evaluation
13. **Discussion and Overall Conclusions**
14. **Tables, Figures and Graphs Referred to but not Included in the Text**
15. **Reference List**
16. **Appendices**

## 4. Informed Consent Form (ICF) – Section Map
*Based on GCP and `ICF_linex.md`*

1.  **Header** (Study Title, Protocol ID, Sponsor, Investigator)
2.  **Introduction** (Invitation to participate)
3.  **Purpose of the Study**
4.  **Study Procedures** (What will happen, duration, randomization)
5.  **Responsibilities of the Participant**
6.  **Risks and Discomforts**
7.  **Benefits** (to participant and society)
8.  **Alternative Treatments**
9.  **Confidentiality of Records**
10. **Compensation / Costs**
11. **Voluntary Participation / Withdrawal**
12. **Contacts** (for questions/injury)
13. **Consent Signature Page** (Participant & Investigator signatures)

## 5. Protocol Synopsis – Section Map
*Based on `synopsis_femoston.md`*

1.  **Study Title**
2.  **Study Aim / Rationale**
3.  **Study Design** (Type, phases, blinding)
4.  **Study Sites** (Number and location)
5.  **Patient Population** (Inclusion criteria summary, Sample size)
6.  **Treatment Groups and Posology** (Test product, Reference, Placebo)
7.  **Study Objectives**
    *   Primary
    *   Secondary
8.  **Endpoints / Assessments**
    *   Efficacy
    *   Safety
    *   Other (PK/PD, QoL)
9.  **Statistical Methods** (Brief summary)

---

# QC – Minimal Checks

## Protocol QC
-   [ ] Synopsis objectives must match Section 7 objectives.
-   [ ] Schedule of Assessments (Table) must cover all visits in Section 10.
-   [ ] Inclusion criteria must define age limits.
-   [ ] Primary endpoint must be defined in Section 11 (Efficacy).
-   [ ] Sample size calculation must reference the Primary Endpoint.

## IB QC
-   [ ] Nonclinical summary must reference pharmacology and toxicology.
-   [ ] Clinical experience section must be present if Phase 2+.
-   [ ] Reference Safety Information (RSI) must be clearly identified.

## CSR QC
-   [ ] Analysis populations (ITT, PP, Safety) must be defined.
-   [ ] Disposition table must sum to total enrolled.
-   [ ] AE summary table must exist.
-   [ ] All appendices referenced in text must exist.

## ICF QC
-   [ ] Must state that participation is voluntary.
-   [ ] Must mention the specific study drug.
-   [ ] Must list contacts for injury/questions.
-   [ ] Language must be lay-friendly (check readability score).

## Synopsis QC
-   [ ] Objectives must aligned with Full Protocol.
-   [ ] Study Design must match flow diagram.
