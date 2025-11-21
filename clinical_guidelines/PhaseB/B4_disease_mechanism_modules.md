# Phase B, Task B4: Disease Overview & Mechanism Modules

**Status:** 🚧 IN PROGRESS  
**Date:** 2025-11-21  
**Goal:** Automate generation of large descriptive blocks (Disease Background, Epidemiology, Pathophysiology, Mechanism) using RAG

---

## 📋 Overview

Clinical documents (Protocol, IB, CSR) require extensive disease and drug mechanism sections. These are typically sourced from:
- FDA labels
- EMA EPAR documents
- Published literature (PubMed)
- Clinical trial data (ClinicalTrials.gov)
- Company IBs and SPCs

**B4 automates this by:**
1. Using existing RAG infrastructure (B2)
2. Adding disease/mechanism-specific templates
3. Integrating RAG retrieval into SectionGenerator
4. Generating evidence-based descriptive content

---

## 🎯 Requirements

### Sections to Generate:

#### For Protocol:
- **Disease Background** - Overview of the disease/condition
- **Epidemiology** - Prevalence, incidence, demographics
- **Pathophysiology** - Disease mechanism and progression
- **Standard of Care** - Current treatment landscape
- **Unmet Medical Need** - Gaps in current therapy

#### For IB (Investigator's Brochure):
- **Disease Overview** - Comprehensive disease description
- **Drug Mechanism of Action** - How the drug works
- **Nonclinical Pharmacology** - Preclinical data
- **Clinical Pharmacology** - Human PK/PD data
- **Clinical Efficacy** - Evidence from trials
- **Safety Profile** - Adverse events, warnings

#### For CSR:
- **Background** - Disease and drug context
- **Rationale** - Why this study was conducted

---

## ✅ What Already Exists (from B2 & B3)

### 1. Database Tables ✅
- `disease_reference_chunks` - Disease-related content with embeddings
- `drug_reference_chunks` - Drug-related content with embeddings
- Both have vector search via `pgvector`

### 2. RAG Infrastructure ✅
- `ReferenceRetriever` service (`lib/services/reference-retriever.ts`)
- Methods:
  - `retrieveDrugReferences()` - Search drug content
  - `retrieveDiseaseReferences()` - Search disease content
  - `retrieveCombined()` - Search both
- Azure OpenAI embeddings integration

### 3. Data Sources ✅
- **Internal:** 30 chunks from `clinical_reference/` (protocols, IBs, ICFs)
- **External:** 20 chunks from ClinicalTrials.gov trials
- Total: **50 RAG chunks** ready for retrieval

### 4. Ingestion Scripts ✅
- `scripts/ingest-clinical-references.ts` - Ingests internal documents
- `scripts/sync-trials-to-rag.ts` - Syncs external trial data

---

## 🔨 What Needs to Be Built

### 1. Templates for Disease/Mechanism Sections

Create JSON templates in `templates_en/`:

```
templates_en/
  protocol/
    disease_background.json      ← NEW
    epidemiology.json            ← NEW
    pathophysiology.json         ← NEW
    standard_of_care.json        ← NEW
    unmet_need.json              ← NEW
  ib/
    disease_overview.json        ← NEW
    mechanism_of_action.json     ← NEW
    nonclinical_pharmacology.json ← NEW
    clinical_pharmacology.json   ← NEW
```

**Template Structure:**
```json
{
  "section_name": "disease_background",
  "document_type": "protocol",
  "description": "Overview of the disease or medical condition",
  "required_inputs": [
    "indication",
    "disease_name"
  ],
  "rag_queries": [
    {
      "type": "disease",
      "query_template": "{{disease_name}} pathophysiology epidemiology",
      "min_chunks": 3,
      "max_chunks": 5
    }
  ],
  "prompt_template": "Generate a comprehensive Disease Background section for a clinical protocol...",
  "expected_length": "500-800 words",
  "style": "formal, evidence-based, regulatory-appropriate"
}
```

### 2. Update SectionGenerator to Use RAG

**Current:** `lib/agents/section-generator.ts` generates sections without RAG  
**Needed:** Integrate `ReferenceRetriever` into generation flow

**Changes:**
```typescript
// In SectionGenerator.generateSection()

// 1. Check if section needs RAG
const template = await this.getTemplate(sectionName)
if (template.rag_queries) {
  // 2. Retrieve references
  const references = await this.retrieveReferences(template.rag_queries, params)
  
  // 3. Format references for prompt
  const referencesText = this.formatReferences(references)
  
  // 4. Add to prompt context
  prompt = this.buildPromptWithReferences(template, params, referencesText)
}

// 5. Generate with Azure OpenAI
const content = await this.generate(prompt)
```

