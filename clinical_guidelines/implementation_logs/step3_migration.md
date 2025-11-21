# Step 3: Prompt Migration (Granularization)

**Date:** 2025-11-20
**Status:** Completed

## Actions Taken
1.  Analyzed `lib/prompts/protocol-prompt.ts` (the monolithic prompt).
2.  Extracted logic and instructions for each section of the Clinical Protocol.
3.  Updated the following JSON templates in `templates_en/protocol/` with the extracted `prompt_text`:
    -   `synopsis.json`
    -   `title_page.json`
    -   `introduction.json`
    -   `objectives.json`
    -   `study_design.json`
    -   `eligibility_criteria.json`
    -   `treatments.json`
    -   `schedule_of_assessments.json` (Procedures)
    -   `safety_monitoring.json`
    -   `statistics.json`
    -   `ethics.json`

## Key Improvements
-   **Decoupling**: Each section now has its own prompt.
-   **Maintainability**: Changing the "Statistics" prompt no longer requires editing a massive TypeScript string.
-   **Context Injection**: The new `prompt_text` uses Handlebars-style `{{variable}}` placeholders which the Orchestrator will fill.

## Validation
-   [x] `templates_en/protocol/*.json` files now contain a `prompt_text` field.
-   [x] The `prompt_text` aligns with ICH E6 requirements derived from the original prompt.

## Next Steps
-   Proceed to Step 4: Create the Section Generator logic (the engine that actually reads these templates and calls the AI).
