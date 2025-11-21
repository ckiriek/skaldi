# Step A1: AI Integration for Section Generator

**Date:** 2025-11-20
**Status:** Completed

## Actions Taken

### 1. Created Edge Function: `generate-section`
**Location:** `supabase/functions/generate-section/index.ts`

**Features:**
-   Accepts: `{ prompt, sectionId, documentType, maxTokens, temperature }`
-   Calls **Azure OpenAI API** (deployment: gpt-4.1) with regulatory-focused system prompt
-   Returns: `{ success, content, usage, latency }`
-   CORS-enabled for cross-origin requests
-   Error handling with detailed error messages

**System Prompt:**
```
You are a clinical documentation expert specializing in regulatory-compliant ${documentType} documents. 
Generate content that adheres to ICH-GCP guidelines, FDA regulations, and EMA standards.
Use clear, precise medical and regulatory terminology.
Ensure all statements are evidence-based and audit-ready.
```

### 2. Updated DocumentOrchestrator
**File:** `lib/services/document-orchestrator.ts`

**Changes:**
-   Replaced placeholder `callAI()` method with actual Edge Function invocation
-   Added `currentDocumentType` property to track document type during generation
-   Calls `supabase.functions.invoke('generate-section', { ... })`
-   Logs token usage and latency for each section
-   Fallback to error message if Edge Function fails

**Error Handling:**
-   Catches Edge Function errors
-   Returns descriptive error message with troubleshooting hints
-   Logs all errors for debugging

## Technical Details

### Edge Function Configuration
-   **Runtime:** Deno (Supabase Edge Runtime)
-   **AI Provider:** Azure OpenAI
-   **Deployment:** gpt-4.1 (configurable via `AZURE_OPENAI_DEPLOYMENT_NAME`)
-   **API Version:** 2025-01-01-preview (configurable via `AZURE_OPENAI_API_VERSION`)
-   **Max Tokens:** 2000 (configurable per section)
-   **Temperature:** 0.7 (balanced creativity/consistency)
-   **Environment Variables Required:**
    -   `AZURE_OPENAI_ENDPOINT`
    -   `AZURE_OPENAI_API_KEY`
    -   `AZURE_OPENAI_DEPLOYMENT_NAME` (optional, defaults to gpt-4.1)
    -   `AZURE_OPENAI_API_VERSION` (optional, defaults to 2025-01-01-preview)

### API Contract
**Request:**
```typescript
{
  prompt: string          // Full prompt with context and constraints
  sectionId: string       // e.g., "protocol_synopsis"
  documentType: string    // e.g., "Protocol", "IB", "CSR"
  maxTokens?: number      // Default: 2000
  temperature?: number    // Default: 0.7
}
```

**Response:**
```typescript
{
  success: boolean
  content?: string        // Generated text
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  latency?: number        // Generation time in ms
  error?: string          // Error message if failed
}
```

## Integration Flow

```
DocumentOrchestrator.generateDocument()
    ↓
For each section:
    ↓
SectionGenerator.constructPrompt()
    ↓
DocumentOrchestrator.callAI()
    ↓
supabase.functions.invoke('generate-section')
    ↓
Edge Function → OpenAI API
    ↓
Return generated content
    ↓
Store in sections object
```

## Deployment Requirements

### Before First Use:
1.  **Deploy Edge Function:**
    ```bash
    supabase functions deploy generate-section
    ```

2.  **Set Azure OpenAI Secrets:**
    ```bash
    supabase secrets set AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
    supabase secrets set AZURE_OPENAI_API_KEY=your-api-key
    supabase secrets set AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4.1
    supabase secrets set AZURE_OPENAI_API_VERSION=2025-01-01-preview
    ```

3.  **Verify Deployment:**
    ```bash
    supabase functions list
    ```

## Testing Checklist
-   [ ] Edge Function deployed to Supabase
-   [ ] Azure OpenAI secrets configured (ENDPOINT, API_KEY, DEPLOYMENT_NAME, API_VERSION)
-   [ ] Test single section generation via DocumentOrchestrator
-   [ ] Verify token usage logging
-   [ ] Verify latency tracking
-   [ ] Test error handling (invalid API key, network failure)

## Performance Metrics (Expected)
-   **Latency per section:** 2-5 seconds (depends on prompt length and model load)
-   **Token usage:** 500-2000 tokens per section (varies by complexity)
-   **Cost:** ~$0.01-0.06 per section (GPT-4o pricing)

## Next Steps
-   Proceed to Step A2: Update `/api/generate` to use DocumentOrchestrator
-   Monitor Edge Function logs for errors and performance
-   Consider adding retry logic for transient failures
-   Consider caching frequently generated sections

---

**Status:** ✅ AI Integration Complete
