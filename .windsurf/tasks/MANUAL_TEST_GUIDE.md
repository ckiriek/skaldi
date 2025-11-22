# 📋 MANUAL TEST GUIDE - 5 Real Clinical Projects

**Goal**: Validate Skaldi pipeline with 5 real-world clinical reference protocols

---

## 🎯 Test Projects

| # | Project | Product Type | Reference Files |
|---|---------|--------------|-----------------|
| 1 | **Femilex** | ⭐ Innovator | `protocol_femilex.md` |
| 2 | **Perindopril** | ⭐ Generic | `protocol_perindopril.md` |
| 3 | **Sitagliptin** | ⭐ Generic | `protocol_sitaglipin.md` |
| 4 | **Linex** | ⭐ Hybrid | `summary_linex.md`, `ICF_linex.md` |
| 5 | **Podhaler** | ⭐ Innovator | `summary_podhaler.md` |

---

## 📝 Step-by-Step Manual Testing

### For Each Project:

#### **Step 1: Create Project** (5 min)

1. Go to Dashboard → **New Project**
2. Fill in metadata:

**Project 1: Femilex**
```
Title: Femilex - Gynecological Treatment Study
Compound: Femilex
Product Type: ⭐ Innovator / Original Compound
Indication: Gynecological conditions
Phase: Phase 3
Sponsor: Skaldi Test Validation
```

**Project 2: Perindopril**
```
Title: Perindopril - Hypertension Bioequivalence Study
Compound: Perindopril
Generic Name: Perindopril erbumine
Product Type: ⭐ Generic Drug
RLD Brand Name: Aceon
RLD Application Number: NDA020886
Indication: Hypertension
Phase: Phase 3
Sponsor: Skaldi Test Validation
```

**Project 3: Sitagliptin**
```
Title: Sitagliptin - Type 2 Diabetes Study
Compound: Sitagliptin
Generic Name: Sitagliptin phosphate
Product Type: ⭐ Generic Drug
RLD Brand Name: Januvia
RLD Application Number: NDA021995
Indication: Type 2 Diabetes Mellitus
Phase: Phase 3
Sponsor: Skaldi Test Validation
```

**Project 4: Linex**
```
Title: Linex - Probiotic Combination Study
Compound: Linex (Probiotic combination)
Product Type: ⭐ Hybrid / Combination Product
Indication: Gastrointestinal disorders
Phase: Phase 3
Sponsor: Skaldi Test Validation
```

**Project 5: Podhaler**
```
Title: Podhaler - Cystic Fibrosis Inhalation Study
Compound: Tobramycin Podhaler
Product Type: ⭐ Innovator / Original Compound
Indication: Cystic Fibrosis
Phase: Phase 3
Sponsor: Skaldi Test Validation
```

3. Click **Create Project**
4. ✅ **Verify**: Project appears in dashboard

---

#### **Step 2: Generate Documents** (20-30 min per project)

For each project, generate all 5 documents:

1. **Investigator's Brochure (IB)**
   - Click "Generate IB"
   - Wait for completion (~3-5 min)
   - ✅ Verify: Document appears in "Documents" tab
   - ✅ Check: Content is relevant to compound

2. **Protocol**
   - Click "Generate Protocol"
   - Wait for completion (~5-7 min)
   - ✅ Verify: Objectives, endpoints, design present
   - ✅ Check: Visit schedule included

3. **Statistical Analysis Plan (SAP)**
   - Click "Generate SAP"
   - Wait for completion (~4-6 min)
   - ✅ Verify: Sample size calculation present
   - ✅ Check: Statistical tests defined

4. **Informed Consent Form (ICF)**
   - Click "Generate ICF"
   - Wait for completion (~3-5 min)
   - ✅ Verify: Patient-friendly language
   - ✅ Check: Risks and benefits listed

5. **Clinical Study Report (CSR)**
   - Click "Generate CSR"
   - Wait for completion (~5-7 min)
   - ✅ Verify: All sections present
   - ✅ Check: Consistent with Protocol

**Total per project**: ~20-30 minutes

---

#### **Step 3: Cross-Document Validation** (5 min)

1. Go to **CrossDoc** tab
2. Click **"Run Validation"**
3. Wait for results (~1-2 min)

