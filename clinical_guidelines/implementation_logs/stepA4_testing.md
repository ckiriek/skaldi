# Step A4: Protocol Generation Testing

**Date:** 2025-11-20
**Status:** Ready for Manual Testing

## Setup Complete

### ✅ Infrastructure Ready
1.  **Edge Function:** `generate-section` deployed and tested
2.  **API Route:** `/api/generate` updated with DocumentOrchestrator integration
3.  **Templates:** 48 templates synced to `document_templates` table
4.  **Structure:** Protocol structure (11 sections) seeded in `document_structure` table
5.  **QC Rules:** 20+ validation rules seeded in `regulatory_rules` table
6.  **Feature Flag:** `USE_NEW_ORCHESTRATOR=true` enabled in `.env.local`

### 📋 Protocol Structure (11 Sections)
1.  `protocol_title_page` - Title Page
2.  `protocol_synopsis` - Protocol Synopsis
3.  `protocol_introduction` - Introduction and Background
4.  `protocol_objectives` - Study Objectives and Endpoints
5.  `protocol_study_design` - Study Design
6.  `protocol_eligibility_criteria` - Selection of Study Population
7.  `protocol_treatments` - Treatment of Subjects
8.  `protocol_schedule_of_assessments` - Schedule of Assessments
9.  `protocol_safety_monitoring` - Safety Monitoring and Reporting
10. `protocol_statistics` - Statistical Considerations
11. `protocol_ethics` - Ethics and Regulatory Considerations

## Manual Testing Instructions

### Test via UI (Recommended)

1.  **Start Development Server:**
    ```bash
    npm run dev
    ```

2.  **Navigate to Project:**
    -   Go to http://localhost:3000/dashboard/projects
    -   Select project: "AST-101 Phase 2 Trial" (ID: `00000000-0000-0000-0000-000000000021`)

3.  **Generate Protocol:**
    -   Click "Generate Document" button
    -   Select "Protocol" from document type dropdown
    -   Click "Generate"

4.  **Monitor Console:**
    -   Check browser console for logs:
        ```
        🚀 Using NEW DocumentOrchestrator for Protocol
        📋 Orchestrator: Starting generation for Protocol
        📊 Found 11 sections to generate
        🎨 Generating section: protocol_synopsis
        🤖 AI Call for protocol_synopsis (500 chars)
        ✅ AI generated 1500 chars in 3200ms (450 tokens)
        ...
        🔍 Running QC validation...
        ✅ Validation complete: PASSED (2 issues)
        ```

5.  **Review Results:**
    -   Check generated document in UI
    -   Review validation results
    -   Verify all 11 sections generated

### Test via API (Alternative)

```bash
# Using curl
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{
    "projectId": "00000000-0000-0000-0000-000000000021",
    "documentType": "Protocol"
  }'
```

### Expected Response

```json
{
  "success": true,
  "document": {
    "id": "doc-uuid",
    "type": "Protocol",
    "sections": {
      "protocol_synopsis": "**Protocol Synopsis**\n\nThis is a Phase 2...",
      "protocol_objectives": "**Study Objectives**\n\n1. Primary Objective...",
      ...
    }
  },
  "validation": {
    "passed": true,
    "issues": [
      {
        "section_id": "protocol_synopsis",
        "rule_id": "rule-uuid",
        "severity": "warning",
        "message": "Synopsis objectives should match Section 7 objectives"
      }
    ]
  },
  "duration_ms": 45000,
  "orchestrator": "new"
}
```

## Success Criteria

### ✅ Generation
-   [ ] All 11 sections generated successfully
-   [ ] Each section contains relevant content (not placeholders)
-   [ ] Content is regulatory-compliant (uses proper terminology)
-   [ ] Generation completes in <60 seconds

### ✅ QC Validation
-   [ ] Validation runs automatically after generation
-   [ ] Validation results included in response
-   [ ] Issues are section-specific (include `section_id`)
-   [ ] Severity levels correct (error/warning/info)

### ✅ Content Quality
-   [ ] Synopsis includes objectives, design, endpoints
-   [ ] Objectives section lists primary and secondary objectives
-   [ ] Study design describes randomization, blinding, arms
-   [ ] Eligibility criteria includes inclusion/exclusion
-   [ ] Schedule of Assessments includes visit schedule
-   [ ] Statistics section includes sample size calculation

### ✅ Data Integrity
-   [ ] Document saved to `documents` table
-   [ ] Sections stored in `content` field as JSON
-   [ ] Validation results linked to document
-   [ ] Audit trail preserved (created_by, created_at)

## Troubleshooting

### Issue: "No structure defined for document type"
**Solution:** Run structure seeding migration:
```bash
supabase migrations apply --file supabase/migrations/20251120_seed_protocol_structure.sql
```

### Issue: "Template not found"
**Solution:** Re-run template sync:
```bash
npx tsx scripts/sync-templates.ts
```

### Issue: "Azure OpenAI not configured"
**Solution:** Check Supabase secrets:
```bash
supabase secrets list
```

### Issue: "Generation timeout"
**Solution:** 
-   Check Edge Function logs: `supabase functions logs generate-section`
-   Verify Azure OpenAI endpoint is accessible
-   Reduce number of sections for testing

## Performance Benchmarks

### Expected Metrics (11 sections)
-   **Total Duration:** 40-60 seconds
-   **Per Section:** 3-5 seconds
-   **Total Tokens:** 5,000-10,000 tokens
-   **Cost:** ~$0.50-1.00 per Protocol

### Actual Results (To Be Filled)
-   **Total Duration:** ___ seconds
-   **Sections Generated:** ___ / 11
-   **Validation Pass Rate:** ___%
-   **Issues Found:** ___ errors, ___ warnings
-   **Total Tokens:** ___
-   **Cost:** $___

## Next Steps After Testing

1.  **If Successful:**
    -   Document results in this file
    -   Proceed to Step A5: Create UI for QC results viewing
    -   Plan rollout to IB document type

2.  **If Issues Found:**
    -   Document issues and errors
    -   Fix critical bugs
    -   Re-test before proceeding

---

**Status:** ⚠️ Ready for Manual Testing (automated test blocked by Next.js context requirements)
