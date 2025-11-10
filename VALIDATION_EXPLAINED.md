# ✅ Document Validation - Объяснение

## 🎯 Что такое "Validate"?

**Validation (Валидация)** - это автоматическая проверка документа на соответствие **регуляторным требованиям** (ICH, FDA, EMA guidelines).

---

## 📊 Что показывает результат?

### Ваш скриншот:
```
Validation complete!
Completeness Score: 0%
Passed: 0/14
```

**Расшифровка:**
- **Completeness Score: 0%** - Документ заполнен на 0% (пустой или минимальный контент)
- **Passed: 0/14** - Прошло 0 проверок из 14 правил валидации

---

## 🔍 Что проверяется?

### 14 Validation Rules (примеры):

#### 1. **Required Sections** (Обязательные секции)
```
✓ Title Page
✓ Table of Contents
✓ Summary
✓ Introduction
✓ Study Objectives
✓ Study Design
✓ Study Population
✓ Safety Assessments
✓ Statistical Methods
✓ References
```

#### 2. **Completeness** (Полнота контента)
```
✓ Each section has >50 characters of content
✓ Not just headings, but actual text
```

#### 3. **Format** (Формат)
```
✓ Document length >100 characters
✓ Proper structure
```

#### 4. **Consistency** (Согласованность)
```
✓ Consistent terminology
✓ No contradictions
```

---

## 🔄 Как работает валидация?

### Flow:

```
User clicks [Validate]
  ↓
1. Fetch document content from DB
  ↓
2. Fetch validation rules for document type
   (e.g., Protocol has 14 rules)
  ↓
3. Run each rule against content:
   - Check if section exists
   - Check if section has content
   - Check format
   - Check consistency
  ↓
4. Calculate score:
   Passed: 10/14 = 71% completeness
  ↓
5. Determine status:
   - <90%: "review" (needs work)
   - ≥90%: "approved" (ready)
   - Critical failed: "needs_revision"
  ↓
6. Update document status in DB
  ↓
7. Show results to user
```

---

## 📊 Validation Rules (Database)

### Table: `validation_rules`

| id | document_type | rule_name | section_ref | check_type | is_active |
|----|---------------|-----------|-------------|------------|-----------|
| 1  | Protocol      | Title Page | Section 1 | required | true |
| 2  | Protocol      | Study Objectives | Section 6 | required | true |
| 3  | Protocol      | Study Design | Section 7 | required | true |
| 4  | Protocol      | Safety Assessments | Section 12 | required | true |
| 5  | Protocol      | Statistical Methods | Section 14 | completeness | true |
| ... | ... | ... | ... | ... | ... |

**Check Types:**
- `required` - Section MUST exist
- `completeness` - Section must have >50 chars
- `format` - Document format checks
- `consistency` - Terminology consistency

---

## 🎨 UI Flow

### Before Validation:

```
┌─────────────────────────────────────────┐
│ Protocol - Version 1                    │
│ Status: draft                           │
│                                         │
│ [Validate] [Export DOCX]                │
└─────────────────────────────────────────┘
```

### Click [Validate]:

```
┌─────────────────────────────────────────┐
│ [Validating...] ← Loading state         │
└─────────────────────────────────────────┘
```

### After Validation (Low Score):

```
┌─────────────────────────────────────────┐
│ Validation complete!                    │
│ Completeness Score: 35%                 │
│ Passed: 5/14                            │
│                                         │
│ [OK]                                    │
└─────────────────────────────────────────┘

Status updated: draft → review
```

### After Validation (High Score):

```
┌─────────────────────────────────────────┐
│ Validation complete!                    │
│ Completeness Score: 93%                 │
│ Passed: 13/14                           │
│                                         │
│ [OK]                                    │
└─────────────────────────────────────────┘

Status updated: review → approved ✅
```

---

## 🔧 Technical Implementation

### 1. Frontend Button (`components/validate-document-button.tsx`)

```typescript
const handleValidate = async () => {
  // Call API
  const response = await fetch('/api/validate', {
    method: 'POST',
    body: JSON.stringify({
      documentId,
      documentType,
      content,
    }),
  })

  const data = await response.json()
  
  // Show results
  alert(`Validation complete!
Completeness Score: ${data.completeness_score}%
Passed: ${data.passed}/${data.total_rules}`)
}
```

### 2. API Route (`app/api/validate/route.ts`)

```typescript
export async function POST(request: Request) {
  // Call Supabase Edge Function
  const { data, error } = await supabase.functions.invoke('validate-document', {
    body: { documentId, documentType, content },
  })
  
  return NextResponse.json(data)
}
```

### 3. Edge Function (`supabase/functions/validate-document/index.ts`)

```typescript
// 1. Fetch validation rules
const { data: rules } = await supabase
  .from('validation_rules')
  .select('*')
  .eq('document_type', documentType)
  .eq('is_active', true)

// 2. Run validation checks
const results = []
for (const rule of rules) {
  const result = await validateRule(rule, content)
  results.push(result)
}

// 3. Calculate score
const passedCount = results.filter(r => r.passed).length
const completenessScore = (passedCount / rules.length) * 100

// 4. Determine status
const status = completenessScore >= 90 ? 'approved' : 'review'

// 5. Update document
await supabase
  .from('documents')
  .update({ status })
  .eq('id', documentId)

return { completeness_score, passed: passedCount, total_rules: rules.length }
```

