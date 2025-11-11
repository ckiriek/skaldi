# Asetria Writer - Implementation Plan

**Last Updated:** 2025-11-11 20:10 UTC  
**Current Phase:** Week 1 - Foundation & Architecture Setup  
**Status:** ✅ Day 1 COMPLETE (100% + bonus) — AHEAD OF SCHEDULE

---

## Current Goal

✅ Week 1 Day 1 COMPLETE! All tasks achieved + bonus:
1. ✅ Add Product Type Selection to UI
2. ✅ Create database migrations for Regulatory Data Layer
3. ✅ Create TypeScript types
4. ✅ Build Intake Agent
5. ✅ Build Enrichment Pipeline
6. ✅ Create Template Engine
7. ✅ Implement 3 Source Adapters (PubChem, openFDA, Orange Book)

**Next:** Day 2 — Testing + More adapters + Integration

---

## Week 1 Progress (Nov 11-17, 2025)

### ✅ Completed

#### Day 1 (Nov 11) - UI + Database + Types
- [x] Created RadioGroup and Label UI components
- [x] Added Product Type Selection to project creation form
  - Innovator / Generic / Hybrid options
  - Conditional RLD fields for Generic products
  - Auto-enrichment notice
- [x] Created migration: `20251111_add_product_type_to_projects.sql`
  - Added product_type, compound_name, RLD fields
  - Added enrichment_status tracking
  - Added inchikey for canonical identification
- [x] Created migration: `20251111_create_regulatory_data_layer.sql`
  - 9 tables: compounds, products, labels, nonclinical_summaries, clinical_summaries, trials, adverse_events, literature, ingestion_logs
  - 25+ indexes for performance
  - 8 triggers for updated_at
- [x] Created TypeScript types:
  - `/lib/types/project.ts` - Project, EnrichmentMetadata, helper functions
  - `/lib/types/regulatory-data.ts` - 20+ interfaces for regulatory data

### ✅ Completed (continued)

#### Day 1 (Nov 11) - Intake Agent
- [x] Create API Route: `/api/v1/intake`
- [x] Implement form validation
- [x] Determine enabled agents based on product_type
- [x] Create project record in database
- [x] Trigger Regulatory Data Agent (if needed)
- [x] Update project creation form to use Intake API

### ✅ Completed (continued)

#### Day 1 (Nov 11 Afternoon) - PubChem Adapter & Enrichment Pipeline
- [x] Create PubChem adapter with rate limiting
- [x] Implement compound name → InChIKey resolution
- [x] Implement full compound data fetching
- [x] Create Enrichment API Route (`/api/v1/enrich`)
- [x] Create Edge Function (`enrich-data`)
- [x] Store in compounds table (upsert)
- [x] Update project with inchikey and enrichment_status
- [x] Log to ingestion_logs
- [x] Create test script for PubChem adapter

### ✅ Completed (continued)

#### Day 1 (Nov 11 Evening) - Template Engine Architecture
- [x] Create Handlebars template engine wrapper
- [x] Register 20+ custom helpers (gte, decimal, percent, date, etc.)
- [x] Create IB Generic Section 6 template (Safety and Tolerability)
- [x] Create mock test script (demonstrates rendering without dependencies)
- [x] Document template engine setup and usage

### ✅ Completed (continued)

#### Day 1 (Nov 11 Late Evening) - openFDA Adapter
- [x] Create openFDA adapter
- [x] Implement fetchLabelByApplicationNumber
- [x] Implement fetchLabelByBrandName
- [x] Implement searchAdverseEvents (FAERS)
- [x] Implement getApplicationNumbers
- [x] Create test script for openFDA

### ✅ Completed (continued)

#### Day 1 (Nov 11 Night) - Orange Book Adapter
- [x] Create Orange Book adapter
- [x] Implement getRLDByApplicationNumber
- [x] Implement searchRLDByBrandName
- [x] Implement getProductsByApplicationNumber
- [x] Implement TE code validation and descriptions
- [x] Create test script for Orange Book

### ⏳ In Progress

