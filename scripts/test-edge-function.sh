#!/bin/bash

# Test Edge Function Deployment
# Tests the updated generate-section function with GPT-5.1 parameters

PROJECT_URL="https://qtlpjxjlwrjindgybsfd.supabase.co"
FUNCTION_URL="$PROJECT_URL/functions/v1/generate-section"

# Get anon key from .env.local
ANON_KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local | cut -d '=' -f2)

echo "🧪 Testing Edge Function Deployment"
echo "===================================="
echo ""
echo "📍 URL: $FUNCTION_URL"
echo ""

# Test 1: New GPT-5.1 Parameters
echo "🧪 TEST 1: New GPT-5.1 Parameters"
echo "-----------------------------------"

curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a clinical documentation expert.",
    "userPrompt": "Generate a brief 2-paragraph protocol synopsis for a Phase 3 diabetes trial.",
    "sectionId": "protocol_synopsis",
    "documentType": "Protocol",
    "max_completion_tokens": 500,
    "reasoning_effort": "medium",
    "verbosity": "medium"
  }' | jq '.'

echo ""
echo ""

# Test 2: Backward Compatibility
echo "🧪 TEST 2: Backward Compatibility (Old Parameters)"
echo "---------------------------------------------------"

curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate a brief protocol synopsis.",
    "sectionId": "protocol_synopsis",
    "documentType": "Protocol",
    "maxTokens": 500
  }' | jq '.'

echo ""
echo ""
echo "✅ Tests Complete!"
echo ""
echo "📊 Check Dashboard for logs:"
echo "https://supabase.com/dashboard/project/qtlpjxjlwrjindgybsfd/functions/generate-section/logs"
