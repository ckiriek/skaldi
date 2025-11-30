# 🚀 Edge Function Deployment - GPT-5.1 Integration

**Last Updated:** 2025-11-24  
**Version:** 2.0.0

---

## 📋 WHAT'S NEW

### Updated Edge Function Features:
- ✅ Separate `systemPrompt` and `userPrompt` parameters
- ✅ GPT-5.1 parameters support:
  - `max_completion_tokens`
  - `reasoning_effort` (none/minimal/low/medium/high)
  - `verbosity` (low/medium/high)
- ✅ Backward compatibility with old parameters
- ✅ Removed unsupported parameters (temperature, top_p)

---

## 🔧 DEPLOYMENT STEPS

### Step 1: Verify Supabase CLI

```bash
# Check if Supabase CLI is installed
supabase --version

# If not installed:
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 3: Deploy Edge Function

```bash
# Deploy the updated generate-section function
supabase functions deploy generate-section

# Expected output:
# ✓ Deployed Function generate-section
# Function URL: https://YOUR_PROJECT.supabase.co/functions/v1/generate-section
```

### Step 4: Verify Environment Variables

Make sure these are set in Supabase Dashboard:

```bash
# Go to: Project Settings → Edge Functions → Secrets

AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.1
AZURE_OPENAI_API_VERSION=2025-01-01-preview
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 5: Test Edge Function

```bash
# Test with curl
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/generate-section' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "systemPrompt": "You are a clinical documentation expert.",
    "userPrompt": "Generate a brief protocol synopsis.",
    "sectionId": "protocol_synopsis",
    "documentType": "Protocol",
    "max_completion_tokens": 2000,
    "reasoning_effort": "medium",
    "verbosity": "medium"
  }'
```

Expected response:
```json
{
  "success": true,
  "content": "...",
  "usage": {
    "promptTokens": 150,
    "completionTokens": 1800,
    "totalTokens": 1950
  },
  "latency": 15000
}
```

---

## 🧪 TESTING CHECKLIST

### Test 1: Basic Functionality ✓
```bash
# Test with minimal parameters
curl -X POST ... -d '{
  "prompt": "Test prompt",
  "sectionId": "test",
  "documentType": "Protocol"
}'
```

### Test 2: New GPT-5.1 Parameters ✓
```bash
# Test with new parameters
curl -X POST ... -d '{
  "systemPrompt": "You are an expert.",
  "userPrompt": "Generate content.",
  "sectionId": "test",
  "documentType": "Protocol",
  "max_completion_tokens": 4000,
  "reasoning_effort": "high",
  "verbosity": "high"
}'
```

### Test 3: Backward Compatibility ✓
```bash
# Test with old parameters (should still work)
curl -X POST ... -d '{
  "prompt": "Test prompt",
  "sectionId": "test",
  "documentType": "Protocol",
  "maxTokens": 2000
}'
```

### Test 4: Error Handling ✓
```bash
# Test with missing required fields
curl -X POST ... -d '{
  "sectionId": "test"
}'

# Expected: 400 error with clear message
```

---

## 📊 MONITORING

### Check Logs

```bash
# View Edge Function logs
supabase functions logs generate-section --tail

# Look for:
# ✅ "🔧 Generating section: ..."
# ✅ "📊 Config: max_tokens=..., reasoning=..., verbosity=..."
# ✅ "🤖 Calling Azure OpenAI: gpt-5.1"
# ✅ "✅ Section generated in ...ms"
```

### Monitor Performance

Key metrics to watch:
- **Latency:** Should be 10-30s for most sections
- **Token usage:** Should match budget calculations
- **Error rate:** Should be <1%
- **Success rate:** Should be >99%

---

## 🔄 ROLLBACK PROCEDURE

If something goes wrong:

```bash
# List previous deployments
supabase functions list

# Rollback to previous version
supabase functions deploy generate-section --version PREVIOUS_VERSION
```

---

## ✅ POST-DEPLOYMENT CHECKLIST

- [ ] Edge Function deployed successfully
- [ ] Environment variables verified
- [ ] Basic test passed
- [ ] GPT-5.1 parameters test passed
- [ ] Backward compatibility test passed
- [ ] Error handling test passed
- [ ] Logs show correct configuration
- [ ] Performance metrics acceptable
- [ ] Integration with Document Orchestrator working

---

## 🎯 NEXT: PRODUCTION TEST

Once Edge Function is deployed and tested, proceed to:

### Test with Real Project

1. **Create Test Project in Supabase**
   ```sql
   INSERT INTO projects (
     title,
     compound_name,
     indication,
     phase,
     product_type
   ) VALUES (
     'Metformin Test',
     'Metformin',
     'Type 2 Diabetes',
     'Phase 3',
     'Generic'
   );
   ```

2. **Run Enrichment**
   - Go to UI → Project → Enrich Data
   - Wait for completion
   - Verify all sources populated

3. **Generate Document**
   - Select document type (IB or Protocol)
   - Click Generate
   - Monitor logs
   - Verify output quality

4. **Validate Results**
   - Check data usage (should use all sources)
   - Check document length (should match targets)
   - Check for placeholders (should be minimal)
   - Check for hallucinations (should be none)

---

## 📞 TROUBLESHOOTING

### Issue: "Azure OpenAI API error"
**Solution:** Check environment variables, verify API key and endpoint

### Issue: "No content generated"
**Solution:** Check logs for specific error, verify deployment name

### Issue: "Timeout"
**Solution:** Increase max_completion_tokens or reduce section size

### Issue: "Invalid parameters"
**Solution:** Verify API version supports reasoning_effort and verbosity

---

## 🎉 SUCCESS CRITERIA

Deployment is successful when:
- ✅ All tests pass
- ✅ Logs show correct configuration
- ✅ Real document generation works
- ✅ Data from all sources is used
- ✅ Output quality is professional
- ✅ No errors in production

**You're ready for production! 🚀**
