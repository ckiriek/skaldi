# 🏛️ Asetria Writer - Architecture Summary

**Last Updated:** 2025-11-10 22:50 UTC  
**Version:** 2.0 (with Regulatory Data Agent)  
**Status:** Architecture Finalized

---

## 🎯 Executive Summary

Asetria Writer — это **production-grade система генерации регуляторных документов** (IB, Protocol, ICF, CSR) на основе multi-agent архитектуры с автоматическим обогащением данных из публичных регуляторных источников.

**Ключевые особенности:**
- 7 специализированных агентов
- Dual-mode operation (Innovator/Generic/Hybrid)
- Автоматическое обогащение данных из FDA, EMA, PubMed, ClinicalTrials.gov
- Template-driven generation (ICH/FDA compliant)
- Automated quality validation
- Professional export (DOCX/PDF)
- Full audit trail & provenance tracking

---

## 🧩 Multi-Agent Architecture (7 Agents)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                              │
│  Product Type: [Innovator] [Generic] [Hybrid]                  │
│  Compound: Metformin HCl                                        │
│  RLD: GLUCOPHAGE (NDA020357)                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   1. INTAKE AGENT                               │
│  • Validate input                                               │
│  • Determine mode (Innovator/Generic/Hybrid)                    │
│  • Activate agent pipeline                                      │
│  • Create project record                                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│            2. REGULATORY DATA AGENT ⭐ NEW                      │
│  • Search external sources (FDA, EMA, PubMed, ClinicalTrials)  │
│  • Extract & normalize data                                     │
│  • Resolve conflicts & deduplicate                              │
│  • Validate quality & calculate coverage                        │
│  • Store in Regulatory Data Layer                               │
│  • Return compound_data.json snapshot                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   3. COMPOSER AGENT                             │
│  • Select template (IB_Generic vs IB_Innovator)                 │
│  • Build document structure                                     │
│  • Determine data needs                                         │
│  • Create placeholders                                          │
│  • Generate document outline                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. WRITER AGENT                              │
│  • Generate narrative per section                               │
│  • Insert data from normalized layer                            │
│  • Add cross-references                                         │
│  • Format tables & figures                                      │
│  • Apply writing style (formal/patient-friendly)                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  5. VALIDATOR AGENT                             │
│  • Check ICH/FDA compliance                                     │
│  • Verify data consistency                                      │
│  • Validate references                                          │
│  • Check RLD/TE-code (for Generic)                              │
│  • Calculate quality score                                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  6. ASSEMBLER AGENT                             │
│  • Merge sections                                               │
│  • Generate Table of Contents                                   │
│  • Auto-number tables/figures                                   │
│  • Resolve cross-references                                     │
│  • Generate abbreviations list                                  │
│  • Format references                                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  7. REVIEWER AGENT                              │
│  • Log human feedback                                           │
│  • Track review comments                                        │
│  • Trigger regeneration                                         │
│  • Manage document versions                                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXPORT                                     │
│  • DOCX (house style)                                           │
│  • PDF (from DOCX)                                              │
│  • Bundle (sources.json + manifest.yaml)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⭐ Regulatory Data Agent (Ключевой компонент)

### Роль
**"Глаза и руки системы"** — единственный агент, который ходит наружу за данными.

### Зона ответственности
- Поиск данных в публичных регуляторных источниках
- Извлечение и нормализация данных
- Разрешение конфликтов между источниками
- Валидация качества данных
- Кэширование и версионирование
- Провенанс-трекинг (audit trail)

### Когда активируется

| Product Type | Required? | Why |
|--------------|-----------|-----|
| **Innovator** | ❌ Optional | Sponsor provides all data |
| **Generic** | ✅ **Mandatory** | Main source = public registries |
| **Hybrid** | ✅ Partial | Nonclinical from registries, clinical from sponsor |
| **Post-marketing** | ✅ Optional | Real-world data (FAERS, EudraVigilance) |

### Source Adapters (9 адаптеров)

1. **OpenFDA** → Labels, adverse events
2. **Drugs@FDA** → Approval documents, clinical/nonclinical summaries
3. **DailyMed** → Current labels (conflict resolution: newer wins)
4. **EMA EPAR** → European regulatory assessments
5. **ClinicalTrials.gov** → Study designs, results
6. **PubChem** → Chemical identifiers (inchikey), properties
7. **PubMed** → Literature references
8. **FDA Orange Book** → RLD, TE-codes (for generics)
9. **MHRA PAR** → UK/EU regulatory data

### Data Flow

