# 🔄 Workflow Improvement - Guided User Flow

## 📊 Текущая ситуация

### Проблема:
- User видит 2 кнопки: "Fetch External Data" и "Generate Document"
- **НЕ понятно** что нужно делать сначала
- Можно случайно сгенерировать документ БЕЗ external data
- Результат: документ без safety data, clinical trials, publications

### Правильный flow:
```
1. Create Project ✅
   ↓
2. Upload Files (optional) ✅
   ↓
3. Fetch External Data ← REQUIRED!
   ↓
4. Generate Documents ← Only after step 3
```

---

## 🎯 Решение

### Option 1: Disable "Generate Document" until external data fetched

**UI Changes:**
```tsx
<div className="flex items-center gap-2">
  <FetchExternalDataButton projectId={project.id} />
  
  <GenerateDocumentButton 
    projectId={project.id}
    disabled={!hasExternalData}
  />
  
  {!hasExternalData && (
    <p className="text-xs text-amber-600">
      ⚠️ Fetch external data first
    </p>
  )}
</div>
```

**Logic:**
```typescript
const hasExternalData = evidenceSources && evidenceSources.length > 0
```

---

### Option 2: Show workflow steps (Recommended)

**UI:**
```tsx
{/* Workflow Steps */}
<Card className="bg-blue-50 border-blue-200">
  <CardHeader>
    <CardTitle className="text-sm">📋 Document Generation Workflow</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      {/* Step 1 */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
          ✓
        </div>
        <div className="flex-1">
          <p className="font-medium">1. Project Created</p>
          <p className="text-xs text-gray-600">Basic information configured</p>
        </div>
      </div>

      {/* Step 2 */}
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${
          projectFiles?.length > 0 
            ? 'bg-green-500 text-white' 
            : 'bg-gray-300 text-gray-600'
        } flex items-center justify-center text-sm font-bold`}>
          {projectFiles?.length > 0 ? '✓' : '2'}
        </div>
        <div className="flex-1">
          <p className="font-medium">2. Upload Files (Optional)</p>
          <p className="text-xs text-gray-600">
            {projectFiles?.length > 0 
              ? `${projectFiles.length} files uploaded` 
              : 'Upload protocol, IND, or other documents'}
          </p>
        </div>
      </div>

      {/* Step 3 */}
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${
          hasExternalData 
            ? 'bg-green-500 text-white' 
            : 'bg-blue-500 text-white animate-pulse'
        } flex items-center justify-center text-sm font-bold`}>
          {hasExternalData ? '✓' : '3'}
        </div>
        <div className="flex-1">
          <p className="font-medium">3. Fetch External Data</p>
          <p className="text-xs text-gray-600">
            {hasExternalData 
              ? `${evidenceSources.length} evidence sources fetched` 
              : 'Get data from ClinicalTrials.gov, PubMed, openFDA'}
          </p>
          {!hasExternalData && (
            <div className="mt-2">
              <FetchExternalDataButton projectId={project.id} />
            </div>
          )}
        </div>
      </div>

      {/* Step 4 */}
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${
          hasExternalData 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-300 text-gray-600'
        } flex items-center justify-center text-sm font-bold`}>
          4
        </div>
        <div className="flex-1">
          <p className="font-medium">4. Generate Documents</p>
          <p className="text-xs text-gray-600">
            {hasExternalData 
              ? 'Ready to generate Protocol, IB, Synopsis' 
              : 'Complete step 3 first'}
          </p>
          {hasExternalData && (
            <div className="mt-2">
              <GenerateDocumentButton projectId={project.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

---

### Option 3: Smart banner (Minimal)

**UI:**
```tsx
{/* Smart Banner */}
{!hasExternalData && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0">
        <Database className="w-5 h-5 text-amber-600" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-amber-900">
          📊 Fetch External Data First
        </h3>
        <p className="text-sm text-amber-700 mt-1">
          Before generating documents, fetch external evidence from 
          ClinicalTrials.gov, PubMed, and openFDA. This ensures your 
          documents contain accurate safety data and clinical context.
        </p>
        <div className="mt-3">
          <FetchExternalDataButton projectId={project.id} />
        </div>
      </div>
    </div>
  </div>
)}

{hasExternalData && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0">
        <CheckCircle className="w-5 h-5 text-green-600" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-green-900">
          ✅ External Data Ready
        </h3>
        <p className="text-sm text-green-700 mt-1">
          {evidenceSources.length} evidence sources fetched. 
          You can now generate documents with complete data.
        </p>
        <div className="mt-3">
          <GenerateDocumentButton projectId={project.id} />
        </div>
      </div>
    </div>
  </div>
)}
```

---

## 🎨 Recommended Implementation: Option 2 + 3

### Combine workflow steps + smart banner

**Layout:**
```
┌─────────────────────────────────────────┐
│ Project Title                           │
│ Phase 2 • Type 2 Diabetes               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📊 Fetch External Data First            │
│                                         │
│ Before generating documents, fetch      │
│ external evidence...                    │
│                                         │
│ [Fetch External Data] ← Highlighted     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Study Design                            │
│ Type: Randomized                        │
│ ...                                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Documents                               │
│ No documents yet                        │
└─────────────────────────────────────────┘
```

**After fetching data:**
```
┌─────────────────────────────────────────┐
│ ✅ External Data Ready                  │
│                                         │
│ 25 evidence sources fetched.            │
│ You can now generate documents.         │
│                                         │
│ [Generate Document] ← Now available     │
└─────────────────────────────────────────┘
```

---

## 📊 Benefits

### 1. **Clear Guidance** 🎯
- User knows exact steps
- No confusion about order
- Visual progress indicators

### 2. **Prevent Errors** ❌→✅
- Can't generate document without data
- Avoids incomplete documents
- Better quality output

### 3. **Better UX** 💼
- Contextual help
- Progressive disclosure
- Feels guided, not lost

### 4. **Higher Success Rate** 📈
- Users complete workflow correctly
- Less support tickets
- Better first impression

---

## 🔧 Implementation

### File: `app/dashboard/projects/[id]/page.tsx`

```typescript
export default async function ProjectPage({ params }: { params: { id: string } }) {
  // ... existing code ...

  // Check if external data has been fetched
  const hasExternalData = evidenceSources && evidenceSources.length > 0
  const hasFiles = projectFiles && projectFiles.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>{project.title}</h1>
        {/* ... badges ... */}
      </div>

      {/* Smart Banner - Show BEFORE other cards */}
      {!hasExternalData ? (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-amber-900">
                  📊 Next Step: Fetch External Data
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  Before generating documents, fetch external evidence from 
                  ClinicalTrials.gov, PubMed, and openFDA. This ensures your 
                  documents contain accurate safety data and clinical context.
                </p>
                <div className="mt-3">
                  <FetchExternalDataButton projectId={project.id} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-green-900">
                  ✅ External Data Ready
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  {evidenceSources.length} evidence sources fetched 
                  ({evidenceSources.filter(e => e.source === 'ClinicalTrials.gov').length} trials, 
                  {evidenceSources.filter(e => e.source === 'PubMed').length} publications, 
                  {evidenceSources.filter(e => e.source === 'openFDA').length} safety reports).
                  You can now generate documents with complete data.
                </p>
                <div className="mt-3">
                  <GenerateDocumentButton projectId={project.id} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rest of the page ... */}
    </div>
  )
}
```

---

## 🎯 Alternative: Workflow Stepper Component

### Create reusable component

**File: `components/project-workflow-stepper.tsx`**

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Circle, Upload, Database, FileText } from 'lucide-react'
import { FetchExternalDataButton } from './fetch-external-data-button'
import { GenerateDocumentButton } from './generate-document-button'

interface WorkflowStep {
  number: number
  title: string
  description: string
  completed: boolean
  current: boolean
  icon: React.ReactNode
  action?: React.ReactNode
}

export function ProjectWorkflowStepper({
  projectId,
  hasFiles,
  hasExternalData,
  hasDocuments,
}: {
  projectId: string
  hasFiles: boolean
  hasExternalData: boolean
  hasDocuments: boolean
}) {
  const steps: WorkflowStep[] = [
    {
      number: 1,
      title: 'Project Created',
      description: 'Basic information configured',
      completed: true,
      current: false,
      icon: <CheckCircle className="w-5 h-5" />,
    },
    {
      number: 2,
      title: 'Upload Files (Optional)',
      description: hasFiles 
        ? 'Files uploaded' 
        : 'Upload protocol, IND, or other documents',
      completed: hasFiles,
      current: !hasFiles && !hasExternalData,
      icon: <Upload className="w-5 h-5" />,
    },
    {
      number: 3,
      title: 'Fetch External Data',
      description: hasExternalData
        ? 'Evidence sources fetched'
        : 'Get data from ClinicalTrials.gov, PubMed, openFDA',
      completed: hasExternalData,
      current: !hasExternalData,
      icon: <Database className="w-5 h-5" />,
      action: !hasExternalData ? (
        <FetchExternalDataButton projectId={projectId} />
      ) : undefined,
    },
    {
      number: 4,
      title: 'Generate Documents',
      description: hasDocuments
        ? 'Documents generated'
        : 'Create Protocol, IB, Synopsis',
      completed: hasDocuments,
      current: hasExternalData && !hasDocuments,
      icon: <FileText className="w-5 h-5" />,
      action: hasExternalData && !hasDocuments ? (
        <GenerateDocumentButton projectId={projectId} />
      ) : undefined,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">📋 Workflow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-start gap-3">
              {/* Step indicator */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step.completed
                    ? 'bg-green-500 text-white'
                    : step.current
                    ? 'bg-blue-500 text-white animate-pulse'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {step.completed ? '✓' : step.number}
              </div>

              {/* Step content */}
              <div className="flex-1">
                <p className={`font-medium ${step.current ? 'text-blue-600' : ''}`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {step.description}
                </p>
                {step.action && (
                  <div className="mt-2">
                    {step.action}
                  </div>
                )}
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-4 top-8 w-0.5 h-12 bg-gray-300" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 📝 Summary

### Current Problem:
❌ No clear workflow guidance  
❌ Can generate documents without external data  
❌ User confusion about order  

### Solution:
✅ Smart banner showing next step  
✅ Visual workflow stepper  
✅ Contextual actions  
✅ Clear progress indicators  

### Impact:
- 🎯 **Better UX** - Clear guidance
- ✅ **Higher quality** - Complete data
- ⏱️ **Faster onboarding** - No confusion
- 📈 **Higher success rate** - Correct workflow

---

**Next: Implement smart banner in project page!** 🚀
