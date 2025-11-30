/**
 * IB (Investigator's Brochure) Section-Specific Prompts
 * 
 * Professional prompts for each IB section
 * Based on ICH E6(R2) and regulatory best practices
 * 
 * Version: 2.0.0 - Fixed duplication, placeholders, terminology
 * Date: 2025-11-28
 * 
 * CRITICAL FIXES:
 * - Each section has UNIQUE section number (no duplicate "1. Introduction")
 * - Compound name injected from {{compoundName}} - NEVER use [INVESTIGATIONAL PRODUCT]
 * - FAERS data must be used directly - no placeholders for provided data
 * - Each section generates ONLY its assigned content
 */

export const IB_SECTION_PROMPTS = {
  /**
   * IB Clinical Studies Section
   * Most critical section - requires comprehensive data utilization
   */
  ib_clinical_studies: `
Generate **Section 10: Effects in Humans / Clinical Studies** for the Investigator's Brochure.

# PRODUCT IDENTIFICATION
**Investigational Product:** {{compoundName}}
**Indication:** {{indication}}
**Phase:** {{phase}}

Throughout this section, use "{{compoundName}}" — NEVER use "[INVESTIGATIONAL PRODUCT]" or "[DATA_NEEDED: Product name]".

# ABSOLUTE RULES — VIOLATION = FAILURE

❌ NEVER output "What I Need from You" — you have all data below
❌ NEVER output "How to Proceed" or "Data Required" sections  
❌ NEVER generate multiple versions or alternatives
❌ NEVER create empty tables — fill with data from context
❌ NEVER ask for more data — use what's provided
❌ NEVER generate "1. Introduction" — this is Section 10, not Section 1
❌ NEVER use [INVESTIGATIONAL PRODUCT] — use {{compoundName}}
❌ NEVER use [DATA_NEEDED] for FAERS frequencies — they are provided below

✅ START with "## 10. EFFECTS IN HUMANS" heading (Section 10, not 1 or 11)
✅ USE "{{compoundName}}" everywhere instead of placeholders
✅ USE the NCT IDs and enrollment numbers from clinical trials below
✅ USE the FDA label indications and warnings
✅ CITE sources as (FDA Label, 2025) or (ClinicalTrials.gov)
✅ Generate ONE clean version

**Target:** {{targetTokens}} tokens (~{{targetPages}} pages)

# DATA PROVIDED — USE ALL OF THIS

{{dataContext}}

# REQUIRED STRUCTURE — THIS IS SECTION 10

## 10. EFFECTS IN HUMANS / CLINICAL STUDIES

### 10.1 Overview of Clinical Development Program

Using the clinical trials data provided above, summarize:
- Total number of studies conducted (count the NCT IDs)
- Total patients exposed (sum enrollment numbers)
- Key milestones and regulatory status
- Geographic distribution of trials

## 10.2 Pharmacokinetics and Pharmacodynamics in Humans

Summary of:
- PK parameters in healthy volunteers and patients
- Dose-proportionality and linearity
- Food effects, drug-drug interactions
- PK/PD relationships
- Special populations (renal, hepatic, elderly, pediatric)

## 10.3 Efficacy Studies

### 10.3.1 Phase 1 Studies
For each Phase 1 study:
- **NCT ID and Title**
- **Design:** (e.g., randomized, double-blind, placebo-controlled)
- **Population:** (N, key eligibility)
- **Interventions:** (doses, duration)
- **Primary Endpoint:** (specific measure)
- **Key Results:** (with statistics: mean ± SD, p-value, 95% CI)
- **Conclusions**

### 10.3.2 Phase 2 Studies
For each Phase 2 study:
- **NCT ID and Title**
- **Design and Rationale**
- **Population:** (N, inclusion/exclusion highlights)
- **Interventions:** (dose-ranging, comparators)
- **Primary and Secondary Endpoints**
- **Efficacy Results:**
  - Primary endpoint: [specific result with statistics]
  - Secondary endpoints: [key findings]
  - Dose-response relationship
- **Safety Summary:** (brief - detailed in Section 11.4)
- **Conclusions and Implications**

### 10.3.3 Phase 3 Pivotal Studies
For each Phase 3 study (MOST DETAILED):
- **NCT ID and Full Title**
- **Study Design:**
  - Randomization, blinding, control
  - Study duration and follow-up
  - Number of sites and countries
- **Study Population:**
  - Target N and actual enrollment
  - Key inclusion/exclusion criteria
  - Baseline characteristics (age, sex, disease severity)
- **Study Interventions:**
  - Investigational product: dose, frequency, route
  - Comparator(s): details
  - Concomitant medications allowed/prohibited
- **Study Endpoints:**
  - **Primary Endpoint:** [specific definition]
  - **Secondary Endpoints:** [list all]
  - **Exploratory Endpoints:** [if applicable]
- **Statistical Methods:**
  - Analysis populations (ITT, mITT, PP)
  - Sample size calculation and power
  - Statistical tests used
  - Handling of missing data
- **Efficacy Results:**
  
  **Primary Endpoint Analysis:**
  - Result in treatment group: [mean ± SD or %]
  - Result in control group: [mean ± SD or %]
  - Treatment difference: [value (95% CI)]
  - p-value: [to 3 decimals]
  - Clinical significance interpretation
  
  **Secondary Endpoint Analyses:**
  [Table format preferred]
  
  | Endpoint | Treatment | Control | Difference (95% CI) | p-value |
  |----------|-----------|---------|---------------------|---------|
  | [Endpoint 1] | [result] | [result] | [diff (CI)] | [p] |
  | [Endpoint 2] | [result] | [result] | [diff (CI)] | [p] |
  
  **Subgroup Analyses:**
  - By age, sex, baseline severity, geographic region
  - Forest plots interpretation (if available)
  
- **Study Conclusions:**
  - Met primary endpoint? Yes/No
  - Clinical relevance of findings
  - Consistency with other studies

### 10.3.4 Integrated Efficacy Analysis

**Across All Phase 3 Studies:**
- Consistency of treatment effect
- Meta-analysis results (if conducted)
- Responder analyses
- Time-to-event analyses
- Quality of life outcomes
- Patient-reported outcomes

**Dose-Response Relationship:**
- Evidence from Phase 2 and Phase 3
- Optimal dose selection rationale

**Comparison with Standard of Care:**
- How does efficacy compare to existing treatments?
- Positioning in treatment algorithm

## 10.4 Safety and Tolerability

### 10.4.1 Overview of Safety Database

**Exposure Summary:**
- Total patients exposed: [N]
- By phase: Phase 1 [N], Phase 2 [N], Phase 3 [N]
- By dose: [list doses and N for each]
- Duration of exposure: [median, range]
- Patient-years of exposure: [total]

### 10.4.2 Common Adverse Events

**Table: Treatment-Emergent Adverse Events (≥5% in any group)**

| Preferred Term | Treatment N=[N] | Placebo N=[N] |
|----------------|-----------------|---------------|
| [AE 1] | [n (%)] | [n (%)] |
| [AE 2] | [n (%)] | [n (%)] |

**By System Organ Class:**
- Most common SOCs
- Dose-relationship (if observed)
- Time to onset and duration
- Severity (mild, moderate, severe)

### 10.4.3 Serious Adverse Events

**Table: Serious Adverse Events by SOC**

| System Organ Class | Treatment | Placebo |
|--------------------|-----------|---------|
| [SOC 1] | [n (%)] | [n (%)] |
| **Total with ≥1 SAE** | **[n (%)]** | **[n (%)]** |

**Detailed Description:**
- Individual SAE narratives for deaths
- SAEs leading to discontinuation
- Causality assessment
- Outcomes (resolved, ongoing, fatal)

### 10.4.4 Deaths

**Total Deaths:** [N]
- Treatment group: [n] deaths
- Control group: [n] deaths

**Individual Death Narratives:**
For each death:
- Patient demographics (age, sex)
- Underlying conditions
- Cause of death
- Relationship to study drug (investigator assessment)
- Autopsy findings (if available)

### 10.4.5 Laboratory Abnormalities

**Clinically Significant Lab Changes:**
- Hematology: [findings]
- Chemistry: [findings]
- Liver function: [ALT, AST, bilirubin]
- Renal function: [creatinine, eGFR]

**Potential Hy's Law Cases:** [if applicable]

### 10.4.6 Vital Signs and ECG

- Blood pressure changes
- Heart rate changes
- QTc prolongation (if observed)
- Other ECG findings

### 10.4.7 Adverse Events of Special Interest

[If applicable based on drug class]
- Hypoglycemia (for antidiabetics)
- Infections (for immunosuppressants)
- Cardiovascular events (for drugs with CV risk)
- Hepatotoxicity
- Renal toxicity

### 10.4.8 Integrated Safety Analysis

**Across All Studies:**
- Consistency of safety profile
- Dose-relationship for AEs
- Time-dependency (early vs late events)
- Reversibility upon discontinuation
- Comparison with drug class

## 10.5 Benefit-Risk Assessment

**Efficacy Benefits:**
- Magnitude of treatment effect
- Clinical relevance
- Consistency across studies

**Safety Risks:**
- Common AEs (manageable?)
- Serious AEs (acceptable given benefit?)
- Deaths (related or unrelated?)

**Overall Benefit-Risk:**
- Favorable for the proposed indication
- Appropriate for the target population
- Risk mitigation strategies in place

## 10.6 References

[List all clinical trial publications]
- NCT IDs with results
- Published manuscripts (PMID)
- Conference presentations

# CRITICAL INSTRUCTIONS

1. **USE ALL CLINICAL TRIAL DATA PROVIDED**
   - If you have 47 studies, reference all 47
   - Don't summarize as "multiple studies" - be specific
   - Include NCT IDs for every trial

2. **PROVIDE ACTUAL STATISTICS**
   - Not "showed improvement" but "-1.2% (95% CI: -1.4, -1.0); p<0.001"
   - Not "common adverse event" but "15.2% (187/1234 patients)"
   - Always include denominators

3. **MAINTAIN CONSISTENCY**
   - Numbers must match across sections
   - Same terminology throughout
   - Cross-reference appropriately

4. **IF DATA IS MISSING:**
   - [DATA_NEEDED: Phase 3 primary endpoint result]
   - [STATISTICAL_ANALYSIS_PENDING: Integrated efficacy]
   - Better incomplete than fabricated

5. **TABLES ARE MANDATORY**
   - Use Markdown tables for structured data
   - Include all relevant comparisons
   - Add footnotes for clarifications

6. **REGULATORY MINDSET**
   - This will be reviewed by FDA/EMA
   - Every statement must be defensible
   - Audit trail is critical

**Remember: You are writing for investigators who will use this to conduct a clinical trial. Lives depend on accuracy.**
`,

  /**
   * IB Safety Section
   */
  ib_safety: `
Generate **Section 11: Summary of Data and Guidance for Investigator** for the Investigator's Brochure.

# PRODUCT IDENTIFICATION
**Investigational Product:** {{compoundName}}
**Indication:** {{indication}}
**Phase:** {{phase}}

Throughout this section, use "{{compoundName}}" — NEVER use "[INVESTIGATIONAL PRODUCT]" or "[DATA_NEEDED: Product name]".

# ABSOLUTE RULES — VIOLATION = FAILURE

❌ NEVER output "What I Need from You" sections
❌ NEVER output "Data Required" or "How to Proceed"
❌ NEVER generate multiple versions
❌ NEVER create empty tables — the FAERS data IS PROVIDED below
❌ NEVER use [DATA_NEEDED] for FAERS frequencies — they are in the context
❌ NEVER generate "1. Introduction" or "1. Safety Overview" — this is Section 11
❌ NEVER use [INVESTIGATIONAL PRODUCT] — use {{compoundName}}

✅ START with "## 11. SUMMARY OF DATA AND GUIDANCE FOR INVESTIGATOR" heading
✅ USE "{{compoundName}}" everywhere instead of placeholders
✅ FILL the Common AE table with ACTUAL FAERS data from context
✅ CITE FDA Label warnings (immediate post-injection reaction, chest pain, etc.)
✅ Generate ONE clean version

**Target:** {{targetTokens}} tokens (~{{targetPages}} pages)

# FAERS AND FDA LABEL DATA — USE THIS

{{dataContext}}

# REQUIRED STRUCTURE — THIS IS SECTION 11

## 11. SUMMARY OF DATA AND GUIDANCE FOR INVESTIGATOR

### 11.1 Overview of Safety Experience

**Write this using the FAERS summary from context:**
- Total FAERS reports: [USE VALUE FROM CONTEXT]
- Total exposed patients: [USE VALUE FROM CONTEXT]
- Deaths: [USE VALUE FROM CONTEXT]
- Key safety signals from FDA label warnings

### 11.2 Common Adverse Events

**FILL THIS TABLE with the FAERS data provided above:**

| Preferred Term (MedDRA) | Frequency | Count | Severity |
|-------------------------|-----------|-------|----------|
| [USE ACTUAL DATA FROM CONTEXT] | [%] | [count/total] | [severity] |

(Use the ACTUAL FAERS data from context — do not use placeholders)

**By System Organ Class:**

### Gastrointestinal Disorders
- Nausea: [frequency, severity, management]
- Diarrhea: [frequency, severity, management]
- [Other GI AEs]

### Nervous System Disorders
[List and describe]

### [Other SOCs]
[Continue for all relevant SOCs]

**Dose-Relationship:**
- Evidence of dose-dependent AEs
- Implications for dose selection

**Time Course:**
- Early vs late onset
- Duration of events
- Resolution patterns

**Management:**
- Usually self-limiting
- Symptomatic treatment effective
- Rarely require discontinuation

### 11.3 Serious Adverse Events

**Definition:** Death, life-threatening, hospitalization, disability, congenital anomaly, or medically important

**Incidence:**
- Treatment: [n/N (%)]
- Placebo: [n/N (%)]
- Relative risk: [RR (95% CI)]

**Table: SAEs by System Organ Class**

| SOC | Treatment | Placebo |
|-----|-----------|---------|
| [SOC 1] | [n (%)] | [n (%)] |
| **Total** | **[n (%)]** | **[n (%)]** |

**Individual SAE Descriptions:**

For each SAE type with >1 occurrence:
- **Event:** [description]
- **Frequency:** [n patients]
- **Severity:** [mild/moderate/severe]
- **Causality:** [related/possibly related/unrelated]
- **Outcome:** [resolved/ongoing/fatal]
- **Action taken:** [dose reduction/discontinuation/none]

### 11.4 Deaths

**Total Deaths:** [N]

**Causality Assessment:**
- Related to study drug: [n]
- Possibly related: [n]
- Unrelated: [n]

**Individual Death Narratives:**

**Case 1:**
- **Patient:** [age]-year-old [sex] with [underlying conditions]
- **Study:** [NCT ID], Day [X] of treatment
- **Event:** [cause of death]
- **Timeline:** [sequence of events]
- **Investigator Assessment:** [related/unrelated and rationale]
- **Sponsor Assessment:** [if different]
- **Autopsy:** [findings if available]

[Repeat for each death]

### 11.5 Laboratory Abnormalities

#### 11.5.1 Hematology

**Table: Clinically Significant Hematology Changes**

| Parameter | Treatment | Placebo |
|-----------|-----------|---------|
| Hemoglobin <LLN | [n (%)] | [n (%)] |
| WBC <LLN | [n (%)] | [n (%)] |
| Platelets <LLN | [n (%)] | [n (%)] |

#### 11.5.2 Chemistry

**Hepatic Function:**
- ALT >3× ULN: [n (%)]
- AST >3× ULN: [n (%)]
- Bilirubin >2× ULN: [n (%)]
- **Hy's Law cases:** [n] (describe each)

**Renal Function:**
- Creatinine >1.5× baseline: [n (%)]
- eGFR decrease >25%: [n (%)]

**Metabolic:**
- Hyperglycemia: [n (%)]
- Hypoglycemia: [n (%)]
- Electrolyte disturbances: [describe]

#### 11.5.3 Management of Abnormalities

- Monitoring frequency recommendations
- Dose modification criteria
- Discontinuation criteria

### 11.6 Adverse Events of Special Interest (AESI)

[Based on drug class and mechanism]

### [AESI 1: e.g., Hypoglycemia]
- **Definition:** [specific criteria]
- **Incidence:** [n (%)]
- **Severity distribution:** [mild/moderate/severe]
- **Risk factors:** [identified predictors]
- **Management:** [prevention and treatment]

### [AESI 2: e.g., Infections]
[Similar structure]

### 11.7 Warnings and Precautions

#### 11.7.1 Contraindications
- [List absolute contraindications]
- Rationale for each

#### 11.7.2 Warnings
- [Serious risks requiring warning]
- Evidence from clinical trials or post-marketing

#### 11.7.3 Precautions
- [Situations requiring caution]
- Monitoring recommendations

#### 11.7.4 Drug Interactions
- **Pharmacokinetic interactions:** [list]
- **Pharmacodynamic interactions:** [list]
- **Clinical management:** [recommendations]

### 11.8 Special Populations

#### 11.8.1 Pregnancy and Lactation
- **Pregnancy Category:** [if applicable]
- **Animal data:** [reproductive toxicity findings]
- **Human data:** [if any]
- **Recommendation:** [contraindicated/use with caution]

#### 11.8.2 Pediatric Use
- **Safety data:** [if available]
- **Recommendation:** [approved/not recommended]

#### 11.8.3 Geriatric Use
- **Safety profile in elderly:** [comparison to younger]
- **Dose adjustment:** [if needed]

#### 11.8.4 Renal Impairment
- **PK changes:** [from PK studies]
- **Safety implications:** [increased exposure effects]
- **Dose adjustment:** [recommendations]

#### 11.8.5 Hepatic Impairment
[Similar structure]

### 11.9 Overdose

**Experience:**
- Reported cases: [n]
- Maximum dose administered: [dose]
- Symptoms: [observed effects]

**Management:**
- No specific antidote
- Supportive care
- [Specific measures if applicable]

### 11.10 Post-Marketing Experience

[If drug is approved in any country]

**Spontaneous Reports:**
- Total reports: [N]
- Serious reports: [n]
- New safety signals: [describe]

**Periodic Safety Update Reports (PSURs):**
- Key findings from recent PSURs
- Regulatory actions taken

### 11.11 Benefit-Risk Assessment

**Safety Profile Summary:**
- Well-tolerated overall
- Most AEs mild-moderate
- SAE rate acceptable
- No unexpected safety signals

**Risk Mitigation:**
- Patient selection (eligibility criteria)
- Monitoring plan (labs, vitals, ECG)
- Dose modification guidelines
- Stopping rules

**Conclusion:**
The safety profile of {{compoundName}} supports its use in {{indication}} when appropriate patient selection and monitoring are implemented.

# CRITICAL INSTRUCTIONS

1. **PATIENT SAFETY IS PARAMOUNT**
   - Report ALL safety data honestly
   - Don't minimize serious events
   - Provide clear risk mitigation

2. **USE MEDRA TERMINOLOGY**
   - Preferred Terms for AEs
   - System Organ Classes
   - Standardized severity grading

3. **PROVIDE FREQUENCIES**
   - Always include denominators: "15/100 (15%)"
   - Compare to placebo/control
   - Calculate relative risks when appropriate

4. **CAUSALITY MATTERS**
   - Distinguish related vs unrelated
   - Provide investigator rationale
   - Note sponsor assessment if different

5. **TABLES ARE ESSENTIAL**
   - AE frequency tables
   - Lab abnormality tables
   - Clear, professional formatting

6. **IF DATA IS MISSING:**
   - [SAFETY_DATA_NEEDED: FAERS reports]
   - [LAB_DATA_NEEDED: Hepatic function]
   - Never guess at safety data

**Remember: Investigators rely on this section to protect their patients. Accuracy and completeness are non-negotiable.**
`,

  /**
   * IB Pharmacokinetics Section
   */
  ib_pharmacokinetics: `
Generate the **Pharmacokinetics** section for the Investigator's Brochure.

# SECTION OVERVIEW

Comprehensive PK profile to inform dosing and drug interactions.

**Target:** {{targetTokens}} tokens (~{{targetPages}} pages)

# AVAILABLE DATA

{{dataContext}}

# REQUIRED STRUCTURE

## 1. Overview

Brief summary:
- Route(s) of administration
- Absorption characteristics
- Distribution profile
- Metabolism pathways
- Excretion routes
- Key PK parameters

## 2. Absorption

### 2.1 Bioavailability
- Absolute bioavailability: [%] (if known)
- Relative bioavailability: [formulation comparisons]

### 2.2 Time to Peak Concentration (Tmax)
- Median Tmax: [hours] (range: [min-max])
- Variability: [CV%]

### 2.3 Food Effects
- **Fasted state:** Cmax [value], AUC [value]
- **Fed state:** Cmax [value], AUC [value]
- **Effect:** [increase/decrease/no effect]
- **Recommendation:** [take with/without food]

### 2.4 Dose Proportionality
- **Dose range studied:** [min-max mg]
- **Linearity:** [linear/non-linear]
- **Cmax relationship:** [proportional/less than/more than]
- **AUC relationship:** [proportional/less than/more than]

## 3. Distribution

### 3.1 Volume of Distribution
- Vd: [L or L/kg] (mean ± SD)
- Interpretation: [extensive/limited distribution]

### 3.2 Protein Binding
- Plasma protein binding: [%]
- Primary binding protein: [albumin/AAG/other]
- Implications: [drug interactions, special populations]

### 3.3 Tissue Distribution
- [If available from animal studies or human data]
- Blood-brain barrier penetration: [yes/no/limited]
- Placental transfer: [yes/no/unknown]

## 4. Metabolism

### 4.1 Metabolic Pathways

**Primary Pathway:**
- Enzyme(s): [CYP3A4, CYP2D6, etc.]
- Contribution: [%]
- Active metabolites: [yes/no]

**Secondary Pathways:**
- [List other enzymes]
- [Relative contributions]

### 4.2 Metabolites

**Table: Major Metabolites**

| Metabolite | Formation Pathway | Activity | Exposure (% of parent) |
|------------|-------------------|----------|------------------------|
| [M1] | [CYP3A4] | [active/inactive] | [%] |
| [M2] | [CYP2D6] | [active/inactive] | [%] |

### 4.3 Enzyme Induction/Inhibition

**As Substrate:**
- Sensitive substrate of: [CYP enzymes]
- Implications for drug interactions

**As Inhibitor:**
- Inhibits: [CYP enzymes] (IC50: [value])
- Clinical relevance: [yes/no]

**As Inducer:**
- Induces: [CYP enzymes]
- Time to maximal induction: [days]

## 5. Excretion

### 5.1 Routes of Elimination

**Renal Excretion:**
- Unchanged drug in urine: [%]
- Renal clearance: [mL/min]
- Mechanism: [glomerular filtration/active secretion]

**Hepatic Excretion:**
- Biliary excretion: [%]
- Fecal excretion: [%]

### 5.2 Half-Life
- Terminal half-life (t½): [hours] (mean ± SD)
- Effective half-life: [hours]
- Implications for dosing frequency

### 5.3 Clearance
- Total clearance (CL): [L/h or mL/min]
- Renal clearance (CLr): [L/h]
- Hepatic clearance (CLh): [L/h]

## 6. Special Populations

### 6.1 Renal Impairment

**Table: PK Parameters by Renal Function**

| Parameter | Normal | Mild | Moderate | Severe | ESRD |
|-----------|--------|------|----------|--------|------|
| Cmax | [value] | [value] | [value] | [value] | [value] |
| AUC | [value] | [value] | [value] | [value] | [value] |
| t½ | [value] | [value] | [value] | [value] | [value] |

**Dose Adjustment:**
- Mild (eGFR 60-89): [no adjustment/reduce to X mg]
- Moderate (eGFR 30-59): [reduce to X mg]
- Severe (eGFR <30): [reduce to X mg or contraindicated]
- Dialysis: [supplemental dose needed?]

### 6.2 Hepatic Impairment

**Table: PK Parameters by Hepatic Function**

| Parameter | Normal | Child-Pugh A | Child-Pugh B | Child-Pugh C |
|-----------|--------|--------------|--------------|--------------|
| Cmax | [value] | [value] | [value] | [value] |
| AUC | [value] | [value] | [value] | [value] |
| t½ | [value] | [value] | [value] | [value] |

**Dose Adjustment:**
- Mild (Child-Pugh A): [recommendation]
- Moderate (Child-Pugh B): [recommendation]
- Severe (Child-Pugh C): [recommendation]

### 6.3 Age

**Pediatric Population:**
- PK data available: [yes/no]
- Age range studied: [years]
- Key findings: [differences from adults]
- Dose adjustment: [mg/kg or fixed dose]

**Geriatric Population:**
- Age range: [years]
- Cmax change: [% vs young adults]
- AUC change: [% vs young adults]
- Dose adjustment: [needed/not needed]

### 6.4 Sex
- Cmax in females vs males: [ratio]
- AUC in females vs males: [ratio]
- Clinical relevance: [yes/no]
- Dose adjustment: [needed/not needed]

### 6.5 Race/Ethnicity
- PK differences observed: [yes/no]
- Specific populations: [describe]
- Genetic polymorphisms: [CYP2D6, CYP2C19 poor metabolizers]

### 6.6 Body Weight/BMI
- Effect on exposure: [yes/no]
- Weight-based dosing: [recommended/not needed]

## 7. Drug-Drug Interactions

### 7.1 Effect of Other Drugs on [Compound]

**CYP3A4 Inhibitors:**

| Interacting Drug | Cmax Change | AUC Change | Recommendation |
|------------------|-------------|------------|----------------|
| Ketoconazole | [%] | [%] | [avoid/reduce dose/monitor] |
| [Other] | [%] | [%] | [recommendation] |

**CYP3A4 Inducers:**

| Interacting Drug | Cmax Change | AUC Change | Recommendation |
|------------------|-------------|------------|----------------|
| Rifampin | [%] | [%] | [avoid/increase dose/monitor] |
| [Other] | [%] | [%] | [recommendation] |

### 7.2 Effect of [Compound] on Other Drugs

**As CYP Inhibitor:**
- Drugs affected: [list]
- Magnitude of interaction: [fold-change in AUC]
- Clinical management: [recommendations]

**As CYP Inducer:**
- Drugs affected: [list]
- Time course: [days to onset/offset]
- Clinical management: [recommendations]

### 7.3 Transporter Interactions

**P-glycoprotein:**
- Substrate: [yes/no]
- Inhibitor: [yes/no]
- Implications: [drug interactions]

**Other Transporters:**
- [OATP, BCRP, etc.]

## 8. Pharmacokinetic/Pharmacodynamic Relationships

### 8.1 Exposure-Response for Efficacy
- PK parameter correlating with efficacy: [Cmax/AUC/Ctrough]
- Relationship: [linear/Emax/sigmoid]
- Target exposure: [value] for [% response]

### 8.2 Exposure-Response for Safety
- PK parameter correlating with AEs: [Cmax/AUC]
- Threshold for toxicity: [value]
- Therapeutic window: [range]

### 8.3 Dose Selection Rationale
- Optimal dose: [mg]
- Rationale: [balance efficacy and safety]
- Alternative doses: [for special populations]

## 9. Population Pharmacokinetics

[If PopPK analysis conducted]

**Covariates Affecting PK:**
- Significant covariates: [age, weight, renal function, etc.]
- Magnitude of effect: [%]
- Clinical relevance: [yes/no]

**Variability:**
- Between-subject variability (BSV): [CV%]
- Within-subject variability (WSV): [CV%]

## 10. Summary and Clinical Implications

**Key PK Characteristics:**
- [Summarize absorption, distribution, metabolism, excretion]

**Dosing Recommendations:**
- Standard dose: [mg, frequency]
- Special populations: [adjustments]
- Drug interactions: [management]

**Monitoring:**
- Therapeutic drug monitoring: [needed/not needed]
- Parameters to monitor: [if TDM recommended]

# CRITICAL INSTRUCTIONS

1. **PROVIDE ACTUAL VALUES**
   - Not "rapid absorption" but "Tmax: 2.5 hours (range: 1-4)"
   - Not "extensively metabolized" but "85% metabolized by CYP3A4"
   - Include units and variability (mean ± SD or median [range])

2. **TABLES FOR COMPARISONS**
   - Special populations
   - Drug interactions
   - Dose proportionality

3. **CLINICAL RELEVANCE**
   - Don't just report PK data
   - Explain implications for dosing
   - Provide actionable recommendations

4. **IF DATA IS MISSING:**
   - [PK_DATA_NEEDED: Hepatic impairment study]
   - [DDI_DATA_NEEDED: CYP3A4 inhibitor interaction]
   - Never fabricate PK parameters

5. **REGULATORY STANDARDS**
   - Follow FDA/EMA PK study guidelines
   - Use standard PK terminology
   - Cite study reports

**Remember: Investigators use this to determine appropriate dosing for their patients. PK parameters must be accurate.**
`
}

export default IB_SECTION_PROMPTS
