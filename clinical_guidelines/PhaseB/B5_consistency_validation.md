# Phase B, Task B5: Cross-Section Consistency Validation

**Status:** 🚧 IN PROGRESS  
**Date:** 2025-11-21  
**Goal:** Implement QC validation to catch inconsistencies between document sections

---

## 📋 Overview

Clinical documents must maintain internal consistency across all sections. Regulatory reviewers specifically check for:
- Consistent dosing information
- Matching study design details
- Aligned population definitions
- Consistent endpoint definitions
- Matching sample sizes

**B5 automates these checks** to catch errors before submission.

---

## 🎯 Requirements

### Critical Consistency Checks:

#### 1. Dosing Consistency
- **Check:** Dose in "Treatments" = Dose in "Statistical Assumptions"
- **Example:** If Protocol says "10mg daily", Statistics section must match
- **Severity:** CRITICAL

#### 2. Study Design Consistency
- **Check:** Arms in "Design" = Arms in "Schedule" = Arms in "Statistics"
- **Example:** If 3 arms in design, must have 3 arms in all sections
- **Severity:** CRITICAL

#### 3. Sample Size Consistency
- **Check:** Sample size identical across all sections
- **Example:** If Protocol says "N=300", CSR must match
- **Severity:** CRITICAL

#### 4. Population Consistency
- **Check:** Inclusion/exclusion criteria = Analysis populations
- **Example:** Age criteria must match population definitions
- **Severity:** HIGH

#### 5. Endpoint Consistency
- **Check:** Primary/secondary endpoints match across Protocol, SAP, CSR
- **Example:** Endpoint definitions must be word-for-word identical
- **Severity:** CRITICAL

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Document Validator                        │
│                                                              │
│  1. Extract key parameters from all sections                │
│  2. Compare parameters across sections                       │
│  3. Flag inconsistencies with severity                       │
│  4. Generate validation report                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Consistency Rules   │
              │  - Dosing            │
              │  - Design            │
              │  - Sample Size       │
              │  - Populations       │
              │  - Endpoints         │
              └──────────────────────┘
```

---

## 🔨 Implementation

### 1. Create ConsistencyValidator Service

**File:** `lib/services/consistency-validator.ts`

```typescript
export interface ConsistencyCheck {
  id: string
  type: 'dosing' | 'design' | 'sample_size' | 'population' | 'endpoint'
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'pass' | 'fail' | 'warning'
  message: string
  sections: string[]
  expected?: string
  actual?: string
}

export interface ConsistencyReport {
  document_id: string
  document_type: string
  total_checks: number
  passed: number
  failed: number
  warnings: number
  checks: ConsistencyCheck[]
  generated_at: string
}

export class ConsistencyValidator {
  // Extract parameters from sections
  extractParameters(sections: Section[]): Parameters
  
  // Check dosing consistency
  checkDosing(sections: Section[]): ConsistencyCheck[]
  
  // Check design consistency
  checkDesign(sections: Section[]): ConsistencyCheck[]
  
  // Check sample size consistency
  checkSampleSize(sections: Section[]): ConsistencyCheck[]
  
  // Check population consistency
  checkPopulation(sections: Section[]): ConsistencyCheck[]
  
  // Check endpoint consistency
  checkEndpoints(sections: Section[]): ConsistencyCheck[]
  
