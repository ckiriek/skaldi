---
name: "Phase H.1: Formulation Normalizer + Indication Intelligence"
description: "Implement intelligent parsing of drug formulations, automatic normalization of input, mapping to dosage forms, routes, strengths, and context-aware indication suggestions."
alwaysApply: false
assignees: ["windsurf"]
---

# Phase H.1 — Formulation Normalizer + Indication Intelligence

This task introduces a new intelligence layer inside the Skaldi project.  
The goals:

1) Normalize user input for active ingredients and formulations  
2) Auto-detect dosage form, route, strength  
3) Map to controlled vocabularies  
4) Adjust indication suggestions based on formulation  
5) Keep existing INN-based enrichment fully intact  
6) Do NOT break project creation flow

This feature becomes a mandatory preprocessing layer for all clinical document generation.

---

# 🎯 OBJECTIVES

## Objective 1 — Create the Formulation Normalizer Engine

Location:
/lib/engine/formulation/


Modules to implement:



formulation_normalizer.ts
formulation_parser.ts
formulation_mapping.ts
formulation_catalog.ts
indication_suggester.ts
index.ts


### Must-Have Capabilities

### A) Parse raw user input  
Input examples:
- "Metronidazole vaginal suppository 500 mg"
- "Sitagliptin 100 mg tablet oral"
- "Metformin hydrochloride 850mg film-coated tablets"
- "Insulin glargine pen injection 100 IU/ml"
- "Metronidazole 500 mg intravaginal"

Extract:
- **apiName** (pure INN or chemical name)
- **dosageForm** (controlled vocabulary)
- **route** (controlled vocabulary)
- **strength** (normalized numeric + unit)
- **additionalProperties** (extended descriptors)

### B) Controlled vocabularies must be created

#### dosage forms (40+)
tablet, film-coated tablet, capsule, powder, spray, injection, IV infusion, subcutaneous injection, inhalation powder, ophthalmic solution, vaginal suppository, vaginal cream, gel, ointment, etc.

#### routes (20+)
oral, IV, IM, SC, inhalation, intravaginal, topical, rectal, ophthalmic, intranasal, etc.

#### strength normalization
Supported units:
mg, g, mcg, IU, %, mg/ml, IU/ml

### C) Normalization Rules
- Strip manufacturer terms  
- Strip brand names  
- Keep only INN variants  
- Convert synonyms:
    - "vaginal pessary" → "vaginal suppository"
    - "intravaginal" → "vaginal"
    - "po" → "oral"
    - "per os" → "oral"
    - "tab" → "tablet"
- Normalize units:
    - 0.5 g → 500 mg  
    - 1000 IU/ml → 1x10^3 IU/ml  

### D) Clean INN extraction
Correct:
- "Metronidazole" → Metronidazole  
- "Metronidazole hydrochloride" → Metronidazole  
- "Sitagliptin phosphate" → Sitagliptin  
- "Insulin glargine pen" → Insulin glargine  

The INN must stay pure for all enrichment modules.

---

# 🎯 Objective 2 — Add Formulation-Aware Indication Intelligence

Location:


/lib/engine/formulation/indication_suggester.ts


### Required Behavior

### 1) If only API known (no form yet):  
Show **systemic/common indications** from:
- FDA  
- EMA  
- CT.gov  
- DrugBank  

Example for Metronidazole:
- Anaerobic infections
- Periodontitis
- H. Pylori therapy
- Rosacea

### 2) If dosage form is local (vaginal / topical / ophthalmic):  
Override indication suggestions using formulation-specific mapping.

### Example:


If dosageForm in ["vaginal suppository", "vaginal cream", "vaginal gel"]
→ Indications = ["Bacterial Vaginosis", "Trichomonas Vaginalis", "Vaginitis", "Mixed Vaginal Infections"]


### Example for ophthalmic solution:
→ Keratitis, conjunctivitis, blepharitis.

### Example for inhalation powder:
→ Asthma, COPD.

### 3) If systemic form (tablet/injection) → no override  
The logic must be:



if localForm → local indications
else → systemic indications


### 4) Manual input must always override suggestions

### 5) All suggestions must be optional — never auto-fill silently

---

# 🎯 Objective 3 — Integrate Formulation Normalizer into Project Creation Flow

Location:


/app/dashboard/projects/new/page.tsx
/app/api/projects/create/route.ts
/lib/engine/enrichment/


### Pipeline Requirements

1) When user types **Compound Name**, normalize it instantly.
2) Store all extracted fields in project metadata:


project.drug.apiName
project.drug.dosageForm
project.drug.route
project.drug.strength
project.drug.rawInput

3) Replace all internal calls that previously used the raw name → use **apiName**.
4) Indication suggestions must be adjusted based on:


apiName + dosageForm + route

5) If no dosage form detected → fallback to systemic indication.
6) No changes to existing document generation — formulation affects only:
- IB formulation section
- ICF description
- Protocol investigational product section

---

# 🎯 Objective 4 — UI/UX Integration

Location:


/components/formulation/


Add a new component:

`<FormulationDebugPanel />`

Only visible under DEV mode (`NEXT_PUBLIC_DEV_TOOLS=true`).

Shows:
- Raw input
- Normalized API
- Strength parsed
- Dosage form
- Route
- Confidence scores

---

# 🎯 Objective 5 — Unit Tests (strict requirement)

Locations:


/tests/formulation/*.test.ts


Tests required:

### Parsing tests
- 30+ examples of formulations  
- Multilingual: English + Russian  
- Edge cases (no strength, wrong order, brand names)

### Mapping tests
- Form inference
- Route inference
- Strength normalization

### Indication tests
- Vaginal form → BV suggestions
- Inhalation → COPD suggestions
- Topical → dermatological suggestions

### Regression tests
- All existing API must NOT break.

---

# 🎯 Objective 6 — Documentation

Location:


/lib/engine/formulation/README.md


Must include:
- Architecture  
- Supported forms & routes  
- Examples  
- API reference  
- Limitations  
- How UI integrates  

---

# 🎯 Objective 7 — Deployment Guardrails

1) Do not break existing project creation  
2) Do not modify document generators  
3) Do not change enrichment logic except INN extraction  
4) No breaking changes in DB schema  
5) Only add new fields (nullable)

Add fields to Supabase:


ALTER TABLE projects
ADD COLUMN api_name TEXT,
ADD COLUMN dosage_form TEXT,
ADD COLUMN route TEXT,
ADD COLUMN strength TEXT,
ADD COLUMN raw_drug_input TEXT;


---

# ✔ Acceptance Criteria

- Parses 95%+ of formulations correctly  
- Correctly distinguishes INN vs chemical salt  
- Correctly detects vaginal forms  
- Correctly proposes BV and gynecological indications  
- Does not break systemic indications  
- UI remains clean and intuitive  
- Full TypeScript coverage  
- Unit tests > 80%  
- No regressions  

---

# ⚡ Bonus (optional for Windsurf)

- Add a dosage form autocomplete based on parsed suggestions  
- Add visual pill for detected formulation fields  
- Add confidence heatmap in DEV panel  

---

# END OF TASK