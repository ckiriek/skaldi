# 🔧 Apply Migration: Create validation_results table

## Quick Steps

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/qtlpjxjlwrjindgybsfd
   - Navigate to: **SQL Editor**

2. **Run Migration**
   - Click "New Query"
   - Copy-paste the entire SQL from: `supabase/migrations/20250110_create_validation_results.sql`
   - Or copy this:

```sql
-- Create validation_results table to store validation check results
CREATE TABLE IF NOT EXISTS validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  validation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completeness_score INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'review', 'needs_revision')),
  total_rules INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_validation_results_document_id ON validation_results(document_id);
CREATE INDEX idx_validation_results_validation_date ON validation_results(validation_date DESC);

ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validation results for their documents"
  ON validation_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN projects p ON d.project_id = p.id
      WHERE d.id = validation_results.document_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert validation results for their documents"
  ON validation_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN projects p ON d.project_id = p.id
      WHERE d.id = validation_results.document_id
      AND p.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_validation_results_updated_at
  BEFORE UPDATE ON validation_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE validation_results IS 'Stores validation check results for documents';
```

3. **Execute**
   - Click "Run" (or press Cmd+Enter)
   - ✅ Should see: "Success. No rows returned"

4. **Verify**
   - Go to: **Table Editor** → **validation_results**
   - Check that table exists with all columns

---

### Option 2: Supabase CLI

```bash
# Link to project (if not already linked)
supabase link --project-ref qtlpjxjlwrjindgybsfd

# Push migration
supabase db push

# Or apply specific migration
supabase db push --include-all
```

---

## Verification

### Check table exists:
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'validation_results'
ORDER BY ordinal_position;
```

**Expected result:**
```
table_name          | column_name         | data_type
--------------------|---------------------|------------------
validation_results  | id                  | uuid
validation_results  | document_id         | uuid
validation_results  | validation_date     | timestamp with time zone
validation_results  | completeness_score  | integer
validation_results  | status              | text
validation_results  | total_rules         | integer
validation_results  | passed              | integer
validation_results  | failed              | integer
validation_results  | results             | jsonb
validation_results  | created_at          | timestamp with time zone
validation_results  | updated_at          | timestamp with time zone
```

### Check RLS policies:
```sql
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE tablename = 'validation_results';
```

---

## Rollback (if needed)

```sql
-- Remove validation_results table
DROP TABLE IF EXISTS validation_results CASCADE;
```

---

## Status

- ✅ Migration file created: `supabase/migrations/20250110_create_validation_results.sql`
- ✅ Edge function updated to save results
- ✅ Document page updated to display results
- ⏳ **Need to apply migration to database**

---

## After Migration

1. ✅ Validate a document
2. ✅ Check that validation results appear on document page
3. ✅ Verify completeness score is displayed
4. ✅ Verify detailed checks are shown with color coding

---

**Ready to apply? Go to Supabase Dashboard → SQL Editor!** 🚀
