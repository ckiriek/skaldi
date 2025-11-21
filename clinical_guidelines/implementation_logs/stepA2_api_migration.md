# Step A2: API Route Migration to DocumentOrchestrator

**Date:** 2025-11-20
**Status:** Completed

## Actions Taken

### 1. Updated `/api/generate/route.ts`
**File:** `app/api/generate/route.ts`

**Changes:**
-   Added `DocumentOrchestrator` import and initialization
-   Implemented feature flag system for gradual rollout
-   Added routing logic to choose between new orchestrator and legacy Edge Function
-   Preserved backwards compatibility with existing generation flow
-   Skip redundant auto-validation for new orchestrator (already includes QC)

### 2. Feature Flag Configuration
**Environment Variable:** `USE_NEW_ORCHESTRATOR`

```bash
# In .env.local
USE_NEW_ORCHESTRATOR=true  # Enable new orchestrator
```

**Supported Document Types:** `['Protocol']` (initially)

### 3. Generation Flow Logic

```typescript
if (USE_NEW_ORCHESTRATOR && documentType === 'Protocol') {
  // NEW PATH: DocumentOrchestrator
  result = await documentOrchestrator.generateDocument({
    projectId,
    documentType,
    userId,
  })
  
  // Response includes:
  // - sections (generated content)
  // - validation (QC results)
  // - duration_ms
  // - orchestrator: 'new'
} else {
  // LEGACY PATH: Edge Function (generate-document)
  result = await supabase.functions.invoke('generate-document', {
    body: { projectId, documentType, userId }
  })
  
  // Auto-validation runs separately
}
```

## Architecture

### Request Flow (New Orchestrator)
```
POST /api/generate
    ↓
Check feature flag + document type
    ↓
DocumentOrchestrator.generateDocument()
    ├─ Fetch project data
    ├─ Fetch document structure
    ├─ For each section:
    │   ├─ SectionGenerator.constructPrompt()
    │   └─ Edge Function: generate-section
    ├─ QCValidator.validate()
    └─ Store in documents table
    ↓
Return response with validation
```

### Request Flow (Legacy)
```
POST /api/generate
    ↓
Check feature flag + document type
    ↓
Edge Function: generate-document
    ↓
Auto-validation (ValidatorAgent)
    ↓
Return response
```

## Response Format

### New Orchestrator Response
```json
{
  "success": true,
  "document": {
    "id": "doc-uuid",
    "type": "Protocol",
    "sections": {
      "protocol_synopsis": "...",
      "protocol_objectives": "...",
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
        "message": "..."
      }
    ]
  },
  "duration_ms": 45000,
  "orchestrator": "new"
}
```

### Legacy Response
```json
{
  "success": true,
  "document": {
    "id": "doc-uuid",
    "type": "IB",
    "content": "..."
  },
  "validation": {
    "score": 85,
    "passed": true,
    "errors": 0,
    "warnings": 2
  }
}
```

## Backwards Compatibility

### ✅ Preserved
-   Existing document types (IB, ICF, Synopsis, etc.) continue using legacy Edge Function
-   API contract unchanged (same request/response structure)
-   Auto-validation still runs for legacy path
-   No breaking changes to existing UI components

### 🆕 New Behavior (Protocol only, when flag enabled)
-   Section-by-section generation via DocumentOrchestrator
-   QC validation included in generation response
-   Structured sections object instead of monolithic content
-   Validation issues with section-level granularity

## Testing

### Enable New Orchestrator
```bash
# Add to .env.local
USE_NEW_ORCHESTRATOR=true
```

### Test Protocol Generation
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{
    "projectId": "project-uuid",
    "documentType": "Protocol"
  }'
```

Expected:
-   Response includes `"orchestrator": "new"`
-   Sections object with individual section content
-   Validation results with section-level issues

### Test Other Document Types (IB, ICF, etc.)
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{
    "projectId": "project-uuid",
    "documentType": "IB"
  }'
```

Expected:
-   Uses legacy Edge Function
-   No `"orchestrator"` field in response
-   Monolithic content field

## Rollout Plan

### Phase 1: Protocol Only (Current)
-   Feature flag: `USE_NEW_ORCHESTRATOR=true`
-   Document types: `['Protocol']`
-   Monitor: Generation success rate, latency, validation pass rate

### Phase 2: Expand to IB
-   Add `'IB'` to `NEW_ORCHESTRATOR_TYPES`
-   Verify IB templates and structure in DB
-   Test IB generation end-to-end

### Phase 3: Expand to All Types
-   Add remaining types: `['Protocol', 'IB', 'ICF', 'Synopsis', 'CSR', 'SAP']`
-   Monitor performance across all types
-   Deprecate legacy Edge Function

### Phase 4: Remove Legacy Path
-   Remove feature flag
-   Remove legacy Edge Function invocation code
-   Update documentation

## Monitoring

### Key Metrics
-   **Generation success rate:** % of successful generations
-   **Average latency:** Time from request to response
-   **Validation pass rate:** % of documents passing QC
-   **Error rate:** % of failed generations
-   **Token usage:** Average tokens per document

### Logs to Watch
```bash
# New orchestrator
🚀 Using NEW DocumentOrchestrator for Protocol
📋 Orchestrator: Starting generation for Protocol
🤖 AI Call for protocol_synopsis (500 chars)
✅ AI generated 1500 chars in 3200ms (450 tokens)
🔍 Running QC validation...
✅ Validation complete: PASSED (2 issues)

# Legacy path
🔄 Using LEGACY Edge Function for IB
```

## Next Steps
-   Proceed to Step A3: Create sync script for `templates_en → document_templates`
-   Monitor Protocol generation in production
-   Prepare IB templates for Phase 2 rollout

---

**Status:** ✅ API Migration Complete (with feature flag)
