#!/bin/bash

# Check if project exists and is enriched

echo "🔍 Checking Projects in Database"
echo "=================================="
echo ""

# Get Supabase URL and key from .env.local
SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d '=' -f2)
SUPABASE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d '=' -f2)

if [ -z "$SUPABASE_KEY" ]; then
  SUPABASE_KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local | cut -d '=' -f2)
fi

echo "📊 Fetching projects..."
echo ""

curl -s "$SUPABASE_URL/rest/v1/projects?select=id,title,compound_name,enrichment_status,created_at&order=created_at.desc&limit=5" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" | jq -r '.[] | "ID: \(.id)\nTitle: \(.title)\nCompound: \(.compound_name)\nEnrichment: \(.enrichment_status)\nCreated: \(.created_at)\n---"'

echo ""
echo "✅ If you see projects above, you're ready to test!"
echo "⚠️  If enrichment_status is null, run enrichment first"
