# Step 2: Template Expansion

**Date:** 2025-11-20
**Status:** Completed

## Actions Taken
1.  Populated `templates_en/` with granular JSON templates for all supported document types.
2.  **Investigator's Brochure (IB)**:
    -   `title_page`, `summary`, `introduction`, `properties`, `nonclinical`, `human_effects`, `guidance`.
3.  **Informed Consent Form (ICF)**:
    -   `header`, `introduction`, `procedures`, `risks`, `benefits`, `confidentiality`, `signature`.
4.  **Protocol Synopsis**:
    -   `title`, `rationale`, `objectives`, `design`, `treatment`, `endpoints`, `statistics`.
5.  **Product Summary (SPC)**:
    -   `name`, `composition`, `clinical`, `pharmacological`, `pharmaceutical`, `admin`.

## Validation
-   [x] All folders in `templates_en/` are populated.
-   [x] JSON files contain required fields (`document_type`, `section_id`, `expected_inputs`).
-   [x] Structure matches the Section Maps defined in `templates.md`.

## Next Steps
-   Proceed to Step 3: Migrate monolithic prompts (like `protocol-prompt.ts`) into these new granular templates.
