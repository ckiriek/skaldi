# 🗺️ User Journey - Complete Flow

## Page Structure

```
/dashboard
  ├── /projects
  │   ├── /new (Create Project Form)
  │   └── /[id] (Project Page)
  │       ├── Tab: Pipeline (GenerationPipeline component)
  │       ├── Tab: Files & Versions
  │       └── Tab: Evidence
  └── /documents/[id] (Document Viewer)
```

---

## 🎯 Complete User Journey

### Step 1: Dashboard → Projects List
**URL**: `/dashboard` or `/dashboard/projects`
- Shows table of projects
- Button: "New Project" → navigates to `/dashboard/projects/new`

### Step 2: Create Project
**URL**: `/dashboard/projects/new`

**Form Fields** (Required):
- Product Type: Radio buttons (innovator/generic/hybrid)
- Project Title: Input
- Compound Name: Autocomplete
- Sponsor: Input
- Phase: Select (Phase 1/2/3/4)
- Indication: Autocomplete

**Submit**: Button "Create Project"
**Result**: Redirects to `/dashboard/projects/{id}`

### Step 3: Project Page (Initial State)
**URL**: `/dashboard/projects/{id}`

**Header**:
- Project title, phase, indication, compound
- Enrichment status badge: "Awaiting Enrichment"
- Button: "Fetch External Data" (visible)

**Alert Box** (Blue):
- "Fetch External Data"
- "Retrieve evidence from ClinicalTrials.gov, PubMed, and openFDA..."

**Tabs**:
1. **Pipeline** (default) - Shows message:
   ```
   "Enrichment Required"
   "Please fetch external data first to enable the document generation pipeline."
   ```
   **NO GenerationPipeline component visible!**

2. **Files & Versions** - Empty state
3. **Evidence** - Empty state

### Step 4: Fetch External Data
**Action**: Click "Fetch External Data" button

**Process**:
1. Opens dialog with progress indicators
2. Fetches from:
   - ClinicalTrials.gov
   - PubMed
   - openFDA
3. Duration: ~30-60 seconds
4. Dialog auto-closes on completion
5. Page refreshes automatically

### Step 5: Project Page (After Data Fetch)
**URL**: `/dashboard/projects/{id}` (same page, refreshed)

**Header**:
- Enrichment status badge: "Data Enriched" ✅

**Alert Box**: REMOVED (no longer shown)

**Tabs**:
1. **Pipeline** - NOW shows `GenerationPipeline` component!
   
   **Pipeline Structure**:
   ```
   Progress Bar: 0%
   
   Step 1: Investigator's Brochure (IB)
   - Status: Ready (white circle)
   - Button: "Generate" ← CLICKABLE!
   
   Step 2: Protocol Synopsis
   - Status: Locked (lock icon)
   - Message: "Complete Investigator's Brochure first"
   
   Step 3: Clinical Protocol
   - Status: Locked
   
   Step 4: Informed Consent (ICF)
   - Status: Locked
   
   Step 5: Statistical Analysis Plan (SAP)
   - Status: Locked
   
   Step 6: Case Report Form (CRF)
   - Status: Locked
   ```

2. **Evidence** - Shows fetched data:
   - Enrichment Data card (trials, publications, labels count)
   - External Evidence card (list of sources)

### Step 6: Generate IB
**Action**: Click "Generate" button on IB step

**Process**:
1. Button changes to "Generating..."
2. Shows rotating phrases:
   - "Compiling preclinical efficacy data..."
   - "Extracting pharmacokinetic parameters..."
   - etc. (15 phrases, 2s each)
3. Duration: ~20-30 seconds
4. On completion:
   - Green checkmark appears
   - Button changes to "View"
   - Progress bar updates to ~17%
   - Next step (Synopsis) unlocks

### Step 7: View IB Document
**Action**: Click "View" button

**Result**: Navigates to `/dashboard/documents/{document_id}`

**Document Viewer Page**:
- Header: Document type, version, status
- Left sidebar: Table of Contents (clickable sections)
- Main content: Markdown document with sections
- Right panel: Actions
  - Button: "Validate"
  - Button: "Export DOCX"
  - Button: "Export PDF" (may be disabled)