---

## 📋 Example Validation Results

### Protocol Document (14 rules):

```
✅ Passed (10/14):
1. ✓ Title Page - Section is present
2. ✓ Table of Contents - Section is present
3. ✓ Study Objectives - Section is present
4. ✓ Study Design - Section is present
5. ✓ Study Population - Section is present
6. ✓ Study Treatments - Section is present
7. ✓ Safety Assessments - Section is present
8. ✓ Efficacy Assessments - Section is present
9. ✓ Statistical Methods - Section is present
10. ✓ References - Section is present

❌ Failed (4/14):
11. ✗ Informed Consent - Missing required section
12. ✗ Data Management - Section needs more detailed content
13. ✗ Quality Assurance - Missing required section
14. ✗ Ethics - Section needs more detailed content

Completeness Score: 71%
Status: review (needs improvement)
```

---

## 🎯 Почему 0% в вашем случае?

### Возможные причины:

#### 1. **Пустой документ**
```
Document content: ""
→ All checks fail
→ Score: 0%
```

#### 2. **Minimal content (только заголовки)**
```
Document content:
"# Protocol
## Introduction
## Methods"

→ Sections exist but no content
→ Completeness checks fail
→ Score: ~20%
```

#### 3. **Placeholder content**
```
Document content:
"Sample Protocol content for validation"

→ Too short (<100 chars)
→ No actual sections
→ Score: 0%
```

**Проблема в коде:**
```typescript
// validate-document-button.tsx line 24
const content = `Sample ${documentType} content for validation`
```
❌ Использует placeholder вместо реального контента!

---

## ✅ Исправление

### Нужно передавать реальный контент документа:

```typescript
const handleValidate = async () => {
  // Fetch actual document content
  const response = await fetch(`/api/documents/${documentId}`)
  const doc = await response.json()
  const actualContent = doc.content // ← Real content!
  
  // Validate with real content
  const validateResponse = await fetch('/api/validate', {
    method: 'POST',
    body: JSON.stringify({
      documentId,
      documentType,
      content: actualContent, // ← Not placeholder!
    }),
  })
}
```

---

## 📊 Expected Results (with real content)

### Good Protocol (90%+):
```
Validation complete!
Completeness Score: 93%
Passed: 13/14

Missing:
- Appendix A: Informed Consent Form

Status: approved ✅
```

### Draft Protocol (50-80%):
```
Validation complete!
Completeness Score: 64%
Passed: 9/14

Missing:
- Data Management Plan
- Quality Assurance Procedures
- Ethics Committee Approval
- Informed Consent Process
- Statistical Analysis Plan

Status: review ⚠️
```

### Empty Protocol (0%):
```
Validation complete!
Completeness Score: 0%
Passed: 0/14

All sections missing!

Status: needs_revision ❌
```

---

## 🎯 Value Proposition

### Why Validation?

#### 1. **Regulatory Compliance** 📋
- Ensures document meets ICH/FDA/EMA requirements
- Catches missing sections before submission
- Reduces regulatory review time

#### 2. **Quality Assurance** ✅
- Automated QC checks
- Consistent standards
- Reduces human error

#### 3. **Time Savings** ⏱️
- Instant feedback (vs manual review)
- Early detection of issues
- Faster iteration

#### 4. **Audit Trail** 📊
- Documents validation history
- Shows compliance efforts
- Supports regulatory submissions

---

## 🚀 Next Steps

### 1. Fix Placeholder Content Issue
```typescript
// Use real document content, not placeholder
const content = await fetchDocumentContent(documentId)
```

### 2. Show Detailed Results
```typescript
// Instead of alert, show detailed results in UI
<ValidationResults 
  score={93}
  passed={13}
  total={14}
  failedRules={[
    { name: "Appendix A", message: "Missing ICF" }
  ]}
/>
```

### 3. Add Validation Status Badge
```tsx
<Badge variant={
  score >= 90 ? 'success' :
  score >= 70 ? 'warning' :
  'destructive'
}>
  {score}% Complete
</Badge>
```

---

## 📝 Summary

### Что происходит при нажатии [Validate]:

1. ✅ **Fetch document content** from database
2. ✅ **Fetch validation rules** for document type (14 rules for Protocol)
3. ✅ **Run checks** against content:
   - Required sections present?
   - Sections have content?
   - Format correct?
   - Terminology consistent?
4. ✅ **Calculate score**: Passed / Total = Completeness %
5. ✅ **Update status**:
   - <90%: "review"
   - ≥90%: "approved"
6. ✅ **Show results** to user

### Ваш результат (0%):
- Используется placeholder content вместо реального
- Нужно исправить чтобы передавать actual document content

### После исправления:
- Будет показывать реальный score (например, 71%)
- Покажет какие секции missing
- Поможет улучшить качество документа

---

**Validation = Автоматическая проверка качества документа!** ✅
