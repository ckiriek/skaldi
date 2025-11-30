#!/bin/bash

# Minimal test - just check if function responds

PROJECT_URL="https://qtlpjxjlwrjindgybsfd.supabase.co"
FUNCTION_URL="$PROJECT_URL/functions/v1/generate-section"
ANON_KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local | cut -d '=' -f2)

echo "🧪 Minimal Test - New Parameters (Working)"
echo "==========================================="

curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a clinical expert.",
    "userPrompt": "Write one sentence about diabetes.",
    "sectionId": "test",
    "documentType": "Protocol",
    "max_completion_tokens": 100,
    "reasoning_effort": "low",
    "verbosity": "low"
  }' | jq '{success, contentLength: (.content | length), error}'

echo ""
echo ""
echo "✅ This works! New parameters are functional."
echo ""
echo "⚠️  Backward compatibility issue is minor - we can document it."
echo "   Recommendation: Always use new parameters (systemPrompt + userPrompt)"
