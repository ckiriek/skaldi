# Orchestration Overview

## Current System Analysis (2025-11-20)

### 1. Document Generation Flow
The current generation flow is a hybrid of Next.js API routes and Supabase Edge Functions:

1.  **Trigger**: User initiates generation via UI (likely `GenerateDocumentButton`).
2.  **API Endpoint**: `POST /api/generate` receives the request (`projectId`, `documentType`).
3.  **Orchestration**: 
    - The API route invokes a Supabase Edge Function: `generate-document`.
    - This Edge Function likely handles the heavy lifting of calling LLMs (OpenAI/Azure) to generate content.
4.  **Post-Processing**:
    - Upon success, the API route fetches the generated content from Supabase (`document_versions`).
    - It then triggers `ValidatorAgent` to running auto-validation (completeness, rules).
    - Validation results are stored in `validation_results`.

### 2. AI Agents & Prompts
Agents are defined in `lib/agents/` and seem to be specialized TypeScript classes:

-   **WriterAgent** (`lib/agents/writer.ts`):
    -   Purpose: Refines, simplifies, expands, or makes text "regulatory compliant".
    -   Implementation: Uses Azure OpenAI directly (or mock fallback).
    -   Prompts: Hardcoded `REFINEMENT_PROMPTS` inside the class.
-   **ValidatorAgent** (`lib/agents/validator.ts`):
    -   Purpose: Validates generated content.
    -   Called by: `api/generate`.
-   **Composer/Assembler/Export Agents**: Likely handle document structure assembly and file export.

