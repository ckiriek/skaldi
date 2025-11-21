# B1: Expand Orchestrator to All Document Types

**Date:** 2025-11-20  
**Status:** ✅ COMPLETED  
**Phase:** B - Clinical Engine Expansion

---

## Objective

Expand the DocumentOrchestrator pipeline to support all clinical document types beyond Protocol:
- **IB** (Investigator's Brochure)
- **ICF** (Informed Consent Form)
- **Synopsis**
- **CSR** (Clinical Study Report)
- **SPC** (Summary of Product Characteristics)

---

## Implementation

### 1. Database: Document Structures Added

**Migration:** `20251120_seed_all_document_structures.sql`

#### IB (Investigator's Brochure) - 11 sections
Based on ICH E6 Section 7:
1. Title Page
2. Table of Contents
3. Summary
4. Introduction
5. Physical, Chemical, and Pharmaceutical Properties
6. Nonclinical Studies
7. Pharmacokinetics and Product Metabolism
8. Pharmacodynamics and Mechanism of Action
9. Toxicology
10. Effects in Humans
11. Summary of Data and Guidance for Investigator

#### ICF (Informed Consent Form) - 12 sections
1. Title and Introduction
2. Purpose of the Study
3. Study Procedures
4. Duration of Participation
5. Risks and Discomforts
6. Potential Benefits
7. Alternative Treatments
8. Confidentiality
9. Compensation and Costs
10. Voluntary Participation
11. Contact Information
12. Signature Page

#### Synopsis - 8 sections
1. Title
2. Rationale
3. Objectives
4. Study Design
5. Study Population
6. Study Treatments
7. Endpoints
8. Statistical Methods

#### CSR (Clinical Study Report) - 14 sections
Based on ICH E3:
1. Title Page
2. Synopsis
3. Table of Contents
4. List of Abbreviations
5. Ethics
6. Investigators and Study Centers
7. Introduction
8. Study Objectives
9. Plan and Conduct of Study
10. Patients
11. Efficacy Evaluation
12. Safety Evaluation
13. Discussion and Conclusions
14. References

#### SPC (Summary of Product Characteristics) - 16 sections
1. Name of the Medicinal Product
2. Qualitative and Quantitative Composition
3. Pharmaceutical Form
4. Therapeutic Indications
5. Posology and Method of Administration
6. Contraindications
7. Special Warnings and Precautions
8. Interaction with Other Medicinal Products
9. Fertility, Pregnancy and Lactation
10. Effects on Ability to Drive
11. Undesirable Effects
12. Overdose
13. Pharmacodynamic Properties
14. Pharmacokinetic Properties
15. Preclinical Safety Data
16. Pharmaceutical Particulars

---

### 2. API Route: Feature Flag System

**File:** `app/api/generate/route.ts`

**Changes:**
```typescript
// Feature flags
const USE_NEW_ORCHESTRATOR = process.env.USE_NEW_ORCHESTRATOR === 'true'
const USE_ORCHESTRATOR_FOR_ALL = process.env.USE_ORCHESTRATOR_FOR_ALL === 'true'

// Document types supported by new orchestrator
const NEW_ORCHESTRATOR_TYPES = USE_ORCHESTRATOR_FOR_ALL 
  ? ['Protocol', 'IB', 'ICF', 'Synopsis', 'CSR', 'SPC'] 
  : ['Protocol'] // Start with Protocol only if not using all
```

**Routing Logic:**
```
if (USE_NEW_ORCHESTRATOR && NEW_ORCHESTRATOR_TYPES.includes(documentType)) {
  → DocumentOrchestrator (NEW)
} else {
  → Legacy Edge Function (FALLBACK)
}
```

---

### 3. Environment Configuration

**File:** `.env.local`

```bash
# Feature Flags
USE_NEW_ORCHESTRATOR=true
USE_ORCHESTRATOR_FOR_ALL=false  # Set to true to enable for all types
```

**Rollout Strategy:**
1. **Phase 1:** `USE_ORCHESTRATOR_FOR_ALL=false` → Only Protocol
2. **Phase 2:** Test IB individually → Add to types array
3. **Phase 3:** Test Synopsis, ICF → Add to types array
4. **Phase 4:** `USE_ORCHESTRATOR_FOR_ALL=true` → All types

---

## Architecture Flow

### Before B1:
```
User → API → DocumentOrchestrator → Protocol only
                ↓
           Legacy Edge Function → IB, ICF, Synopsis, CSR, SPC
```

### After B1:
```
User → API → Feature Flag Check
                ↓
    USE_ORCHESTRATOR_FOR_ALL?
         ↓                    ↓
        YES                  NO
         ↓                    ↓
    All types          Protocol only
         ↓                    ↓
    DocumentOrchestrator → SectionGenerator → Edge Function → Azure OpenAI
```

---

## Section Count by Document Type

| Document Type | Sections | Complexity | Est. Time |
|---------------|----------|------------|-----------|
| Protocol | 11 | High | 90-130s |
| IB | 11 | Very High | 120-180s |
| ICF | 12 | Medium | 60-90s |
| Synopsis | 8 | Medium | 40-60s |
| CSR | 14 | Very High | 150-200s |
| SPC | 16 | High | 100-150s |

---

## Testing Plan

### Phase 1: Individual Testing
Test each document type separately before enabling `USE_ORCHESTRATOR_FOR_ALL`:

```bash
# 1. Test IB
USE_ORCHESTRATOR_FOR_ALL=false
NEW_ORCHESTRATOR_TYPES = ['Protocol', 'IB']
→ Generate IB
→ Verify all 11 sections
→ Check QC validation

# 2. Test Synopsis
NEW_ORCHESTRATOR_TYPES = ['Protocol', 'IB', 'Synopsis']
→ Generate Synopsis
→ Verify all 8 sections
→ Check QC validation

# 3. Test ICF
NEW_ORCHESTRATOR_TYPES = ['Protocol', 'IB', 'Synopsis', 'ICF']
→ Generate ICF
→ Verify all 12 sections
→ Check QC validation

# 4. Test SPC
NEW_ORCHESTRATOR_TYPES = ['Protocol', 'IB', 'Synopsis', 'ICF', 'SPC']
→ Generate SPC
→ Verify all 16 sections
→ Check QC validation

# 5. Test CSR
NEW_ORCHESTRATOR_TYPES = ['Protocol', 'IB', 'Synopsis', 'ICF', 'SPC', 'CSR']
→ Generate CSR
→ Verify all 14 sections
→ Check QC validation
```

### Phase 2: Full Rollout
```bash
USE_ORCHESTRATOR_FOR_ALL=true
→ Test all document types
→ Monitor performance
→ Check error rates
→ Verify QC validation
```

---

## Success Criteria

### ✅ Completed
- [x] Database structures for all 5 document types
- [x] Feature flag system implemented
- [x] API route supports all types
- [x] Backward compatibility maintained

### ⏳ Pending (Next Steps)
- [ ] Templates for IB sections (need to sync from templates_en/)
- [ ] Templates for ICF sections
- [ ] Templates for Synopsis sections
- [ ] Templates for CSR sections
- [ ] Templates for SPC sections
- [ ] QC rules for each document type
- [ ] Individual testing for each type
- [ ] Full rollout with USE_ORCHESTRATOR_FOR_ALL=true

---

## Next Steps

### Immediate (B1 Completion)
1. ✅ Verify structures in database
2. ⏳ Sync templates for all document types
3. ⏳ Add QC rules for each type
4. ⏳ Test IB generation

### Short-term (B2-B3)
1. Implement RAG layer for reference material
2. Integrate external data (FDA, PubMed, CT.gov)
3. Add disease/drug reference modules

### Medium-term (B4-B6)
1. Add disease overview & mechanism modules
2. Implement cross-section consistency validation
3. Complete rollout to all document types

---

## Files Modified

### New Files
1. `supabase/migrations/20251120_seed_all_document_structures.sql`
2. `clinical_guidelines/PhaseB/B1_orchestrator_expansion.md`

### Modified Files
1. `app/api/generate/route.ts` - Added feature flags and all document types
2. `.env.local` - Added USE_ORCHESTRATOR_FOR_ALL flag

---

## Database Stats

```sql
-- Check structures added
SELECT document_type_id, COUNT(*) as section_count
FROM document_structure
GROUP BY document_type_id
ORDER BY document_type_id;

-- Expected result:
-- protocol: 11
-- ib: 11
-- icf: 12
-- synopsis: 8
-- csr: 14
-- spc: 16
-- TOTAL: 72 sections
```

---

## Conclusion

B1 is **structurally complete**. The orchestrator can now handle all document types. Next step is to ensure templates exist for all sections (B1 continuation) before moving to B2 (RAG layer).

---

**Status:** ✅ Infrastructure Ready  
**Next:** Sync templates for IB, ICF, Synopsis, CSR, SPC  
**Phase:** B1 → B2 transition
