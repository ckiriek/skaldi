# 🚀 Phase H.UI - Sprint Plan

**Based on**: PHASE_H_UI_FULL_ROADMAP.md  
**Target**: Next.js 14 / Supabase / Azure OpenAI  
**Total Duration**: 4 sprints (2 weeks)  
**Status**: READY TO START

---

## 📊 SPRINT OVERVIEW

| Sprint | Duration | Focus | Deliverables |
|--------|----------|-------|--------------|
| **Sprint 1** | 3-4 days | Foundation & Smart Fields | Project UI + Smart Fields complete |
| **Sprint 2** | 3-4 days | Study Designer Wizard | AI Study Designer working end-to-end |
| **Sprint 3** | 3-4 days | Protocol Editor | AI Protocol Editor with suggestions |
| **Sprint 4** | 2-3 days | Integration & Polish | Full workflow + testing |

---

## 🎯 SPRINT 1: FOUNDATION & SMART FIELDS (3-4 days)

**Goal**: Стабилизировать Project UI и довести Smart Fields до production-ready состояния

### Day 1: Project UI Structure (6-8h)

#### Task 1.1: ProjectTabs Component (2h)
**File**: `/components/project/ProjectTabs.tsx`

**Requirements**:
- Tabs: Overview / Documents / Study Flow / Cross-Doc / Protocol Editor
- Active state management
- Route integration
- Responsive design

**Acceptance Criteria**:
- ✅ All tabs render
- ✅ Active tab highlights
- ✅ Navigation works
- ✅ Mobile responsive

---

#### Task 1.2: ProjectHeader Component (1h)
**File**: `/components/project/ProjectHeader.tsx`

**Requirements**:
- Project title + metadata
- Status badge
- Action buttons (Edit, Export, Settings)
- Breadcrumbs

**Acceptance Criteria**:
- ✅ Shows project info
- ✅ Buttons functional
- ✅ Matches design system

---

#### Task 1.3: Update Project Detail Page (2h)
**File**: `/app/dashboard/projects/[id]/page.tsx`

**Changes**:
- Integrate ProjectHeader
- Integrate ProjectTabs
- Add tab content routing
- Update layout

**Acceptance Criteria**:
- ✅ Header shows
- ✅ Tabs work
- ✅ Content switches
- ✅ No layout breaks

---

#### Task 1.4: Project Overview Tab (1-2h)
**File**: `/components/project/ProjectOverview.tsx`

**Content**:
- Project metadata cards
- Recent activity
- Quick stats
- Document status summary

**Acceptance Criteria**:
- ✅ Shows all metadata
- ✅ Cards responsive
- ✅ Stats accurate

---

### Day 2: Smart Fields Enhancement (6-8h)

#### Task 2.1: EndpointSmartField Component (2-3h)
**File**: `/components/smart-fields/EndpointSmartField.tsx`

**Requirements**:
- Fetch from `/api/knowledge/endpoints`
- Show endpoint type (continuous/binary/time-to-event)
- Show typical timepoint
- ML ranking display
- Confidence badges

**Integration**:
```typescript
<EndpointSmartField
  projectId={projectId}
  indication={indication}
  phase={phase}
  value={primaryEndpoint}
  onChange={setPrimaryEndpoint}
  label="Primary Endpoint"
/>
```

**Acceptance Criteria**:
- ✅ Fetches endpoints from KG
- ✅ Shows ranked suggestions
- ✅ Displays confidence scores
- ✅ Shows endpoint type
- ✅ Saves selection

---

#### Task 2.2: SafetySmartField Component (2h)
**File**: `/components/smart-fields/SafetySmartField.tsx`

**Requirements**:
- Suggest safety assessments (vitals, ECG, labs, AE monitoring)
- Multi-select chips
- Standard procedures from KG
- Phase-appropriate suggestions

**Acceptance Criteria**:
- ✅ Shows safety procedures
- ✅ Multi-select works
- ✅ Phase-filtered
- ✅ Saves to project

---

#### Task 2.3: Update Project Creation Form (2-3h)
**File**: `/app/dashboard/projects/new/page.tsx`

**Changes**:
- Add EndpointSmartField for primary endpoint
- Add EndpointSmartField for secondary endpoints (multi)
- Add SafetySmartField
- Add Analysis Populations field
- Update form validation
- Update save logic

