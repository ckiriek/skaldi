/**
 * SAP (Statistical Analysis Plan) Section-Specific Prompts
 * 
 * Professional prompts for SAP sections per ICH E9 guidelines
 * Technical statistical language for biostatisticians and regulatory reviewers
 * 
 * CRITICAL: Each prompt MUST include {{dataContext}} placeholder
 * The system will inject real data from enrichment sources + Synopsis/Protocol
 * 
 * Version: 1.0.0
 * Date: 2025-11-29
 */

export const SAP_SECTION_PROMPTS: Record<string, string> = {
  sap_title_page: `<task>
Generate the SAP Title Page for a clinical trial statistical analysis plan.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use the ACTUAL compound name, protocol number, sponsor from the data
- Include version number and date
- DO NOT write "[DATA_NEEDED]" - use the provided data
- Reference Protocol title for consistency
- Follow ICH E9 formatting standards
</critical_rules>

<required_content>
### Statistical Analysis Plan

**Study Title**: [Full protocol title from data]

**Protocol Number**: [From study design]

**Compound**: {{compoundName}}

**Indication**: {{indication}}

**Phase**: {{phase}}

**Sponsor**: [From study design]

**SAP Version**: 1.0

**SAP Date**: [Current date]

**Prepared by**: [Statistical Lead - placeholder]

**Reviewed by**: [Medical Monitor - placeholder]

### Document History
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | [Date] | [Author] | Initial version |

### Confidentiality Statement
This document contains confidential information. Do not distribute without authorization.
</required_content>

<output_format>
Format as a professional title page with clear hierarchy.
Use markdown tables where appropriate.
</output_format>`,

  sap_toc: `<task>
Generate the SAP Table of Contents.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- List all SAP sections in logical order per ICH E9
- Include section numbers
- DO NOT write "[DATA_NEEDED]"
</critical_rules>

<required_content>
## Table of Contents

1. Introduction
   1.1 Purpose
   1.2 Scope
   1.3 Related Documents

2. Study Objectives and Endpoints
   2.1 Primary Objective and Endpoint
   2.2 Secondary Objectives and Endpoints
   2.3 Exploratory Objectives and Endpoints

3. Study Design Overview
   3.1 Overall Design
   3.2 Randomization and Blinding
   3.3 Sample Size Determination

4. Analysis Populations
   4.1 Intent-to-Treat (ITT) Population
   4.2 Modified Intent-to-Treat (mITT) Population
   4.3 Per-Protocol (PP) Population
   4.4 Safety Population

5. Statistical Methods
   5.1 General Considerations
   5.2 Handling of Missing Data
   5.3 Multiplicity Adjustments
   5.4 Covariates and Subgroups

6. Analysis of Primary Endpoint
   6.1 Primary Analysis
   6.2 Sensitivity Analyses
   6.3 Supportive Analyses

7. Analysis of Secondary Endpoints
   7.1 Key Secondary Endpoints
   7.2 Other Secondary Endpoints

8. Safety Analyses
   8.1 Adverse Events
   8.2 Laboratory Parameters
   8.3 Vital Signs
   8.4 Other Safety Assessments

9. Interim Analysis (if applicable)

10. Changes from Protocol

11. References

12. Appendices
    12.1 List of Abbreviations
    12.2 Programming Specifications
    12.3 Mock Tables, Listings, and Figures
</required_content>

<output_format>
Use numbered list format with proper indentation.
</output_format>`,

  sap_introduction: `<task>
Generate the SAP Introduction section explaining the purpose and scope of the statistical analysis plan.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Reference the Protocol and Synopsis for consistency
- Use ACTUAL study identifiers from the data
- DO NOT write "[DATA_NEEDED]" - synthesize from available information
- Follow ICH E9 guidance for SAP content
</critical_rules>

<required_content>
## 1. Introduction

### 1.1 Purpose
This Statistical Analysis Plan (SAP) describes the planned statistical analyses for Protocol [Protocol Number]: {{phase}} study of {{compoundName}} in patients with {{indication}}.

This SAP:
- Provides detailed specifications for all planned statistical analyses
- Defines analysis populations
- Specifies handling of missing data
- Documents any deviations from the protocol-specified analyses
- Serves as the basis for programming and validation of analysis datasets and outputs

This SAP was developed prior to database lock and unblinding.

### 1.2 Scope
This SAP covers:
- All efficacy analyses (primary, secondary, and exploratory endpoints)
- All safety analyses
- Interim analyses (if applicable)
- Subgroup and sensitivity analyses

This SAP does not cover:
- Pharmacokinetic analyses (covered in separate PK Analysis Plan, if applicable)
- Biomarker analyses (covered in separate Biomarker Analysis Plan, if applicable)

### 1.3 Related Documents
- Protocol: [Protocol Number] Version [X.X]
- Synopsis: [Reference]
- Case Report Form (CRF)
- Data Management Plan
- Clinical Database Specifications

### 1.4 Responsibilities
| Role | Responsibility |
|------|----------------|
| Sponsor Biostatistician | SAP development, analysis oversight |
| CRO Biostatistician | Programming, analysis execution |
| Medical Monitor | Clinical interpretation, safety review |
| Data Management | Database lock, data quality |
</required_content>

<output_format>
Use professional statistical document formatting.
Include tables where appropriate.
</output_format>`,

  sap_objectives_endpoints: `<task>
Generate the SAP Study Objectives and Endpoints section with precise statistical definitions.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL objectives and endpoints from Protocol/Synopsis
- Define each endpoint with statistical precision
- Include measurement timing and derivation rules
- DO NOT write "[DATA_NEEDED]" - use provided study design data
- Ensure consistency with Protocol
</critical_rules>

<required_content>
## 2. Study Objectives and Endpoints

### 2.1 Primary Objective and Endpoint

**Primary Objective**:
[From Protocol - e.g., To evaluate the efficacy of {{compoundName}} compared to placebo in patients with {{indication}}]

**Primary Endpoint**:
- **Definition**: [Precise statistical definition]
- **Measurement**: [How and when measured]
- **Derivation**: [How calculated from raw data]
- **Analysis timepoint**: [e.g., Week 24, Change from Baseline]

### 2.2 Secondary Objectives and Endpoints

**Key Secondary Endpoints** (included in multiplicity adjustment):

| Endpoint | Definition | Timepoint | Derivation |
|----------|------------|-----------|------------|
| [Endpoint 1] | [Definition] | [Time] | [Method] |
| [Endpoint 2] | [Definition] | [Time] | [Method] |

**Other Secondary Endpoints**:
[List with definitions]

### 2.3 Exploratory Objectives and Endpoints

Exploratory endpoints will be analyzed descriptively without formal hypothesis testing:
- [Exploratory endpoint 1]
- [Exploratory endpoint 2]

### 2.4 Endpoint Derivation Rules

**Baseline Definition**:
- Last non-missing value prior to first dose of study drug

**Post-Baseline Values**:
- Values collected after first dose of study drug

**Change from Baseline**:
- Post-baseline value minus baseline value

**Percent Change from Baseline**:
- ((Post-baseline - Baseline) / Baseline) × 100
</required_content>

<output_format>
Use tables for endpoint summaries.
Be precise with statistical definitions.
</output_format>`,

  sap_study_design: `<task>
Generate the SAP Study Design Overview section with statistical design parameters.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL study design from Protocol/Synopsis
- Include randomization ratio, stratification factors
- Document sample size calculation with SPECIFIC NUMBERS from the Sample Size Assumptions section
- The data context includes industry benchmarks for this indication - USE THEM
- Calculate and show the actual sample size formula with numbers
- DO NOT write "[DATA_NEEDED]" - use provided data and benchmarks
- Cite the reference source for assumptions (e.g., "Based on DEFINE trial, NCT00420212")
</critical_rules>

<required_content>
## 3. Study Design Overview

### 3.1 Overall Design
This is a {{phase}}, [randomized/open-label], [double-blind/single-blind], [placebo-controlled/active-controlled], [parallel-group/crossover] study of {{compoundName}} in [population] with {{indication}}.

**Study Schema**:
[Describe treatment arms and study periods]

**Treatment Arms**:
| Arm | Treatment | Dose | Route | Duration |
|-----|-----------|------|-------|----------|
| A | {{compoundName}} | [Dose] | [Route] | [Duration] |
| B | Placebo/Comparator | [Dose] | [Route] | [Duration] |

**Study Periods**:
- Screening: [Duration]
- Treatment: [Duration]
- Follow-up: [Duration]

### 3.2 Randomization and Blinding

**Randomization**:
- Ratio: [e.g., 1:1]
- Method: [e.g., Interactive Response Technology (IRT)]
- Stratification factors:
  - [Factor 1]
  - [Factor 2]

**Blinding**:
- [Double-blind/Open-label]
- Blinding maintained until: [Database lock / Interim analysis]
- Emergency unblinding procedures: [Reference to protocol]

### 3.3 Sample Size Determination

**Target Sample Size**: [Use target from Study Design or calculate from benchmarks]

**Assumptions** (from Sample Size Assumptions in data context):
- Primary endpoint: [From study design]
- Expected standard deviation: [From benchmarks - USE ACTUAL NUMBER]
- Clinically meaningful difference: [From benchmarks - USE ACTUAL NUMBER]
- Expected dropout rate: [From benchmarks - USE ACTUAL PERCENTAGE]
- Type I error (α): [From benchmarks, typically 0.05 two-sided]
- Power (1-β): [From benchmarks, typically 90% for Phase 3]

**Sample Size Calculation**:
Using the formula for two-sample t-test:
n = 2 × (SD)² × (Z_α + Z_β)² / (Δ)²

Where:
- SD = [actual number from benchmarks]
- Δ = [actual number from benchmarks]
- Z_α = 1.96 (for α = 0.05, two-sided)
- Z_β = 1.28 (for 90% power)

Calculation:
n = 2 × [SD]² × (1.96 + 1.28)² / [Δ]² = [calculated N] per arm

Adjusting for [dropout%] dropout: [N] / (1 - [dropout]) = [adjusted N] per arm

**Total Sample Size**: [N] subjects ([n] per arm)

**Reference**: [Cite the reference from benchmarks, e.g., "Based on DEFINE/CONFIRM trials (NCT00420212)"]
</required_content>

<output_format>
Use tables for treatment arms and design parameters.
Include statistical notation where appropriate.
</output_format>`,

  sap_analysis_populations: `<task>
Generate the SAP Analysis Populations section defining all analysis sets.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Define each population precisely
- Specify which analyses use which population
- Include handling of protocol deviations
- DO NOT write "[DATA_NEEDED]"
- Follow ICH E9 guidance on analysis populations
</critical_rules>

<required_content>
## 4. Analysis Populations

### 4.1 Intent-to-Treat (ITT) Population
**Definition**: All randomized subjects, analyzed according to randomized treatment assignment regardless of actual treatment received.

**Use**: Primary efficacy analysis (if applicable)

**Handling**:
- Subjects randomized but never treated: Included
- Subjects who discontinued early: Included with available data

### 4.2 Modified Intent-to-Treat (mITT) Population
**Definition**: All randomized subjects who received at least one dose of study drug and have at least one post-baseline efficacy assessment.

**Use**: Primary efficacy analysis

**Exclusions**:
- No study drug received
- No post-baseline efficacy data

### 4.3 Per-Protocol (PP) Population
**Definition**: All mITT subjects who completed the study without major protocol deviations that could affect efficacy assessment.

**Use**: Supportive/sensitivity efficacy analysis

**Major Protocol Deviations** (leading to PP exclusion):
- Treatment compliance < [X]%
- Use of prohibited concomitant medications
- Unblinding
- Significant deviation from visit windows
- Wrong treatment administered

### 4.4 Safety Population
**Definition**: All subjects who received at least one dose (or partial dose) of study drug, analyzed according to actual treatment received.

**Use**: All safety analyses

### 4.5 Population Assignment
| Analysis Type | Primary Population | Sensitivity Population |
|---------------|-------------------|----------------------|
| Primary efficacy | mITT | PP |
| Secondary efficacy | mITT | PP |
| Safety | Safety | - |

### 4.6 Subject Disposition
Subject disposition will be summarized by:
- Number screened
- Number screen failures (with reasons)
- Number randomized
- Number in each analysis population
- Number completing study
- Number discontinuing (with reasons)
</required_content>

<output_format>
Use clear definitions and tables.
Be precise about inclusion/exclusion criteria.
</output_format>`,

  sap_statistical_methods: `<task>
Generate the SAP Statistical Methods section with general statistical considerations.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Specify all general statistical methods
- Define handling of missing data
- Document multiplicity adjustments
- Include software specifications
- DO NOT write "[DATA_NEEDED]"
- Follow ICH E9 guidance
</critical_rules>

<required_content>
## 5. Statistical Methods

### 5.1 General Considerations

**Significance Level**:
- All statistical tests will be performed at the two-sided α = 0.05 significance level unless otherwise specified.

**Confidence Intervals**:
- Two-sided 95% confidence intervals will be provided for all point estimates.

**Descriptive Statistics**:
- Continuous variables: n, mean, SD, median, min, max, Q1, Q3
- Categorical variables: n, percentage (%)
- Time-to-event variables: Kaplan-Meier estimates, median, 95% CI

**Statistical Software**:
- SAS® Version 9.4 or higher
- R Version 4.x (for specific analyses, if applicable)

### 5.2 Handling of Missing Data

**Primary Approach**: [e.g., Mixed Model for Repeated Measures (MMRM)]

**Missing Data Assumptions**:
- Primary analysis assumes Missing at Random (MAR)
- Sensitivity analyses will assess impact of Missing Not at Random (MNAR)

**Imputation Methods** (for sensitivity analyses):
- Last Observation Carried Forward (LOCF)
- Multiple Imputation (MI)
- Tipping point analysis
- Return to baseline

**Intercurrent Events**:
| Event | Strategy | Handling |
|-------|----------|----------|
| Treatment discontinuation | Treatment policy | Include all data |
| Use of rescue medication | Composite strategy | [Specify] |
| Death | [Specify] | [Specify] |

### 5.3 Multiplicity Adjustments

**Testing Hierarchy** (for key secondary endpoints):
1. Primary endpoint
2. Key secondary endpoint 1
3. Key secondary endpoint 2
[Continue as applicable]

**Method**: Fixed-sequence (gatekeeping) procedure
- Each endpoint tested at α = 0.05 only if all prior endpoints are significant

**Exploratory Endpoints**:
- No multiplicity adjustment; p-values are nominal

### 5.4 Covariates and Subgroups

**Covariates in Primary Analysis**:
- Treatment group
- Stratification factors: [List]
- Baseline value of endpoint (for change from baseline analyses)

**Pre-specified Subgroups**:
- Age (< 65 vs ≥ 65 years)
- Sex (Male vs Female)
- Race
- Baseline disease severity
- Geographic region
- [Other relevant subgroups]

**Subgroup Analysis Method**:
- Treatment-by-subgroup interaction tests
- Forest plots for treatment effects within subgroups
- No multiplicity adjustment (exploratory)

### 5.5 Pooling of Study Centers
- Study centers with < [X] subjects may be pooled with geographically proximate centers
- Pooled centers will be used for any center-related analyses
</required_content>

<output_format>
Use professional statistical formatting.
Include tables for complex specifications.
</output_format>`,

  sap_primary_analysis: `<task>
Generate the SAP Primary Endpoint Analysis section with detailed statistical methodology.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL primary endpoint from Protocol/Synopsis
- Specify exact statistical model and parameters
- Include sensitivity and supportive analyses
- DO NOT write "[DATA_NEEDED]" - use provided data
- Be precise with statistical notation
</critical_rules>

<required_content>
## 6. Analysis of Primary Endpoint

### 6.1 Primary Endpoint
**Endpoint**: [From Protocol - e.g., Change from baseline in [measure] at Week [X]]

**Analysis Population**: mITT

### 6.2 Primary Analysis

**Statistical Model**: [e.g., Mixed Model for Repeated Measures (MMRM)]

**Model Specification**:

    Y_ijk = μ + τ_i + β_j + (τβ)_ij + γX_ijk + ε_ijk

Where:
- Y_ijk = Response for subject k in treatment i at time j
- μ = Overall mean
- τ_i = Treatment effect
- β_j = Time effect
- (τβ)_ij = Treatment-by-time interaction
- X_ijk = Baseline covariate
- ε_ijk = Random error

**Fixed Effects**:
- Treatment group
- Visit
- Treatment-by-visit interaction
- Stratification factors
- Baseline value

**Covariance Structure**: Unstructured (UN)
- If UN does not converge: AR(1), then CS

**Degrees of Freedom**: Kenward-Roger approximation

**Primary Comparison**:
- {{compoundName}} vs Placebo at [Primary timepoint]
- Least squares mean difference with 95% CI
- Two-sided p-value

**Hypothesis**:
- H₀: μ_treatment - μ_placebo = 0
- H₁: μ_treatment - μ_placebo ≠ 0

### 6.3 Sensitivity Analyses

| Analysis | Purpose | Method |
|----------|---------|--------|
| PP population | Assess impact of protocol deviations | Same as primary |
| LOCF imputation | Assess impact of missing data | ANCOVA with LOCF |
| Multiple imputation | MAR sensitivity | MI with 50 imputations |
| Tipping point | MNAR sensitivity | Vary imputed values |
| Excluding rescue | Assess rescue medication impact | Censor at rescue |

### 6.4 Supportive Analyses

**Responder Analysis**:
- Proportion achieving ≥ [X]% improvement
- Cochran-Mantel-Haenszel test stratified by [factors]
- Odds ratio with 95% CI

**Time to Response**:
- Kaplan-Meier estimates
- Log-rank test
- Cox proportional hazards model

**Subgroup Analyses**:
- Forest plot of treatment effects by subgroup
- Treatment-by-subgroup interaction p-values (nominal)
</required_content>

<output_format>
Use statistical notation and model specifications.
Include tables for sensitivity analyses.
</output_format>`,

  sap_secondary_analysis: `<task>
Generate the SAP Secondary Endpoints Analysis section.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL secondary endpoints from Protocol/Synopsis
- Specify methods for each endpoint type
- Follow multiplicity hierarchy
- DO NOT write "[DATA_NEEDED]"
</critical_rules>

<required_content>
## 7. Analysis of Secondary Endpoints

### 7.1 Key Secondary Endpoints

Key secondary endpoints are included in the multiplicity-controlled testing hierarchy.

**Endpoint 1**: [Name and definition]
- **Analysis**: [Statistical method]
- **Model**: [Specification]
- **Comparison**: [Treatment vs Control]
- **Testing**: Tested at α = 0.05 only if primary endpoint is significant

**Endpoint 2**: [Name and definition]
- **Analysis**: [Statistical method]
- **Model**: [Specification]
- **Comparison**: [Treatment vs Control]
- **Testing**: Tested at α = 0.05 only if Endpoint 1 is significant

### 7.2 Other Secondary Endpoints

Other secondary endpoints will be analyzed without multiplicity adjustment. P-values are nominal.

**Continuous Endpoints**:
- Method: MMRM or ANCOVA (as appropriate)
- Summary: LS means, difference, 95% CI, p-value

**Binary Endpoints**:
- Method: Logistic regression or CMH test
- Summary: Proportions, odds ratio, 95% CI, p-value

**Time-to-Event Endpoints**:
- Method: Kaplan-Meier, log-rank test, Cox model
- Summary: Median time, hazard ratio, 95% CI, p-value

**Count Endpoints**:
- Method: Negative binomial regression or Poisson regression
- Summary: Rate, rate ratio, 95% CI, p-value

### 7.3 Summary of Secondary Endpoint Analyses

| Endpoint | Type | Method | Population |
|----------|------|--------|------------|
| [Endpoint 1] | Continuous | MMRM | mITT |
| [Endpoint 2] | Binary | Logistic | mITT |
| [Endpoint 3] | Time-to-event | Cox | mITT |
| [Endpoint 4] | Count | Neg Binomial | mITT |
</required_content>

<output_format>
Use tables to summarize endpoint analyses.
Be consistent with primary analysis methods.
</output_format>`,

  sap_safety_analysis: `<task>
Generate the SAP Safety Analyses section with comprehensive safety evaluation methods.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL safety data categories from Protocol
- Include AE, laboratory, vital signs analyses
- Reference MedDRA coding and CTCAE grading
- DO NOT write "[DATA_NEEDED]"
- Follow ICH E9 safety analysis guidance
</critical_rules>

<required_content>
## 8. Safety Analyses

All safety analyses will be performed on the Safety Population and summarized by treatment group.

### 8.1 Adverse Events

**Coding**: MedDRA Version [X.X]

**Definitions**:
- Treatment-Emergent AE (TEAE): AE with onset after first dose through [X] days after last dose
- Serious AE (SAE): Per ICH E2A definition
- AE of Special Interest (AESI): [List if applicable]

**Summaries**:
| Summary | Variables |
|---------|-----------|
| Overall AE summary | Subjects with any TEAE, SAE, AE leading to discontinuation, AE leading to death |
| TEAEs by SOC and PT | n (%) by System Organ Class and Preferred Term |
| TEAEs by severity | Mild, Moderate, Severe (CTCAE Grade 1-5) |
| TEAEs by relationship | Related, Not related |
| SAEs | Detailed listing and summary |
| Deaths | Detailed listing |

**Analysis Methods**:
- Descriptive statistics (n, %)
- No formal statistical testing for safety endpoints
- Exposure-adjusted incidence rates (events per 100 patient-years) if appropriate

### 8.2 Laboratory Parameters

**Parameters**: Hematology, Chemistry, Urinalysis

**Summaries**:
- Descriptive statistics by visit
- Change from baseline by visit
- Shift tables (Normal/Low/High)
- Potentially Clinically Significant (PCS) values

**PCS Criteria**: [Reference to protocol or separate document]

### 8.3 Vital Signs

**Parameters**: Blood pressure (systolic, diastolic), Heart rate, Temperature, Weight

**Summaries**:
- Descriptive statistics by visit
- Change from baseline by visit
- PCS values

### 8.4 Other Safety Assessments

**ECG** (if applicable):
- QTcF interval: Mean, change from baseline
- Categorical analysis: QTcF > 450, > 480, > 500 ms
- ΔQTcF > 30, > 60 ms

**Physical Examination**:
- Shift from baseline (Normal/Abnormal)

**Injection Site Reactions** (if applicable):
- Incidence by type (pain, erythema, swelling, etc.)
- Severity
- Duration

### 8.5 Exposure

**Study Drug Exposure**:
- Duration of exposure (days)
- Total dose received
- Compliance (%)
- Dose modifications/interruptions
</required_content>

<output_format>
Use tables for safety summaries.
Be comprehensive in safety coverage.
</output_format>`,

  sap_interim_analysis: `<task>
Generate the SAP Interim Analysis section (if applicable to the study).
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Specify if interim analysis is planned
- Include alpha spending function if applicable
- Document DSMB procedures
- DO NOT write "[DATA_NEEDED]"
</critical_rules>

<required_content>
## 9. Interim Analysis

### 9.1 Planned Interim Analyses

[If no interim analysis planned]:
No formal interim analysis is planned for this study. The Data Safety Monitoring Board (DSMB) will review unblinded safety data periodically, but no efficacy interim analysis will be performed.

[If interim analysis planned]:

**Number of Interim Analyses**: [X]

**Timing**: 
- Interim 1: After [X]% of subjects complete [timepoint]
- [Additional interims if applicable]

### 9.2 Alpha Spending

**Method**: [e.g., O'Brien-Fleming, Lan-DeMets]

**Spending Function**: [Specification]

| Analysis | Information Fraction | Cumulative α Spent | Boundary (Z) |
|----------|---------------------|-------------------|--------------|
| Interim 1 | [X]% | [α] | [Z] |
| Final | 100% | 0.05 | [Z] |

### 9.3 Stopping Rules

**Efficacy**:
- Stop for efficacy if p < [boundary] at interim

**Futility**:
- [Binding/Non-binding] futility boundary
- Conditional power < [X]%

**Safety**:
- DSMB may recommend stopping for safety at any time

### 9.4 Data Safety Monitoring Board (DSMB)

**Composition**: Independent statistician, clinicians

**Review Schedule**: [Frequency]

**Charter**: Separate DSMB Charter document

### 9.5 Operational Considerations

- Interim analysis will be conducted by independent statistical group
- Sponsor team remains blinded
- Results communicated only to DSMB
</required_content>

<output_format>
Include alpha spending table if applicable.
Be clear about blinding maintenance.
</output_format>`,

  sap_changes_from_protocol: `<task>
Generate the SAP Changes from Protocol section documenting any deviations.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Document any changes from protocol-specified analyses
- Justify each change
- Note timing (before vs after unblinding)
- DO NOT write "[DATA_NEEDED]"
</critical_rules>

<required_content>
## 10. Changes from Protocol

### 10.1 Summary of Changes

This section documents any differences between the analyses specified in this SAP and those described in the Protocol.

| Section | Protocol Specification | SAP Specification | Rationale | Timing |
|---------|----------------------|-------------------|-----------|--------|
| [Section] | [Original] | [Changed] | [Why] | Pre-unblinding |

### 10.2 Detailed Descriptions

[If no changes]:
There are no changes from the protocol-specified statistical analyses. All analyses in this SAP are consistent with the Protocol.

[If changes exist]:
**Change 1**: [Description]
- Protocol specified: [Original method]
- SAP specifies: [New method]
- Rationale: [Justification]
- Impact: [Expected impact on results interpretation]

### 10.3 Post-Hoc Analyses

Any analyses not pre-specified in the Protocol or this SAP will be clearly identified as post-hoc in the Clinical Study Report.
</required_content>

<output_format>
Use table format for change summary.
Be transparent about all deviations.
</output_format>`,

  sap_references: `<task>
Generate the SAP References section with relevant statistical and regulatory citations.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Include relevant ICH guidelines
- Include statistical methodology references
- DO NOT write "[DATA_NEEDED]"
</critical_rules>

<required_content>
## 11. References

### Regulatory Guidelines

1. ICH E9: Statistical Principles for Clinical Trials (1998)

2. ICH E9(R1): Addendum on Estimands and Sensitivity Analysis in Clinical Trials (2019)

3. ICH E6(R2): Guideline for Good Clinical Practice (2016)

4. FDA Guidance: Adaptive Designs for Clinical Trials of Drugs and Biologics (2019)

5. EMA Guideline on Missing Data in Confirmatory Clinical Trials (2010)

### Statistical Methodology

6. Kenward MG, Roger JH. Small sample inference for fixed effects from restricted maximum likelihood. Biometrics. 1997;53(3):983-997.

7. Rubin DB. Multiple Imputation for Nonresponse in Surveys. New York: John Wiley & Sons; 1987.

8. Little RJA, Rubin DB. Statistical Analysis with Missing Data. 2nd ed. New York: John Wiley & Sons; 2002.

9. Dmitrienko A, et al. Multiple Testing Problems in Pharmaceutical Statistics. Chapman & Hall/CRC; 2009.

### Disease-Specific References

[Add indication-specific references as appropriate]
</required_content>

<output_format>
Use numbered reference format.
Include complete citations.
</output_format>`,

  sap_appendices: `<task>
Generate the SAP Appendices section with abbreviations, specifications, and mock shells.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Include comprehensive abbreviations list
- Reference mock TLF shells
- DO NOT write "[DATA_NEEDED]"
</critical_rules>

<required_content>
## 12. Appendices

### Appendix 12.1: List of Abbreviations

| Abbreviation | Definition |
|--------------|------------|
| AE | Adverse Event |
| ANCOVA | Analysis of Covariance |
| CI | Confidence Interval |
| CMH | Cochran-Mantel-Haenszel |
| CRF | Case Report Form |
| CTCAE | Common Terminology Criteria for Adverse Events |
| DSMB | Data Safety Monitoring Board |
| ECG | Electrocardiogram |
| HR | Hazard Ratio |
| ICH | International Council for Harmonisation |
| ITT | Intent-to-Treat |
| LOCF | Last Observation Carried Forward |
| LS | Least Squares |
| MAR | Missing at Random |
| MedDRA | Medical Dictionary for Regulatory Activities |
| MI | Multiple Imputation |
| mITT | Modified Intent-to-Treat |
| MMRM | Mixed Model for Repeated Measures |
| MNAR | Missing Not at Random |
| OR | Odds Ratio |
| PCS | Potentially Clinically Significant |
| PP | Per-Protocol |
| PT | Preferred Term |
| QTcF | QT interval corrected by Fridericia |
| SAE | Serious Adverse Event |
| SAP | Statistical Analysis Plan |
| SD | Standard Deviation |
| SOC | System Organ Class |
| TEAE | Treatment-Emergent Adverse Event |

### Appendix 12.2: Programming Specifications

Programming will follow:
- CDISC SDTM for data collection
- CDISC ADaM for analysis datasets
- Sponsor programming standards

**Key Analysis Datasets**:
| Dataset | Description |
|---------|-------------|
| ADSL | Subject-level analysis dataset |
| ADEFF | Efficacy analysis dataset |
| ADAE | Adverse events analysis dataset |
| ADLB | Laboratory analysis dataset |
| ADVS | Vital signs analysis dataset |

### Appendix 12.3: Mock Tables, Listings, and Figures

Mock shells for all planned outputs are provided in a separate document:
- Tables: T-14.1.x through T-14.3.x
- Listings: L-16.1.x through L-16.4.x
- Figures: F-14.1.x through F-14.2.x

[Reference to TLF shells document]
</required_content>

<output_format>
Use tables for abbreviations and datasets.
Reference external documents appropriately.
</output_format>`
}

export default SAP_SECTION_PROMPTS