### Step 8: Validate Document
**Action**: Click "Validate" button

**Process**:
1. Runs validation (~2-5 seconds)
2. Shows validation results:
   - Total checks
   - Passed/Failed/Warnings
   - List of issues with severity
   - Click on issue → jumps to section

### Step 9: Export Document
**Action**: Click "Export DOCX" button

**Process**:
1. Generates DOCX file
2. Browser downloads file
3. Filename: `{type}_v{version}_{date}.docx`

---

## 🔑 Key Selectors for Testing

### Dashboard
```typescript
'button:has-text("New Project")'
```

### Create Project Form
```typescript
// Title
'input[placeholder*="AST-101 Phase 2 Trial"]'

// Compound (autocomplete)
'input[placeholder*="AST-256"]'

// Sponsor
'input[placeholder*="Biogen"]'

// Indication (autocomplete)
'input[placeholder*="Type 2 Diabetes"]'

// Submit
'button[type="submit"]:has-text("Create Project")'
```

### Project Page
```typescript
// Fetch Data button
'button:has-text("Fetch External Data")'

// Tab: Pipeline
'button[role="tab"]:has-text("Pipeline")'

// Tab: Evidence
'button[role="tab"]:has-text("Evidence")'
```

### Generation Pipeline
```typescript
// Generate IB button
'button:has-text("Generate")' // First one in pipeline

// View IB button (after generation)
'button:has-text("View")' // First one in pipeline

// Or more specific:
'div:has-text("Investigator\'s Brochure") button:has-text("Generate")'
'div:has-text("Investigator\'s Brochure") button:has-text("View")'
```

### Document Viewer
```typescript
// Validate button
'button:has-text("Validate")'

// Export DOCX
'button:has-text("Export DOCX")'

// Export PDF
'button:has-text("Export PDF")'
```

---

## ⚠️ Critical Points

### 1. External Data is REQUIRED
- GenerationPipeline is NOT visible until data is fetched
- Must check `hasExternalData === true`

### 2. Sequential Generation
- IB must be generated before Synopsis
- Synopsis must be generated before Protocol
- etc.

### 3. Page Refreshes
- After fetch data → page auto-refreshes
- After generation → call `router.refresh()`
- May need to wait for refresh to see updated state

### 4. Timing
- Fetch data: 30-60 seconds
- Generate IB: 20-30 seconds
- Validate: 2-5 seconds
- Export: 2-5 seconds

### 5. Autocomplete Fields
- Need to type + wait for dropdown
- Press Enter or click suggestion
- Has 500ms debounce

---

## 🧪 Smoke Test Checklist

- [ ] 1. Navigate to dashboard
- [ ] 2. Click "New Project"
- [ ] 3. Fill form (all required fields)
- [ ] 4. Submit form
- [ ] 5. Verify redirect to project page
- [ ] 6. Verify "Fetch External Data" button visible
- [ ] 7. Click "Fetch External Data"
- [ ] 8. Wait for fetch to complete (~60s)
- [ ] 9. Verify page refreshed
- [ ] 10. Verify enrichment badge shows "Data Enriched"
- [ ] 11. Verify Pipeline tab shows GenerationPipeline
- [ ] 12. Verify IB "Generate" button visible
- [ ] 13. Click "Generate" on IB
- [ ] 14. Wait for generation (~30s)
- [ ] 15. Verify "View" button appears
- [ ] 16. Click "View"
- [ ] 17. Verify document viewer opens
- [ ] 18. Click "Validate"
- [ ] 19. Verify validation results appear
- [ ] 20. Click "Export DOCX"
- [ ] 21. Verify file downloads

---

## 📝 Test Data

```typescript
const TEST_PROJECT = {
  title: `Smoke Test ${Date.now()}`,
  compound: 'Aspirin',
  sponsor: 'Test Pharma Inc',
  phase: 'Phase 2', // default
  indication: 'Hypertension'
}
```
