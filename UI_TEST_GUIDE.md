# 🧪 UI Testing Guide - Full Data Integration

**Date:** 2025-11-24  
**Status:** Ready for Testing  
**URL:** http://localhost:3000

---

## 🎯 TEST OBJECTIVE

Validate that the complete data integration pipeline works end-to-end through the UI:
1. Data Aggregator collects all sources
2. Context Builder formats data
3. Token Budget Calculator allocates correctly
4. Section Generator uses new prompts
5. Document Orchestrator calls Edge Function with GPT-5.1 params
6. Generated content is professional and accurate

---

## 📋 TEST PLAN

### Test 1: Quick Protocol Synopsis (5 minutes)

**Goal:** Verify basic functionality

**Steps:**
1. Open http://localhost:3000
2. Click "New Project"
3. Fill in:
   - **Title:** Metformin Test
   - **Compound:** Metformin
   - **Indication:** Type 2 Diabetes
   - **Phase:** Phase 3
   - **Product Type:** Generic
4. Click "Create Project"
5. Click "Enrich Data" (wait 1-2 minutes)
6. Go to "Documents" tab
7. Click "Generate Protocol"
8. Select section: "Synopsis"
9. Click "Generate"
10. Wait ~30 seconds
11. Review output

**Expected Results:**
- ✅ Enrichment completes successfully
- ✅ Generation starts without errors
- ✅ Synopsis is 2-3 pages (1500-2000 tokens)
- ✅ Content is professional
- ✅ No placeholders like "[TO BE PROVIDED]"
- ✅ Mentions Metformin specifically
- ✅ Includes study design elements

---

### Test 2: Full IB Section (10 minutes)

**Goal:** Test comprehensive data integration

**Steps:**
1. Same project as Test 1
2. Go to "Documents" tab
3. Click "Generate IB"
4. Select section: "Clinical Studies"
5. Click "Generate"
6. Wait ~5-10 minutes (this is a large section)
7. Review output

**Expected Results:**
- ✅ Section is 30-40 pages
- ✅ References actual clinical trials (NCT IDs)
- ✅ Includes statistics (p-values, CI)
- ✅ Has tables for trial data
- ✅ Mentions multiple Phase 1, 2, 3 studies
- ✅ Professional medical writing style
- ✅ No hallucinated data
- ✅ Integrated efficacy and safety analyses

**Data Sources Check:**
- ✅ Knowledge Graph data used
- ✅ ClinicalTrials.gov data used
- ✅ FDA Labels referenced
- ✅ Literature cited
- ✅ Safety data included

---

### Test 3: Monitor Logs (During Generation)

**While Test 2 is running:**

1. Open browser console (F12)
2. Check Network tab for API calls
3. Look for:
   - POST to `/api/generate`
   - Calls to Edge Function
   - No 500 errors

**Check Supabase Logs:**
1. Go to: https://supabase.com/dashboard/project/qtlpjxjlwrjindgybsfd/functions/generate-section/logs
2. Look for:
   - `🔧 Generating section: IB/ib_clinical_studies`
   - `📊 Config: max_tokens=15000, reasoning=high, verbosity=high`
   - `🤖 Calling Azure OpenAI: gpt-5.1`
   - `✅ Section generated in XXXXms`

---

## 🔍 VALIDATION CHECKLIST

### Content Quality
- [ ] Professional medical writing style
- [ ] Proper Markdown formatting
- [ ] Tables formatted correctly
- [ ] Headings hierarchy correct (##, ###)
- [ ] No lorem ipsum or placeholder text
- [ ] Specific to compound (not generic)

### Data Integration
- [ ] Real NCT IDs mentioned
- [ ] Actual statistics (not made up)
- [ ] FDA label information included
- [ ] Safety data from FAERS
- [ ] Literature references (PMIDs)
- [ ] Knowledge Graph data visible

### Technical
- [ ] No errors in console
- [ ] No 500 errors in network
- [ ] Generation completes successfully
- [ ] Token usage reasonable
- [ ] Latency acceptable (<10 min per section)

### Regulatory Compliance
- [ ] ICH-GCP language
- [ ] FDA/EMA terminology
- [ ] Audit-ready quality
- [ ] Evidence-based statements
- [ ] Proper citations

---

## 🐛 TROUBLESHOOTING

### Issue: "Enrichment Failed"
**Solution:** 
- Check Supabase connection
- Verify Azure OpenAI credentials
- Check API rate limits

### Issue: "Generation Timeout"
**Solution:**
- Section might be too large
- Check Edge Function logs
- Verify max_completion_tokens

### Issue: "No Content Generated"
**Solution:**
- Check Edge Function deployment
- Verify environment variables
- Check Azure OpenAI API key

### Issue: "Content is Generic"
**Solution:**
- Verify enrichment completed
- Check if Knowledge Graph populated
- Verify Data Aggregator working

---

## 📊 SUCCESS CRITERIA

Test is successful if:
- ✅ All 3 tests complete without errors
- ✅ Generated content is professional quality
- ✅ Data from all sources is used
- ✅ No hallucinations detected
- ✅ Regulatory compliance evident
- ✅ Performance acceptable

---

## 📝 TEST RESULTS TEMPLATE

```
# Test Results - [Date]

## Test 1: Protocol Synopsis
- Status: [ PASS / FAIL ]
- Duration: [ X seconds ]
- Quality: [ 1-5 stars ]
- Notes: [ observations ]

## Test 2: IB Clinical Studies
- Status: [ PASS / FAIL ]
- Duration: [ X minutes ]
- Pages Generated: [ X pages ]
- Data Sources Used: [ list ]
- Quality: [ 1-5 stars ]
- Issues: [ if any ]

## Test 3: Logs Monitoring
- Edge Function: [ OK / ERRORS ]
- API Calls: [ OK / ERRORS ]
- Token Usage: [ X tokens ]
- Notes: [ observations ]

## Overall Assessment
- Ready for Production: [ YES / NO ]
- Recommendations: [ list ]
```

---

## 🎉 NEXT STEPS AFTER TESTING

If tests pass:
1. ✅ Mark as production-ready
2. 📊 Document performance metrics
3. 🚀 Deploy to production
4. 📈 Monitor real usage
5. 🔄 Iterate based on feedback

If tests fail:
1. 📋 Document issues
2. 🔧 Fix identified problems
3. 🧪 Re-test
4. ✅ Validate fixes

---

**Good luck with testing! 🚀**

The system is designed to work - all components are integrated and tested.
