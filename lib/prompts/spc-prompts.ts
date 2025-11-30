/**
 * SPC (Summary of Product Characteristics) Section-Specific Prompts
 * 
 * Professional prompts for EMA-style SmPC documents
 * Based on EMA QRD template and EU regulatory requirements
 * Optimized for GPT-5.1 with XML-style tags per OpenAI Cookbook
 * 
 * CRITICAL: Each prompt MUST include {{dataContext}} placeholder
 * The system will inject real data from enrichment sources
 * 
 * Version: 2.0.0
 * Date: 2025-11-27
 */

export const SPC_SECTION_PROMPTS: Record<string, string> = {
  spc_name: `<task>
Generate Section 1 - Name of the Medicinal Product for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use the ACTUAL product name from the provided data
- Include strength and pharmaceutical form per EMA QRD template
- Follow exact EMA formatting requirements
</critical_rules>

<required_content>
Full product name including:
- Invented name or INN (International Nonproprietary Name)
- Strength (e.g., 500 mg, 10 mg/mL)
- Pharmaceutical form (e.g., film-coated tablets, solution for injection)
</required_content>

<output_format>
Format: [Product Name] [Strength] [Pharmaceutical Form]
Example: "Metformin Hydrochloride 500 mg film-coated tablets"
</output_format>`,

  spc_composition: `<task>
Generate Section 2 - Qualitative and Quantitative Composition for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL composition data from FDA label or Knowledge Graph
- Include active substance with exact quantity per unit
- List excipients with known effect (per EMA guideline)
- Reference Section 6.1 for full excipient list
</critical_rules>

<required_content>
1. Active substance(s) with quantity per dosage unit
2. Salt form if applicable (e.g., "as hydrochloride")
3. Excipients with known effect (if any):
   - Lactose, sucrose, glucose
   - Sodium content >1 mmol
   - Ethanol, propylene glycol
   - Azo dyes, parabens
4. Cross-reference to Section 6.1
</required_content>

<output_format>
Standard EMA format:
"Each [dosage form] contains [X] mg [active substance].
Excipient(s) with known effect: [list if applicable]
For the full list of excipients, see section 6.1."
</output_format>`,

  spc_pharmaceutical_form: `<task>
Generate Section 3 - Pharmaceutical Form for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use standard pharmaceutical form terminology (Ph. Eur.)
- Include complete physical description
- Use data from FDA label if available
</critical_rules>

<required_content>
1. Pharmaceutical form (standard term):
   - Film-coated tablet, Capsule, hard
   - Solution for injection, Powder for solution for injection
   - Oral solution, Suspension

2. Physical description:
   - Color (e.g., white, off-white, pale yellow)
   - Shape (e.g., round, oval, oblong)
   - Size (dimensions if relevant)
   - Markings/imprints (debossing, printing)
   - Score line (functional or non-functional)
</required_content>

<output_format>
Brief, descriptive paragraph.
Example: "White to off-white, round, biconvex film-coated tablets, debossed with 'M500' on one side and plain on the other."
</output_format>`,

  spc_indications: `<task>
Generate Section 4.1 - Therapeutic Indications for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL approved indications from FDA label or regulatory data
- Specify patient population for each indication precisely
- Include any restrictions, conditions, or line of therapy
- Use precise regulatory language
</critical_rules>

<required_content>
For each indication:
1. Therapeutic indication (disease/condition)
2. Target patient population:
   - Age group (adults, paediatric with age range)
   - Disease stage/severity
   - Prior treatment status (first-line, second-line, etc.)
3. Monotherapy or combination therapy specification
4. Any restrictions or conditions for use
</required_content>

<output_format>
Use bullet points for multiple indications.
Be specific about population and conditions.
Example: "[Product] is indicated for the treatment of type 2 diabetes mellitus in adults as an adjunct to diet and exercise:
- as monotherapy when metformin is inappropriate due to intolerance
- in combination with other glucose-lowering medicinal products including insulin"
</output_format>`,

  spc_posology: `<task>
Generate Section 4.2 - Posology and Method of Administration for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL dosing from FDA label - do not invent doses
- Include ALL special populations with specific recommendations
- Specify dose adjustments for renal/hepatic impairment with thresholds
- Include complete administration instructions
</critical_rules>

<required_content>
### Posology
- Starting dose
- Titration schedule (if applicable)
- Maintenance dose range
- Maximum recommended dose
- Duration of treatment

### Special Populations
**Elderly (≥65 years):**
- Dose adjustment recommendations
- Monitoring requirements

**Renal impairment:**
- Dose by eGFR or CrCl categories:
  - Mild (eGFR 60-89)
  - Moderate (eGFR 30-59)
  - Severe (eGFR 15-29)
  - End-stage (eGFR <15)

**Hepatic impairment:**
- Mild (Child-Pugh A)
- Moderate (Child-Pugh B)
- Severe (Child-Pugh C)

**Paediatric population:**
- Age-specific dosing or
- Statement on lack of data/contraindication

### Method of Administration
- Route of administration
- Timing relative to meals
- Special handling/preparation
- Swallowing instructions (do not crush, etc.)
</required_content>

<output_format>
Use clear subsections with specific numeric values.
Include tables for complex dosing.
Target length: 400-600 words.
</output_format>`,

  spc_contraindications: `<task>
Generate Section 4.3 - Contraindications for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL contraindications from FDA label
- Always include hypersensitivity statement first
- List ALL absolute contraindications
- Use precise medical terminology
</critical_rules>

<required_content>
Standard format (bulleted list):
- Hypersensitivity to the active substance or to any of the excipients listed in section 6.1
- [Specific contraindication 1]
- [Specific contraindication 2]
- [Cross-references to other sections where relevant]
</required_content>

<output_format>
Bulleted list with clear, specific contraindications.
Use standard EMA phrasing.
Cross-reference other sections (e.g., "see section 4.4").
</output_format>`,

  spc_warnings: `<task>
Generate Section 4.4 - Special Warnings and Precautions for Use for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL warnings from FDA label (Warnings and Precautions, Boxed Warning)
- Prioritize by clinical importance
- Include specific monitoring requirements
- Add excipient warnings per EMA guideline
</critical_rules>

<required_content>
Organize by clinical importance:

1. **Major Warnings** (from boxed warning if any)
   - Most serious risks
   - Risk mitigation measures

2. **Organ-Specific Precautions**
   - Cardiovascular
   - Hepatic
   - Renal
   - Metabolic
   - Haematological

3. **Monitoring Requirements**
   - Laboratory tests and frequency
   - Clinical monitoring

4. **Drug-Disease Interactions**
   - Conditions requiring caution

5. **Excipient Warnings** (per EMA guideline)
   - Lactose (for lactose intolerant patients)
   - Sodium (if >1 mmol per dose)
   - Other relevant excipients

6. **Effects on Ability to Drive** (cross-ref to 4.7)
</required_content>

<output_format>
Use clear subsections with headers.
Be specific about risks and mitigation.
Target length: 600-1000 words.
</output_format>`,

  spc_interactions: `<task>
Generate Section 4.5 - Interaction with Other Medicinal Products for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL drug interactions from FDA label
- Categorize by mechanism (CYP, transporter, PD)
- Include clinical recommendations for each interaction
- Specify contraindicated vs cautionary combinations
</critical_rules>

<required_content>
### Pharmacokinetic Interactions

**Effect of other medicinal products on [Product]:**
- CYP inhibitors (strong, moderate, weak)
- CYP inducers
- Transporter inhibitors (P-gp, OATP, etc.)

**Effect of [Product] on other medicinal products:**
- Substrates affected
- Clinical significance

### Pharmacodynamic Interactions
- Additive/synergistic effects (e.g., hypoglycemia risk)
- Antagonistic effects
- QT prolongation combinations

### Clinical Recommendations
- **Contraindicated combinations:** [list]
- **Combinations requiring dose adjustment:** [list with specific adjustments]
- **Combinations requiring monitoring:** [list with monitoring parameters]
</required_content>

<output_format>
Use clear categorization.
Include specific clinical guidance.
Target length: 400-700 words.
</output_format>`,

  spc_fertility: `<task>
Generate Section 4.6 - Fertility, Pregnancy and Lactation for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL pregnancy/lactation data from FDA label
- Include pregnancy category or risk summary
- Reference animal data when human data is limited
- Include contraception recommendations
</critical_rules>

<required_content>
### Women of Childbearing Potential
- Pregnancy testing requirements
- Contraception requirements (duration)

### Pregnancy
- Risk summary (human data availability)
- Human data (epidemiological studies, case reports)
- Animal data (developmental toxicity findings)
- Recommendation: use/avoid during pregnancy

### Breast-feeding
- Excretion in human milk (known/unknown)
- Effects on breastfed infant
- Effects on milk production
- Recommendation: continue/discontinue

### Fertility
- Effects on male fertility
- Effects on female fertility
- Animal fertility data
- Recommendations
</required_content>

<output_format>
Use standard EMA subsection structure.
Be specific about data availability.
Target length: 300-500 words.
</output_format>`,

  spc_driving: `<task>
Generate Section 4.7 - Effects on Ability to Drive and Use Machines for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Base assessment on adverse reaction profile
- Use standard EMA influence categories
- Reference specific adverse reactions that may impair ability
</critical_rules>

<required_content>
1. Overall assessment using EMA categories:
   - "No or negligible influence"
   - "Minor influence"
   - "Moderate influence"
   - "Major influence"

2. Specific adverse reactions that may affect driving:
   - Dizziness
   - Somnolence
   - Visual disturbances
   - Hypoglycemia (for antidiabetics)

3. Patient advice
</required_content>

<output_format>
Brief paragraph (2-4 sentences).
Example: "[Product] has minor influence on the ability to drive and use machines. Patients should be advised that dizziness has been reported (see section 4.8) and should not drive or operate machinery if affected."
</output_format>`,

  spc_undesirable_effects: `<task>
Generate Section 4.8 - Undesirable Effects for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL adverse reaction data from FDA label and FAERS
- Organize by MedDRA System Organ Class (SOC)
- Use EMA frequency categories with exact definitions
- Include post-marketing data if available
</critical_rules>

<required_content>
### Summary of the Safety Profile
Brief overview (2-3 sentences) of:
- Most common adverse reactions
- Most serious adverse reactions
- Overall tolerability

### Tabulated List of Adverse Reactions
Organize by SOC with frequency:
- **Very common (≥1/10)**
- **Common (≥1/100 to <1/10)**
- **Uncommon (≥1/1,000 to <1/100)**
- **Rare (≥1/10,000 to <1/1,000)**
- **Very rare (<1/10,000)**
- **Not known (cannot be estimated from available data)**

### Description of Selected Adverse Reactions
For important/serious reactions:
- Detailed description
- Risk factors
- Time to onset
- Management recommendations

### Reporting of Suspected Adverse Reactions
Standard EMA text for ADR reporting.
</required_content>

<output_format>
Use table format for ADR listing by SOC.
Include frequency category for each reaction.
Target length: 600-1000 words.
</output_format>`,

  spc_overdose: `<task>
Generate Section 4.9 - Overdose for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL overdose data from FDA label
- Include symptoms and management
- Reference specific antidote if available
- Include dialysis/hemoperfusion information
</critical_rules>

<required_content>
### Symptoms
- Signs and symptoms of overdose
- Dose-response relationship if known
- Time course of symptoms

### Management
- General supportive measures
- Specific antidote (if available)
- Symptomatic treatment
- Monitoring recommendations
- Dialysis/hemoperfusion efficacy
- Contact information for poison control
</required_content>

<output_format>
Clear subsections for symptoms and management.
Be specific about treatment recommendations.
Target length: 200-400 words.
</output_format>`,

  spc_pharmacodynamics: `<task>
Generate Section 5.1 - Pharmacodynamic Properties for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL pharmacology data from FDA label
- Include mechanism of action with molecular targets
- Reference clinical efficacy data from pivotal trials
- Include ATC code
</critical_rules>

<required_content>
### Pharmacotherapeutic Group and ATC Code
- Pharmacotherapeutic group (per ATC classification)
- ATC code (e.g., A10BA02)

### Mechanism of Action
- Molecular target(s)
- Mechanism at cellular/tissue level
- Downstream pharmacological effects
- Relationship to therapeutic effect

### Pharmacodynamic Effects
- Primary pharmacodynamic effects
- Secondary effects
- Dose-response relationship
- Time course of effect

### Clinical Efficacy and Safety
Summary of pivotal trials:
- Study design (brief)
- Patient population
- Primary endpoint results
- Key secondary endpoints
- Comparison to placebo/active comparator
</required_content>

<output_format>
Use clear subsections.
Include specific trial results with statistics.
Target length: 600-1000 words.
</output_format>`,

  spc_pharmacokinetics: `<task>
Generate Section 5.2 - Pharmacokinetic Properties for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL PK data from FDA label
- Include all ADME parameters with specific values
- Specify special population PK differences
- Include drug-drug interaction PK data
</critical_rules>

<required_content>
### Absorption
- Absolute bioavailability (%)
- Tmax (hours)
- Effect of food on absorption
- Dose proportionality

### Distribution
- Volume of distribution (L or L/kg)
- Plasma protein binding (%)
- Blood-brain barrier penetration
- Placental transfer

### Biotransformation
- Metabolic pathways (Phase I, Phase II)
- CYP enzymes involved (with relative contribution)
- Active metabolites (if any)
- Contribution of metabolites to activity

### Elimination
- Terminal half-life (hours)
- Total clearance (L/h or mL/min)
- Renal clearance
- Route of excretion (% urine, % feces)

### Special Populations
- Renal impairment (PK changes by severity)
- Hepatic impairment (PK changes by Child-Pugh)
- Elderly (age-related changes)
- Paediatric (if data available)
- Gender differences
- Race/ethnicity differences
- Body weight effects
</required_content>

<output_format>
Use clear subsections with specific numeric values.
Include units for all parameters.
Target length: 500-800 words.
</output_format>`,

  spc_preclinical: `<task>
Generate Section 5.3 - Preclinical Safety Data for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use available nonclinical data from FDA label
- Include carcinogenicity, mutagenicity, reproductive toxicity
- Discuss human relevance of findings
- Use standard EMA format
</critical_rules>

<required_content>
### General Toxicity
- Single-dose toxicity (species, route, findings)
- Repeat-dose toxicity (species, duration, NOAEL, target organs)
- Safety margins relative to human exposure

### Genotoxicity
- In vitro studies (Ames, chromosomal aberration)
- In vivo studies (micronucleus, etc.)
- Conclusions

### Carcinogenicity
- Species studied (rat, mouse)
- Duration of studies
- Findings (tumor types, incidence)
- Human relevance assessment

### Reproductive and Developmental Toxicity
- Fertility studies (effects on mating, fertility indices)
- Embryo-fetal development (teratogenicity, NOAEL)
- Pre- and post-natal development
- Effects on offspring

### Other Studies (if applicable)
- Phototoxicity
- Immunotoxicity
- Juvenile animal studies
- Environmental risk assessment
</required_content>

<output_format>
Use clear subsections.
Include NOAEL values and safety margins.
Target length: 400-600 words.
</output_format>`,

  spc_pharmaceutical_particulars: `<task>
Generate Section 6 - Pharmaceutical Particulars for an EMA SmPC.
</task>

<available_data>
{{dataContext}}
</available_data>

<critical_rules>
- Use ACTUAL formulation data from available sources
- Include complete excipient list
- Specify storage conditions precisely
- Include shelf life and packaging details
</critical_rules>

<required_content>
### 6.1 List of Excipients
Complete list of all excipients:
- Tablet core excipients
- Coating excipients (if applicable)
- Capsule shell components (if applicable)

### 6.2 Incompatibilities
- Known incompatibilities with other products/materials
- OR "Not applicable" for solid oral dosage forms

### 6.3 Shelf Life
- Shelf life in original packaging (months/years)
- Shelf life after first opening (if applicable)
- Shelf life after reconstitution/dilution (if applicable)
- In-use shelf life

### 6.4 Special Precautions for Storage
- Temperature requirements (e.g., "Do not store above 25°C")
- Light protection (e.g., "Store in the original package")
- Humidity requirements
- Other conditions

### 6.5 Nature and Contents of Container
- Container type (blister, bottle, vial)
- Material (PVC/PVDC/Al, HDPE, glass Type I)
- Closure type
- Pack sizes marketed

### 6.6 Special Precautions for Disposal
- Handling precautions (if any)
- Disposal instructions
- Standard statement: "Any unused medicinal product or waste material should be disposed of in accordance with local requirements."
</required_content>

<output_format>
Use numbered subsections (6.1-6.6).
Be specific about materials and conditions.
Target length: 300-500 words.
</output_format>`
}
