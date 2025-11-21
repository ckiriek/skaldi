# Phase C: Advanced Features - Implementation Plan

**Date:** 2025-11-21  
**Status:** 🚧 IN PROGRESS  
**Goal:** Add advanced features to make Skaldi production-ready

---

## 🎯 Overview

Phase C builds on Phase B's foundation to add:
1. **UI Integration** - Make backend features visible and usable
2. **Advanced Validation** - AI-powered semantic consistency checks
3. **Full Text Enrichment** - Complete content for better RAG
4. **Batch Operations** - Scale to multiple documents

---

## 📋 Task Breakdown

### C1: UI Integration (2-3 hours) 🚧 IN PROGRESS

**Goal:** Make Phase B features visible and usable in the UI

#### C1.1: Validation Results Display ✅
**What:** Show consistency validation results in document viewer

**Components to create:**
- `components/validation/validation-panel.tsx` - Main panel
- `components/validation/validation-summary.tsx` - Summary stats
- `components/validation/validation-check-item.tsx` - Individual check
- `components/validation/validation-badge.tsx` - Status badge

**Features:**
- Display total checks, passed, failed, warnings
- Show each check with severity and status
- Filter by status (all, failed, warnings, passed)
- Click to jump to relevant section
- Trigger validation button

**API Endpoint:**
```typescript
GET /api/documents/:id/validations
POST /api/documents/:id/validate
```

#### C1.2: RAG Sources Viewer
**What:** Show which references were used in generation

**Components:**
- `components/rag/rag-sources-panel.tsx` - Main panel
- `components/rag/reference-card.tsx` - Individual reference
- `components/rag/similarity-badge.tsx` - Similarity score

**Features:**
- List all references used
- Show similarity scores
- Display source (internal/external)
- Link to original source
- Highlight relevant sections

#### C1.3: External Data Dashboard
**What:** Display enriched external data

**Components:**
- `components/external-data/data-overview.tsx` - Summary
- `components/external-data/trials-list.tsx` - Clinical trials
- `components/external-data/literature-list.tsx` - Publications
- `components/external-data/adverse-events-list.tsx` - Safety data

**Features:**
- Show enrichment status
- Display fetched data
- Link to original sources
- Re-trigger enrichment button

---

### C2: Advanced Validation (2-3 hours)

**Goal:** AI-powered semantic consistency checks

#### C2.1: Semantic Consistency Checker
**What:** Use LLM to detect semantic inconsistencies

**Features:**
- Compare endpoint definitions across sections
- Check population descriptions for consistency
- Validate statistical methods match design
- Detect contradictions in text

**Implementation:**
```typescript
class SemanticValidator {
  async checkEndpointConsistency(sections: Section[]): Promise<Check[]>
  async checkPopulationConsistency(sections: Section[]): Promise<Check[]>
  async checkStatisticalConsistency(sections: Section[]): Promise<Check[]>
  async detectContradictions(sections: Section[]): Promise<Check[]>
}
```

#### C2.2: Auto-Fix Suggestions
**What:** Suggest corrections for validation failures

**Features:**
- Generate fix suggestions using LLM
- Show before/after preview
- One-click apply
- Track auto-fixes in audit log

#### C2.3: Custom Validation Rules
**What:** Allow users to define their own rules

**Features:**
- Rule builder UI
- Regex patterns
- Logic expressions
- Save/load rule sets

---

### C3: Full Text Enrichment (1-2 hours)

**Goal:** Fetch complete content for better RAG quality

#### C3.1: PubMed Full Abstracts
**What:** Fetch complete abstracts instead of just PMIDs

**Changes:**
- Update PubMed adapter to fetch abstracts
- Store in `literature.abstract` field
- Sync to RAG chunks with full text

#### C3.2: ClinicalTrials.gov Full Protocols
**What:** Fetch detailed trial information

**Changes:**
- Fetch eligibility criteria
- Get detailed outcome measures
- Store intervention descriptions
- Sync to RAG chunks

#### C3.3: Enhanced RAG Chunks
**What:** Better chunk content and metadata

**Features:**
- Longer chunks (500-1000 tokens)
- Better metadata (source, date, relevance)
- Hierarchical chunking
- Overlap between chunks

---

### C4: Batch Operations (2-3 hours)

**Goal:** Scale to multiple documents

#### C4.1: Batch Document Generation
**What:** Generate multiple documents at once

**Features:**
- Select multiple document types
- Queue-based processing
- Progress tracking
- Parallel generation

**API:**
```typescript
POST /api/documents/batch-generate
{
  project_id: "uuid",
  document_types: ["Protocol", "IB", "ICF"],
  options: { parallel: true }
}
```

#### C4.2: Bulk Validation
**What:** Validate multiple documents

**Features:**
- Select multiple documents
- Run all validation checks
- Aggregate results
- Export validation report

#### C4.3: Batch Export
**What:** Export multiple documents

**Features:**
- Select documents
- Choose format (PDF, DOCX)
- Zip archive
- Email delivery option

---

## 🗓️ Timeline

### Session 1 (Tonight, 2-3 hours):
- ✅ C1.1: Validation Results Display
- ✅ C1.2: RAG Sources Viewer
- ✅ C1.3: External Data Dashboard

### Session 2 (Next, 2-3 hours):
- C2.1: Semantic Consistency Checker
- C2.2: Auto-Fix Suggestions
- C2.3: Custom Validation Rules

### Session 3 (Later, 1-2 hours):
- C3.1: PubMed Full Abstracts
- C3.2: ClinicalTrials.gov Full Protocols
- C3.3: Enhanced RAG Chunks

### Session 4 (Later, 2-3 hours):
- C4.1: Batch Document Generation
- C4.2: Bulk Validation
- C4.3: Batch Export

---

## 📊 Success Criteria

### C1: UI Integration
- [ ] Validation results visible in UI
- [ ] RAG sources displayed
- [ ] External data dashboard working
- [ ] All components responsive
- [ ] Loading states implemented

### C2: Advanced Validation
- [ ] Semantic checks working
- [ ] Auto-fix suggestions generated
- [ ] Custom rules can be created
- [ ] LLM integration tested

### C3: Full Text Enrichment
- [ ] Abstracts fetched from PubMed
- [ ] Trial details from ClinicalTrials.gov
- [ ] RAG chunks enhanced
- [ ] Retrieval quality improved

### C4: Batch Operations
- [ ] Multiple documents generated
- [ ] Bulk validation working
- [ ] Batch export functional
- [ ] Queue system implemented

---

## 🎯 Current Focus

**NOW:** C1.1 - Validation Results Display

Creating UI components to show consistency validation results in the document viewer.

---

**Date:** 2025-11-21  
**Status:** 🚧 IN PROGRESS  
**Next:** Create validation panel components