  // Run all checks
  validate(document: Document): ConsistencyReport
}
```

### 2. Parameter Extraction

Extract key parameters from document sections:

```typescript
interface ExtractedParameters {
  dosing: {
    dose?: string
    frequency?: string
    duration?: string
    route?: string
  }
  design: {
    type?: string
    arms?: number
    arm_names?: string[]
    randomization?: string
    blinding?: string
  }
  sample_size: {
    total?: number
    per_arm?: number[]
    calculation?: string
  }
  population: {
    age_min?: number
    age_max?: number
    gender?: string
    inclusion_criteria?: string[]
    exclusion_criteria?: string[]
  }
  endpoints: {
    primary?: string[]
    secondary?: string[]
    exploratory?: string[]
  }
}
```

### 3. Consistency Rules

Define rules for each check type:

```typescript
const CONSISTENCY_RULES = {
  dosing: {
    sections: ['treatments', 'study_design', 'statistics'],
    extract: (section) => extractDose(section.content),
    compare: (values) => allEqual(values),
    message: 'Dose must be consistent across all sections'
  },
  
  design_arms: {
    sections: ['study_design', 'schedule', 'statistics'],
    extract: (section) => extractArmCount(section.content),
    compare: (values) => allEqual(values),
    message: 'Number of arms must match across all sections'
  },
  
  sample_size: {
    sections: ['study_design', 'statistics', 'synopsis'],
    extract: (section) => extractSampleSize(section.content),
    compare: (values) => allEqual(values),
    message: 'Sample size must be identical in all sections'
  },
  
  // ... more rules
}
```

### 4. Database Schema

Add validation results to database:

```sql
CREATE TABLE consistency_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id),
  validation_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  sections TEXT[],
  expected_value TEXT,
  actual_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consistency_validations_document 
  ON consistency_validations(document_id);
CREATE INDEX idx_consistency_validations_status 
  ON consistency_validations(status);
```

---

## 🧪 Testing Plan

### Test 1: Dosing Inconsistency
```typescript
const sections = [
  { name: 'treatments', content: 'Dose: 10mg daily' },
  { name: 'statistics', content: 'Dose: 20mg daily' }
]

const result = validator.checkDosing(sections)
// Expected: FAIL - doses don't match
```

### Test 2: Design Consistency
```typescript
const sections = [
  { name: 'design', content: '3 arms: Placebo, Low Dose, High Dose' },
  { name: 'statistics', content: '2 arms: Placebo, Treatment' }
]

const result = validator.checkDesign(sections)
// Expected: FAIL - arm count mismatch
```

### Test 3: Sample Size Consistency
```typescript
const sections = [
  { name: 'design', content: 'Total N=300' },
  { name: 'statistics', content: 'Total N=300' },
  { name: 'synopsis', content: 'Total N=300' }
]

const result = validator.checkSampleSize(sections)
// Expected: PASS - all match
```

---

## 📊 Success Criteria

- [ ] ConsistencyValidator service created
- [ ] Parameter extraction working for all types
- [ ] All 5 check types implemented
- [ ] Database schema created
- [ ] Validation integrated into document generation
- [ ] Validation results visible in UI
- [ ] All tests pass

---

## 🎯 Integration Points

### 1. Document Generation
```typescript
// After generating document
const validator = new ConsistencyValidator()
const report = await validator.validate(document)

if (report.failed > 0) {
  // Store validation results
  await storeValidationReport(report)
  
  // Optionally block document finalization
  if (hasCriticalFailures(report)) {
    throw new ValidationError('Critical consistency issues found')
  }
}
```

### 2. UI Display
```typescript
// In document viewer
<ValidationPanel>
  <ValidationSummary 
    passed={report.passed}
    failed={report.failed}
    warnings={report.warnings}
  />
  
  <ValidationChecks checks={report.checks} />
</ValidationPanel>
```

### 3. API Endpoint
```typescript
// POST /api/documents/:id/validate
export async function POST(req: Request) {
  const { id } = await req.json()
  
  const document = await getDocument(id)
  const validator = new ConsistencyValidator()
  const report = await validator.validate(document)
  
  return Response.json(report)
}
```

---

## 💡 Future Enhancements

1. **AI-Powered Checks** - Use LLM to detect semantic inconsistencies
2. **Auto-Fix** - Suggest corrections for common issues
3. **Custom Rules** - Allow users to define their own consistency rules
4. **Historical Tracking** - Track validation results over document versions
5. **Batch Validation** - Validate multiple documents at once

---

**Status:** Ready to implement  
**Estimated Time:** 2-3 hours  
**Priority:** HIGH - Critical for regulatory compliance
