# Step 6: UI Expansion for Missing Clinical Parameters

**Date:** 2025-11-20
**Status:** Completed

## Actions Taken
1.  **Modified New Project Form**: `app/dashboard/projects/new/page.tsx`
    -   Added 4 new optional fields to form state:
        -   `visit_schedule`: Key visit timepoints (e.g., Screening, Baseline, Week 4, Week 12, Week 24)
        -   `safety_monitoring`: Key safety assessments (e.g., Vital signs, ECG, laboratory tests)
        -   `secondary_endpoints`: Secondary endpoints (semicolon-separated)
        -   `analysis_populations`: Analysis sets (e.g., ITT, PP, Safety)
    -   Included these fields in the `design_json` payload sent to the Intake Agent API.
    -   Added UI inputs after the Primary Endpoint field with clear placeholders and help text.

## Design Decisions
-   **Optional Fields**: All new fields are optional to maintain backwards compatibility with existing projects.
-   **No Breaking Changes**: Existing projects without these fields will continue to work.
-   **Minimal UI**: Added only the essential fields identified in `system.md` as missing.
-   **Clear Guidance**: Each field includes placeholder text and help text to guide users.

## Backwards Compatibility
-   Existing projects created before this change will have empty values for these fields.
-   The Intake Agent and downstream services should handle missing values gracefully.
-   Default values (e.g., "ITT, PP, Safety" for populations) can be applied at generation time if not provided.

## Validation
-   [x] Form state updated with new fields.
-   [x] API payload includes new parameters.
-   [x] UI fields added with appropriate styling and help text.
-   [x] No breaking changes to existing API contracts.

## Next Steps
-   Proceed to Step 7: Update orchestration documentation to reflect the new template-driven architecture.
