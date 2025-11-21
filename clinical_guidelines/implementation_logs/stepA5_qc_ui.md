# Step A5: QC Results UI

**Date:** 2025-11-20
**Status:** Pending (depends on Step A4 testing)

## Objective

Create UI components to display QC validation results on document detail pages, showing:
-   Validation status (passed/failed)
-   List of issues with severity levels
-   Section-specific error locations
-   Validation metrics (score, rules passed/failed)

## Planned Components

### 1. ValidationResultsCard
**Location:** `components/documents/validation-results-card.tsx`

**Features:**
-   Summary header with pass/fail status badge
-   Overall score display
-   Breakdown of errors/warnings/info
-   Expandable issue list

**Props:**
```typescript
interface ValidationResultsCardProps {
  validation: {
    passed: boolean
    issues: Array<{
      section_id?: string
      rule_id: string
      severity: 'error' | 'warning' | 'info'
      message: string
    }>
  }
  documentType: string
}
```

### 2. ValidationIssueItem
**Location:** `components/documents/validation-issue-item.tsx`

**Features:**
-   Icon based on severity (❌ error, ⚠️ warning, ℹ️ info)
-   Issue message
-   Section link (clickable, scrolls to section in document viewer)
-   Rule ID tooltip

### 3. Integration Points

#### Document Detail Page
**File:** `app/dashboard/projects/[projectId]/documents/[documentId]/page.tsx`

Add new tab: "Validation"
```tsx
<Tabs defaultValue="content">
  <TabsList>
    <TabsTrigger value="content">Content</TabsTrigger>
    <TabsTrigger value="validation">Validation</TabsTrigger>
    <TabsTrigger value="history">History</TabsTrigger>
  </TabsList>
  
  <TabsContent value="validation">
    <ValidationResultsCard validation={document.validation} />
  </TabsContent>
</Tabs>
```

#### Generation Pipeline
**File:** `components/generation-pipeline.tsx`

Show validation results immediately after generation:
```tsx
{generationResult?.validation && (
  <ValidationResultsCard 
    validation={generationResult.validation}
    documentType={documentType}
  />
)}
```

## UI Design

### Validation Summary
```
┌─────────────────────────────────────────┐
│ ✅ Validation Passed                    │
│                                         │
│ Score: 95%                              │
│ ✅ 18 checks passed                     │
│ ⚠️  2 warnings                          │
│ ❌ 0 errors                             │
└─────────────────────────────────────────┘
```

### Issue List
```
┌─────────────────────────────────────────┐
│ ⚠️  Warning                             │
│ Synopsis objectives should match        │
│ Section 7 objectives                    │
│ Section: protocol_synopsis              │
│ Rule: consistency-objectives            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ℹ️  Info                                │
│ Consider adding sample size             │
│ justification                           │
│ Section: protocol_statistics            │
│ Rule: statistics-sample-size            │
└─────────────────────────────────────────┘
```

## Color Scheme

-   **Error:** Red (`text-red-600`, `bg-red-50`, `border-red-200`)
-   **Warning:** Amber (`text-amber-600`, `bg-amber-50`, `border-amber-200`)
-   **Info:** Blue (`text-blue-600`, `bg-blue-50`, `border-blue-200`)
-   **Success:** Green (`text-green-600`, `bg-green-50`, `border-green-200`)

## Implementation Steps

1.  **Create ValidationResultsCard component**
    -   Summary header
    -   Metrics display
    -   Issue list

2.  **Create ValidationIssueItem component**
    -   Severity icon
    -   Message
    -   Section link
    -   Rule tooltip

3.  **Update Document Detail Page**
    -   Add Validation tab
    -   Fetch validation results from DB
    -   Display ValidationResultsCard

4.  **Update Generation Pipeline**
    -   Show validation results after generation
    -   Highlight critical errors
    -   Provide "Fix Issues" action

5.  **Add Section Navigation**
    -   Clicking issue navigates to section in document viewer
    -   Highlight problematic section

## Database Query

```typescript
// Fetch validation results for a document
const { data: validation } = await supabase
  .from('validation_results')
  .select('*')
  .eq('document_id', documentId)
  .order('validation_date', { ascending: false })
  .limit(1)
  .single()
```

## Testing Checklist

-   [ ] Validation tab appears on document detail page
-   [ ] Summary shows correct pass/fail status
-   [ ] Issues grouped by severity
-   [ ] Section links work (scroll to section)
-   [ ] Rule tooltips display
-   [ ] Empty state when no issues
-   [ ] Loading state while fetching
-   [ ] Error state if validation failed to run

## Next Steps After Implementation

1.  Test with real validation results from Step A4
2.  Add filtering (by severity, by section)
3.  Add export functionality (PDF report)
4.  Add "Re-validate" button
5.  Add validation history timeline

---

**Status:** ⏸️ Paused (waiting for Step A4 testing to complete and identify actual validation result structure)
