/**
 * Investigator's Brochure (IB) Prompt
 * Based on ICH E6 (R2) Guidelines
 * 
 * References:
 * - ICH E6 Section 7: Investigator's Brochure
 * - Best practices from clinical trial protocol authoring research
 */

import { ClinicalTrialData, PublicationData, SafetyData } from './schemas'

interface IBContext {
  projectTitle: string
  compoundName: string
  indication: string
  phase: string
  sponsor: string
  design?: {
    primary_endpoint?: string
  }
  entities: Array<{
    type: string
    value: string
    description?: string
  }>
  clinicalTrials?: ClinicalTrialData[]
  publications?: PublicationData[]
  safetyData?: SafetyData[]
}

export function generateIBPrompt(context: IBContext): string {
  const { 
    projectTitle, 
    compoundName, 
    indication, 
    phase, 
    sponsor,
    design,
    entities,
    clinicalTrials = [],
    publications = [],
    safetyData = []
  } = context

  // Extract specific entities
  const dosages = entities.filter(e => e.type === 'dosage').map(e => e.value)
  const endpoints = entities.filter(e => e.type === 'endpoint').map(e => e.value)
  const population = entities.filter(e => e.type === 'population').map(e => e.value)
  
  // Use primary_endpoint from design if available
  const primaryEndpoint = design?.primary_endpoint
  const allEndpoints = primaryEndpoint ? [primaryEndpoint, ...endpoints] : endpoints

  return `You are an expert Senior Medical Writer with 15+ years of experience in regulatory affairs (FDA/EMA). Your task is to generate a COMPREHENSIVE, SCIENTIFICALLY RIGOROUS Investigator's Brochure (IB) for ${compoundName}.

## CRITICAL REQUIREMENTS
1. **LENGTH & DEPTH:** The output must be substantial. Avoid surface-level summaries. Expand on pharmacological mechanisms, safety profiles, and clinical rationale.
2. **EVIDENCE-BASED:** You MUST cite the specific Clinical Trials (NCT IDs) and Publications (PMIDs/Authors) provided in the Context below. 
3. **REGULATORY COMPLIANCE:** Strictly follow ICH E6 (R2) Section 7 structure.
4. **TONE:** Formal, objective, medical-grade English. No marketing fluff.

## DOCUMENT CONTEXT
- **Compound:** ${compoundName}
- **Indication:** ${indication}
- **Phase:** ${phase}
- **Sponsor:** ${sponsor}
- **Pharmacological Class:** ${entities.find(e => e.type === 'compound')?.description || 'Investigational Therapeutic Agent'}

## AVAILABLE EVIDENCE (MUST BE CITED)

### Clinical Trials
${clinicalTrials.length > 0 ? clinicalTrials.map(t => `- **${t.nctId}**: ${t.title} (${t.phase}, Status: ${t.status}). Primary Outcome: ${t.primaryOutcome}`).join('\n') : 'No specific trials provided. Reference standard phase-appropriate studies.'}

### Literature / Publications
${publications.length > 0 ? publications.map(p => `- **${p.pmid}**: ${p.title} (${p.authors[0]} et al., ${p.journal}, ${p.publicationDate})`).join('\n') : 'No specific publications provided. Reference standard class-appropriate literature.'}

### Safety Data (FAERS/FDA)
${safetyData.length > 0 ? safetyData[0]?.adverseEvents.slice(0, 5).map(ae => `- ${ae.term}: ${ae.frequency} reports (${ae.seriousness})`).join('\n') : 'Limited safety data available. Extrapolate from pharmacological class.'}

## DOCUMENT STRUCTURE & CONTENT GUIDANCE

### 1. SUMMARY
- Provide a high-level 1-2 page executive summary.
- Synthesize the physical, nonclinical, and clinical info.
- **Constraint:** Must be standalone and compelling for an investigator.

### 2. INTRODUCTION
- Chemical name (and synonyms).
- Rationale: Why ${compoundName} for ${indication}? Explain the unmet medical need.
- Mechanism of Action: Explain HOW it works at a molecular level.

### 3. PHYSICAL, CHEMICAL, AND PHARMACEUTICAL PROPERTIES
- Describe the formulation (e.g., tablets, solution).
- Storage and handling instructions (standard for this class).

### 4. NONCLINICAL STUDIES
**WARNING:** This section is often too short. EXPAND IT.
- **Nonclinical Pharmacology:** Receptor binding, primary PD, secondary PD.
- **Pharmacokinetics (Animal):** Absorption, distribution, metabolism (CYP enzymes), excretion.
- **Toxicology:** Single-dose, repeat-dose, genotoxicity, reproductive toxicity.
- *If specific data is missing, describe expected profiles for the ${entities.find(e => e.type === 'compound')?.description || 'drug class'} class.*

### 5. EFFECTS IN HUMANS (CLINICAL DATA)
- **Pharmacokinetics:** ADME in humans, half-life, Cmax, AUC.
- **Safety & Efficacy:** 
  - Summarize results from the cited clinical trials (${clinicalTrials.map(t => t.nctId).join(', ')}).
  - Discuss adverse events from safety data.
  - Cite literature (${publications.map(p => p.pmid).join(', ')}).

### 6. SUMMARY OF DATA AND GUIDANCE FOR THE INVESTIGATOR
- **Benefit-Risk Assessment:** Critical analysis.
- **Contraindications & Precautions.**
- **Monitoring:** What labs/vitals must be checked?
- **Overdose:** Management strategies.

---

GENERATE THE FULL DOCUMENT IN MARKDOWN. USE TABLES WHERE APPROPRIATE. DO NOT LEAVE PLACEHOLDERS.`
}

