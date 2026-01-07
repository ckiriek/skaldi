/**
 * Synopsis Section-Specific Prompts
 * 
 * Professional prompts for clinical trial synopses
 * Based on ICH E6(R2), FDA 21 CFR 312, EMA guidelines
 * Optimized for GPT-5.1 with XML-style tags per OpenAI Cookbook
 * 
 * CRITICAL: Each prompt MUST include {{dataContext}} placeholder
 * The system will inject real data from enrichment sources
 * 
 * Version: 2.0.0
 * Date: 2025-11-27
 */

export const SYNOPSIS_SECTION_PROMPTS: Record<string, string> = {
  synopsis_title: `<task>
Generate a professional Synopsis Title Section for a clinical trial protocol.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use the ACTUAL compound name, sponsor, indication from the provided data
- Generate a specific study title based on the study design parameters
- DO NOT write "[DATA_NEEDED]" unless absolutely no data is available
- Include protocol number, version, and date
- Be comprehensive and complete - do not stop prematurely
</critical_rules>

<required_content>
1. **Study Title** - Full descriptive title including:
   - Study phase (Phase 1/2/3/4)
   - Design type (randomized, double-blind, placebo-controlled, etc.)
   - Compound name and dose
   - Indication
   - Target population

2. **Protocol Number** - Format: [SPONSOR]-[COMPOUND]-[PHASE]-[SEQUENCE]

3. **Sponsor Information** - Name and address (use placeholder if not provided)

4. **Version and Date** - Version 1.0, current date

5. **Investigational Product** - Compound name, formulation, strength
</required_content>

<output_format>
Format as a clean, professional header section with clear hierarchy.
Use markdown formatting with proper headings.
</output_format>`,

  synopsis_rationale: `<task>
Generate a compelling Study Rationale section for a clinical trial synopsis.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL epidemiology data for the indication from provided sources
- Reference REAL clinical evidence from ClinicalTrials.gov and literature
- Explain why this study is needed based on current treatment landscape
- Synthesize available information comprehensively
- Cite sources: (FDA Label, 2023), (NCT12345678), (PMID: 12345678)
</critical_rules>

<required_content>
1. **Disease Background** (2-3 paragraphs)
   - Epidemiology: prevalence, incidence, mortality
   - Pathophysiology overview
   - Current treatment options and their limitations
   - Unmet medical need

2. **Compound Rationale** (1-2 paragraphs)
   - Mechanism of action (from FDA label or Knowledge Graph)
   - Preclinical/clinical evidence supporting development
   - Expected benefits over existing treatments

3. **Study Justification** (1 paragraph)
   - Why this specific study design
   - Expected contribution to development program
   - Regulatory pathway considerations
</required_content>

<output_format>
Write in professional medical writing style.
Use proper citations for all factual claims.
Target length: 400-600 words.
</output_format>`,

  synopsis_objectives: `<task>
Generate clear and measurable Study Objectives for a clinical trial synopsis.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Primary objective must be specific, measurable, and clinically meaningful
- Secondary objectives should support and complement the primary
- Use standard ICH E9 clinical trial objective language
- Align objectives with the study phase and indication
- Each objective must have a corresponding endpoint
</critical_rules>

<required_content>
### Primary Objective
- Single, clear primary objective
- Directly related to the primary endpoint
- Measurable and achievable within study duration

### Secondary Objectives
3-5 secondary objectives covering:
- Additional efficacy measures
- Safety and tolerability assessment
- Pharmacokinetics (if applicable for phase)
- Quality of life / patient-reported outcomes (if applicable)

### Exploratory Objectives (if applicable)
- Biomarker exploration
- Subgroup analyses
- Mechanistic studies
</required_content>

<output_format>
Use clear headers and bullet points.
Each objective should be a single, complete sentence.
Format: "To [verb] [specific measure] in [population]"
</output_format>`,

  synopsis_design: `<task>
Generate a comprehensive Study Design section for a clinical trial synopsis.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL study parameters from the data (phase, arms, duration, blinding)
- Use the REGULATORY CLASSIFICATION section if available - it contains:
  - Regulatory Pathway (innovator/generic/biosimilar/hybrid)
  - Primary Objective (pk_equivalence/confirmatory_efficacy/etc.)
  - Design Pattern (canonical design from FDA/EMA guidance)
  - Regulatory Rationale (WHAT/WHY/REGULATORY ALIGNMENT)
- Use the ACCEPTANCE CRITERIA section for statistical endpoints
- For BE studies: include PK sampling schedule and acceptance criteria (80-125% or 90-111% for NTI)
- Include specific randomization scheme and ratio
- Reference comparator/placebo as specified in study design
- Be precise about all design elements - no ambiguity
- Include study schema description
- Reference the REGULATORY BASIS citations
</critical_rules>

<required_content>
### Study Type and Design
- Phase of development (Phase 1/2/3/4)
- Design type (parallel-group, crossover, factorial, etc.)
- Randomization scheme and ratio (e.g., 1:1, 2:1)
- Blinding (open-label, single-blind, double-blind, double-dummy)
- Control type (placebo, active comparator, dose-response)

### Study Schema
Describe the study flow:
- Screening period (duration, key assessments)
- Run-in period (if applicable)
- Treatment period (duration, visit schedule)
- Follow-up period (duration, safety monitoring)

### Treatment Arms
For each arm specify:
- Investigational product: dose, formulation, route, frequency
- Comparator/placebo: matching details
- Rescue therapy provisions and criteria

### Study Duration
- Per-subject duration (screening to follow-up)
- Overall study duration estimate
- Key milestones

### Sample Size
- Target enrollment (total and per arm)
- Brief rationale (power, effect size, dropout rate)
</required_content>

<output_format>
Use clear structure with markdown headings.
Include a textual study schema diagram.
Target length: 500-800 words.
</output_format>`,

  synopsis_population: `<task>
Generate a Study Population section defining inclusion/exclusion criteria.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use indication-specific diagnostic criteria (validated scales, biomarkers)
- Reference FDA label contraindications for exclusion criteria
- Include appropriate safety exclusions based on compound profile
- Be specific and unambiguous - criteria must be operationalizable
- Consider regulatory requirements for the target population
</critical_rules>

<required_content>
### Target Population
- Brief description of target population
- Estimated number of subjects to be enrolled
- Geographic distribution (if relevant)

### Key Inclusion Criteria (numbered list)
1. Age range (specify min/max)
2. Diagnosis criteria (specific, validated - e.g., DSM-5, ICD-10)
3. Disease severity/stage (quantified where possible)
4. Prior treatment requirements (treatment-naive, failed X therapies)
5. Adequate organ function (specific lab values)
6. Ability to provide informed consent

### Key Exclusion Criteria (numbered list)
1. Contraindications from FDA label
2. Significant comorbid conditions
3. Prohibited prior/concomitant medications (with washout periods)
4. Laboratory abnormalities (specific thresholds)
5. Pregnancy/lactation/contraception requirements
6. Participation in other clinical trials

### Withdrawal Criteria
- Subject-initiated withdrawal
- Investigator-initiated withdrawal (safety, non-compliance)
- Sponsor-initiated withdrawal
</required_content>

<output_format>
Use numbered lists for I/E criteria.
Be specific with numeric thresholds where applicable.
Target: 8-12 inclusion criteria, 10-15 exclusion criteria.
</output_format>`,

  synopsis_treatments: `<task>
Generate a Study Treatments section describing investigational product and comparators.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL dosing from FDA label or study design parameters
- Include specific formulation, strength, and administration details
- Define dose modification rules clearly
- Specify concomitant medication restrictions
- Reference rescue therapy provisions
</critical_rules>

<required_content>
### Investigational Product
- Generic name and trade name (if applicable)
- Formulation and strength (e.g., 500 mg film-coated tablets)
- Dosing regimen: dose, frequency, route of administration
- Duration of treatment
- Dose titration schedule (if applicable)
- Dose modification criteria

### Comparator (if applicable)
- Placebo description (matching for blinding)
- OR Active comparator: name, dose, formulation
- Rationale for comparator selection

### Concomitant Medications
- Permitted medications (with any restrictions)
- Prohibited medications (with washout requirements)
- Rescue therapy: criteria for use, allowed agents

### Treatment Compliance
- Compliance monitoring methods (pill counts, diaries, etc.)
- Acceptable compliance range
- Actions for non-compliance
</required_content>

<output_format>
Use clear subsections with specific details.
Include tables for dosing schedules if complex.
Target length: 300-500 words.
</output_format>`,

  synopsis_endpoints: `<task>
Generate a Study Endpoints section defining primary, secondary, and exploratory endpoints.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Primary endpoint must be specific, measurable, and clinically meaningful
- Use validated assessment tools/scales with references
- Specify exact timepoints for all endpoint assessments
- Align endpoints directly with study objectives
- Include both efficacy and safety endpoints
</critical_rules>

<required_content>
### Primary Endpoint
- Specific definition with measurement method
- Assessment tool/scale (validated, with reference)
- Timepoint for primary analysis
- Clinical relevance and regulatory acceptance

### Secondary Endpoints

**Efficacy Endpoints:**
- 3-5 secondary efficacy endpoints
- Assessment methods and timepoints for each
- Hierarchy for multiplicity control

**Safety Endpoints:**
- Incidence of treatment-emergent adverse events (TEAEs)
- Incidence of serious adverse events (SAEs)
- Laboratory parameter changes
- Vital signs changes
- ECG parameters (if applicable)

### Exploratory Endpoints (if applicable)
- Biomarker endpoints
- Patient-reported outcomes (PROs)
- Pharmacokinetic parameters
- Subgroup-specific endpoints
</required_content>

<output_format>
Use clear categorization with specific definitions.
Each endpoint should specify: what, how, when.
Target length: 400-600 words.
</output_format>`,

  synopsis_statistics: `<task>
Generate a Statistical Methods section for a clinical trial synopsis.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Sample size calculation must be fully justified with assumptions
- Primary analysis method must match the endpoint type
- Include multiplicity adjustment strategy if multiple endpoints
- Specify missing data handling approach
- Follow ICH E9 and E9(R1) guidelines
</critical_rules>

<required_content>
### Sample Size Determination
- Target sample size (total and per arm)
- Primary endpoint for calculation
- Effect size assumption (with justification/reference)
- Standard deviation or event rate assumption
- Power (typically 80% or 90%)
- Alpha level (typically 0.05, two-sided)
- Dropout rate assumption
- Calculation method/software

### Analysis Populations
- Intent-to-Treat (ITT): definition
- Modified ITT (mITT): definition (if applicable)
- Per-Protocol (PP): definition
- Safety population: definition

### Primary Analysis
- Statistical method for primary endpoint
- Hypothesis type (superiority/non-inferiority/equivalence)
- Significance level and confidence intervals
- Covariates/stratification factors

### Secondary Analyses
- Methods for each secondary endpoint
- Multiplicity adjustment (Hochberg, Holm, hierarchical, etc.)

### Missing Data Handling
- Primary approach (e.g., MMRM, multiple imputation)
- Sensitivity analyses (MNAR assumptions, tipping point)

### Interim Analysis (if applicable)
- Timing and purpose
- Stopping rules (efficacy/futility)
- Alpha spending function
</required_content>

<output_format>
Use precise statistical terminology.
Include specific methods and assumptions.
Target length: 500-700 words.
</output_format>`
}
