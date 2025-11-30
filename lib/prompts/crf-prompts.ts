/**
 * CRF (eCRF Specification) Section-Specific Prompts
 * CDISC CDASH standards compliant
 * Version: 1.1.0 - Now extracts data from Protocol
 */

export const CRF_SECTION_PROMPTS: Record<string, string> = {
  crf_title_page: `<task>Generate eCRF Specification Title Page.</task>
<available_data>{{dataContext}}</available_data>
<critical_rules>
- Use ACTUAL protocol number, compound, sponsor from data
- Reference CDISC CDASH standards
- DO NOT write "[DATA_NEEDED]" - all data is available in the context
- Extract visit windows, eligibility criteria, assessments from the Protocol document provided
</critical_rules>
<required_content>
# eCRF Specification
**Protocol Number**: [From data]
**Study Title**: [Full title]
**Compound**: {{compoundName}}
**Indication**: {{indication}}
**Phase**: {{phase}}
**Sponsor**: [From data]
**eCRF Version**: 1.0
**Standards**: CDISC CDASH v1.1, SDTM v1.7
</required_content>`,

  crf_toc: `<task>Generate eCRF Table of Contents.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## Table of Contents
1. Introduction
2. Study Design Overview
3. Visit Schedule and Windows
4. Forms by Visit (Screening, Baseline, Treatment, Follow-up)
5. Domain Forms (DM, MH, CM, AE, EX, EF, LB, VS, PE)
6. Edit Checks and Validation Rules
7. CDASH/SDTM Mapping
8. Data Dictionary
</required_content>`,

  crf_introduction: `<task>Generate eCRF Introduction section.</task>
<available_data>{{dataContext}}</available_data>
<critical_rules>
- Explain purpose of eCRF specification
- List standards: CDASH, SDTM, MedDRA, WHO Drug
- DO NOT write "[DATA_NEEDED]"
</critical_rules>
<required_content>
## 1. Introduction
### 1.1 Purpose
This eCRF Specification defines electronic Case Report Forms for {{compoundName}} {{phase}} study in {{indication}}.

### 1.2 Standards
| Standard | Version | Application |
|----------|---------|-------------|
| CDISC CDASH | 1.1 | CRF field naming |
| CDISC SDTM | 1.7 | Target data model |
| MedDRA | Current | AE/MH coding |
| WHO Drug | Current | CM coding |

### 1.3 Conventions
- Required fields marked with *
- Date format: DD-MMM-YYYY
- Time format: HH:MM (24-hour)
</required_content>`,

  crf_study_overview: `<task>Generate Study Design Overview for eCRF.</task>
<available_data>{{dataContext}}</available_data>
<critical_rules>
- EXTRACT study design details from Protocol document in context
- Use ACTUAL protocol number, design type, duration, treatment arms
- DO NOT use placeholders - all data is available in Protocol
</critical_rules>
<required_content>
## 2. Study Design Overview

**EXTRACT FROM PROTOCOL:**

| Parameter | Value |
|-----------|-------|
| Protocol | [EXTRACT: Protocol number from Protocol] |
| Phase | {{phase}} |
| Design | [EXTRACT: Design type - randomized, double-blind, etc.] |
| Duration | [EXTRACT: Treatment duration in weeks] |
| Population | [EXTRACT: Target population from Protocol] |
| Sample Size | [EXTRACT: Planned sample size] |

### Treatment Arms
**EXTRACT FROM PROTOCOL: Actual treatment arms, doses, routes**

| Arm | Treatment | Dose | Route |
|-----|-----------|------|-------|
| A | {{compoundName}} | [EXTRACT: Actual dose] | [EXTRACT: Route] |
| B | [EXTRACT: Comparator] | [EXTRACT: Dose] | [EXTRACT: Route] |

### Randomization
- Ratio: [EXTRACT from Protocol]
- Stratification factors: [EXTRACT from Protocol]
</required_content>`,

  crf_visit_schedule: `<task>Generate Visit Schedule for eCRF.</task>
<available_data>{{dataContext}}</available_data>
<critical_rules>
- EXTRACT the ACTUAL visit schedule from Protocol document in context
- Use the EXACT visit names, timing, and windows from Protocol
- List the ACTUAL assessments required at each visit from Protocol
- DO NOT use generic placeholders - Protocol has all the data
</critical_rules>
<required_content>
## 3. Visit Schedule and Windows

**EXTRACT FROM PROTOCOL: Create table with actual visits, timing, windows, and assessments**

| Visit | Code | Target Day | Window | Key Forms |
|-------|------|------------|--------|-----------|
| [From Protocol] | [Code] | [Day] | [Window] | [Forms per Protocol] |

For each visit, specify:
- Visit name and code
- Target study day
- Allowable window (±days)
- Required CRF forms/assessments

Include all visits from Protocol:
- Screening
- Baseline/Randomization
- Treatment visits (per Protocol schedule)
- End of Treatment
- Follow-up
- Unscheduled visits (if applicable)
</required_content>`,

  crf_screening_forms: `<task>Generate Screening Visit Forms specification.</task>
<available_data>{{dataContext}}</available_data>
<critical_rules>
- EXTRACT the actual screening window from Protocol (e.g., "Day -28 to Day -1")
- EXTRACT the actual inclusion criteria from Protocol and list them
- EXTRACT the actual exclusion criteria from Protocol and list them
- EXTRACT EDSS range if this is an MS study (from Protocol inclusion criteria)
- DO NOT use [DATA_NEEDED] - all data is in the Protocol provided in context
</critical_rules>
<required_content>
## 4.1 Screening Visit Forms

Visit: Screening
Visit Window: [EXTRACT FROM PROTOCOL - e.g., Day -28 to Day -1]

### 4.1.1 Screening Form Overview
List all forms required at screening based on Protocol assessments.

### 4.1.2 Informed Consent (IC)
| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Consent Date | ICDTC | Date | Yes |
| Consent Version | ICVER | Text | Yes |

### 4.1.3 Demographics (DM-SCR)
Include: Subject ID, DOB, Age, Sex, Race, Ethnicity, Country, Height, Weight

### 4.1.4 Inclusion/Exclusion Criteria (IE)
**CRITICAL: List the ACTUAL criteria from Protocol**
| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Criterion | IETEST | Text | Yes |
| Met? | IEORRES | Y/N | Yes |

Inclusion Criteria (from Protocol):
[List each inclusion criterion with number]

Exclusion Criteria (from Protocol):
[List each exclusion criterion with number]

### 4.1.5 Disease History
For {{indication}}: capture diagnosis date, disease course, prior treatments

### 4.1.6 Medical History (MH-SCR)
### 4.1.7 Prior Medications (CM-SCR)
### 4.1.8 Physical Examination (PE-NEU)
### 4.1.9 Vital Signs (VS-SCR)
### 4.1.10 Laboratory Assessments (LB-SCR)
### 4.1.11 Eligibility Confirmation

Edit Checks:
- All inclusion = Y, all exclusion = N for eligibility
- Age ≥ 18 years (or per Protocol)
- Consent date ≤ all other screening dates
</required_content>`,

  crf_baseline_forms: `<task>Generate Baseline Visit Forms specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 4.2 Baseline Visit Forms

### Randomization (RS)
| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Randomization Date | RSDTC | Date | Yes |
| Randomization Number | RANDNUM | Text | Yes |
| Treatment Arm | ARMCD | Text | Yes |

### First Dose (EX)
| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Treatment | EXTRT | Text | Yes |
| Dose | EXDOSE | Num | Yes |
| Start Date | EXSTDTC | Date | Yes |
</required_content>`,

  crf_treatment_forms: `<task>Generate Treatment Visit Forms specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 4.3 Treatment Visit Forms

### Ongoing Exposure (EX)
| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Treatment | EXTRT | Text | Yes |
| Dose | EXDOSE | Num | Yes |
| Dose Modification? | EXADJ | Y/N | Yes |
| Reason | EXADJREA | Text | If Y |

### Compliance (DA)
| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Doses Prescribed | DAPRESCR | Num | Yes |
| Doses Taken | DATAKEN | Num | Yes |
| Compliance % | DACOMP | Num | Derived |
</required_content>`,

  crf_unscheduled_forms: `<task>Generate Unscheduled Visit Forms specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 4.4 Unscheduled Visit Forms

### Visit Header
| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Visit Date | SVSTDTC | Date | Yes |
| Reason | SVREASND | Text | Yes |

Reasons: AE evaluation, Relapse, Repeat labs, Other

Available forms: AE, CM, VS, LB (as needed)
</required_content>`,

  crf_followup_forms: `<task>Generate Follow-up Visit Forms specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 4.5 Follow-up Visit Forms

### Subject Disposition (DS)
| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Disposition Date | DSDTC | Date | Yes |
| Status | DSDECOD | Text | Yes |
| Reason | DSTERM | Text | If not completed |

Status codes: COMPLETED, ADVERSE EVENT, WITHDRAWAL, LOST TO FOLLOW-UP, DEATH
</required_content>`,

  crf_demographics: `<task>Generate Demographics (DM) form specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 5.1 Demographics (DM)

| Field | CDASH | Type | Required | Codelist |
|-------|-------|------|----------|----------|
| Subject ID | SUBJID | Text | Yes | |
| Birth Date | BRTHDTC | Date | Yes* | |
| Age | AGE | Num | Yes* | |
| Sex | SEX | Text | Yes | M/F |
| Race | RACE | Text | Yes | CDASH CT |
| Ethnicity | ETHNIC | Text | Yes | CDASH CT |
| Country | COUNTRY | Text | Yes | ISO 3166 |

*Either birth date or age required
</required_content>`,

  crf_medical_history: `<task>Generate Medical History (MH) form specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 5.2 Medical History (MH)

| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Condition | MHTERM | Text | Yes |
| MedDRA PT | MHDECOD | Text | Derived |
| Start Date | MHSTDTC | Date | No |
| Ongoing? | MHONGO | Y/N | Yes |

Coding: MedDRA (current version)

Required categories:
- Primary diagnosis history
- Prior treatments for {{indication}}
- Relevant comorbidities
</required_content>`,

  crf_concomitant_meds: `<task>Generate Concomitant Medications (CM) form specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 5.3 Concomitant Medications (CM)

| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Medication | CMTRT | Text | Yes |
| WHO Drug Code | CMDECOD | Text | Derived |
| Dose | CMDOSE | Num | No |
| Frequency | CMDOSFRQ | Text | No |
| Indication | CMINDC | Text | Yes |
| Start Date | CMSTDTC | Date | Yes |
| Ongoing? | CMONGO | Y/N | Yes |

Coding: WHO Drug Dictionary
</required_content>`,

  crf_adverse_events: `<task>Generate Adverse Events (AE) form specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 5.4 Adverse Events (AE)

| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| AE Term | AETERM | Text | Yes |
| MedDRA PT | AEDECOD | Text | Derived |
| Start Date | AESTDTC | Date | Yes |
| End Date | AEENDTC | Date | If resolved |
| Ongoing? | AEONGO | Y/N | Yes |
| Severity | AESEV | Text | Yes |
| Serious? | AESER | Y/N | Yes |
| Related? | AEREL | Text | Yes |
| Action Taken | AEACN | Text | Yes |
| Outcome | AEOUT | Text | Yes |

Severity: MILD, MODERATE, SEVERE
Relationship: NOT RELATED, POSSIBLY, PROBABLY, DEFINITELY
Outcome: RECOVERED, RECOVERING, NOT RECOVERED, FATAL, UNKNOWN
</required_content>`,

  crf_exposure: `<task>Generate Study Drug Exposure (EX) form specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 5.5 Study Drug Exposure (EX)

| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Treatment | EXTRT | Text | Yes |
| Dose | EXDOSE | Num | Yes |
| Units | EXDOSU | Text | Yes |
| Frequency | EXDOSFRQ | Text | Yes |
| Route | EXROUTE | Text | Yes |
| Start Date | EXSTDTC | Date | Yes |
| End Date | EXENDTC | Date | If stopped |
| Dose Adjusted? | EXADJ | Y/N | Yes |
</required_content>`,

  crf_efficacy: `<task>Generate Efficacy Assessments (EF) form specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 5.6 Efficacy Assessments (EF)

| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Assessment Date | EFDTC | Date | Yes |
| Assessment Name | EFTEST | Text | Yes |
| Result | EFORRES | Text | Yes |
| Numeric Score | EFSTRESN | Num | If applicable |

Primary endpoint assessments per protocol schedule.
Derive change from baseline for analysis.
</required_content>`,

  crf_laboratory: `<task>Generate Laboratory Results (LB) form specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 5.7 Laboratory Results (LB)

| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Test Name | LBTEST | Text | Yes |
| Result | LBORRES | Text | Yes |
| Units | LBORRESU | Text | Yes |
| Ref Range Low | LBORNRLO | Num | No |
| Ref Range High | LBORNRHI | Num | No |
| Normal/Abnormal | LBNRIND | Text | No |
| Collection Date | LBDTC | Date | Yes |

Panels: Hematology, Chemistry, Urinalysis
</required_content>`,

  crf_vital_signs: `<task>Generate Vital Signs (VS) form specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 5.8 Vital Signs (VS)

| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Test | VSTEST | Text | Yes |
| Result | VSORRES | Num | Yes |
| Units | VSORRESU | Text | Yes |
| Position | VSPOS | Text | No |
| Date/Time | VSDTC | DateTime | Yes |

Parameters: SBP, DBP, HR, Temperature, Weight, Height (baseline)
</required_content>`,

  crf_physical_exam: `<task>Generate Physical Examination (PE) form specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 5.9 Physical Examination (PE)

| Field | CDASH | Type | Required |
|-------|-------|------|----------|
| Body System | PETEST | Text | Yes |
| Finding | PEORRES | Text | Yes |
| Clinically Sig? | PECLSIG | Y/N | If abnormal |
| Date | PEDTC | Date | Yes |

Systems: General, HEENT, Cardiovascular, Respiratory, Abdominal, Neurological, Skin, Musculoskeletal
</required_content>`,

  crf_edit_checks: `<task>Generate Edit Checks and Validation Rules.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 6. Edit Checks and Validation Rules

### 6.1 Date Checks
| ID | Rule | Severity |
|----|------|----------|
| DT001 | Consent date ≤ all other dates | Hard |
| DT002 | First dose date = randomization date | Hard |
| DT003 | AE start ≤ AE end | Hard |
| DT004 | Visit dates within windows | Soft |

### 6.2 Eligibility Checks
| ID | Rule | Severity |
|----|------|----------|
| IE001 | All inclusion criteria = Y | Hard |
| IE002 | All exclusion criteria = N | Hard |

### 6.3 Safety Checks
| ID | Rule | Severity |
|----|------|----------|
| AE001 | SAE requires expedited reporting | Hard |
| AE002 | If AE serious, complete SAE form | Hard |
| AE003 | Related AE requires action taken | Soft |

### 6.4 Exposure Checks
| ID | Rule | Severity |
|----|------|----------|
| EX001 | Dose within protocol range | Soft |
| EX002 | Compliance < 80% requires reason | Soft |
</required_content>`,

  crf_cdash_mapping: `<task>Generate CDASH/SDTM Mapping specification.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 7. CDASH/SDTM Mapping

### 7.1 Domain Mapping Summary
| CRF Form | SDTM Domain | Key Variables |
|----------|-------------|---------------|
| Demographics | DM | USUBJID, AGE, SEX, RACE |
| Medical History | MH | MHTERM, MHDECOD, MHSTDTC |
| Concomitant Meds | CM | CMTRT, CMDECOD, CMSTDTC |
| Adverse Events | AE | AETERM, AEDECOD, AESTDTC, AESER |
| Exposure | EX | EXTRT, EXDOSE, EXSTDTC |
| Labs | LB | LBTEST, LBORRES, LBDTC |
| Vital Signs | VS | VSTEST, VSORRES, VSDTC |
| Efficacy | Custom | Per endpoint |
| Disposition | DS | DSDECOD, DSSTDTC |

### 7.2 USUBJID Derivation
USUBJID = STUDYID || "-" || SITEID || "-" || SUBJID
</required_content>`,

  crf_data_dictionary: `<task>Generate Data Dictionary.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 8. Data Dictionary

### 8.1 Controlled Terminology Summary
| Codelist | Source | Variables |
|----------|--------|-----------|
| Sex | CDISC CT | SEX |
| Race | CDISC CT | RACE |
| Ethnicity | CDISC CT | ETHNIC |
| AE Severity | CDISC CT | AESEV |
| AE Outcome | CDISC CT | AEOUT |
| Route | CDISC CT | EXROUTE, CMROUTE |
| Frequency | CDISC CT | EXDOSFRQ, CMDOSFRQ |

### 8.2 External Dictionaries
| Dictionary | Version | Application |
|------------|---------|-------------|
| MedDRA | [Current] | AE, MH coding |
| WHO Drug | [Current] | CM coding |

### 8.3 Study-Specific Codelists
Define any custom codelists for efficacy instruments, stratification factors, etc.
</required_content>`,

  crf_appendices: `<task>Generate eCRF Appendices.</task>
<available_data>{{dataContext}}</available_data>
<required_content>
## 9. Appendices

### Appendix A: Abbreviations
| Abbreviation | Definition |
|--------------|------------|
| AE | Adverse Event |
| CDASH | Clinical Data Acquisition Standards Harmonization |
| CM | Concomitant Medication |
| CRF | Case Report Form |
| DM | Demographics |
| eCRF | Electronic Case Report Form |
| EX | Exposure |
| LB | Laboratory |
| MH | Medical History |
| SDTM | Study Data Tabulation Model |
| VS | Vital Signs |

### Appendix B: Mock CRF Pages
[Reference to separate mock CRF document]

### Appendix C: Completion Guidelines
[Reference to CRF Completion Guidelines document]
</required_content>`
}

export default CRF_SECTION_PROMPTS