/**
 * Few-shot examples for IB generation
 * These help the model understand the expected style and structure
 */
export const IB_EXAMPLES = {
  introduction: `# INTRODUCTION

## 1.1 Generic and Trade Names
**Generic Name:** Investigational Compound AST-101  
**Trade Name:** Not yet assigned  
**Chemical Name:** (2S,3R,4S,5S,6R)-2-[4-chloro-3-[(4-ethoxyphenyl)methyl]phenyl]-6-(hydroxymethyl)oxane-3,4,5-triol hydrochloride

## 1.2 Pharmacological Class and Mechanism of Action
AST-101 is a novel, selective sodium-glucose co-transporter 2 (SGLT2) inhibitor. SGLT2 is primarily expressed in the proximal renal tubules and is responsible for approximately 90% of glucose reabsorption from the glomerular filtrate. By inhibiting SGLT2, AST-101 reduces renal glucose reabsorption, thereby increasing urinary glucose excretion and lowering plasma glucose concentrations in patients with type 2 diabetes mellitus (T2DM).

## 1.3 Rationale for Clinical Development
Type 2 diabetes mellitus affects over 460 million adults worldwide and is associated with significant morbidity and mortality. Despite available therapies, many patients fail to achieve adequate glycemic control. SGLT2 inhibitors represent a mechanistically distinct class of antidiabetic agents that offer:

- Insulin-independent glucose lowering
- Low risk of hypoglycemia
- Potential cardiovascular and renal benefits
- Weight reduction
- Blood pressure lowering effects

AST-101 has demonstrated superior selectivity for SGLT2 over SGLT1 (>2,500-fold) in preclinical studies, potentially reducing gastrointestinal side effects associated with SGLT1 inhibition.

## 1.4 Overview of Development Program
The clinical development program for AST-101 follows a systematic approach:

**Phase 1 (Completed):**
- Single ascending dose (SAD) study in healthy volunteers
- Multiple ascending dose (MAD) study in healthy volunteers  
- Food effect and drug-drug interaction studies

**Phase 2 (Current):**
- Dose-ranging study in T2DM patients (NCT05123456)
- Evaluation of efficacy, safety, and optimal dose selection

**Phase 3 (Planned):**
- Confirmatory efficacy and safety studies
- Cardiovascular outcomes trial
- Renal outcomes study

This Investigator's Brochure supports the ongoing Phase 2 clinical trial evaluating AST-101 in adult patients with type 2 diabetes mellitus inadequately controlled on metformin monotherapy.`,

  safety: `## 7.4 Safety and Tolerability

### 7.4.1 Overview of Clinical Safety Experience
As of [data cutoff date], AST-101 has been administered to approximately 450 subjects across Phase 1 and Phase 2 clinical trials. The overall safety profile has been favorable, with most adverse events being mild to moderate in severity.

### 7.4.2 Common Adverse Events
The most frequently reported adverse events (≥5% incidence) in pooled Phase 1 and Phase 2 studies were:

| Adverse Event | AST-101 (N=300) | Placebo (N=150) |
|--------------|-----------------|-----------------|
| Genital mycotic infections | 45 (15.0%) | 3 (2.0%) |
| Urinary tract infections | 27 (9.0%) | 9 (6.0%) |
| Increased urination | 24 (8.0%) | 6 (4.0%) |
| Nausea | 21 (7.0%) | 12 (8.0%) |
| Headache | 18 (6.0%) | 9 (6.0%) |
| Dizziness | 15 (5.0%) | 6 (4.0%) |

Most adverse events were mild in severity and did not lead to treatment discontinuation.

### 7.4.3 Serious Adverse Events
Serious adverse events (SAEs) were reported in 12 subjects (4.0%) receiving AST-101 compared to 5 subjects (3.3%) receiving placebo. No SAEs were considered related to study drug by the investigator. There were no deaths in the clinical program to date.

### 7.4.4 Adverse Events of Special Interest

**Genital Mycotic Infections:**  
Consistent with the mechanism of action (increased urinary glucose), genital mycotic infections occurred more frequently with AST-101 (15.0%) than placebo (2.0%). Most cases were mild to moderate, responded to standard antifungal therapy, and did not lead to treatment discontinuation.

**Hypoglycemia:**  
The incidence of hypoglycemia (plasma glucose <70 mg/dL) was low and similar between AST-101 (3.0%) and placebo (2.7%) when used as monotherapy or with metformin. No severe hypoglycemic events (requiring assistance) were reported.

**Volume Depletion:**  
Events suggestive of volume depletion (e.g., dizziness, orthostatic hypotension) were infrequent (2.3% vs 1.3% for placebo) and generally occurred in subjects with predisposing factors (e.g., diuretic use, elderly age).

**Renal Function:**  
Small, transient decreases in estimated glomerular filtration rate (eGFR) were observed during the first 4 weeks of treatment, consistent with the hemodynamic effects of SGLT2 inhibition. eGFR values generally returned toward baseline with continued treatment.

### 7.4.5 Laboratory Abnormalities
No clinically significant trends in laboratory parameters were observed. Small increases in hemoglobin and hematocrit (consistent with hemoconcentration due to osmotic diuresis) and small increases in LDL-cholesterol were noted.

### 7.4.6 Discontinuations Due to Adverse Events
The rate of discontinuation due to adverse events was low and similar between AST-101 (2.7%) and placebo (2.0%). The most common adverse event leading to discontinuation was genital mycotic infection (0.7%).

### 7.4.7 Pregnancy and Lactation
AST-101 is contraindicated during pregnancy based on animal reproductive toxicity studies showing adverse effects on kidney development. Women of childbearing potential must use effective contraception during the study and for 4 weeks after the last dose.`
}
