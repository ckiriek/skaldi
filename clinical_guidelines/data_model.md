# Clinical Document Data Model

This document defines the Supabase schema for managing clinical document templates, structure, and rules.

## 1. Conceptual Schema

### `document_types`
Defines the available document types (Protocol, IB, CSR, etc.).
- `id` (text, PK): e.g., 'csr', 'protocol', 'ib'
- `name` (text): Display name
- `description` (text)
- `regulatory_standard` (text): e.g., 'ICH E3', 'ICH E6'

### `document_structure`
Defines the hierarchical structure (TOC) of a document.
- `id` (uuid, PK)
- `document_type_id` (text, FK -> document_types.id)
- `section_id` (text): Logical ID, e.g., 'csr_synopsis'
- `parent_section_id` (text, nullable): For hierarchy (sub-sections)
- `order_index` (int): Sorting order
- `title` (text): Default section title
- `is_required` (boolean): Default true
- `is_repeatable` (boolean): e.g., for Appendices
- `level` (int): Indentation level (0, 1, 2...)

### `document_templates`
Stores the actual templates/prompts for generating content for a section.
- `id` (uuid, PK)
- `document_type_id` (text, FK)
- `section_id` (text): Links to `document_structure.section_id` (logical link)
- `version` (int): For versioning (1, 2, 3...)
- `language` (text): 'en', 'ru', etc.
- `template_content` (text): Handlebars or Text template
- `prompt_text` (text): The AI system prompt to generate this section
- `expected_inputs` (jsonb): Array of variable names
- `constraints` (jsonb): Array of strings
- `is_active` (boolean): Only one active version per language/section
- `created_at` (timestamp)

### `document_examples`
Stores reference examples (snippets) from the `clinical_reference` corpus.
- `id` (uuid, PK)
- `document_type_id` (text, FK)
- `section_id` (text)
- `content` (text): The actual example text
- `source_document` (text): e.g., 'bcd-063_CSR.md'
- `tags` (text[]): e.g., ['oncology', 'phase-3']

### `regulatory_rules`
Defines QC and validation rules.
- `id` (uuid, PK)
- `document_type_id` (text, FK)
- `section_id` (text, nullable): If null, applies to whole document
- `rule_type` (text): 'presence', 'consistency', 'terminology', 'custom'
- `rule_definition` (jsonb):
    - For `presence`: `{ "target": "section_id" }`
    - For `consistency`: `{ "source": "objectives", "target": "endpoints", "match_type": "semantic" }`
- `logic_expression` (text, nullable): Simple expression for custom logic, e.g., `length(content) > 100` or `contains(content, "p-value")`.
- `severity` (text): 'error', 'warning', 'info'
- `error_message` (text)

### `style_guide`
Defines terminology and phrasing preferences.
- `id` (uuid, PK)
- `term` (text): e.g., 'subject' vs 'patient'
- `preferred_usage` (text)
- `forbidden_usage` (text)
- `context` (text): 'all' or specific document type

## 2. Relationships & Flow

1.  **Generation Start**:
    -   Fetch `document_structure` for `document_type` -> Builds the TOC.
    -   For each leaf node in structure, fetch active `document_template`.
2.  **Prompt Assembly**:
    -   Combine `template_content` (structure) with `prompt_text` (instruction).
    -   Inject `document_examples` (few-shot learning) into the prompt if needed.
3.  **Validation**:
    -   After generation, run `regulatory_rules` against the output.

## 3. Migration Strategy

1.  Create tables.
2.  Seed `document_types`.
3.  Seed `document_structure` from the Section Maps defined in `clinical_guidelines/templates.md`.
4.  Seed `document_templates` from `templates_en/**/*.json` (requires a script to load JSONs into DB).
