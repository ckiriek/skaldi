# Step 4: Section Generator Implementation

**Date:** 2025-11-20
**Status:** Completed

## Actions Taken
1.  Created `lib/services/section-generator.ts`:
    -   Fetches document structure from `document_structure` table.
    -   Loads templates from `document_templates` table (with FS fallback).
    -   Constructs prompts by injecting context variables into `prompt_text`.

2.  Created `lib/services/document-orchestrator.ts`:
    -   Main orchestration logic for generating a full document.
    -   Iterates through sections sequentially.
    -   Builds context from project data.
    -   Calls AI for each section (placeholder for now).
    -   Stores result in `documents` table.

3.  Created `lib/services/qc-validator.ts`:
    -   Loads validation rules from `regulatory_rules` table.
    -   Implements basic checks: `presence`, `consistency`, `terminology`, `custom`.
    -   Returns structured validation results.

## Architecture
```
User Request
    ↓
DocumentOrchestrator
    ↓
SectionGenerator (for each section)
    ↓
AI Service (Edge Function / Azure OpenAI)
    ↓
QCValidator
    ↓
Store in DB
```

## Key Features
-   **Database-driven**: Structure and templates come from Supabase.
-   **Fallback to FS**: During development, can read from `templates_en/` if DB is empty.
-   **Modular**: Each service has a single responsibility.
-   **Non-breaking**: Does not modify existing agents or API routes.

## Validation
-   [x] Services created in `lib/services/`.
-   [x] TypeScript types defined.
-   [x] Basic QC logic implemented.

## Next Steps
-   Proceed to Step 5: Seed the database with initial QC rules.
