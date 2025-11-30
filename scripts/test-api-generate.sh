#!/bin/bash

# Test /api/generate endpoint directly

PROJECT_ID="3d1c2098-2f60-40ff-addf-5b8073430f59"  # Metformin Test
ANON_KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local | cut -d '=' -f2)

echo "🧪 Testing /api/generate Endpoint"
echo "=================================="
echo ""
echo "Project: Metformin Test"
echo "Document: Protocol"
echo ""

# First, get a session token (you'll need to be logged in)
echo "⚠️  Note: This test requires authentication"
echo "   Please ensure you're logged in to the UI"
echo ""

# Test the endpoint
curl -v -X POST "http://localhost:3000/api/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"documentType\": \"Protocol\"
  }" 2>&1 | grep -E "(HTTP|success|error)" | head -20

echo ""
echo ""
echo "📊 Check server logs for more details"
