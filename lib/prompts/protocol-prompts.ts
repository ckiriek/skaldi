/**
 * Protocol Section-Specific Prompts
 * 
 * Professional prompts for clinical trial protocols
 * Based on ICH E6(R2), FDA 21 CFR 312, EMA guidelines
 * 
 * CRITICAL: Each prompt MUST include {{dataContext}} placeholder
 * The system will inject real data from enrichment sources
 * 
 * Version: 3.0.0
 * Date: 2025-11-26
 */

export const PROTOCOL_SECTION_PROMPTS: Record<string, string> = {
  protocol_title_page: `# TASK: Generate Protocol Title Page

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Using the data above, generate a professional Protocol Title Page.

**CRITICAL RULES:**
1. Use the ACTUAL compound name, sponsor, indication from the data
2. Generate a specific protocol title based on the study design
3. DO NOT write "[DATA_NEEDED]" - use the provided data
4. If sponsor address is not provided, use "[Sponsor Address]" only for that field

## REQUIRED CONTENT
1. **Protocol Title** - Full descriptive title including:
   - Study phase
   - Design type (randomized, double-blind, etc.)
   - Compound name
   - Indication
   - Population

2. **Protocol Number** - Generate based on sponsor + compound + phase

3. **Sponsor** - Use provided sponsor name

4. **Version** - Version 1.0, current date

5. **Confidentiality Statement** - Standard regulatory language

Format professionally per ICH E6(R2) requirements.`,

  protocol_synopsis: `# TASK: Generate Protocol Synopsis

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Using the data above, generate a comprehensive Protocol Synopsis.

**CRITICAL RULES:**
1. Use ALL provided data - compound, indication, phase, design, endpoints
2. Reference actual clinical trials data if provided
3. Use real safety data from FAERS/adverse events if available
4. DO NOT write "[DATA_NEEDED]" - synthesize from available information
5. If specific data is missing, make reasonable clinical assumptions based on phase and indication

## REQUIRED CONTENT (as structured table)
| Section | Content |
|---------|---------|
| Study Title | Based on compound, indication, phase |
| Protocol Number | Generate appropriately |
| Phase | From provided data |
| Design | Randomization, blinding, arms |
| Population | Target population with sample size |
| Primary Objective | Based on indication and phase |
| Primary Endpoint | Specific, measurable |
| Secondary Objectives | 2-4 objectives |
| Secondary Endpoints | With timepoints |
| Duration | Based on phase and indication |
| IP and Dosing | From compound data |

Use actual data from clinical trials and FDA labels when available.`,

  protocol_introduction: `# TASK: Write Introduction and Background

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Using the data above, write a comprehensive Introduction and Background section.

**CRITICAL RULES:**
1. Use ACTUAL epidemiology data for the indication
2. Reference REAL clinical trials from the data (NCT numbers)
3. Use ACTUAL safety profile from FAERS/adverse events
4. Cite FDA labels and literature when provided
5. DO NOT write "[DATA_NEEDED]" - use available data to write substantive content
6. If literature is provided, cite it properly

## REQUIRED SUBSECTIONS

### 1.1 Disease Background and Epidemiology
- Pathophysiology of the indication
- Prevalence and incidence (use real data if available)
- Disease burden and impact

### 1.2 Current Treatment Landscape
- Approved therapies (from FDA labels if available)
- Standard of care
- Treatment guidelines

### 1.3 Unmet Medical Need
- Limitations of current therapies
- Gaps in treatment

### 1.4 Investigational Product Overview
- Compound name and class
- Mechanism of action
- Development history

### 1.5 Nonclinical and Clinical Rationale
- Preclinical evidence
- Prior clinical experience (from trials data)

### 1.6 Risk-Benefit Assessment
- Known safety profile (from FAERS/adverse events)
- Expected benefits
- Justification for the study

Reference all available sources with proper citations.`,

  protocol_objectives: `# TASK: Write Study Objectives and Endpoints

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Using the data above, write the Study Objectives and Endpoints section.

**CRITICAL RULES:**
1. Base objectives on the ACTUAL indication and phase
2. Use endpoints from similar clinical trials if provided
3. Make objectives SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
4. DO NOT write "[DATA_NEEDED]" - create specific objectives based on available data
5. Reference regulatory precedent from FDA labels if available

## REQUIRED CONTENT

### 2.1 Primary Objective
- Single, clear primary objective
- Directly tied to the indication

### 2.2 Primary Endpoint
- Specific measurement
- Timepoint
- Assessment method

### 2.3 Secondary Objectives (2-4)
- Supporting efficacy objectives
- Safety objective

### 2.4 Secondary Endpoints
- Each with measurement method and timepoint

### 2.5 Exploratory Objectives (if applicable)
- Biomarker objectives
- Subgroup analyses

Ensure consistency with study design and indication.`,

  protocol_study_design: `# TASK: Write Study Design Section

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Using the data above, write a detailed Study Design section.

**CRITICAL RULES:**
1. Use the ACTUAL phase, design type, and duration from data
2. Reference similar trial designs from clinical trials data
3. Provide specific rationale for design choices
4. DO NOT write "[DATA_NEEDED]" - make clinically appropriate decisions
5. Design should be appropriate for the phase and indication

## REQUIRED SUBSECTIONS

### 9.1 Overall Design Description
- Phase and design type
- Randomization scheme
- Blinding approach
- Number of arms

### 9.2 Study Schema
- Visual description of study flow
- Key timepoints

### 9.3 Randomization Procedures
- Allocation ratio
- Stratification factors
- Method (IWRS/IXRS)

### 9.4 Blinding Procedures
- Who is blinded
- Emergency unblinding

### 9.5 Treatment Arms
- Detailed description of each arm
- Dosing regimens

### 9.6 Study Duration
- Screening period
- Treatment period
- Follow-up period

### 9.7 Dose Modifications
- Criteria for dose reduction
- Discontinuation rules

Base all decisions on the phase, indication, and compound characteristics.`,

  protocol_population: `# TASK: Write Study Population Section

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Using the data above, write the Study Population section.

**CRITICAL RULES:**
1. Base criteria on the ACTUAL indication
2. Use eligibility patterns from similar trials if provided
3. Include safety-based exclusions from known adverse events
4. DO NOT write "[DATA_NEEDED]" - create specific, appropriate criteria
5. Criteria should be measurable and clinically relevant

## REQUIRED CONTENT

### 5.1 Target Population
- Description based on indication
- Key characteristics

### 5.2 Inclusion Criteria (8-12 criteria)
1. Age range (appropriate for indication)
2. Diagnosis confirmation
3. Disease severity/stage
4. Adequate organ function
5. Informed consent
[Continue with indication-specific criteria]

### 5.3 Exclusion Criteria (10-15 criteria)
1. Pregnancy/lactation
2. Known hypersensitivity
3. Contraindicated conditions (based on safety data)
4. Prohibited medications
5. Recent participation in other trials
[Continue with safety-based exclusions]

### 5.4 Withdrawal Criteria
- Safety reasons
- Consent withdrawal
- Protocol violations

### 5.5 Replacement Policy
- Criteria for replacement`,

  protocol_eligibility_criteria: `# TASK: Write Eligibility Criteria Section

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Using the data above, write detailed eligibility criteria.

**CRITICAL RULES:**
1. Use eligibility patterns from similar trials in the data
2. Include contraindications from FDA labels/safety data
3. Make criteria specific and measurable
4. DO NOT write "[DATA_NEEDED]" - create complete criteria
5. Number all criteria clearly

## REQUIRED CONTENT

### 8.1 Inclusion Criteria
Number each criterion (8.1.1, 8.1.2, etc.)
Include:
- Age and sex requirements
- Diagnosis criteria with specific tests
- Disease severity with measurable thresholds
- Laboratory parameters with ranges
- Contraception requirements
- Informed consent

### 8.2 Exclusion Criteria
Number each criterion (8.2.1, 8.2.2, etc.)
Include:
- Pregnancy and lactation
- Hypersensitivity to compound class
- Organ dysfunction (specific thresholds)
- Prohibited medications (with washout periods)
- Concurrent conditions
- Prior therapy restrictions
- Other trial participation

### 8.3 Withdrawal Criteria
- Subject-initiated
- Investigator-initiated
- Sponsor-initiated

Use actual safety data to inform exclusion criteria.`,

  protocol_treatments: `# TASK: Write Study Treatments Section

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Using the data above, write the Study Treatments section.

**CRITICAL RULES:**
1. Use ACTUAL compound information from the data
2. Base dosing on FDA labels or similar trials if available
3. Include known drug interactions from safety data
4. DO NOT write "[DATA_NEEDED]" - provide specific treatment details
5. Be precise about dosing, timing, and administration

## REQUIRED CONTENT

### 6.1 Investigational Product Description
- Name, formulation, strength
- Manufacturer
- Storage requirements

### 6.2 Dosage and Administration
- Dose levels
- Route of administration
- Frequency and timing
- Duration of treatment

### 6.3 Dose Modifications
- Criteria for dose reduction
- Dose levels for reduction
- Criteria for dose interruption
- Criteria for discontinuation

### 6.4 Comparator/Placebo (if applicable)
- Description
- Matching procedures

### 6.5 Concomitant Medications
- Permitted medications
- Prohibited medications (with rationale from safety data)
- Required medications

### 6.6 Treatment Compliance
- Monitoring methods
- Acceptable compliance range

### 6.7 Drug Accountability
- Dispensing procedures
- Return and destruction`,

  protocol_procedures: `# TASK: Write Study Procedures Section

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Using the data above, write the Study Procedures section.

**CRITICAL RULES:**
1. Include procedures appropriate for the indication
2. Reference procedures from similar trials if provided
3. Include safety monitoring based on known adverse events
4. DO NOT write "[DATA_NEEDED]" - specify all procedures
5. Be specific about timing and responsible parties

## REQUIRED CONTENT

### 7.1 Screening Procedures (Day -28 to Day -1)
- Informed consent
- Demographics and medical history
- Physical examination
- Vital signs
- Laboratory assessments
- ECG
- Disease-specific assessments
- Eligibility confirmation

### 7.2 Baseline Assessments (Day 1)
- Pre-dose assessments
- Efficacy baseline
- Safety baseline

### 7.3 Treatment Period Procedures
- Visit schedule
- Efficacy assessments at each visit
- Safety assessments at each visit
- Drug dispensing

### 7.4 End of Treatment
- Final efficacy assessments
- Final safety assessments
- Drug return

### 7.5 Follow-up Procedures
- Safety follow-up visits
- Long-term follow-up (if applicable)

### 7.6 Unscheduled Visits
- Criteria for unscheduled visits
- Required assessments`,

  protocol_schedule_of_assessments: `# TASK: Write Schedule of Assessments

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Using the data above, create a comprehensive Schedule of Assessments.

**CRITICAL RULES:**
1. Include all assessments appropriate for the indication
2. Base timing on study duration from design data
3. Include safety monitoring for known adverse events
4. DO NOT write "[DATA_NEEDED]" - create a complete schedule
5. Include visit windows

## REQUIRED CONTENT

### 10.1 Schedule of Assessments Table

Create a detailed table with:
- Rows: All procedures and assessments
- Columns: Screening, Baseline (Day 1), Week 2, Week 4, Week 8, Week 12, EOT, Follow-up

Include:
- Informed consent
- Inclusion/exclusion review
- Demographics
- Medical history
- Physical examination
- Vital signs
- Height/weight
- Laboratory tests (hematology, chemistry, urinalysis)
- ECG
- Efficacy assessments (indication-specific)
- Adverse events
- Concomitant medications
- Study drug dispensing
- Study drug accountability
- Pregnancy test (if applicable)

### 10.2 Visit Windows
- Specify acceptable windows for each visit (e.g., ±3 days)

### 10.3 Footnotes
- Conditional assessments
- Special instructions`,

  protocol_safety: `# TASK: Write Safety Assessments Section

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Using the data above, write the Safety Assessments section.

**CRITICAL RULES:**
1. Use ACTUAL adverse event data from FAERS/safety reports
2. Define AESIs based on known safety signals
3. Include monitoring for common adverse events
4. DO NOT write "[DATA_NEEDED]" - use available safety data
5. Follow ICH E2A definitions

## REQUIRED CONTENT

### 11.1 Adverse Event Definitions
- AE definition per ICH E2A
- Relationship to study drug
- Severity grading (CTCAE v5.0)

### 11.2 Serious Adverse Event Criteria
- Death
- Life-threatening
- Hospitalization
- Disability
- Congenital anomaly
- Important medical events

### 11.3 Adverse Events of Special Interest
Based on known safety profile:
[List specific AESIs from safety data]

### 11.4 AE Reporting Procedures
- Collection methods
- Documentation requirements
- Reporting timelines (24h for SAEs)

### 11.5 Laboratory Safety Assessments
- Hematology panel
- Chemistry panel
- Urinalysis
- Special tests based on compound

### 11.6 Vital Signs
- Blood pressure, heart rate, temperature
- Frequency of assessment

### 11.7 ECG Monitoring
- 12-lead ECG schedule
- Central reading (if applicable)

### 11.8 Physical Examination
- Complete vs. symptom-directed`,

  protocol_safety_monitoring: `# TASK: Write Safety Monitoring and Reporting Section

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Using the data above, write the Safety Monitoring and Reporting section.

**CRITICAL RULES:**
1. Use ACTUAL safety signals from the data to define monitoring
2. Include specific stopping rules based on known risks
3. Reference regulatory requirements
4. DO NOT write "[DATA_NEEDED]" - create specific procedures
5. Follow ICH E2A and E6(R2) requirements

## REQUIRED CONTENT

### 12.1 Adverse Event Definitions
Per ICH E2A:
- AE: Any untoward medical occurrence
- SAE: Criteria listed
- AESI: Based on known safety profile

### 12.2 AE Assessment
- Severity: CTCAE v5.0 grading
- Causality: Related/Not related/Unknown
- Expectedness: Based on IB

### 12.3 Reporting Requirements
- SAE reporting: Within 24 hours
- Regulatory reporting: Per 21 CFR 312.32
- IND Safety Reports: 15-day and 7-day reports

### 12.4 Safety Monitoring Procedures
Based on known adverse events:
- Laboratory monitoring schedule
- Vital signs monitoring
- ECG monitoring
- Specific organ function monitoring

### 12.5 Data Safety Monitoring Board
- Composition (if applicable)
- Charter
- Meeting schedule
- Stopping rules based on safety signals`,

  protocol_statistics: `# TASK: Write Statistical Considerations Section

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Using the data above, write the Statistical Considerations section.

**CRITICAL RULES:**
1. Base sample size on the phase and indication
2. Use effect sizes from similar trials if available
3. Select appropriate statistical methods for endpoints
4. DO NOT write "[DATA_NEEDED]" - provide specific calculations
5. Follow ICH E9 guidelines

## REQUIRED CONTENT

### 13.1 Sample Size Determination
Based on phase and indication:
- Primary endpoint assumptions
- Expected effect size
- Alpha = 0.05 (two-sided)
- Power = 80% or 90%
- Dropout rate adjustment
- Final sample size per arm and total

### 13.2 Analysis Populations
- ITT: All randomized subjects
- mITT: Randomized with ≥1 dose and ≥1 post-baseline assessment
- Per-Protocol: Completed per protocol
- Safety: All subjects receiving ≥1 dose

### 13.3 Statistical Methods
Primary Endpoint:
- Analysis method (ANCOVA, MMRM, etc.)
- Covariates
- Handling of missing data

Secondary Endpoints:
- Methods for each endpoint type

### 13.4 Multiplicity Adjustment
- Hierarchical testing or
- Bonferroni/Hochberg correction

### 13.5 Interim Analysis (if applicable)
- Timing (e.g., 50% of events)
- Alpha spending function
- Stopping boundaries

### 13.6 Missing Data Handling
- Primary approach (e.g., MMRM, MI)
- Sensitivity analyses`,

  protocol_ethics: `# TASK: Write Ethical and Regulatory Considerations

## AVAILABLE DATA
{{dataContext}}

## INSTRUCTIONS
Write the Ethical and Regulatory Considerations section.

**CRITICAL RULES:**
1. Reference ICH E6(R2) GCP guidelines
2. Include all required regulatory elements
3. Be specific about procedures
4. This section is largely standard - provide complete content
5. DO NOT write "[DATA_NEEDED]" for standard elements

## REQUIRED CONTENT

### 14.1 IRB/IEC Approval
- Approval required before enrollment
- Continuing review requirements
- Amendment approval process

### 14.2 Informed Consent
- Process description
- Required elements per 21 CFR 50
- Documentation requirements
- Re-consent procedures

### 14.3 Subject Confidentiality
- HIPAA compliance (US)
- GDPR compliance (EU)
- Data de-identification
- Access restrictions

### 14.4 GCP Compliance
- ICH E6(R2) adherence
- Investigator responsibilities
- Sponsor responsibilities

### 14.5 Protocol Amendments
- Substantial vs. administrative
- Approval requirements
- Implementation procedures

### 14.6 Study Monitoring
- Monitoring plan
- Source data verification
- Site visits

### 14.7 Data Management
- EDC system
- Data entry procedures
- Query resolution
- Database lock

### 14.8 Publication Policy
- Authorship criteria
- Review procedures
- Timing of publication`
}

export default PROTOCOL_SECTION_PROMPTS