#### Day 1-2 (Nov 11-12) - Testing & Next Adapters
- [ ] Install Handlebars (npm install handlebars @types/handlebars)
- [ ] Test adapters with real data (PubChem, openFDA, Orange Book)
- [ ] Test end-to-end enrichment flow
- [ ] Add DailyMed adapter (current labels)
- [ ] Integrate adapters into Edge Function

### 📋 Pending

#### Day 2-3 (Nov 12-13) - More Source Adapters
- [ ] DailyMed adapter (current labels)
- [ ] EMA EPAR adapter
- [ ] ClinicalTrials.gov adapter

#### Day 4-5 (Nov 14-15) - More Adapters & Templates
- [ ] PubMed adapter
- [ ] ClinicalTrials.gov adapter
- [ ] Create more IB templates (Section 5, Section 7)
- [ ] Integrate templates with Composer Agent

---

## Phase Roadmap (20 Weeks)

### Phase 0: Foundation & Architecture ✅ (Week 1-2)
- Week 1: UI, Database, Types, Intake Agent ⏳
- Week 2: Template engine, first adapters

### Phase 1: Data Layer & Schema (Week 2-4)
- Regulatory Data Layer implementation
- Source adapters (9 adapters)
- Normalization pipeline

### Phase 2: External API Integration (Week 4-6)
- Regulatory Data Agent full implementation
- All 9 source adapters operational
- Caching layer (Redis)
- Error handling & retries

### Phase 3: Multi-Agent System Core (Week 6-10)
- Composer Agent
- Writer Agent
- Validator Agent
- Assembler Agent

### Phase 4: Document Templates (Week 10-14)
- IB templates (Innovator, Generic)
- Protocol template
- ICF template
- Synopsis template

### Phase 5: Validation & QC (Week 14-16)
- 100+ validation rules
- Coverage scoring
- Quality metrics

### Phase 6: Export Pipeline (Week 16-18)
- DOCX generation
- PDF export
- Bundle assembly

### Phase 7: MVP Testing (Week 18-20)
- End-to-end testing
- User acceptance testing
- Bug fixes & refinement

---

## Key Decisions Made

### Architecture
- ✅ Hybrid approach: API Routes (orchestration) + Edge Functions (heavy processing)
- ✅ Handlebars for template engine
- ✅ Postgres + Redis for storage
- ✅ InChIKey as canonical compound identifier
- ✅ MedDRA for adverse event coding

### Product Types
- ✅ Innovator: Full data from sponsor, enrichment optional
- ✅ Generic: RLD-based, enrichment mandatory
- ✅ Hybrid: Partial enrichment, combination products

### Data Flow
- ✅ Regulatory Data Agent as standalone microservice
- ✅ Provenance tracking for all data
- ✅ Confidence levels (high/medium/low)
- ✅ JSONB for flexible structured data

---

## Unclear / Blockers

None currently. Clear path forward.

---

## Next Actions (Priority Order)

1. **Intake Agent** - Validate form, create project, trigger enrichment
2. **PubChem Resolver** - First source adapter, InChIKey resolution
3. **Template Engine Test** - Verify Handlebars works with our data
4. **Regulatory Data Agent Skeleton** - API + Edge Function structure

---

## Success Criteria (Week 1)

- [x] Product Type Selection working in UI
- [x] Database schema for Regulatory Data Layer created
- [x] TypeScript types defined
- [ ] Intake Agent can create projects with product_type
- [ ] PubChem can resolve compound name to InChIKey
- [ ] Template engine can render basic IB section

**Target:** 4/6 criteria met by end of Week 1

---

## Resources

- **Main Plan:** ASETRIA_WRITER_IMPLEMENTATION_PLAN.md
- **Week 1 Details:** WEEK_1_ACTION_PLAN.md
- **Architecture:** ARCHITECTURE_SUMMARY.md
- **Regulatory Data Agent:** REGULATORY_DATA_AGENT_SPEC.md
- **Data Contracts:** DATA_CONTRACTS_REGULATORY.md
- **Templates:** IB_SECTION_TEMPLATES_EXAMPLES.md
- **DevLog:** devlog/2025-11-11.md
