# 🚀 Phase H.UI v3-v4: FULL INTEGRATION PLAN

**Goal**: Вывести все backend движки на UI пульт управления  
**Time**: 7-10 hours  
**Status**: NOT STARTED

---

## 🎯 OVERVIEW

**Что делаем**: Интегрируем существующие компоненты в user flow  
**Что НЕ делаем**: Новые движки, новые API, рефакторинг backend

**Принцип**: Все backend готово → просто подключаем UI

---

## 📋 TASK BREAKDOWN

### **BLOCK 1: Protocol Editor Integration** (2-3h)

#### Task 1.1: Create Protocol Editor Route (30min)
**File**: `/app/dashboard/projects/[id]/protocol/page.tsx`

```typescript
'use client'

import { ProtocolEditor } from '@/components/protocol-editor/ProtocolEditor'
import { useParams } from 'next/navigation'

export default function ProtocolEditorPage() {
  const params = useParams()
  const projectId = params.id as string
  
  return (
    <div className="h-screen">
      <ProtocolEditor projectId={projectId} />
    </div>
  )
}
```

**Acceptance Criteria**:
- ✅ Route `/dashboard/projects/[id]/protocol` works
- ✅ ProtocolEditor component renders
- ✅ No console errors

---

#### Task 1.2: Add "Edit Protocol" Button (30min)
**File**: `/app/dashboard/projects/[id]/page.tsx`

**Changes**:
1. Find Protocol document card
2. Add button "Edit with AI"
3. Link to `/dashboard/projects/[id]/protocol`

**UI**:
```tsx
<Button 
  variant="outline" 
  onClick={() => router.push(`/dashboard/projects/${projectId}/protocol`)}
>
  <Edit className="h-4 w-4 mr-2" />
  Edit with AI
</Button>
```

**Acceptance Criteria**:
- ✅ Button visible on Protocol card
- ✅ Clicking opens Protocol Editor
- ✅ Back navigation works

---

#### Task 1.3: Add Autosave (30min)
**File**: `/components/protocol-editor/ProtocolEditor.tsx`

**Changes**:
```typescript
// Add debounced save
const debouncedSave = useMemo(
  () => debounce(async (sections: Record<ProtocolSectionId, string>) => {
    await fetch(`/api/projects/${projectId}/protocol`, {
      method: 'PUT',
      body: JSON.stringify({ sections })
    })
  }, 2000),
  [projectId]
)

useEffect(() => {
  debouncedSave(sectionTexts)
}, [sectionTexts])
```

**Acceptance Criteria**:
- ✅ Changes save automatically after 2s
- ✅ "Saving..." indicator shows
- ✅ "Saved" confirmation shows

---

#### Task 1.4: Add Inline Completion (1h)
**File**: `/components/protocol-editor/InlineCompletion.tsx`

**New Component**:
```typescript
export function InlineCompletion({ 
  currentText, 
  cursorPosition,
  onAccept 
}: Props) {
  const [completion, setCompletion] = useState<string | null>(null)
  
  // Fetch completion from Azure OpenAI
  useEffect(() => {
    fetchCompletion()
  }, [currentText, cursorPosition])
  
  // Show ghost text
  return completion ? (
    <span className="text-muted-foreground">
      {completion}
    </span>
  ) : null
}
```

**Integration**:
- Add to Textarea
- Trigger on typing pause (500ms)
- Accept with Tab key

**Acceptance Criteria**:
- ✅ Ghost text appears after typing pause
- ✅ Tab accepts completion
- ✅ Esc dismisses
- ✅ Azure OpenAI called

---

#### Task 1.5: Add Snippet Preview Panel (30min)
**File**: `/components/protocol-editor/SnippetPreviewPanel.tsx`

**UI**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>From Reference Protocols</CardTitle>
  </CardHeader>
  <CardContent>
    {snippets.map(snippet => (
      <div key={snippet.id}>
        <Badge>{snippet.source}</Badge>
        <p className="text-sm">{snippet.text}</p>
        <div className="text-xs text-muted-foreground">
          Similarity: {Math.round(snippet.similarity * 100)}%
        </div>
        <Button size="sm" onClick={() => insertSnippet(snippet)}>
          Insert
        </Button>
      </div>
    ))}
  </CardContent>
</Card>
```

**Acceptance Criteria**:
- ✅ Shows snippets from RAG
- ✅ Shows source file name
- ✅ Shows similarity score
- ✅ "Insert" button works

---

### **BLOCK 2: Study Designer Integration** (2-3h)

#### Task 2.1: Create Study Designer Route (30min)
**File**: `/app/dashboard/study-designer/new/page.tsx`

```typescript
'use client'

import { StudyDesignerWizard } from '@/components/study-designer/StudyDesignerWizard'