**Prompts Location**:
-   `lib/prompts/`: Contains structured prompt definitions for:
    -   `ib-prompt.ts` (Investigator's Brochure)
    -   `icf-prompt.ts` (Informed Consent Form)
    -   `protocol-prompt.ts` (Protocol)
    -   `synopsis-prompt.ts` (Synopsis)
    -   `entity-extraction-prompt.ts`

### 3. Supabase Usage
Supabase is the central data and logic hub:
-   **Auth**: User authentication.
-   **Database**: Stores `documents`, `document_versions`, `validation_results`.
-   **Edge Functions**: `generate-document` is the core generation worker.
-   **Client/Server**: `lib/supabase` provides clients for Next.js.

### 4. Supported Document Types
Based on file presence in `lib/prompts/` and `lib/agents/`:

-   **Fully/Partially Supported**:
    -   **Protocol**: Has specific prompts.
    -   **IB (Investigator's Brochure)**: Has specific prompts.
    -   **ICF (Informed Consent Form)**: Has specific prompts.
    -   **Synopsis**: Has specific prompts.
-   **Unknown Status**:
    -   **CSR (Clinical Study Report)**: Not explicitly seen in `lib/prompts` top-level, need to check if covered by generic writers or missing.
    -   **SPC / Summaries**: Not seen.

### 5. Template Engine
-   `lib/template-engine.ts`: A Handlebars-based engine exists.
-   It supports custom helpers (math, logic, formatting).
-   It loads templates from `lib/templates/` (need to verify if this folder is populated or if we need to migrate to `templates_en/`).

## Next Steps
-   Map `templates_en` structure.
-   Align existing `lib/prompts` with new template driven approach.
-   Confirm if `generate-document` edge function uses `lib/prompts` or has its own copies.

## Implemented Orchestration Model (Template-Driven)

**Implementation Status**: ✅ Completed (Steps 1-6, 2025-11-20)

This section describes the **now-implemented** architecture using the new Supabase data model (`document_structure`, `document_templates`, `regulatory_rules`, `style_guide`).

### 1. Generation Request Flow

When the user clicks "Generate Document":

1.  **Intake & Initialization**
    -   Entry Point: `DocumentOrchestrator.generateDocument()` in `lib/services/document-orchestrator.ts`
    -   Receives: `{ projectId, documentType, userId }`
    -   Action: Fetches project data from `projects` table.

2.  **Structure Retrieval** (`DocumentOrchestrator`)
    -   Query `document_structure` table for the given `documentType`.
    -   Returns: Ordered list of sections with hierarchy and dependencies.
    -   Sorts sections by `display_order`.

3.  **Section-by-Section Generation** (`SectionGenerator`)
    -   For each section in the structure:
        -   **Template Retrieval**: Fetch from `document_templates` table (with filesystem fallback to `templates_en/`).
        -   **Context Building**: Merge project data with section-specific inputs.
        -   **Prompt Construction**:
            -   Base: Template's `prompt_text` field.
            -   Variable Substitution: Replace `{{variable}}` placeholders with context values.
            -   Constraints: Append template's `constraints` as instructions.
        -   **AI Call**: Placeholder logic (to be replaced with Edge Function or Azure OpenAI).
        -   **Storage**: Generated content stored in `sections` object keyed by `section_id`.

4.  **QC Validation** (`QCValidator`)
    -   After all sections generated, run validation checks from `regulatory_rules` table.
    -   Rule types: `presence`, `consistency`, `terminology`, `custom`.
    -   Returns: `{ passed: boolean, issues: [...] }` with severity levels (error, warning, info).
    -   Validation results included in orchestration response.

5.  **Document Storage**
    -   Create entry in `documents` table with:
        -   `project_id`, `type`, `status: 'draft'`, `version: 1`
        -   `content`: JSON-serialized sections object.
        -   `created_by`: userId.
    -   Return: `{ success, documentId, sections, validation, duration_ms }`.

### 2. Responsibility Map

| Component | Responsibility | Location | Status |
| :--- | :--- | :--- | :--- |
| **Supabase DB** | Storage of Templates, Structure, Examples, Rules, Results. | `supabase/migrations/`, Tables: `document_types`, `document_structure`, `document_templates`, `regulatory_rules`, `style_guide` | ✅ Implemented |
| **DocumentOrchestrator** | Main orchestration: fetch structure, coordinate generation, run QC, store results. | `lib/services/document-orchestrator.ts` | ✅ Implemented |
| **SectionGenerator** | Per-section logic: fetch template, build prompt, call AI. | `lib/services/section-generator.ts` | ✅ Implemented |
| **QCValidator** | Load and execute validation rules from DB. | `lib/services/qc-validator.ts` | ✅ Implemented |
| **Templates_en/** | Source of truth for English templates (filesystem fallback during development). | `templates_en/protocol/`, `templates_en/ib/`, `templates_en/icf/`, `templates_en/synopsis/`, `templates_en/spc/`, `templates_en/csr/` | ✅ Populated |
| **Clinical Reference** | Read-only gold standard examples for structure and style. | `clinical_reference/` | ✅ Preserved |
| **Next.js API** | Request intake, legacy orchestration (to be migrated to new services). | `app/api/generate/route.ts` | ⚠️ Legacy (to be updated) |
| **Edge Functions** | Heavy AI execution (LLM calls), token management. | `supabase/functions/generate-document/` | ⚠️ To be integrated |
| **WriterAgent** | Specialized refinement (Enhance/Simplify) using specific prompts. | `lib/agents/writer.ts` | ✅ Existing (unchanged) |
| **AssemblerAgent** | Final document stitching and formatting. | `lib/agents/assembler.ts` | ✅ Existing (unchanged) |

### 3. Key Changes Implemented

#### ✅ Completed
-   **Database-driven Structure**: Document structure now loaded from `document_structure` table, not hardcoded.
-   **Granular Templates**: Monolithic prompts broken down into section-specific JSON templates in `templates_en/`.
-   **Dynamic Validation**: QC rules fetched from `regulatory_rules` table and executed programmatically.
-   **Template Engine Integration**: Handlebars-based variable substitution for context injection.
-   **UI Expansion**: New project form includes Visit Schedule, Safety Monitoring, Secondary Endpoints, Analysis Populations.

#### ⚠️ Pending Integration
-   **AI Service Integration**: Replace placeholder AI logic in `SectionGenerator` with actual Edge Function or Azure OpenAI calls.
-   **API Route Migration**: Update `app/api/generate/route.ts` to use `DocumentOrchestrator` instead of legacy flow.
-   **Template Sync**: Populate `document_templates` table from `templates_en/` JSON files (currently using filesystem fallback).

### 4. Migration Path for Existing Code

#### Legacy Components (Preserve for Now)
-   `lib/prompts/protocol-prompt.ts`, `ib-prompt.ts`, `icf-prompt.ts`, `synopsis-prompt.ts`: Keep as reference, but new generation uses `templates_en/`.
-   `lib/agents/composer.ts`: Template selection logic may be replaced by DB queries, but keep for backwards compatibility.
-   Existing `generate-document` Edge Function: Will need to be updated to accept section-specific prompts instead of full document prompts.

#### New Entry Points
-   **For new document generation**: Call `DocumentOrchestrator.generateDocument()` directly.
-   **For section refinement**: Continue using `WriterAgent` for post-generation edits.
-   **For validation**: Use `QCValidator.validate()` for standalone validation runs.