**Acceptance Criteria**:
- ✅ All smart fields integrated
- ✅ Form validates
- ✅ Saves to database
- ✅ KG data flows correctly

---

### Day 3: Knowledge Graph UI (6-8h)

#### Task 3.1: KnowledgeGraphPanel Component (3-4h)
**File**: `/components/knowledge/KnowledgeGraphPanel.tsx`

**Requirements**:
- Tabs: Indications / Endpoints / Formulations / Sources
- Show confidence scores
- Show sources (FDA, EMA, CT.gov, DailyMed)
- Drill-down into entities
- Export data

**UI Structure**:
```tsx
<Tabs>
  <TabsList>
    <TabsTrigger value="indications">Indications</TabsTrigger>
    <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
    <TabsTrigger value="formulations">Formulations</TabsTrigger>
    <TabsTrigger value="sources">Sources</TabsTrigger>
  </TabsList>
  
  <TabsContent value="indications">
    {indications.map(indication => (
      <Card>
        <CardHeader>
          <CardTitle>{indication.text}</CardTitle>
          <Badge>Confidence: {indication.confidence}%</Badge>
        </CardHeader>
        <CardContent>
          <div>Sources: {indication.sources.map(...)}</div>
          <div>ICD-10: {indication.icd10}</div>
        </CardContent>
      </Card>
    ))}
  </TabsContent>
</Tabs>
```

**Acceptance Criteria**:
- ✅ All tabs work
- ✅ Shows KG data
- ✅ Confidence scores visible
- ✅ Sources displayed
- ✅ Drill-down works

---

#### Task 3.2: SuggestionsList & SuggestionItem (2h)
**Files**: 
- `/components/knowledge/SuggestionsList.tsx`
- `/components/knowledge/SuggestionItem.tsx`

**Requirements**:
- Reusable suggestion list component
- Item with confidence badge
- Source badges
- Apply button
- Hover preview

**Acceptance Criteria**:
- ✅ Renders suggestions
- ✅ Shows confidence
- ✅ Shows sources
- ✅ Apply works
- ✅ Reusable

---

#### Task 3.3: Add KG Panel to Project Page (1-2h)
**File**: `/app/dashboard/projects/[id]/page.tsx`

**Changes**:
- Add "View Knowledge Graph" button
- Open modal/drawer with KnowledgeGraphPanel
- Pass compound INN
- Fetch KG data

**Acceptance Criteria**:
- ✅ Button visible
- ✅ Modal opens
- ✅ Shows KG data
- ✅ Closes properly

---

### Day 4: Testing & Polish (4-6h)

#### Task 4.1: Smart Fields Tests (2h)
**Files**: 
- `/__tests__/smart-fields/endpoint.test.ts`
- `/__tests__/smart-fields/safety.test.ts`

**Tests**:
- Fetch suggestions
- Ranking works
- Selection saves
- Validation

---

#### Task 4.2: Integration Testing (2h)
**File**: `/__tests__/integration/project-creation.test.ts`

**Scenarios**:
- Create project with all smart fields
- KG data flows correctly
- Form validation
- Save to database

---

#### Task 4.3: UI Polish (2h)
- Fix responsive issues
- Add loading states
- Add error handling
- Add empty states
- Update documentation

---

## 🎯 SPRINT 2: STUDY DESIGNER WIZARD (3-4 days)

**Goal**: Реализовать AI Study Designer Wizard end-to-end

### Day 1: Backend Orchestration (6-8h)

#### Task 1.1: Study Designer Types (1h)
**File**: `/lib/engine/study-designer/types.ts`

```typescript
export interface StudyDesignerInput {
  // Step 1: Drug & Indication
  compound: string
  indication: string
  phase: string
  populationNotes?: string
  
  // Step 2: Strategy
  objectiveType: 'superiority' | 'non-inferiority' | 'equivalence' | 'safety' | 'pk'
  comparator: 'placebo' | 'active' | 'add-on' | 'single-arm'
  blinding: 'open' | 'single' | 'double'
  randomization: boolean
  
  // Step 3: Constraints
  durationWeeks: number
  targetSampleSize?: number
  budgetLevel: 'low' | 'medium' | 'high'
  regulatoryFocus: 'fda' | 'ema' | 'both' | 'generic'
  
  // Step 4: Outputs
  generateProtocol: boolean
  generateIB: boolean
  generateSAP: boolean
  generateICF: boolean
  detailLevel: 'skeleton' | 'full-draft'
}

export interface StudyDesignerOutput {
  projectId: string
  documents: {
    protocolId?: string
    ibId?: string
    sapId?: string
    icfId?: string
  }
  studyFlowId: string
  statsSummary: {
    totalSampleSize: number
    perArm: number
    alpha: number
    power: number
    assumptions: Record<string, any>
  }
  visitSchedule: {
    visits: Array<{
      name: string
      week: number
      window?: string
      procedures: string[]
    }>
    totalDuration: number
  }
  warnings: Array<{
    code: string
    message: string
    severity: 'info' | 'warning' | 'error'
  }>
}
```

