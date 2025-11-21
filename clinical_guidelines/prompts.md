# Prompts and Agents Audit

## 1. Existing Agents

### WriterAgent (`lib/agents/writer.ts`)
-   **Purpose**: Text refinement (enhance, simplify, expand, regulatory, technical).
-   **Inputs**: `content`, `section_id`, `document_type`, `refinement_type`.
-   **Outputs**: Refined text string + metadata.
-   **Issues**:
    -   Prompts are hardcoded in `REFINEMENT_PROMPTS` constant.
    -   Uses Azure OpenAI directly, bypassing potential centralized orchestration logging if any.

### ValidatorAgent (`lib/agents/validator.ts`)
-   **Purpose**: Validates generated content.
-   **Inputs**: `content`, `section_id`.
-   **Outputs**: Score, passed/failed boolean, list of issues.
-   **Issues**:
    -   Validation rules likely hardcoded or opaque.

### AssemblerAgent (`lib/agents/assembler.ts`)
-   **Purpose**: Assembles sections into a final document with TOC.
-   **Inputs**: Map of sections.
-   **Outputs**: Full markdown document.
-   **Issues**:
    -   **CRITICAL**: `SECTION_ORDER` and `SECTION_TITLES` are hardcoded in the file. This must be moved to the database/template configuration.

### ComposerAgent (`lib/agents/composer.ts`)
-   **Purpose**: Selects templates and builds context for generation.
-   **Inputs**: Project ID, Document Type.
-   **Outputs**: Rendered sections.
-   **Issues**:
    -   **CRITICAL**: `TEMPLATE_MAPPINGS` is hardcoded.
    -   Relies on `lib/templates` (Handlebars files) which are separate from the new `templates_en` JSON structure.

### ExportAgent (`lib/agents/export.ts`)
-   **Purpose**: Converts Markdown to DOCX/PDF.
-   **Inputs**: Markdown content.
-   **Outputs**: File.
-   **Issues**: Mock implementation in places, but less critical for clinical structure.

## 2. Existing Prompts (`lib/prompts/*.ts`)

### `protocol-prompt.ts`
-   **Target**: Clinical Trial Protocol (Full document or large chunks).
-   **Structure**: Massive Template Literal.
-   **Issues**:
    -   **Monolithic**: Generates the whole protocol in one prompt.
    -   **Hardcoded Structure**: Section headers (1. Title Page, 2. Synopsis...) are embedded in the string.
    -   **Logic Mixing**: TypeScript logic mixes with the prompt string.
    > **RISK**: Refactoring this requires ensuring that the shared context (e.g., Primary Endpoint derived from clinical trials) is correctly passed to individual section templates.

### `ib-prompt.ts`, `icf-prompt.ts`, `synopsis-prompt.ts`
-   **Target**: Respective documents.
-   **Structure**: Likely similar to Protocol (Monolithic).
-   **Issues**: Same as Protocol.

## 3. Refactoring Plan

### Phase 1: Externalize Structure
1.  Migrate `SECTION_ORDER` from `AssemblerAgent` to `document_structure` (Supabase/JSON).
2.  Migrate `TEMPLATE_MAPPINGS` from `ComposerAgent` to `document_templates` lookup.

### Phase 2: Atomize Prompts
1.  Break down `protocol-prompt.ts` (and others) into section-specific prompts.
2.  Store these prompts in `templates_en/protocol/*.json` (or as Handlebars templates referenced by JSON).
3.  **New Flow**:
    -   Orchestrator identifies required sections.
    -   For each section, load the specific small prompt/template.
    -   Generate section.
    -   Assembler stitches them together based on the externalized order.

### Phase 3: Template-Driven Agents
1.  Modify `ComposerAgent` to fetch template metadata from Supabase/File System (`templates_en`).
2.  Modify `WriterAgent` to accept custom system prompts if defined in the template metadata (allowing per-section refinement rules).
