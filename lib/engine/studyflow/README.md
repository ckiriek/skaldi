# Study Flow Engine

**Production-ready engine for generating visit schedules, procedures, and Table of Procedures (ToP) for clinical trials.**

---

## 🚀 Quick Start

```typescript
import { StudyFlowEngine } from '@/lib/engine/studyflow'

// Generate study flow
const response = await fetch('/api/studyflow/generate', {
  method: 'POST',
  body: JSON.stringify({
    protocolId: 'prot_123',
    endpoints: [{ id: 'ep_1', name: 'Change in HbA1c', type: 'primary' }],
    visitSchedule: ['Screening', 'Baseline', 'Week 4', 'Week 12', 'EOT'],
  }),
})

const { studyFlow } = await response.json()
```

---

## 📦 Features

### ✅ Visit Processing
- Parse Day/Week/Month patterns (EN/RU)
- Infer missing visits (Screening, Baseline, EOT, Follow-up)
- Calculate visit windows (±days)
- Detect treatment cycles

### ✅ Procedure Management
- 70+ procedure catalog
- Fuzzy text matching
- Automatic inference from endpoints
- Category-based organization

### ✅ Table of Procedures
- Build visits × procedures matrix
- Export to 7 formats (DOCX, Excel, PDF, HTML, CSV, Markdown, JSON)
- Statistics and validation

### ✅ Validation & Auto-fix
- 10 validation rules
- 5 auto-fixers
- Risk assessment

---

## 🏗️ Architecture

```
/lib/engine/studyflow/
├── types.ts                    # Core types
├── index.ts                    # Main engine
├── visit_model/                # Visit processing
├── procedures/                 # Procedure management
├── top/                        # Table of Procedures
├── alignment/                  # Endpoint-procedure alignment
├── validation/                 # Validation rules
└── autofix/                    # Auto-fix engine
```

---

## 📚 API Reference

### Generate Study Flow

**POST** `/api/studyflow/generate`

```typescript
{
  protocolId: string
  endpoints?: Array<{ id: string; name: string; type: 'primary' | 'secondary' | 'exploratory' }>
  visitSchedule?: string[]
}
```

### Validate Study Flow

**POST** `/api/studyflow/validate`

```typescript
{
  studyFlowId: string
  protocolId: string
  sapId?: string
  icfId?: string
}
```

### Apply Auto-fixes

**POST** `/api/studyflow/auto-fix`

```typescript
{
  studyFlowId: string
  issueIds: string[]
  strategy?: 'conservative' | 'balanced' | 'aggressive'
}
```

---

## 🧪 Testing

```bash
# Run unit tests
npm test __tests__/studyflow/

# Run API tests
npm test __tests__/studyflow/api.test.ts
```

---

## 📖 Documentation

See **[PHASE_G_COMPLETE.md](./PHASE_G_COMPLETE.md)** for comprehensive documentation.

---

## 🎯 Status

**Phase G: 100% COMPLETE** ✅

- [x] Foundation
- [x] Procedures Engine
- [x] Table of Procedures
- [x] Alignment
- [x] Validation Rules
- [x] Auto-fix
- [x] REST APIs
- [x] UI Components
- [x] Tests

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| **Modules** | 30+ files |
| **Lines of Code** | 5,000+ |
| **Procedures** | 70+ |
| **Validation Rules** | 10 |
| **Auto-fixers** | 5 |
| **Export Formats** | 7 |

---

## 🔮 Future Enhancements

- ML-based procedure inference
- SDTM export format
- Visit schedule optimization
- Resource planning
- Cost estimation
- Timeline Gantt charts

---

**Built with ❤️ for Skaldi**
