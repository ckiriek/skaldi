# Step A3: Template Sync Script

**Date:** 2025-11-20
**Status:** ✅ Completed

## Actions Taken

### 1. Created Sync Script
**File:** `scripts/sync-templates.ts`

**Features:**
-   Recursively scans `templates_en/` directory
-   Parses JSON template files
-   Extracts placeholders from `prompt_text` using regex `{{variable}}`
-   Inserts or updates templates in `document_templates` table
-   Increments version number on updates
-   Handles errors gracefully with detailed logging

### 2. Added Missing Database Column
**Migration:** `supabase/migrations/20251120_add_placeholders_column.sql`

**Changes:**
-   Added `placeholders TEXT[]` column to `document_templates`
-   Added `updated_at TIMESTAMPTZ` column for tracking updates
-   Created GIN index on `placeholders` for faster lookups
-   Added column comments for documentation

### 3. Sync Results
**Total Templates:** 48  
**Successfully Synced:** 48  
**Failed:** 0

#### Breakdown by Document Type:
-   **CSR:** 10 templates
-   **IB:** 7 templates
-   **ICF:** 7 templates
-   **Protocol:** 11 templates
-   **SPC:** 6 templates
-   **Synopsis:** 7 templates

## Script Usage

### Run Sync
```bash
npx tsx scripts/sync-templates.ts
```

### Expected Output
```
🔄 Starting template sync...

📂 Scanning templates_en/ directory...
   Found 48 templates

📋 PROTOCOL (11 templates)
  📄 protocol_synopsis
    ✅ Created (v1)
  📄 protocol_objectives
    ✅ Created (v1)
  ...

============================================================
✅ Successfully synced: 48
❌ Failed: 0
📊 Total: 48
============================================================
```

## Template Structure

### Input (JSON file)
```json
{
  "section_id": "protocol_synopsis",
  "section_name": "Protocol Synopsis",
  "prompt_text": "Generate a protocol synopsis for {{compoundName}} in {{indication}}...",
  "expected_inputs": ["compoundName", "indication", "phase"],
  "constraints": [
    "Maximum 2 pages",
    "Include all ICH E6 required elements"
  ]
}
```

### Output (Database record)
```sql
INSERT INTO document_templates (
  document_type_id,    -- 'protocol'
  section_id,          -- 'protocol_synopsis'
  prompt_text,         -- Full prompt with {{placeholders}}
  expected_inputs,     -- ['compoundName', 'indication', 'phase']
  constraints,         -- ['Maximum 2 pages', ...]
  placeholders,        -- ['compoundName', 'indication'] (auto-extracted)
  version,             -- 1
  is_active,           -- true
  created_at,          -- now()
  updated_at           -- now()
)
```

## Placeholder Extraction

The script automatically extracts placeholders from `prompt_text`:

```typescript
function extractPlaceholders(promptText: string): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const placeholders: string[] = []
  let match

  while ((match = regex.exec(promptText)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1])
    }
  }

  return placeholders
}
```

**Example:**
-   Input: `"Generate synopsis for {{compoundName}} in {{indication}} phase {{phase}}"`
-   Output: `["compoundName", "indication", "phase"]`

## Update Behavior

### First Run (Insert)
-   Creates new template with `version = 1`
-   Sets `is_active = true`

### Subsequent Runs (Update)
-   Finds existing template by `document_type_id` + `section_id` + `is_active = true`
-   Increments `version` (e.g., v1 → v2)
-   Updates `prompt_text`, `constraints`, `expected_inputs`, `placeholders`
-   Updates `updated_at` timestamp

## Database Schema

### document_templates Table
```sql
CREATE TABLE document_templates (
    id UUID PRIMARY KEY,
    document_type_id TEXT REFERENCES document_types(id),
    section_id TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    language TEXT DEFAULT 'en',
    template_content TEXT,
    prompt_text TEXT,
    expected_inputs JSONB DEFAULT '[]',
    constraints JSONB DEFAULT '[]',
    placeholders TEXT[] DEFAULT '{}',  -- NEW
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()  -- NEW
);
```

## Integration with SectionGenerator

The `SectionGenerator` now loads templates from the database:

```typescript
// Fetch template from DB
const { data: template } = await supabase
  .from('document_templates')
  .select('*')
  .eq('document_type_id', documentType)
  .eq('section_id', sectionId)
  .eq('is_active', true)
  .single()

// Use prompt_text with placeholders
const prompt = template.prompt_text
  .replace('{{compoundName}}', context.compoundName)
  .replace('{{indication}}', context.indication)
  // ... etc
```

## Maintenance

### Re-sync After Template Changes
```bash
# Edit templates in templates_en/
# Then re-run sync
npx tsx scripts/sync-templates.ts
```

This will:
-   Update existing templates (increment version)
-   Create new templates if added
-   Preserve old versions (for audit trail)

### View Templates in Database
```sql
SELECT 
  document_type_id,
  section_id,
  version,
  array_length(placeholders, 1) as placeholder_count,
  is_active,
  updated_at
FROM document_templates
ORDER BY document_type_id, section_id;
```

## Next Steps
-   Proceed to Step A4: Test Protocol generation with Orchestrator and QC
-   Monitor template usage in production
-   Add template versioning UI for medical writers

---

**Status:** ✅ Template Sync Complete (48/48 templates synced)
