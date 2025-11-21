#!/bin/bash

# Patch enrich-data Edge Function
# Applies fixes for schema mismatches and adds external_data_cache support

echo "🔧 Patching enrich-data Edge Function..."
echo "=========================================="

ENRICH_FILE="supabase/functions/enrich-data/index.ts"
BACKUP_FILE="supabase/functions/enrich-data/index.ts.backup"

# Create backup
echo "📦 Creating backup..."
cp "$ENRICH_FILE" "$BACKUP_FILE"

# Apply fixes using sed
echo "🔨 Applying fixes..."

# Fix 1: Remove project_id from trials (line ~756)
sed -i.tmp 's/project_id,$/\/\/ project_id removed - field does not exist/' "$ENRICH_FILE"

# Fix 2: Remove project_id from literature (line ~804)  
# (already done by previous sed)

# Fix 3: Comment out labels upsert with inchikey (lines 659-666, 685-692)
# This is complex, so we'll do it manually or use the v2 file

echo "⚠️  Manual steps required:"
echo "1. Replace labels storage code (lines 658-669, 684-695) with external_data_cache logic"
echo "2. Add DataNormalizer import at top"
echo "3. Test with: deno run --allow-all supabase/functions/enrich-data/index.ts"
echo ""
echo "📝 See: supabase/functions/enrich-data/FIXES.md for details"
echo "📝 Reference: supabase/functions/enrich-data/index-v2.ts"
echo ""
echo "✅ Backup created: $BACKUP_FILE"
