# Skaldi Writer: Technical Specification & User Flow

**Date:** 2025-11-17  
**Version:** 1.0  
**Status:** For Technical Team

---

## Current Problems

**What's broken:**
- ❌ Generated documents contain placeholders: "[Insert Sponsor Name]", "Investigational Compound"
- ❌ No real use of PubMed, ClinicalTrials.gov, openFDA data
- ❌ Missing data enrichment pipeline
- ❌ No ICH/GCP/FDA validation
- ❌ Only IB and Synopsis generated, missing Protocol, ICF, SAP, CSR, CRF
- ❌ No role-based workflow (Draft → Review → Approved)

**What we need to build:**
Full automated pipeline from project creation to complete regulatory document package.

---

## Complete User Flow

### 0. Registration / Login
- User registers → selects role (Medical Writer / Sponsor / CRA / Reviewer)
- Supabase Auth creates user with role
- RLS policies ensure users see only their projects

### 1. Dashboard
- Table of all projects
- "New Project" button
- Document statuses
- Recent actions

### 2. Project Creation (Critical Step)

**3-step wizard:**

**Step 1: Basic Info**
- title, product_type, compound_name, indication, phase, sponsor, countries

**Step 2: Study Design**
- randomized, blinded, arms, duration, primary_endpoint, sample_size

**Step 3: Additional Data**
- rld_name (for Generic), pi_name, cro_name, file uploads

**On save:**
1. Create project with status "enriching"
2. Trigger background enrichment job
3. Upload and parse files

### 3. Automatic Project Enrichment (Background Pipeline)

**This is THE key step!**

**3.1. Extractor Agent** (if files uploaded)
- Parse PDF/DOCX text
- Extract: pharmacology, PK/PD, safety, efficacy data
- Save to `entities_corpus` table

**3.2. RegData Agent** (external sources)
```
ClinicalTrials.gov → similar trials, designs, endpoints
PubMed → 30 relevant articles
openFDA → adverse events data
FDA Orange Book → RLD data (for Generic)
EMA EPAR → efficacy summaries (if available)
```

**3.3. Harmonizer**
- Combine all data into single ProjectContext JSON
- Save to `project_metadata` table

**3.4. Validator**
- Check all required fields present
- No conflicting data
- No empty sections

**Result:**
- Project status → "ready"
- UI shows: "Ready to generate documents"

### 4. Project Detail Page

**Tabs:**
- **Overview:** metadata, enrichment status, quick actions
- **Documents:** list of generated docs, versions, statuses
- **Data Sources:** table of ClinicalTrials.gov, PubMed, openFDA sources
- **Files:** uploaded files, extracted entities
- **Validation:** ICH/GCP/FDA compliance checklist

### 5. Document Generation (AI Pipeline)

**Documents to generate:**
1. Investigator's Brochure (IB) — ICH E6
2. Clinical Study Protocol (CSP) — ICH E6/E3
3. Informed Consent Form (ICF) — FDA 21 CFR Part 50
4. Synopsis
5. Statistical Analysis Plan (SAP) — ICH E9
6. Clinical Study Report (CSR) — ICH E3
7. Case Report Form (CRF) — draft template
8. Monitoring Plan
9. Risk Management Plan

**Generation Pipeline:**

```typescript
// For each document:
1. Load ProjectContext (all enriched data)
2. Select regulatory template (ICH E6, etc.)
3. Generate section-by-section with OpenAI
4. Validate against requirements
5. Assemble Markdown
6. Save to database
7. Generate PDF/DOCX exports
```

**Critical: Prompts MUST use real data!**

**Bad prompt (current):**
```
Generate an Investigator's Brochure for a clinical trial.
```

**Good prompt:**
```
You are generating Section 5 (Pharmacology) of an Investigator's Brochure.

PROJECT DATA:
- Compound: Natalizumab
- Indication: Relapsing Remitting Multiple Sclerosis
- Phase: Phase 4
- Sponsor: Biogen Inc.

EXTRACTED DATA:
[actual pharmacology text from uploaded files]

LITERATURE:
- Study 1: [title, abstract, findings]
- Study 2: [title, abstract, findings]

SIMILAR TRIALS:
- NCT12345: [design, outcomes]

REQUIREMENTS (ICH E6):
- Must describe mechanism of action
- Must include PK/PD data
- Must reference published studies

Generate Section 5 following ICH E6 guidelines.
Use ONLY provided data. NO placeholders like "[Insert]".
Include proper citations.
```

**Validator checks:**
- All required sections present
- No placeholder text
- Project-specific data used
- Sufficient literature citations (min 5)

**Result:**
- Document created with all sections
- Uses real project data
- No placeholders
- Has literature citations
- Status: Draft or Needs Revision

### 6. Document Editing
- Markdown editor with preview
- TOC navigation
- Comments for review
- Version history with diff

### 7. Final Package Export
- Generate ZIP with all documents
- Include: MD, PDF, DOCX formats
- Add: README, SOURCES.csv, VALIDATION_REPORT.pdf

---

## Technical Stack

### Frontend (Next.js 14)
```
/app/dashboard/page.tsx
/app/dashboard/projects/new/page.tsx       (3-step wizard)
/app/dashboard/projects/[id]/page.tsx      (tabs)
/app/dashboard/documents/[id]/page.tsx     (editor)
```

### Backend (Supabase Edge Functions)
```
/functions/enrich-project
/functions/extract-entities
/functions/generate-document
/functions/validate-document
/functions/export-document
/functions/generate-package
```

### Database (add to existing schema)
```sql
CREATE TABLE project_enrichment (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  source_type TEXT,
  source_id TEXT,
  data JSONB,
  created_at TIMESTAMPTZ
);

CREATE TABLE validation_results (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  passed BOOLEAN,
  issues JSONB,
  validated_at TIMESTAMPTZ
);
```

### AI Prompts
```
/lib/prompts/extractor.ts
/lib/prompts/generator-ib.ts
/lib/prompts/generator-protocol.ts
/lib/prompts/generator-icf.ts
/lib/prompts/validator.ts
```

---

## Implementation Priorities

### Phase 1: Fix Generation (2 weeks)
1. Implement full `buildProjectContext()`
2. Rewrite prompts with real data
3. Remove all placeholders
4. Add document validation
5. Test on real projects

### Phase 2: Data Enrichment (2 weeks)
1. ClinicalTrials.gov API integration
2. PubMed API integration
3. openFDA API integration
4. FDA Orange Book integration
5. Background jobs for enrichment

### Phase 3: Additional Documents (2 weeks)
1. Protocol generator
2. ICF generator
3. SAP generator
4. CSR generator
5. CRF template generator

### Phase 4: UX & Workflow (1 week)
1. 3-step project wizard
2. Project page tabs
3. Document editor with versions
4. Validation panel
5. ZIP export

---

## Success Metrics

**Generation Quality:**
- 0% placeholders in documents
- 100% use of project data
- Min 10 literature citations per document
- Pass ICH/GCP/FDA validation

**Performance:**
- Project enrichment: < 2 minutes
- Document generation: < 30 seconds
- PDF/DOCX export: < 10 seconds

**UX:**
- Project creation: < 5 minutes
- Time to ready IB: < 10 minutes total
