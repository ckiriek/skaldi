# System Design & Architecture

## 1. Data Entry – Clinical Parameters

### 1.1. Current Collection Forms
The primary data entry point is the **New Project Wizard** (`app/dashboard/projects/new/page.tsx`).

**Captured Fields:**
-   **General**: Title, Sponsor, Phase, Indication, Countries.
-   **Product**: Type (Innovator/Generic/Hybrid), Compound Name, RLD Brand Name.
-   **Study Design**: Design Type (Rand/Non-Rand/Obs), Blinding, Arms (Count), Duration (Weeks).
-   **Endpoints**: Primary Endpoint (Single text field).

### 1.2. Mapping to Document Types
| Parameter | Protocol | IB | CSR | Synopsis | ICF |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Compound Name | ✅ | ✅ | ✅ | ✅ | ✅ |
| Indication | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phase | ✅ | - | ✅ | ✅ | - |
| Design/Blinding | ✅ | - | ✅ | ✅ | ✅ |
| Primary Endpoint | ✅ | - | ✅ | ✅ | - |
| RLD (Generics) | ✅ | ✅ | - | ✅ | - |

### 1.3. Critical Data Gaps
The following fields are **required** for robust template-based generation but are currently **missing** from the UI:

1.  **Study Population Details**:
    -   Age range (Adult vs Paediatric templates).
    -   Gender/Key Inclusion criteria beyond indication.
2.  **Detailed Treatment Regimen**:
    -   Dose strength, Frequency, Route of administration.
    -   Comparator details (Placebo vs Active).
3.  **Visit Schedule**:
    -   Number of visits, key timepoints.
4.  **Safety Monitoring**:
    -   Key safety labs or assessments.
5.  **Secondary Endpoints**:
    -   Currently only capturing Primary.
6.  **Statistical Hypotheses**:
    -   Superiority vs Non-inferiority margins.

## 2. Backwards Compatibility and Risk Notes

### 2.1. Critical Flows (Do Not Break)
-   **Existing Projects**: Projects created before the migration must still be accessible.
-   **Generated Documents**: Existing documents in `documents` table must remain viewable even if templates change.
-   **Generic Drug Workflow**: The auto-enrichment logic (fetching RLD data) is a key differentiator. Changes to `ComposerAgent` must support the existing context schema.

### 2.2. High-Risk Areas
-   **Prompt Migration**: Moving from monolithic `protocol-prompt.ts` to granular templates may result in loss of coherence between sections if context isn't passed correctly.
-   **Supabase Edge Function**: `generate-document` likely relies on specific payload structures. Changing the Orchestrator payload without updating the Edge Function will break generation.
-   **UI Forms**: Adding required fields to forms must be done carefully to not break existing "draft" projects that are missing those fields.

### 2.3. Guard Rails
-   **Feature Flags**: Roll out template-driven generation per document type (start with Protocol, then IB).
-   **Fallback**: Keep existing `WriterAgent` logic as a fallback if granular generation fails.
-   **Validation**: Ensure `ValidatorAgent` runs in "permissive" mode for legacy documents.

