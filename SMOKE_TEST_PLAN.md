# 🧪 Smoke Test Plan - Based on Real Code

## 📋 Form Structure Analysis

### New Project Form (`/dashboard/projects/new`)

#### Required Fields:
1. **Product Type** (Radio buttons)
   - `innovator` (default)
   - `generic`
   - `hybrid`

2. **Project Title** (`title`)
   - Input field
   - Required
   - Placeholder: "e.g., AST-101 Phase 2 Trial"

3. **Compound / Drug Name** (`compound_name`)
   - FieldAutocomplete component
   - Endpoint: `/api/v1/autocomplete/compounds`
   - Required
   - Placeholder: "e.g., AST-256" or "e.g., Metformin Hydrochloride" (for generic)

4. **Sponsor Organization** (`sponsor`)
   - Input field
   - Required
   - Placeholder: "e.g., Biogen Inc., Pfizer, Novartis"

5. **Phase** (`phase`)
   - Select dropdown
   - Required
   - Options: Phase 1, Phase 2 (default), Phase 3, Phase 4

6. **Indication** (`indication`)
   - FieldAutocomplete component
   - Endpoint: `/api/v1/autocomplete/indications`
   - Required
   - Placeholder: "e.g., Type 2 Diabetes"

#### Optional Fields:
7. **Countries** (`countries`)
   - FieldAutocomplete component
   - Endpoint: `/api/v1/autocomplete/countries`
   - Optional
   - Placeholder: "e.g., USA, Germany, Japan (comma-separated)"

8. **RLD Brand Name** (`rld_brand_name`)
   - Only shown if product_type === 'generic'
   - FieldAutocomplete component
   - Endpoint: `/api/v1/autocomplete/rld?type=brand`
   - Required for generic

#### Study Design Fields:
9. **Design Type** (`design_type`)
   - Select: randomized (default), non-randomized, observational

10. **Blinding** (`blinding`)
    - Select: open-label, single-blind, double-blind (default)

11. **Number of Arms** (`arms`)
    - Number input
    - Default: "2"

12. **Duration (weeks)** (`duration_weeks`)
    - Number input
    - Default: "24"

13. **Primary Endpoint** (`primary_endpoint`)
    - Input field
    - Optional
    - Placeholder: "e.g., Change in HbA1c from baseline at Week 24"

14. **Secondary Endpoints** (`secondary_endpoints`)
    - Input field
    - Optional

15. **Visit Schedule** (`visit_schedule`)
    - Input field
    - Optional

16. **Safety Monitoring** (`safety_monitoring`)
    - Input field
    - Optional

17. **Analysis Populations** (`analysis_populations`)
    - Input field
    - Optional

#### Submit Button:
- Text: "Create Project"
- Loading text: "Creating..."
- Calls: `POST /api/v1/intake`

---

## 🎯 Document Generation Flow

### Project Page (`/dashboard/projects/[id]`)

#### Generation Pipeline Steps (Sequential):
1. **IB** - Investigator's Brochure
2. **Synopsis** - Protocol Synopsis
3. **Protocol** - Clinical Protocol
4. **ICF** - Informed Consent
5. **SAP** - Statistical Analysis Plan
6. **CRF** - Case Report Form

#### Each Step Has:
- **Icon** (Book, FileText, Activity, etc.)
- **Label** (e.g., "Investigator's Brochure")
- **Description**
- **Status**: 
  - Not started (locked if previous not done)
  - Generating (with progress phrases)
  - Completed (with View button)

#### Generation Button:
- Shows "Generate [Type]" when ready
- Shows loading phrases during generation
- Shows "View [Type]" when completed

---

## 🧪 Smoke Test Scenarios