**Expected Results**:
- ✅ Critical: 0-2
- ✅ Error: 0-5
- ⚠️ Warning: 5-15
- ℹ️ Info: 10-30

**Check Issue Categories**:
- IB ↔ Protocol alignment
- Protocol ↔ SAP consistency
- Protocol ↔ ICF patient info
- Protocol ↔ CSR endpoints

4. ✅ **Verify**: Issues are categorized correctly

---

#### **Step 4: Cross-Document Auto-Fix** (2 min)

1. In CrossDoc tab, click **"Auto-Fix"**
2. Select strategy: **"Balanced"**
3. Click **"Apply Fixes"**
4. Wait for completion (~30-60 sec)

**Expected Results**:
- ✅ Critical issues: Reduced to 0-1
- ✅ Error issues: Reduced by 50-80%
- ✅ Auto-fix count: 5-20 fixes applied

5. Click **"Re-run Validation"**
6. ✅ **Verify**: Issue count decreased

---

#### **Step 5: Study Flow Generation** (5 min)

1. Go to **Study Flow** tab
2. Click **"Generate Study Flow"**
3. Wait for completion (~1-2 min)

**Expected Results**:
- ✅ Visits: 5-15 visits generated
- ✅ Procedures: 20-50 procedures mapped
- ✅ Table of Procedures (ToP): Complete matrix
- ✅ Baseline & EOT: Auto-added

4. ✅ **Verify**: Visit schedule makes sense
5. ✅ **Check**: Primary endpoint procedures present

---

#### **Step 6: Study Flow Validation** (2 min)

1. In Study Flow tab, click **"Validate"**
2. Wait for results (~30 sec)

**Expected Results**:
- ✅ Timing issues: 0-3
- ✅ Missing procedures: 0-2
- ✅ Alignment errors: 0-1
- ✅ Cycle inconsistencies: 0

3. ✅ **Verify**: Issues are actionable

---

#### **Step 7: Study Flow Auto-Fix** (2 min)

1. Click **"Auto-Fix Study Flow"**
2. Select strategy: **"Balanced"**
3. Click **"Apply Fixes"**
4. Wait for completion (~30 sec)

**Expected Results**:
- ✅ Fixed: 2-5 issues
- ✅ Remaining: 0-1 issues

5. Click **"Re-validate"**
6. ✅ **Verify**: Study flow is valid

---

#### **Step 8: Statistics Validation** (3 min)

1. Go to **Statistics** tab (if available)
2. Check:
   - ✅ Sample size calculation present
   - ✅ Statistical test selection correct
   - ✅ Power analysis included
   - ✅ Consistent with SAP

3. For **Generic projects** (Perindopril, Sitagliptin):
   - ✅ Bioequivalence test selected
   - ✅ 90% CI for AUC/Cmax
   - ✅ 80-125% acceptance range

4. For **Innovator projects** (Femilex, Podhaler):
   - ✅ Superiority or non-inferiority test
   - ✅ Appropriate alpha level
   - ✅ Sample size justified

---

#### **Step 9: Export Documents** (5 min)

1. Go to each document
2. Click **"Export"** → **DOCX**
3. Download all 5 documents

**Files to export**:
- `IB_<project>.docx`
- `Protocol_<project>.docx`
- `SAP_<project>.docx`
- `ICF_<project>.docx`
- `CSR_<project>.docx`

4. ✅ **Verify**: Files open correctly in Word
5. ✅ **Check**: Formatting is professional

---

#### **Step 10: Compare with Reference** (10 min)

1. Open reference file from `clinical_reference/`
2. Compare with generated Protocol

**Comparison Checklist**:
- ✅ **Objectives**: Similar intent?
- ✅ **Endpoints**: Primary endpoint matches?
- ✅ **Visit Schedule**: Similar structure?
- ✅ **Procedures**: Key assessments present?
- ✅ **Populations**: ITT, PP, Safety defined?
- ✅ **Dosing**: Regimen makes sense?
- ✅ **Safety**: Monitoring plan adequate?
- ✅ **Statistics**: Methods appropriate?

**Similarity Score**:
- 90-100%: Excellent ✅
- 70-89%: Good ⚠️
- <70%: Needs improvement ❌

