#!/bin/bash

# Detailed test for backward compatibility

PROJECT_URL="https://qtlpjxjlwrjindgybsfd.supabase.co"
FUNCTION_URL="$PROJECT_URL/functions/v1/generate-section"
ANON_KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local | cut -d '=' -f2)

echo "🧪 Detailed Backward Compatibility Test"
echo "========================================"
echo ""

# Test with verbose output
echo "📤 Request:"
echo '{
  "prompt": "Generate a brief protocol synopsis for a diabetes trial.",
  "sectionId": "protocol_synopsis",
  "documentType": "Protocol",
  "maxTokens": 500
}'
echo ""
echo "📥 Response:"

curl -v -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate a brief protocol synopsis for a diabetes trial.",
    "sectionId": "protocol_synopsis",
    "documentType": "Protocol",
    "maxTokens": 500
  }' 2>&1 | grep -E "(< HTTP|success|error|content)" | head -20

echo ""
echo ""
echo "✅ Check full logs at:"
echo "https://supabase.com/dashboard/project/qtlpjxjlwrjindgybsfd/functions/generate-section/logs"