---

#### Task 1.2: Study Designer Orchestrator (3-4h)
**File**: `/lib/engine/study-designer/orchestrator.ts`

**Pipeline**:
```typescript
export async function runStudyDesigner(
  input: StudyDesignerInput
): Promise<StudyDesignerOutput> {
  // 1. Normalize formulation
  const formulation = await normalizeFormulation(input.compound)
  
  // 2. Build Knowledge Graph
  const kg = await buildKnowledgeGraph(formulation.apiName)
  
  // 3. Select endpoints (ML ranking)
  const endpoints = await selectEndpoints(kg, input.indication, input.phase)
  
  // 4. Calculate sample size
  const stats = await calculateSampleSize({
    phase: input.phase,
    objectiveType: input.objectiveType,
    budgetLevel: input.budgetLevel
  })
  
  // 5. Generate study flow
  const studyFlow = await generateStudyFlow({
    phase: input.phase,
    duration: input.durationWeeks,
    budgetLevel: input.budgetLevel,
    indication: input.indication
  })
  
  // 6. Create project
  const project = await createProject({
    compound: formulation,
    indication: input.indication,
    phase: input.phase,
    endpoints,
    sampleSize: stats.totalSampleSize
  })
  
  // 7. Generate documents
  const documents = await generateDocuments(project.id, input)
  
  // 8. Save study flow
  await saveStudyFlow(project.id, studyFlow)
  
  return {
    projectId: project.id,
    documents,
    studyFlowId: studyFlow.id,
    statsSummary: stats,
    visitSchedule: studyFlow.visitSchedule,
    warnings: []
  }
}
```

**Acceptance Criteria**:
- ✅ All steps execute
- ✅ Error handling
- ✅ Returns complete output
- ✅ Saves to database

---

#### Task 1.3: API Endpoint (2h)
**File**: `/app/api/study-designer/run/route.ts`

```typescript
export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  // Parse input
  const input: StudyDesignerInput = await request.json()
  
  // Validate
  const validation = validateStudyDesignerInput(input)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors }, { status: 400 })
  }
  
  // Run orchestrator
  try {
    const result = await runStudyDesigner(input)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Study Designer failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
```

**Acceptance Criteria**:
- ✅ Auth works
- ✅ Validation works
- ✅ Calls orchestrator
- ✅ Returns result
- ✅ Error handling

---

### Day 2: Wizard UI Components (6-8h)

#### Task 2.1: Wizard Shell (2h)
**File**: `/components/study-designer/StudyDesignerWizard.tsx`

```typescript
export function StudyDesignerWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<StudyDesignerInput>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<StudyDesignerOutput | null>(null)
  
  const steps = [
    { id: 1, title: 'Drug & Indication', component: StepDrugIndication },
    { id: 2, title: 'Study Strategy', component: StepStudyStrategy },
    { id: 3, title: 'Constraints & Risk', component: StepRiskRegulatory },
    { id: 4, title: 'Outputs', component: StepOutputs }
  ]
  
  const handleNext = () => setCurrentStep(prev => prev + 1)
  const handleBack = () => setCurrentStep(prev => prev - 1)
  
  const handleGenerate = async () => {
    setIsGenerating(true)
    const response = await fetch('/api/study-designer/run', {
      method: 'POST',
      body: JSON.stringify(formData)
    })
    const data = await response.json()
    setResult(data.data)
    setIsGenerating(false)
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <WizardProgress steps={steps} currentStep={currentStep} />
      
      {currentStep <= 4 && (
        <CurrentStepComponent
          data={formData}
          onChange={setFormData}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      
      {currentStep === 5 && (
        <DesignerSummary
          data={formData}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      )}
      
      {result && (
        <DesignerResults result={result} />
      )}
    </div>
  )
}
```