```
External Sources (FDA/EMA/PubMed/ClinicalTrials)
    ↓
[Source Adapters] — fetch raw data
    ↓
[Normalizer] — convert to standard schema
    ↓
[Deduper & Resolver] — remove conflicts, prioritize by source
    ↓
[Data Validator] — check quality, calculate coverage score
    ↓
[Regulatory Data Layer] — store in Postgres + Redis cache
    ↓
[Snapshot API] — serve compound_data.json to other agents
```

### API Endpoints

```
POST   /regdata/enrich              # Start data collection
GET    /regdata/snapshot/{inchikey} # Get normalized compound data
POST   /regdata/update/{source}     # Force update specific source
GET    /regdata/validate/{project}  # Get coverage & issues
GET    /regdata/resolve             # Resolve identifiers to inchikey
```

---

## 🗄️ Regulatory Data Layer

### Core Tables

```sql
-- Canonical compound identification
compounds (inchikey PK, name, mechanism, molecular_data, provenance)

-- Products (brands, generics)
products (id PK, inchikey FK, brand_name, application_number, rld, te_code)

-- Regulatory labels
labels (id PK, product_id FK, sections JSONB, effective_date, provenance)

-- Nonclinical data
nonclinical_summaries (id PK, inchikey FK, pk/tox/genotox JSONB, provenance)

-- Clinical data
clinical_summaries (id PK, inchikey FK, efficacy/safety JSONB, provenance)

-- Clinical trials
trials (nct_id PK, inchikey FK, design/outcomes JSONB, provenance)

-- Literature
literature (pmid PK, title, abstract, journal, provenance)

-- Adverse events (MedDRA normalized)
adverse_events (id PK, inchikey FK, soc, pt, incidence, provenance)

-- Audit trail
ingestion_logs, audit_changes
```

### Normalization Keys

- **Primary key:** `inchikey` (canonical compound identifier from PubChem)
- **Product key:** `application_number` + `region`
- **Provenance:** Every field tracks `source`, `url`, `retrieved_at`, `confidence`
- **Conflict resolution:** Priority by source type (label > EPAR > literature) + freshness

---

## 📋 Data Contracts

### 1. labels.sections (FDA/EMA normalized)
```typescript
{
  label_meta: {source, application_number, effective_date, region},
  sections: {
    indications_and_usage,
    dosage_and_administration,
    contraindications,
    warnings_and_precautions,
    adverse_reactions_label,
    clinical_pharmacology: {mechanism, pharmacokinetics, pharmacodynamics}
  }
}
```

### 2. adverse_events (MedDRA normalized)
```typescript
{
  population: {study_id, arm, n, control_arm, n_control},
  events: [{soc, pt, incidence_pct, rr, ci95, serious, related, source}],
  summary: {any_teae_pct, treatment_related_pct, any_sae_pct}
}
```

### 3. clinical_pharmacology (PK/PD)
```typescript
{
  mechanism_of_action,
  pharmacokinetics: {bioavailability, tmax, t12, vss, clearance},
  pk_profiles: {study_id, arms: [{dose, cmax, auc, tmax}]},
  dose_response: {endpoint, model, parameters, data_points}
}
```

### 4. efficacy_data (Clinical outcomes)
```typescript
{
  clinical_summary: {efficacy: [{endpoint, delta, ci, p_value}]},
  trials: [{nct_id, phase, design, outcomes_primary, outcomes_secondary}]
}
```

---

## 🎨 Template System

### Template Engine: Handlebars

### Templates per Document Type