export default function StudyDesignerPage() {
  return (
    <div className="container mx-auto py-8">
      <StudyDesignerWizard />
    </div>
  )
}
```

**Acceptance Criteria**:
- ✅ Route `/dashboard/study-designer/new` works
- ✅ Wizard renders
- ✅ No console errors

---

#### Task 2.2: Add "Use Study Designer" Option (30min)
**File**: `/app/dashboard/projects/new/page.tsx`

**Changes**:
1. Add toggle "Use AI Study Designer"
2. If enabled → redirect to wizard
3. If disabled → show current form

**UI**:
```tsx
<div className="mb-6">
  <Label>
    <input type="checkbox" checked={useWizard} onChange={...} />
    Use AI Study Designer (Recommended)
  </Label>
  <p className="text-sm text-muted-foreground">
    Generate complete study design from minimal input
  </p>
</div>

{useWizard ? (
  <Button onClick={() => router.push('/dashboard/study-designer/new')}>
    Launch Study Designer
  </Button>
) : (
  // Current form
)}
```

**Acceptance Criteria**:
- ✅ Toggle visible
- ✅ Clicking launches wizard
- ✅ Can still use old form

---

#### Task 2.3: Add Visit Schedule Preview (1h)
**File**: `/components/study-designer/VisitSchedulePreview.tsx`

**New Component**:
```typescript
export function VisitSchedulePreview({ visits }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visit Schedule Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {visits.map(visit => (
            <div key={visit.id} className="flex items-center gap-4">
              <Badge>{visit.name}</Badge>
              <span className="text-sm">Week {visit.week}</span>
              <span className="text-xs text-muted-foreground">
                {visit.procedures.length} procedures
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

**Integration**:
- Add to Step 4 of wizard
- Fetch from `/api/study-designer/preview`
- Show before final generation

**Acceptance Criteria**:
- ✅ Shows visit schedule
- ✅ Shows procedure count
- ✅ Updates when parameters change

---

#### Task 2.4: Add Sample Size Preview (30min)
**File**: `/components/study-designer/SampleSizePreview.tsx`

**UI**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Sample Size Calculation</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div>
        <span className="font-semibold">Total: </span>
        {sampleSize.total} patients
      </div>
      <div>
        <span className="font-semibold">Per Arm: </span>
        {sampleSize.perArm} patients
      </div>
      <div className="text-sm text-muted-foreground">
        Assumptions: α={assumptions.alpha}, Power={assumptions.power}
      </div>
    </div>
  </CardContent>
</Card>
```

**Acceptance Criteria**:
- ✅ Shows total sample size
- ✅ Shows per-arm breakdown
- ✅ Shows assumptions

---

#### Task 2.5: Add Progress Indicator (30min)
**File**: `/components/study-designer/GenerationProgress.tsx`

**UI**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Generating Study Design...</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {steps.map(step => (
        <div key={step.id} className="flex items-center gap-2">
          {step.status === 'done' && <CheckCircle2 className="text-green-500" />}
          {step.status === 'running' && <Loader2 className="animate-spin" />}
          {step.status === 'pending' && <Circle className="text-muted" />}
          <span>{step.label}</span>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

**Steps**:
1. Normalizing formulation
2. Building Knowledge Graph
3. Selecting endpoints
4. Calculating sample size
5. Generating study flow
6. Creating documents

**Acceptance Criteria**:
- ✅ Shows current step
- ✅ Updates in real-time
- ✅ Shows completion

---

### **BLOCK 3: KG Viewer** (1-2h)

#### Task 3.1: Create KG Viewer Component (1h)
**File**: `/components/knowledge/KGViewer.tsx`

**UI**:
```tsx
export function KGViewer({ inn }: Props) {
  const [kgData, setKgData] = useState<KGSnapshot | null>(null)
  
  return (
    <Tabs defaultValue="indications">
      <TabsList>
        <TabsTrigger value="indications">Indications</TabsTrigger>
        <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
        <TabsTrigger value="formulations">Formulations</TabsTrigger>
        <TabsTrigger value="sources">Sources</TabsTrigger>
      </TabsList>
      
      <TabsContent value="indications">
        {indications.map(indication => (
          <Card key={indication.id}>
            <CardHeader>
              <CardTitle>{indication.text}</CardTitle>
              <Badge>Confidence: {indication.confidence}%</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">Sources:</span>
                  {indication.sources.map(source => (
                    <KGSourceBadge key={source} source={source} />
                  ))}
                </div>
                {indication.icd10 && (
                  <div>
                    <span className="font-semibold">ICD-10:</span> {indication.icd10}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
      
      {/* Similar for other tabs */}
    </Tabs>
  )
}
```

**Acceptance Criteria**:
- ✅ Shows all KG entities
- ✅ Shows confidence scores
- ✅ Shows sources
- ✅ Tabs work

---

#### Task 3.2: Add KG Viewer to Project Page (30min)
**File**: `/app/dashboard/projects/[id]/page.tsx`

**Changes**:
1. Add "View Knowledge Graph" button
2. Open modal with KGViewer
3. Pass compound INN

**Acceptance Criteria**:
- ✅ Button visible
- ✅ Modal opens
- ✅ Shows KG data

---

### **BLOCK 4: RAG UI** (1h)

#### Task 4.1: Add Snippet Panel to Protocol Editor (1h)
**File**: `/components/protocol-editor/ProtocolEditor.tsx`

**Changes**:
1. Add 4th panel (bottom or right)
2. Show RAG snippets
3. Add "Insert" buttons
4. Show source file + line numbers

**UI**:
```tsx
<div className="border-t p-4">
  <h3 className="font-semibold mb-3">Reference Snippets</h3>
  <div className="space-y-2">
    {snippets.map(snippet => (
      <Card key={snippet.id}>
        <CardContent className="p-3">
          <div className="text-xs text-muted-foreground mb-1">
            From: {snippet.source} (line {snippet.lineNumber})
          </div>
          <p className="text-sm mb-2">{snippet.text}</p>
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {Math.round(snippet.similarity * 100)}% match
            </Badge>
            <Button size="sm" onClick={() => insertSnippet(snippet)}>
              Insert
            </Button>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
</div>
```

**Acceptance Criteria**:
- ✅ Shows snippets from RAG
- ✅ Shows source file
- ✅ Shows similarity
- ✅ Insert works

---

### **BLOCK 5: Full Workflow** (1h)

#### Task 5.1: Connect All Components (30min)

**Flow**:
```
1. Dashboard → "New Project"
2. Toggle "Use AI Study Designer"
3. Study Designer Wizard (4 steps)
   - Shows visit preview
   - Shows sample size
   - Shows progress
4. Project created with documents
5. Click "Edit Protocol"
6. Protocol Editor opens
   - AI suggestions
   - RAG snippets
   - Inline completion
   - Regulatory hints
7. Auto-save
8. Validate → Auto-fix
9. Export
```

**Acceptance Criteria**:
- ✅ All steps work
- ✅ No broken links
- ✅ Data flows correctly

---

#### Task 5.2: Add "Regenerate Section" (30min)
**File**: `/components/protocol-editor/ProtocolEditor.tsx`

**Changes**:
1. Add button "Regenerate" per section
2. Call `/api/protocol/suggest` with `regenerate: true`
3. Replace section text

**UI**:
```tsx
<Button 
  size="sm" 
  variant="outline"
  onClick={() => regenerateSection(currentSection)}
>
  <RefreshCw className="h-4 w-4 mr-2" />
  Regenerate
</Button>
```

**Acceptance Criteria**:
- ✅ Button visible
- ✅ Regenerates section
- ✅ Shows loading state

---

## 📊 PROGRESS TRACKING

### Block 1: Protocol Editor (2-3h)
- [ ] Task 1.1: Create route (30min)
- [ ] Task 1.2: Add button (30min)
- [ ] Task 1.3: Autosave (30min)
- [ ] Task 1.4: Inline completion (1h)
- [ ] Task 1.5: Snippet preview (30min)

### Block 2: Study Designer (2-3h)
- [ ] Task 2.1: Create route (30min)
- [ ] Task 2.2: Add toggle (30min)
- [ ] Task 2.3: Visit preview (1h)
- [ ] Task 2.4: Sample size preview (30min)
- [ ] Task 2.5: Progress indicator (30min)

### Block 3: KG Viewer (1-2h)
- [ ] Task 3.1: Create component (1h)
- [ ] Task 3.2: Add to project page (30min)

### Block 4: RAG UI (1h)
- [ ] Task 4.1: Snippet panel (1h)

### Block 5: Full Workflow (1h)
- [ ] Task 5.1: Connect all (30min)
- [ ] Task 5.2: Regenerate section (30min)

---

## 🎯 ACCEPTANCE CRITERIA (Overall)

### User Can:
- ✅ Use Study Designer wizard from project creation
- ✅ See visit schedule preview before generation
- ✅ See sample size calculation
- ✅ Edit protocol with AI after generation
- ✅ See AI suggestions in real-time
- ✅ See RAG snippets from references
- ✅ Use inline completion (Copilot-style)
- ✅ See regulatory hints
- ✅ Insert snippets with one click
- ✅ Regenerate sections
- ✅ Auto-save changes
- ✅ View Knowledge Graph data
- ✅ See sources and confidence scores

### Technical:
- ✅ All routes work
- ✅ All components connected
- ✅ No console errors
- ✅ Data flows correctly
- ✅ APIs called properly
- ✅ Performance acceptable (<2s load)

---

## 🚀 DEPLOYMENT

### After Completion:
1. Test full workflow end-to-end
2. Fix any bugs
3. Update documentation
4. Deploy to production
5. **Ready for pilots** 🎉

---

## 💡 NOTES

### What We're NOT Doing:
- ❌ New engines
- ❌ New APIs
- ❌ Backend refactoring
- ❌ Performance optimization
- ❌ New features

### What We're Doing:
- ✅ UI integration only
- ✅ Connecting existing components
- ✅ User flow completion
- ✅ Making product usable

### Principle:
**"Вывести реактор на пульт управления"** - не строить новый реактор, а добавить кнопки и дисплеи.

---

*Total Time: 7-10 hours*  
*Result: Product ready for pilots* 🚀