### Scenario 1: Create Project (Minimal)
```typescript
1. Navigate to /dashboard/projects/new
2. Fill required fields:
   - title: "Smoke Test Project {timestamp}"
   - compound_name: "Aspirin" (type and wait for autocomplete)
   - sponsor: "Test Pharma Inc"
   - phase: "Phase 2" (already selected)
   - indication: "Hypertension" (type and wait for autocomplete)
3. Click "Create Project"
4. Wait for redirect to /dashboard/projects/{id}
5. Verify project page loads
```

### Scenario 2: Generate IB
```typescript
1. On project page
2. Find "Investigator's Brochure" step
3. Click "Generate IB" button
4. Wait for generation (20-30s)
   - Should show rotating phrases
   - Should show progress
5. Verify "View IB" button appears
6. Click "View IB"
7. Verify document viewer opens
```

### Scenario 3: Run Validation
```typescript
1. On document viewer page
2. Find "Validate" button
3. Click "Validate"
4. Wait for validation (2-5s)
5. Verify validation results appear
6. Check for:
   - Issues count
   - Severity indicators
   - Issue descriptions
```

### Scenario 4: Export Document
```typescript
1. On document viewer page
2. Find "Export DOCX" button
3. Click "Export DOCX"
4. Wait for download (5s)
5. Verify file downloads
```

---

## 🔍 Key Selectors

### Form Fields:
```typescript
// Product type radio
'input[value="innovator"]'
'input[value="generic"]'
'input[value="hybrid"]'

// Text inputs (by label)
'input' near 'Project Title'
'input' near 'Sponsor Organization'

// Autocomplete fields (FieldAutocomplete component)
// These render as regular inputs but with dropdown
'input[placeholder*="AST-256"]' // compound
'input[placeholder*="Type 2 Diabetes"]' // indication
'input[placeholder*="USA, Germany"]' // countries

// Selects
'select' near 'Phase'
'select' near 'Design Type'
'select' near 'Blinding'

// Number inputs
'input[type="number"]' near 'Number of Arms'
'input[type="number"]' near 'Duration'

// Submit button
'button[type="submit"]'
'button:has-text("Create Project")'
```

### Project Page:
```typescript
// Generation buttons
'button:has-text("Generate IB")'
'button:has-text("Generate Synopsis")'
'button:has-text("View IB")'

// Progress indicators
'text=/Compiling|Extracting|Reviewing/'

// Document cards
'[data-testid="document-card"]' // if we add test IDs
```

### Document Viewer:
```typescript
// Validation button
'button:has-text("Validate")'

// Export buttons
'button:has-text("Export DOCX")'
'button:has-text("Export PDF")'

// Validation results
'[role="alert"]' // for validation issues
'text=/error|warning|info/i'
```

---

## ⚠️ Important Notes

### Autocomplete Fields:
- FieldAutocomplete is a custom component
- Need to type text and wait for dropdown
- May need to click on suggestion or press Enter
- Has debounce (500ms)

### Generation Time:
- IB: ~20-30 seconds
- Synopsis: ~15-20 seconds
- Protocol: ~25-35 seconds
- Other docs: ~15-25 seconds

### Validation:
- Runs quickly (< 5s)
- Returns structured results
- May have 0 issues (that's OK)

### Sequential Dependencies:
- Must generate IB before Synopsis
- Must generate Synopsis before Protocol
- etc.

---

## 🎯 Recommended Test Strategy

### Quick Smoke (5 min):
1. ✅ Create project
2. ✅ Generate IB
3. ✅ View IB
4. ✅ Run validation
5. ✅ Export DOCX

### Full Smoke (15 min):
1. ✅ Create project
2. ✅ Generate IB
3. ✅ Generate Synopsis
4. ✅ Generate Protocol
5. ✅ Validate all
6. ✅ Export all
7. ✅ Check external data

---

## 📝 Next Steps

1. Update `e2e/smoke.spec.ts` with correct selectors
2. Handle autocomplete properly (type + wait + select)
3. Add proper waits for generation
4. Handle sequential dependencies
5. Add assertions for each step