**IB (Investigator's Brochure):**
- `IB_Innovator_Template.hbs` (12 sections, full data)
- `IB_Generic_Template.hbs` (8 sections, bridge mode)

**Protocol:**
- `Protocol_Template.hbs` (16 sections)

**ICF (Informed Consent Form):**
- `ICF_Template.hbs` (12 sections, patient-friendly language)

**Synopsis:**
- `Synopsis_Template.hbs` (10 sections, tabular format)

### Template Features
- Conditional logic: `{{#if generic_mode}}`
- Data placeholders: `{{compound.name}}`
- Loops: `{{#each nonclinical.studies}}`
- Table specifications
- Reference markers

---

## ✅ Validation & Quality Control

### Validation Rules (100+ rules)

**IB Innovator Checklist:**
- All 9 main sections present
- Nonclinical: PK, PD, Tox, Genotox, Carc, Repro
- Clinical: PK, PD, Efficacy, Safety
- At least 1 table per major section
- References ≥ 15 entries
- Cross-references valid

**IB Generic Checklist:**
- RLD identified and referenced
- TE-code present (if FDA)
- Literature references ≥ 10
- Bioequivalence section present
- No claim of original efficacy data
- Proper attribution to RLD

### Validation Output
```json
{
  "coverage": {"nonclinical": 0.82, "clinical": 0.91, "label": 1.0},
  "issues": [{"severity": "warn", "code": "MISSING_BE_REF"}],
  "score": 90
}
```

---

## 📦 Export & Assembly

### Export Formats

**DOCX:**
- House style template (Asetria brand)
- Styles: Heading 1-4, Body, Table, Caption
- Auto-numbering for sections/tables/figures
- Header/footer with version info

**PDF:**
- From DOCX via LibreOffice headless
- Bookmarks for navigation
- Hyperlinked TOC and cross-references

### Bundle Structure
```
AST-256_IB_v1.0/
├── AST-256_IB_v1.0.docx
├── AST-256_IB_v1.0.pdf
├── sources.json          # All data sources used
├── manifest.yaml         # Metadata, versions, checksums
├── tables/
│   ├── table_5.2-1.csv
│   └── table_6.1-1.csv
├── figures/
│   └── figure_7.1-1.png
└── references.bib        # Bibliography
```

### Manifest Format
```yaml
document:
  type: IB
  version: v1.0
  product_type: generic
  generated_at: 2025-11-10T22:00:00Z

agents:
  - Regulatory_Data_Agent v1.0.0
  - Composer_Generic v1.2.0
  - Writer_Generic v1.1.0

data_sources:
  - openFDA: NDA020357
  - EMA_EPAR: EU/1/00/000
  - PubMed: 15 articles

checksums:
  docx: sha256:abc123...
  pdf: sha256:def456...
```

---

## 🔐 Security & Compliance

### Data Access
- Egress allowlist для внешних API
- Логи без PHI/PII
- MedDRA по лицензии
- Только public domain данные

### Audit Trail
- Provenance tracking для каждого поля
- Версионирование документов
- Change log для всех правок
- Manifest с источниками и версиями

### RLS (Row Level Security)
- Все таблицы Supabase с RLS
- Service role только на backend
- User-level access control

---

## 📊 Success Criteria (MVP)

### Technical
- ✅ All 7 agents operational
- ✅ Dual-mode (Innovator/Generic) working
- ✅ External API enrichment functional
- ✅ Template system with 15+ templates
- ✅ DOCX/PDF export working
- ✅ Validation score ≥ 90 on test cases

### Business
- ✅ Generate IB in < 30 minutes
- ✅ 60-90 pages for IB (proper length)
- ✅ ICH/FDA compliant structure
- ✅ References auto-generated
- ✅ First-pass acceptance ≥ 80%

### User Experience
- ✅ Simple project creation (5 fields)
- ✅ Auto-enrichment (no manual data entry for generics)
- ✅ Progress tracking (agent status)
- ✅ Review interface (comments, edits)
- ✅ One-click export (DOCX + PDF)

---

## 🚀 Implementation Timeline

**Phase 0:** Foundation & Architecture (Week 1-2)  
**Phase 1:** Data Layer & Schema (Week 2-4)  
**Phase 2:** External API Integration (Week 4-6) ← **Regulatory Data Agent**  
**Phase 3:** Multi-Agent System Core (Week 6-10)  
**Phase 4:** Document Templates (Week 10-14)  
**Phase 5:** Validation & QC (Week 14-16)  
**Phase 6:** Export Pipeline (Week 16-18)  
**Phase 7:** MVP Testing (Week 18-20)

**Total:** 20 weeks to MVP

---

## 📚 Key Documents

1. **ASETRIA_WRITER_IMPLEMENTATION_PLAN.md** — Master plan (20 weeks)
2. **REGULATORY_DATA_AGENT_SPEC.md** — Technical spec for Regulatory Data Agent
3. **DATA_CONTRACTS_REGULATORY.md** — Data contracts between agents
4. **IB_SECTION_TEMPLATES_EXAMPLES.md** — Reference examples (submission-ready)
5. **WEEK_1_ACTION_PLAN.md** — Detailed week 1 breakdown
6. **DOCUMENT_NUMBERING_GUIDE.md** — ICH/FDA numbering standards

---

## 💡 Key Insights

### 1. Data First, AI Second
- Normalized data layer = foundation
- LLM writes narrative around facts
- No hallucinations if data is structured

### 2. Regulatory Data Agent = Competitive Advantage
- Generic mode = 80% less data input
- External enrichment = automation
- Same pipeline, different templates

### 3. Provenance = Compliance
- Every field tracks source
- Audit trail for regulators
- Versioning for reproducibility

### 4. Quality by Validation
- Automated compliance checks
- Human review for final 10%
- Continuous improvement via feedback

---

**Status:** ✅ Architecture Finalized

**Next:** Phase 0 Implementation (Week 1)

**Confidence:** High — clear separation of concerns, well-defined contracts, proven approach