---

#### Task 2.2: Step Components (4-6h)

**StepDrugIndication.tsx** (1.5h):
- FormulationSmartField
- IndicationSmartField
- Phase select
- Population notes textarea

**StepStudyStrategy.tsx** (1.5h):
- Objective type radio
- Comparator select
- Blinding select
- Randomization checkbox

**StepRiskRegulatory.tsx** (1h):
- Duration slider
- Target sample size input
- Budget level select
- Regulatory focus checkboxes

**StepOutputs.tsx** (1h):
- Document checkboxes (Protocol, IB, SAP, ICF)
- Detail level radio
- Summary preview

---

### Day 3: Preview & Progress Components (6-8h)

#### Task 3.1: DesignerPreviewPanel (2-3h)
**File**: `/components/study-designer/DesignerPreviewPanel.tsx`

**Sections**:
- Visit Schedule Preview
- Sample Size Preview
- Endpoints Preview
- Documents Preview

---

#### Task 3.2: DesignerProgress (2h)
**File**: `/components/study-designer/DesignerProgress.tsx`

**Steps**:
1. Normalizing formulation ✓
2. Building Knowledge Graph ⏳
3. Selecting endpoints ⏳
4. Calculating sample size ⏳
5. Generating study flow ⏳
6. Creating documents ⏳

---

#### Task 3.3: DesignerSummary & Results (2-3h)
**Files**:
- `/components/study-designer/DesignerSummary.tsx`
- `/components/study-designer/DesignerResults.tsx`

---

### Day 4: Integration & Testing (4-6h)

#### Task 4.1: Create Wizard Route (1h)
**File**: `/app/dashboard/study-designer/new/page.tsx`

---

#### Task 4.2: Add Entry Points (1h)
- Dashboard: "AI Study Designer" button
- Project creation: "Use AI Study Designer" toggle

---

#### Task 4.3: Testing (2-3h)
**Files**:
- `/__tests__/study-designer/api_run.test.ts`
- `/__tests__/study-designer/wizard_flow.test.ts`

---

#### Task 4.4: Polish (1h)
- Loading states
- Error handling
- Validation messages
- Success redirect

---

## 🎯 SPRINT 3: PROTOCOL EDITOR (3-4 days)

**Goal**: Реализовать AI Protocol Editor с suggestions

### Day 1: Protocol Engine (6-8h)

#### Task 1.1: Section Schema (1h)
**File**: `/lib/engine/protocol-ui/section_schema.ts`

Already created ✅ - verify and update if needed

---

#### Task 1.2: Types (1h)
**File**: `/lib/engine/protocol-ui/types.ts`

Already created ✅ - verify and update if needed

---

#### Task 1.3: Suggestion Engine (3-4h)
**File**: `/lib/engine/protocol-ui/suggestion_engine.ts`

**Implementation**:
```typescript
export async function getSectionSuggestions(
  ctx: ProtocolSuggestionContext
): Promise<ProtocolSuggestionResult> {
  const suggestions: SectionSuggestion[] = []
  const regHints: RegHint[] = []
  
  // 1. Get project context
  const project = await getProject(ctx.projectId)
  
  // 2. Get template suggestions
  const templates = await getTemplateSuggestions(ctx.sectionId, project)
  suggestions.push(...templates)
  
  // 3. Get RAG snippets
  const snippets = await getReferenceSnippets(ctx.sectionId, project, ctx.currentText)
  suggestions.push(...snippets)
  
  // 4. Get AI completion
  const completion = await getAICompletion(ctx.sectionId, project, ctx.currentText)
  if (completion) suggestions.push(completion)
  
  // 5. Get regulatory hints
  const hints = await getRegHints(ctx.sectionId, project, ctx.currentText)
  regHints.push(...hints)
  
  // 6. Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence)
  
  return { suggestions, regHints }
}
```

---

#### Task 1.4: Snippet Provider (2h)
**File**: `/lib/engine/protocol-ui/snippet_provider.ts`

**Implementation**:
```typescript
export async function getReferenceSnippets(
  sectionId: ProtocolSectionId,
  project: Project,
  currentText: string
): Promise<SectionSuggestion[]> {
  // Build query
  const query = buildRAGQuery(sectionId, project.indication, project.phase)
  
  // Search RAG
  const chunks = await ragSearch(query, {
    limit: 5,
    threshold: 0.7
  })
  
  // Convert to suggestions
  return chunks.map(chunk => ({
    id: `snippet-${chunk.id}`,
    sectionId,
    type: 'snippet',
    title: `From ${chunk.source}`,
    preview: chunk.text.substring(0, 100),
    fullText: chunk.text,
    source: 'rag',
    confidence: chunk.similarity,
    referenceIds: [chunk.source]
  }))
}
```