3. Document findings in notes

---

## 📊 Per-Project Completion Checklist

For each project, mark completed:

### Project 1: Femilex
- [ ] Project created
- [ ] 5 documents generated
- [ ] CrossDoc validation run
- [ ] CrossDoc auto-fix applied
- [ ] Study flow generated
- [ ] Study flow validated
- [ ] Study flow auto-fixed
- [ ] Statistics validated
- [ ] Documents exported
- [ ] Compared with reference

### Project 2: Perindopril
- [ ] Project created
- [ ] 5 documents generated
- [ ] CrossDoc validation run
- [ ] CrossDoc auto-fix applied
- [ ] Study flow generated
- [ ] Study flow validated
- [ ] Study flow auto-fixed
- [ ] Statistics validated
- [ ] Documents exported
- [ ] Compared with reference

### Project 3: Sitagliptin
- [ ] Project created
- [ ] 5 documents generated
- [ ] CrossDoc validation run
- [ ] CrossDoc auto-fix applied
- [ ] Study flow generated
- [ ] Study flow validated
- [ ] Study flow auto-fixed
- [ ] Statistics validated
- [ ] Documents exported
- [ ] Compared with reference

### Project 4: Linex
- [ ] Project created
- [ ] 5 documents generated
- [ ] CrossDoc validation run
- [ ] CrossDoc auto-fix applied
- [ ] Study flow generated
- [ ] Study flow validated
- [ ] Study flow auto-fixed
- [ ] Statistics validated
- [ ] Documents exported
- [ ] Compared with reference

### Project 5: Podhaler
- [ ] Project created
- [ ] 5 documents generated
- [ ] CrossDoc validation run
- [ ] CrossDoc auto-fix applied
- [ ] Study flow generated
- [ ] Study flow validated
- [ ] Study flow auto-fixed
- [ ] Statistics validated
- [ ] Documents exported
- [ ] Compared with reference

---

## 🎯 Success Criteria

### Per Project:
- ✅ All 5 documents generated successfully
- ✅ CrossDoc Critical issues ≤ 1 after auto-fix
- ✅ CrossDoc Error issues ≤ 2 after auto-fix
- ✅ Study flow valid (0 critical issues)
- ✅ Statistics engine produces valid results
- ✅ Similarity to reference ≥ 70%

### Overall:
- ✅ 5/5 projects completed
- ✅ Average similarity ≥ 75%
- ✅ No blocking issues
- ✅ All exports work correctly

---

## 📝 Notes Template

Use this template to document findings for each project:

```markdown
## Project: [Name]

**Date**: [Date]
**Tester**: [Your name]

### Generation Results:
- IB: ✅/❌ (Notes: ...)
- Protocol: ✅/❌ (Notes: ...)
- SAP: ✅/❌ (Notes: ...)
- ICF: ✅/❌ (Notes: ...)
- CSR: ✅/❌ (Notes: ...)

### CrossDoc Validation:
- Before auto-fix: C:__ E:__ W:__ I:__
- After auto-fix: C:__ E:__ W:__ I:__
- Fixed count: __

### Study Flow:
- Visits generated: __
- Procedures: __
- Issues: __
- After auto-fix: __

### Statistics:
- Sample size: __
- Test selection: ✅/❌
- Notes: ...

### Reference Comparison:
- Similarity: __%
- Key differences:
  1. ...
  2. ...

### Overall: ✅/❌
```

---

## ⏱️ Time Estimate

**Per Project**: ~60-90 minutes
**Total for 5 Projects**: ~5-7.5 hours

**Recommended Schedule**:
- Day 1: Projects 1-2 (3-4 hours)
- Day 2: Projects 3-4 (3-4 hours)
- Day 3: Project 5 + Final report (2-3 hours)

---

## 🚀 Final Deliverable

After completing all 5 projects, create:

**FULL_SKALDI_SYSTEM_VALIDATION_REPORT.md**

Include:
1. Summary table (all 5 projects)
2. Quality scores per module
3. CrossDoc performance analysis
4. Study Flow performance analysis
5. Statistics engine accuracy
6. Reference comparison results
7. Final readiness score
8. Recommendations for improvements

---

**Good luck! 🎉**
