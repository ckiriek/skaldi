# 🎯 ВСЕ ПРОМПТЫ SKALDI

**Дата создания:** 24 ноября 2025  
**Назначение:** Централизованное хранилище всех промптов для Azure OpenAI  

---

## 📋 Оглавление

1. [System Prompts (Edge Functions)](#system-prompts-edge-functions)
2. [Template Prompts - IB](#template-prompts---ib)
3. [Template Prompts - Protocol](#template-prompts---protocol)
4. [Template Prompts - CSR](#template-prompts---csr)
5. [Template Prompts - ICF](#template-prompts---icf)
6. [Template Prompts - Synopsis](#template-prompts---synopsis)
7. [Template Prompts - SPC](#template-prompts---spc)
8. [Agent Prompts](#agent-prompts)
9. [Protocol UI Prompts](#protocol-ui-prompts)

---

## System Prompts (Edge Functions)

### PROMPT-SYS-001: generate-section System Prompt
**Файл:** `supabase/functions/generate-section/index.ts`  
**Строки:** 149-173

```
You are a clinical documentation expert specializing in regulatory-compliant ${documentType} documents. 

**Critical Requirements:**
1. Generate content that adheres to ICH-GCP guidelines, FDA regulations, and EMA standards
2. Use clear, precise medical and regulatory terminology
3. Ensure all statements are evidence-based and audit-ready

**Formatting Requirements:**
- ALWAYS format your response in proper Markdown
- Use ## for section headings, ### for subsections
- Use **bold** for emphasis and key terms
- Use bullet points (-) or numbered lists (1.) for lists
- Add blank lines between paragraphs for readability
- Use tables (| header | header |) where appropriate for structured data
- Use > for important notes or warnings

**Content Requirements:**
- Be comprehensive and detailed - aim for the target page count specified
- Include specific data, values, and statistics where available
- Cite sources when referencing studies or data
- Use proper medical and scientific terminology
- Structure content logically with clear hierarchy

Your output will be rendered as Markdown, so proper formatting is essential for readability.
```

---

### PROMPT-SYS-002: generate-document System Prompt
**Файл:** `supabase/functions/generate-document/index.ts`  
**Строки:** 1645-1646

```
You are an expert medical writer specializing in regulatory-compliant clinical trial documentation. You follow ICH E6, ICH E3, FDA 21 CFR, and EMA guidelines. You write in a clear, precise, and scientifically rigorous style.
```

---

### PROMPT-SYS-003: extract-entities System Prompt
**Файл:** `supabase/functions/extract-entities/index.ts`  
**Строки:** 125-126

```
You are a medical entity extraction expert. Return only valid JSON arrays.
```

---

## Template Prompts - IB

### PROMPT-IB-001: Title Page
**Файл:** `templates_en/ib/title_page.json`  
**Section ID:** `ib_title_page`

```
Create the title page for {{compoundName}} Investigator's Brochure.

Include:
- Product name: {{compoundName}}
- Sponsor: [Sponsor Name]
- Version and date
- Confidentiality statement
- Regulatory compliance statement

Format in Markdown.
```

---

### PROMPT-IB-002: Summary
**Файл:** `templates_en/ib/summary.json`  
**Section ID:** `ib_summary`

```
Write the Summary section for {{compoundName}} Investigator's Brochure.

Provide a 2-3 page executive summary covering:
- Chemical name and structure
- Pharmacological class
- Mechanism of action
- Key nonclinical findings
- Clinical development status
- Safety profile summary

Format in Markdown with ## headings.
```

---

### PROMPT-IB-003: Introduction
**Файл:** `templates_en/ib/introduction.json`  
**Section ID:** `ib_introduction`

```
Write the Introduction section for {{compoundName}} Investigator's Brochure.

Include:
- Purpose of the IB
- Compound overview
- Therapeutic area
- Development rationale

Format in Markdown. Write 2-3 pages.
```

---

### PROMPT-IB-004: Nonclinical Overview
**Файл:** `templates_en/ib/nonclinical.json`  
**Section ID:** `ib_nonclinical`

```
Write the Nonclinical Studies Overview for {{compoundName}} Investigator's Brochure.

Cover:
- Pharmacology studies
- Toxicology summary
- ADME overview
- Safety pharmacology

Format in Markdown with ## headings. Write 3-4 pages.
```

---

### PROMPT-IB-005: Physical and Chemical Properties
**Файл:** `templates_en/ib/physical_chemical.json`  
**Section ID:** `ib_physical_chemical`

```
Write the Physical and Chemical Properties section for {{compoundName}} Investigator's Brochure.

Write about the ACTUAL drug {{compoundName}}, using real physicochemical data.

Format in Markdown with ## headings and bullet points.

Cover:

## Chemical Structure
IUPAC name, molecular formula, molecular weight

## Physical Properties
Appearance, solubility, stability, pH

## Chemical Properties
pKa, LogP, polymorphism

## Formulation
Active ingredient, excipients, storage conditions

Write 3-4 pages for {{compoundName}}.
```

---

### PROMPT-IB-006: Pharmacodynamics
**Файл:** `templates_en/ib/pharmacodynamics.json`  
**Section ID:** `ib_pharmacodynamics`

```
Write the Pharmacodynamics section for {{compoundName}} Investigator's Brochure.

Write about the ACTUAL drug {{compoundName}}, using real PD data from nonclinical and clinical studies.

Format in Markdown with ## headings, tables, and bullet points.

Cover:

## Mechanism of Action
Target, pathway, downstream effects

## Nonclinical Pharmacodynamics
In vitro and in vivo models, dose-response

## Clinical Pharmacodynamics
PD markers, dose-response in humans, PK/PD relationships

## Duration of Effect
Onset, peak, duration

Write 6-8 pages for {{compoundName}}.
```

---

### PROMPT-IB-007: Pharmacokinetics
**Файл:** `templates_en/ib/pharmacokinetics.json`  
**Section ID:** `ib_pharmacokinetics`

```
Write the Pharmacokinetics section for {{compoundName}} Investigator's Brochure.

Write about the ACTUAL drug {{compoundName}}, using real PK data from FDA label, clinical pharmacology studies, and literature.

Format in Markdown with ## headings, tables, and bullet points.

Cover:

## Absorption
Bioavailability, Tmax, Cmax, food effect

## Distribution
Vd, protein binding, tissue distribution

## Metabolism
CYP enzymes, metabolites, drug interactions

## Excretion
Half-life, clearance, renal/hepatic elimination

## Special Populations
Renal impairment, hepatic impairment, elderly, pediatric

## Drug-Drug Interactions
CYP inhibitors/inducers, transporter interactions

Write 8-10 pages for {{compoundName}}.
```

---

### PROMPT-IB-008: Toxicology
**Файл:** `templates_en/ib/toxicology.json`  
**Section ID:** `ib_toxicology`

```
Write the Toxicology section for {{compoundName}} Investigator's Brochure.

Write about the ACTUAL drug {{compoundName}}, using real nonclinical data from toxicology reports and regulatory submissions.

Format in Markdown with ## headings, tables, and bullet points.

Cover:

## Single-Dose Toxicity
Acute toxicity in species

## Repeat-Dose Toxicity
Subacute/chronic findings, NOAELs

## Genotoxicity
Ames, chromosomal aberration, micronucleus

## Carcinogenicity
Long-term studies if available

## Reproductive Toxicity
Fertility, embryo-fetal, pre/postnatal

## Local Tolerance
Irritation, sensitization

## Safety Margins
NOAEL vs clinical doses

Write 6-8 pages for {{compoundName}}.
```

---

### PROMPT-IB-009: Clinical Studies
**Файл:** `templates_en/ib/clinical_studies.json`  
**Section ID:** `ib_clinical_studies`

```
Write the Clinical Studies (Effects in Humans) section for {{compoundName}} in {{indication}} for the Investigator's Brochure.

You are writing about the ACTUAL drug {{compoundName}}, not a template. Use real clinical trial data from ClinicalTrials.gov, FDA labels, and published studies.

Format in Markdown with ## headings, tables, and bullet points.

Cover:

## Clinical Development Overview
Phases completed, total patients

## Phase 1 Studies
SAD/MAD studies, PK/PD, DDI studies

## Phase 2 Studies  
Key trials with NCT numbers, design, results

## Phase 3 Pivotal Studies
For each major study: NCT#, design, N, endpoints, efficacy results (with p-values), safety

## Integrated Efficacy
Pooled results, consistency, dose-response

## Integrated Safety
Common AEs (≥5%), serious AEs, deaths, lab abnormalities

## Special Populations
Elderly, pediatric, renal/hepatic impairment

## Long-Term Safety
Extension studies, post-marketing data

Include specific study IDs, statistics, and data. Write 15-25 pages for {{compoundName}}.
```

---

### PROMPT-IB-010: Safety
**Файл:** `templates_en/ib/safety.json`  
**Section ID:** `ib_safety`

```
Write the Safety and Tolerability section for {{compoundName}} Investigator's Brochure.

Write about the ACTUAL drug {{compoundName}}, using real safety data from clinical trials, FDA label, and post-marketing surveillance.

Format in Markdown with ## headings, tables, and bullet points.

Cover:

## Overview of Safety Profile
Summary of exposure, overall safety

## Common Adverse Events
AEs ≥5%, by system organ class

## Serious Adverse Events
SAEs, deaths, discontinuations

## Laboratory Abnormalities
Hematology, chemistry, urinalysis

## Vital Signs and ECG
Changes in BP, HR, QTc

## Warnings and Precautions
Boxed warnings, contraindications

## Drug Interactions
Safety concerns with concomitant meds

## Overdose
Management and outcomes

Write 8-10 pages for {{compoundName}}.
```

---

## Template Prompts - Protocol

### PROMPT-PROT-001: Title Page
**Файл:** `templates_en/protocol/title_page.json`  
**Section ID:** `protocol_title_page`

```
Generate the TITLE PAGE for the Clinical Protocol.

Context:
- Protocol Title: "A {{phase}} Study of {{compoundName}} in {{indication}}"
- Protocol Number: [NUMBER]
- Sponsor: {{sponsor}}
- Date: {{currentDate}}

Include standard Confidentiality Statement.
```

---

### PROMPT-PROT-002: Synopsis
**Файл:** `templates_en/protocol/synopsis.json`  
**Section ID:** `protocol_synopsis`

```
Generate a Tabular Protocol Synopsis (2-3 pages) summarizing the study.

Context:
- Title: "A {{phase}} Study of {{compoundName}} in {{indication}}"
- Phase: {{phase}}
- Indication: {{indication}}
- Compound: {{compoundName}}
- Sponsor: {{sponsor}}

The synopsis must include:
1. Study Title and Phase
2. Objectives (Primary and Secondary)
3. Study Design and Methodology
4. Study Population (Inclusion/Exclusion summary)
5. Treatment Groups and Dosing
6. Endpoints and Assessments
7. Statistical Considerations
8. Study Duration

Format as a clear Markdown table or structured list.
```

---

### PROMPT-PROT-003: Introduction
**Файл:** `templates_en/protocol/introduction.json`  
**Section ID:** `protocol_introduction`

```
Write Section 5: INTRODUCTION.

Context:
- Indication: {{indication}}
- Compound: {{compoundName}}
- Evidence: {{publications}}

Requirements:
1. Background: Describe the disease burden of {{indication}}.
2. Rationale: Why {{compoundName}} is being developed.
3. Risk/Benefit: Brief assessment.

Cite 2-3 key supporting publications if available.
```

---

### PROMPT-PROT-004: Objectives
**Файл:** `templates_en/protocol/objectives.json`  
**Section ID:** `protocol_objectives`

```
Write Section 6: STUDY OBJECTIVES AND ENDPOINTS.

Context:
- Primary Endpoint: {{primaryEndpoint}}
- Indication: {{indication}}
- Compound: {{compoundName}}
- Secondary Endpoints: {{secondaryEndpoints}}

Requirements:
1. Primary Objective: Clearly state the objective to evaluate {{primaryEndpoint}}.
2. Secondary Objectives: List 3-5 key secondary objectives (Safety, PK, QoL).
3. Exploratory Objectives: Include PK/PD, biomarkers, etc.

Format as:
#### 6.1 Primary Objective
#### 6.2 Secondary Objectives
#### 6.3 Exploratory Objectives
```

---

### PROMPT-PROT-005: Study Design
**Файл:** `templates_en/protocol/study_design.json`  
**Section ID:** `protocol_study_design`

```
Write Section 7: STUDY DESIGN.

Context:
- Phase: {{phase}}
- Design: {{design_type}}, {{blinding}}, placebo-controlled
- Duration: {{duration_weeks}} weeks treatment
- Arms: {{arms}}

Requirements:
1. Overall Design: Describe the study architecture (randomized, double-blind, etc.).
2. Study Schema: Insert a placeholder [INSERT STUDY DIAGRAM].
3. Rationale: Justify the choice of control group and blinding.

Format as:
#### 7.1 Overall Design
#### 7.2 Study Schema
#### 7.3 Rationale for Study Design
```

---

### PROMPT-PROT-006: Eligibility Criteria
**Файл:** `templates_en/protocol/eligibility_criteria.json`  
**Section ID:** `protocol_eligibility_criteria`

```
Write Section 8: STUDY POPULATION.

Context:
- Indication: {{indication}}
- Population: {{population}}

Requirements:
1. Inclusion Criteria: List 5-7 standard criteria (Age 18-75, Diagnosis of {{indication}}, Informed Consent).
2. Exclusion Criteria: List 5-7 standard exclusions (Pregnancy, Comorbidities, Hypersensitivity).
3. Withdrawal Criteria: Standard safety and consent withdrawal reasons.

Format as:
#### 8.1 Inclusion Criteria
#### 8.2 Exclusion Criteria
#### 8.3 Subject Withdrawal Criteria
```

---

### PROMPT-PROT-007: Treatments
**Файл:** `templates_en/protocol/treatments.json`  
**Section ID:** `protocol_treatments`

```
Write Section 9: STUDY TREATMENTS.

Context:
- Drug: {{compoundName}}
- Dose: {{dosages}}
- Comparator: Placebo

Requirements:
1. Study Drug: Describe formulation, route, frequency.
2. Comparator: Describe matching placebo.
3. Dosing instructions: How to administer.
4. Concomitant meds: Allowed vs Prohibited.
5. Compliance checking.
```

---

### PROMPT-PROT-008: Schedule of Assessments
**Файл:** `templates_en/protocol/schedule_of_assessments.json`  
**Section ID:** `protocol_schedule_of_assessments`

```
Write Section 10: STUDY PROCEDURES.

Requirements:
1. Create a detailed Schedule of Assessments (Table placeholder).
2. Describe Screening Period (Day -28 to -1).
3. Describe Treatment Period (Day 1 to Week {{duration_weeks}}).
4. Describe Follow-up Period.

Include standard safety assessments (Vitals, ECG, Labs) and efficacy assessments related to {{primaryEndpoint}}.
```

---

### PROMPT-PROT-009: Safety Monitoring
**Файл:** `templates_en/protocol/safety_monitoring.json`  
**Section ID:** `protocol_safety_monitoring`

```
Write Section 12: SAFETY ASSESSMENTS.

Requirements:
1. Define AEs and SAEs (ICH E2A).
2. Grading: CTCAE v5.0.
3. Reporting: SAEs within 24 hours.
4. Labs: Hematology, Chemistry, Urinalysis.
5. Vitals and ECG monitoring.
```

---

### PROMPT-PROT-010: Statistics
**Файл:** `templates_en/protocol/statistics.json`  
**Section ID:** `protocol_statistics`

```
Write Section 14: STATISTICAL CONSIDERATIONS.

Context:
- Primary Endpoint: {{primaryEndpoint}}

Requirements:
1. Sample Size: Describe assumptions and power calculation (placeholder).
2. Analysis Sets: ITT, PP, Safety.
3. Statistical Methods: How {{primaryEndpoint}} will be analyzed (e.g., ANCOVA).
4. Missing Data: Handling strategy.
```

---

### PROMPT-PROT-011: Ethics
**Файл:** `templates_en/protocol/ethics.json`  
**Section ID:** `protocol_ethics`

```
Write Section 16: ETHICAL AND REGULATORY CONSIDERATIONS.

Requirements:
1. Compliance with Declaration of Helsinki and ICH GCP.
2. Informed Consent process.
3. IRB/IEC approval.
4. Data privacy.
```

---

## Template Prompts - CSR

### PROMPT-CSR-001: Synopsis
**Файл:** `templates_en/csr/synopsis.json`  
**Section ID:** `csr_synopsis`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-CSR-002: Introduction
**Файл:** `templates_en/csr/introduction.json`  
**Section ID:** `csr_introduction`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-CSR-003: Objectives
**Файл:** `templates_en/csr/objectives.json`  
**Section ID:** `csr_objectives`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-CSR-004: Study Design
**Файл:** `templates_en/csr/study_design.json`  
**Section ID:** `csr_study_design`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-CSR-005: Endpoints
**Файл:** `templates_en/csr/endpoints.json`  
**Section ID:** `csr_endpoints`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-CSR-006: Populations
**Файл:** `templates_en/csr/populations.json`  
**Section ID:** `csr_populations`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-CSR-007: Statistics
**Файл:** `templates_en/csr/statistics.json`  
**Section ID:** `csr_statistics`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-CSR-008: Efficacy Evaluation
**Файл:** `templates_en/csr/efficacy_evaluation.json`  
**Section ID:** `csr_efficacy_evaluation`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-CSR-009: Safety Evaluation
**Файл:** `templates_en/csr/safety_evaluation.json`  
**Section ID:** `csr_safety_evaluation`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-CSR-010: Conclusions
**Файл:** `templates_en/csr/conclusions.json`  
**Section ID:** `csr_conclusions`

*Note: No prompt_text found - needs to be added*

---

## Template Prompts - ICF

### PROMPT-ICF-001: Header
**Файл:** `templates_en/icf/header.json`  
**Section ID:** `icf_header`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-ICF-002: Introduction
**Файл:** `templates_en/icf/introduction.json`  
**Section ID:** `icf_introduction`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-ICF-003: Procedures
**Файл:** `templates_en/icf/procedures.json`  
**Section ID:** `icf_procedures`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-ICF-004: Risks
**Файл:** `templates_en/icf/risks.json`  
**Section ID:** `icf_risks`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-ICF-005: Benefits
**Файл:** `templates_en/icf/benefits.json`  
**Section ID:** `icf_benefits`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-ICF-006: Confidentiality
**Файл:** `templates_en/icf/confidentiality.json`  
**Section ID:** `icf_confidentiality`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-ICF-007: Signature
**Файл:** `templates_en/icf/signature.json`  
**Section ID:** `icf_signature`

*Note: No prompt_text found - needs to be added*

---

## Template Prompts - Synopsis

### PROMPT-SYN-001: Title
**Файл:** `templates_en/synopsis/title.json`  
**Section ID:** `synopsis_title`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-SYN-002: Objectives
**Файл:** `templates_en/synopsis/objectives.json`  
**Section ID:** `synopsis_objectives`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-SYN-003: Design
**Файл:** `templates_en/synopsis/design.json`  
**Section ID:** `synopsis_design`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-SYN-004: Endpoints
**Файл:** `templates_en/synopsis/endpoints.json`  
**Section ID:** `synopsis_endpoints`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-SYN-005: Treatment
**Файл:** `templates_en/synopsis/treatment.json`  
**Section ID:** `synopsis_treatment`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-SYN-006: Statistics
**Файл:** `templates_en/synopsis/statistics.json`  
**Section ID:** `synopsis_statistics`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-SYN-007: Rationale
**Файл:** `templates_en/synopsis/rationale.json`  
**Section ID:** `synopsis_rationale`

*Note: No prompt_text found - needs to be added*

---

## Template Prompts - SPC

### PROMPT-SPC-001: Name
**Файл:** `templates_en/spc/name.json`  
**Section ID:** `spc_name`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-SPC-002: Composition
**Файл:** `templates_en/spc/composition.json`  
**Section ID:** `spc_composition`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-SPC-003: Pharmaceutical
**Файл:** `templates_en/spc/pharmaceutical.json`  
**Section ID:** `spc_pharmaceutical`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-SPC-004: Clinical
**Файл:** `templates_en/spc/clinical.json`  
**Section ID:** `spc_clinical`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-SPC-005: Pharmacological
**Файл:** `templates_en/spc/pharmacological.json`  
**Section ID:** `spc_pharmacological`

*Note: No prompt_text found - needs to be added*

---

### PROMPT-SPC-006: Administration
**Файл:** `templates_en/spc/admin.json`  
**Section ID:** `spc_admin`

*Note: No prompt_text found - needs to be added*

---

## Agent Prompts

### PROMPT-AGENT-001: Writer Agent Refine
**Файл:** `lib/agents/writer.ts`  
**Строки:** 189-210

**System Prompt:** *(Передается как параметр)*

**User Prompt:**
```
Please refine the following content:

${content}
```

**Parameters:**
- temperature: 0.3
- max_tokens: 4000
- top_p: 0.95

---

## Protocol UI Prompts

### PROMPT-UI-001: Protocol UI Base System Prompt
**Файл:** `lib/engine/protocol-ui/azure_completion.ts`  
**Строки:** 86-113

```
You are a clinical trial protocol writer with expertise in ICH-GCP guidelines, FDA/EMA regulations, and clinical research best practices.

You are helping write the ${context.sectionId} section of a clinical trial protocol.

Study Context:
${contextInfo.join('\n')}

Provide clear, professional, regulatory-compliant text. Use standard clinical trial terminology. Be concise but complete.
```

---

### PROMPT-UI-002: Protocol UI Inline Completion
**Файл:** `lib/engine/protocol-ui/azure_completion.ts`  
**Строки:** 131-133

```
Continue this protocol section text naturally and professionally:

${textBeforeCursor}
```

---

### PROMPT-UI-003: Protocol UI Section Completions
**Файл:** `lib/engine/protocol-ui/azure_completion.ts`  
**Строки:** 148-162

**Section-specific prompts:**

- **objectives:** `Write clear primary and secondary objectives for this clinical trial.`
- **endpoints:** `Define primary and secondary endpoints with measurement methods and timepoints.`
- **eligibility:** `Write comprehensive inclusion and exclusion criteria.`
- **safety_assessments:** `Describe safety monitoring procedures including AE/SAE reporting, laboratory assessments, and vital signs.`
- **statistics:** `Write the statistical analysis plan including sample size calculation and analysis methods.`
- **default:** `Write the ${sectionId} section.`

**Full prompt:**
```
Continue and complete this ${sectionId} section:

${currentText}

${sectionPrompt}
```

---

## 📊 Статистика промптов

- **System Prompts:** 3
- **IB Templates:** 10 (с промптами)
- **Protocol Templates:** 11 (с промптами)
- **CSR Templates:** 0 (нужно добавить)
- **ICF Templates:** 0 (нужно добавить)
- **Synopsis Templates:** 0 (нужно добавить)
- **SPC Templates:** 0 (нужно добавить)
- **Agent Prompts:** 1
- **Protocol UI Prompts:** 3

**ИТОГО:** 28 промптов с текстом  
**Нужно добавить:** ~30 промптов для CSR, ICF, Synopsis, SPC

---

## 🔧 Инструкция по обновлению

1. **Редактируй промпты в этом файле**
2. **Сохрани файл**
3. **Отдай мне обратно**
4. **Я автоматически разнесу изменения по нужным файлам**

### Формат ID промпта:
```
PROMPT-{TYPE}-{NUMBER}
```

Где:
- `TYPE`: SYS (system), IB, PROT (protocol), CSR, ICF, SYN (synopsis), SPC, AGENT, UI
- `NUMBER`: Порядковый номер (001, 002, etc)

---

## ⚠️ Важные замечания

1. **Плейсхолдеры:** Используй `{{variableName}}` для переменных
2. **Markdown:** Все промпты должны генерировать Markdown
3. **Длина:** Указывай ожидаемую длину (например, "Write 6-8 pages")
4. **Специфичность:** Всегда указывай "Write about the ACTUAL drug {{compoundName}}"
5. **Структура:** Перечисляй разделы которые должны быть включены

---

**Конец файла**