---

#### Task 1.5: RegHint Engine (1-2h)
**File**: `/lib/engine/protocol-ui/reg_hint_engine.ts`

**Rules**:
- Primary objective required
- Primary endpoint + timepoint required
- Inclusion + exclusion criteria required
- AE/SAE reporting required
- Sample size calculation required

---

### Day 2: Protocol API & Storage (6-8h)

#### Task 2.1: Protocol Storage Schema (2h)

**Database**:
```sql
CREATE TABLE protocol_sections (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  section_id TEXT NOT NULL,
  content TEXT,
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_protocol_sections_project ON protocol_sections(project_id);
```

---

#### Task 2.2: API Endpoints (3-4h)

**Files**:
- `/app/api/protocol/suggest/route.ts` (already exists ✅)
- `/app/api/protocol/sections/route.ts` (GET/PUT)
- `/app/api/protocol/regenerate/route.ts` (POST)

---

#### Task 2.3: Autosave Logic (1-2h)

**Implementation**:
```typescript
const debouncedSave = useMemo(
  () => debounce(async (sections) => {
    await fetch(`/api/protocol/sections`, {
      method: 'PUT',
      body: JSON.stringify({ projectId, sections })
    })
  }, 2000),
  [projectId]
)
```

---

### Day 3: Protocol Editor UI (6-8h)

#### Task 3.1: ProtocolEditor Component (2h)
**File**: `/components/protocol-editor/ProtocolEditor.tsx`

Already created ✅ - enhance with:
- Autosave
- Version tracking
- Regenerate section
- Export

---

#### Task 3.2: InlineCompletion Component (2-3h)
**File**: `/components/protocol-editor/InlineCompletion.tsx`

**Features**:
- Ghost text display
- Tab to accept
- Esc to dismiss
- Fetch from Azure OpenAI

---

#### Task 3.3: SourceSnippetBadge (1h)
**File**: `/components/protocol-editor/SourceSnippetBadge.tsx`

**Display**:
- FDA (blue)
- EMA (green)
- CT.gov (purple)
- DailyMed (orange)
- Local Protocol (gray)

---

#### Task 3.4: Additional Components (2h)
- RegHintsPanel enhancements
- SectionSuggestionBar improvements
- ProtocolOutlineSidebar polish

---

### Day 4: Protocol Route & Integration (4-6h)

#### Task 4.1: Protocol Editor Route (1h)
**File**: `/app/dashboard/projects/[id]/protocol/page.tsx`

---

#### Task 4.2: Add "Edit Protocol" Button (1h)
**File**: `/app/dashboard/projects/[id]/page.tsx`

---

#### Task 4.3: Testing (2-3h)
**Files**:
- `/__tests__/protocol-editor/suggestion_engine.test.ts`
- `/__tests__/protocol-editor/api_suggest.test.ts`
- `/__tests__/protocol-editor/inline_completion.test.ts`

---

#### Task 4.4: Polish (1h)
- Loading states
- Error handling
- Keyboard shortcuts
- Mobile responsive

---

## 🎯 SPRINT 4: INTEGRATION & POLISH (2-3 days)

**Goal**: Связать все компоненты, тестирование, production-ready

### Day 1: Full Workflow Integration (6-8h)

#### Task 1.1: Complete User Flow (3-4h)

**Flow**:
```
1. Dashboard → "New Project"
2. Toggle "Use AI Study Designer"
3. Study Designer Wizard (4 steps)
   - Drug & Indication (with KG suggestions)
   - Study Strategy
   - Constraints
   - Outputs (with previews)
4. Generate → Progress indicator
5. Project created with documents
6. Click "Edit Protocol"
7. Protocol Editor opens
   - AI suggestions
   - RAG snippets
   - Inline completion
   - Regulatory hints
8. Edit sections
9. Auto-save
10. Validate → Auto-fix
11. Export
```

**Tasks**:
- Connect all routes
- Fix navigation
- Add breadcrumbs
- Add back buttons
- Test flow end-to-end

---