### 3. Reference Formatting

Create utility to format RAG results for prompts:

```typescript
function formatReferencesForPrompt(references: ReferenceChunk[]): string {
  return references.map((ref, i) => `
[Reference ${i + 1}]
Source: ${ref.source}
Content: ${ref.content}
${ref.url ? `URL: ${ref.url}` : ''}
---
  `).join('\n')
}
```

### 4. Update Document Structure

Add new sections to `document_structure` table:

```sql
-- Protocol disease sections
INSERT INTO document_structure (document_type, section_name, parent_section, order_index) VALUES
  ('protocol', 'disease_background', 'introduction', 1),
  ('protocol', 'epidemiology', 'disease_background', 1),
  ('protocol', 'pathophysiology', 'disease_background', 2),
  ('protocol', 'standard_of_care', 'disease_background', 3),
  ('protocol', 'unmet_need', 'disease_background', 4);

-- IB disease/mechanism sections
INSERT INTO document_structure (document_type, section_name, parent_section, order_index) VALUES
  ('ib', 'disease_overview', 'introduction', 1),
  ('ib', 'mechanism_of_action', 'pharmacology', 1),
  ('ib', 'nonclinical_pharmacology', 'pharmacology', 2),
  ('ib', 'clinical_pharmacology', 'pharmacology', 3);
```

---

## 🧪 Testing Plan

### Test 1: RAG Retrieval for Disease
```bash
npx tsx scripts/test-disease-rag.ts
```
- Query: "Herpes Simplex pathophysiology"
- Expected: 3-5 relevant chunks from internal + external sources

### Test 2: Template Loading
```bash
npx tsx scripts/test-disease-templates.ts
```
- Load `disease_background.json`
- Verify `rag_queries` structure
- Validate prompt template

### Test 3: Section Generation with RAG
```bash
npx tsx scripts/test-disease-section-generation.ts
```
- Generate "Disease Background" for acyclovir/Herpes Simplex
- Verify RAG references are included
- Check content quality and length

### Test 4: Full Protocol with Disease Sections
```bash
# Via API
POST /api/documents/generate
{
  "project_id": "...",
  "document_type": "protocol",
  "sections": ["disease_background", "epidemiology", "unmet_need"]
}
```

---

## 📊 Success Criteria

- [ ] 5+ disease/mechanism templates created
- [ ] SectionGenerator integrated with ReferenceRetriever
- [ ] RAG references formatted and included in prompts
- [ ] Generated sections cite 3-5 relevant sources
- [ ] Content is evidence-based and regulatory-appropriate
- [ ] Disease Background section: 500-800 words
- [ ] Mechanism section: 300-500 words
- [ ] All tests pass

---

## 🚀 Implementation Steps

### Step 1: Create Templates ✅
1. Create `templates_en/protocol/disease_background.json`
2. Create `templates_en/protocol/epidemiology.json`
3. Create `templates_en/ib/disease_overview.json`
4. Create `templates_en/ib/mechanism_of_action.json`

### Step 2: Update SectionGenerator
1. Add `ReferenceRetriever` dependency
2. Add `retrieveReferences()` method
3. Add `formatReferences()` method
4. Update `generateSection()` to use RAG when needed

### Step 3: Update Database
1. Add disease/mechanism sections to `document_structure`
2. Sync templates to `document_templates` table

### Step 4: Test
1. Test RAG retrieval
2. Test template loading
3. Test section generation
4. Test full document generation

---

## 📝 Notes

### Why This Matters
Without disease/mechanism content, clinical documents are incomplete and won't pass regulatory review. These sections demonstrate:
- Understanding of the medical context
- Scientific rationale for the study
- Evidence base for treatment approach
- Regulatory awareness

### RAG Advantages
- **Evidence-based:** All content traceable to sources
- **Consistent:** Same sources used across documents
- **Auditable:** References logged in metadata
- **Scalable:** Works for any disease/drug combination

### Future Enhancements (Post-B4)
- Add more external sources (EMA EPAR, WHO, medical textbooks)
- Implement citation formatting (Vancouver, AMA)
- Add automatic fact-checking against sources
- Generate reference lists automatically

---

**Status:** Ready to implement  
**Next:** Create disease/mechanism templates
