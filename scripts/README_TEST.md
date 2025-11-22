# 🧪 Automated Pipeline Test - README

## Overview

Automated test script for validating the complete Skaldi pipeline with 5 real clinical projects.

---

## 📋 Prerequisites

1. **Skaldi running locally**:
   ```bash
   npm run dev
   # Server should be running on http://localhost:3000
   ```

2. **Supabase connected**:
   - Database migrations applied
   - Authentication working
   - RLS policies active

3. **Reference files present**:
   - `/clinical_reference/protocol_femilex.md`
   - `/clinical_reference/protocol_perindopril.md`
   - `/clinical_reference/protocol_sitaglipin.md`
   - `/clinical_reference/summary_linex.md`
   - `/clinical_reference/summary_podhaler.md`

---

## 🚀 Quick Start

### Option 1: Automated Test (Recommended)

```bash
# Install dependencies (if needed)
npm install

# Run the automated test
npx tsx scripts/test-full-pipeline.ts
```

**What it does**:
1. Creates 5 test projects
2. Generates all documents (IB, Protocol, SAP, ICF, CSR)
3. Runs CrossDoc validation & auto-fix
4. Generates Study Flow & validates
5. Validates Statistics Engine
6. Compares with reference documents
7. Generates final report

**Duration**: ~30-60 minutes (depending on API response times)

**Output**: `FULL_SKALDI_SYSTEM_VALIDATION_REPORT.md`

---

### Option 2: Manual Testing

Follow the step-by-step guide:

```bash
# Open the manual test guide
cat .windsurf/tasks/MANUAL_TEST_GUIDE.md
```

**Duration**: ~5-7.5 hours (all 5 projects)

---

## 📊 Test Projects

| # | Project | Type | Reference |
|---|---------|------|-----------|
| 1 | Femilex | Innovator | `protocol_femilex.md` |
| 2 | Perindopril | Generic | `protocol_perindopril.md` |
| 3 | Sitagliptin | Generic | `protocol_sitaglipin.md` |
| 4 | Linex | Hybrid | `summary_linex.md` |
| 5 | Podhaler | Innovator | `summary_podhaler.md` |

---

## 🔍 What Gets Tested

### Per Project:
- ✅ Project creation with correct metadata
- ✅ Document generation (5 documents)
- ✅ Cross-document validation
- ✅ Cross-document auto-fix
- ✅ Study flow generation
- ✅ Study flow validation
- ✅ Study flow auto-fix
- ✅ Statistics engine validation
- ✅ Reference comparison

### Overall:
- ✅ Pipeline completeness
- ✅ Quality scores
- ✅ Performance metrics
- ✅ Error rates
- ✅ Similarity to references

---

## 📈 Success Criteria

### Per Project:
- ✅ All documents generated
- ✅ CrossDoc Critical ≤ 1 (after auto-fix)
- ✅ CrossDoc Error ≤ 2 (after auto-fix)
- ✅ Study flow valid
- ✅ Statistics valid
- ✅ Similarity ≥ 70%

### Overall:
- ✅ 5/5 projects pass
- ✅ Average similarity ≥ 75%
- ✅ Readiness score ≥ 80%

---

## 🛠️ Troubleshooting

### Issue: "Connection refused"
**Solution**: Make sure Skaldi is running on `http://localhost:3000`

### Issue: "Authentication failed"
**Solution**: 
1. Check Supabase connection
2. Verify `.env.local` has correct credentials
3. Test login manually in browser

### Issue: "Document generation timeout"
**Solution**: 
1. Increase timeout in script (default: 2 minutes)
2. Check API logs for errors
3. Verify OpenAI API key is valid

### Issue: "Reference file not found"
**Solution**: 
1. Check `/clinical_reference/` folder exists
2. Verify all 5 reference files are present
3. Check file names match exactly

---

## 📝 Output Files

After test completion:

```
/FULL_SKALDI_SYSTEM_VALIDATION_REPORT.md  # Main report
/test-results/
  ├── project-1-femilex/
  │   ├── IB.docx
  │   ├── Protocol.docx
  │   ├── SAP.docx
  │   ├── ICF.docx
  │   ├── CSR.docx
  │   ├── crossdoc-validation.json
  │   ├── studyflow.json
  │   └── comparison.md
  ├── project-2-perindopril/
  │   └── ...
  └── ...
```

---

## 🎯 Next Steps After Testing

1. **Review Report**: Check `FULL_SKALDI_SYSTEM_VALIDATION_REPORT.md`
2. **Identify Issues**: Note any failing projects or steps
3. **Fix Critical Issues**: Address blocking problems
4. **Re-run Test**: Verify fixes work
5. **Document Findings**: Update project documentation

---

## 📞 Support

If you encounter issues:

1. Check logs in `/logs/test-run-[timestamp].log`
2. Review API responses in console output
3. Verify database state in Supabase dashboard
4. Check reference files are valid markdown

---

## 🔄 Continuous Testing

**Recommended Schedule**:
- **Daily**: Quick smoke test (1 project)
- **Weekly**: Full 5-project validation
- **Before Release**: Complete validation + manual review

**Command for quick test**:
```bash
# Test only Femilex (fastest)
npx tsx scripts/test-single-project.ts femilex
```

---

## 📚 Related Documentation

- **Manual Test Guide**: `.windsurf/tasks/MANUAL_TEST_GUIDE.md`
- **Test Plan**: `.windsurf/tasks/TEST_PROJECTS_GENERATION_PLAN.md`
- **Phase Documentation**: `.windsurf/tasks/COMPLETE_SUMMARY_PHASES_A_TO_G.md`
- **Deployment Guide**: `PRODUCTION_DEPLOYMENT_2025_11_22.md`

---

**Happy Testing! 🚀**