#### Task 1.2: Cross-Document Panel v2 (2-3h)
**File**: `/components/crossdoc/CrossDocPanel.tsx`

**Enhancements**:
- Better issue display
- Grouped by severity
- Auto-fix batch selection
- Patch preview
- Apply confirmation

---

#### Task 1.3: Study Flow Panel v2 (1-2h)
**File**: `/components/study-flow/StudyFlowPanel.tsx`

**Enhancements**:
- Tabs: Overview / Visits / Procedures / ToP / Validation
- Better ToP matrix
- Visit window display
- Procedure details

---

### Day 2: Testing & QA (6-8h)

#### Task 2.1: Integration Tests (3-4h)

**Scenarios**:
1. Create project with Study Designer
2. Edit protocol with AI
3. Cross-document validation
4. Study flow generation
5. Export documents

**Files**:
- `/__tests__/integration/full_workflow.test.ts`
- `/__tests__/integration/study_designer_to_protocol.test.ts`
- `/__tests__/integration/kg_to_suggestions.test.ts`

---

#### Task 2.2: E2E Tests (2-3h)

**Tools**: Playwright

**Scenarios**:
- Complete project creation
- Wizard flow
- Protocol editing
- Document export

---

#### Task 2.3: Bug Fixes (1-2h)
- Fix any issues found in testing
- Performance optimization
- Memory leaks
- Edge cases

---

### Day 3: Polish & Documentation (4-6h)

#### Task 3.1: UI Polish (2-3h)
- Loading states everywhere
- Error messages
- Empty states
- Success confirmations
- Animations
- Mobile responsive
- Dark mode (if needed)

---

#### Task 3.2: Documentation (2h)

**Files**:
- Update README.md
- Create USER_GUIDE.md
- Update API documentation
- Add inline code comments

---

#### Task 3.3: Final Smoke Test (1h)

**Checklist**:
- ✅ Create project
- ✅ Use Study Designer
- ✅ Edit protocol
- ✅ View KG data
- ✅ Check cross-doc
- ✅ Check study flow
- ✅ Export documents
- ✅ No console errors
- ✅ Performance acceptable

---

## 📊 SPRINT METRICS

### Sprint 1 Deliverables:
- ✅ ProjectTabs component
- ✅ ProjectHeader component
- ✅ EndpointSmartField
- ✅ SafetySmartField
- ✅ KnowledgeGraphPanel
- ✅ Updated project creation form
- ✅ Tests

### Sprint 2 Deliverables:
- ✅ Study Designer orchestrator
- ✅ API endpoint
- ✅ Wizard UI (4 steps)
- ✅ Preview components
- ✅ Progress indicator
- ✅ Tests

### Sprint 3 Deliverables:
- ✅ Protocol suggestion engine
- ✅ Snippet provider
- ✅ RegHint engine
- ✅ Protocol Editor UI
- ✅ Inline completion
- ✅ API endpoints
- ✅ Tests

### Sprint 4 Deliverables:
- ✅ Full workflow integration
- ✅ Cross-Doc v2
- ✅ Study Flow v2
- ✅ Integration tests
- ✅ E2E tests
- ✅ Documentation
- ✅ Production-ready

---

## 🎯 SUCCESS CRITERIA

### Technical:
- ✅ All routes work
- ✅ All APIs functional
- ✅ No console errors
- ✅ Performance <2s load
- ✅ Mobile responsive
- ✅ Tests passing (>80% coverage)

### Product:
- ✅ User can create project with AI
- ✅ User can use Study Designer
- ✅ User can edit protocol with AI
- ✅ User sees KG data
- ✅ User sees RAG snippets
- ✅ User gets regulatory hints
- ✅ Full workflow works end-to-end

### Business:
- ✅ Ready for pilot customers
- ✅ Demo-able
- ✅ Documented
- ✅ Stable

---

## 📅 TIMELINE

**Week 1**:
- Sprint 1 (Mon-Wed): Foundation & Smart Fields
- Sprint 2 (Thu-Sun): Study Designer

**Week 2**:
- Sprint 3 (Mon-Wed): Protocol Editor
- Sprint 4 (Thu-Fri): Integration & Polish

**Total**: 10-14 days (2 weeks)

---

## 🚀 READY TO START!

**Next Step**: Begin Sprint 1, Task 1.1 (ProjectTabs Component)

**Command**: "Начинаем Sprint 1!"
