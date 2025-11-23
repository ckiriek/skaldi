# Study Designer

**Phase H.UI v4**: AI-driven clinical study design wizard

---

## Overview

The Study Designer is a wizard that generates complete study designs from minimal input, including:
- Protocol skeleton
- Study flow and visit schedule
- Sample size calculations
- Statistical analysis plan
- Investigator's Brochure outline

---

## Features

### 1. Multi-Step Wizard

**Step 1: Basic Information**
- Drug/Compound (with smart suggestions)
- Indication (ML-ranked from Knowledge Graph)
- Phase (1-4)
- Geography
- Population characteristics

**Step 2: Study Strategy**
- Primary objective type (efficacy, safety, non-inferiority, PK/PD)
- Comparator strategy (placebo, active, add-on)
- Randomization (yes/no)
- Blinding (open-label, single-blind, double-blind)

**Step 3: Constraints & Risk**
- Maximum duration (weeks)
- Budget level (low/medium/high)
- Regulatory focus (FDA, EMA, generic)

**Step 4: Output Selection**
- Documents to generate (Protocol, IB, SAP, ICF)
- Detail level (skeleton, full draft)

### 2. AI Orchestration

The wizard orchestrates multiple AI engines:

1. **Formulation Normalizer**: Extracts INN from compound name
2. **Knowledge Graph**: Fetches indications, endpoints, formulations
3. **ML Ranking**: Ranks endpoints by relevance
4. **Statistics Engine**: Calculates sample size
5. **Study Flow Engine**: Generates visit schedule
6. **Protocol Engine**: Creates protocol skeleton
7. **RAG Layer**: Retrieves snippets from reference protocols

---

## Usage

### Basic Usage:

```typescript
import { StudyDesignerWizard } from '@/components/study-designer/StudyDesignerWizard'

<StudyDesignerWizard />
```

### API Usage:

```bash
curl -X POST http://localhost:3000/api/study-designer/run \
  -H "Content-Type: application/json" \
  -d '{
    "compound": "Metformin Hydrochloride",
    "indication": "Type 2 Diabetes Mellitus",
    "phase": "Phase 3",
    "primaryObjectiveType": "efficacy",
    "comparatorStrategy": "placebo",
    "blinding": "double-blind",
    "maxDuration": 24,
    "budgetLevel": "medium",
    "regulatoryFocus": "fda",
    "generateProtocol": true,
    "generateIB": true,
    "generateSAP": true,
    "detailLevel": "full-draft"
  }'
```

---

## API Response

```json
{
  "success": true,
  "projectId": "proj-1234567890",
  "generated": {
    "protocol": {
      "documentId": "doc-protocol-1234567890",
      "quality": "full-draft"
    },
    "ib": {
      "documentId": "doc-ib-1234567890",
      "quality": "skeleton"
    },
    "sap": {
      "documentId": "doc-sap-1234567890",
      "quality": "full-draft"
    },
    "studyflow": {
      "id": "flow-1234567890",
      "visits": [
        { "name": "Screening", "week": -2 },
        { "name": "Baseline", "week": 0 },
        { "name": "Week 4", "week": 4 },
        { "name": "Week 8", "week": 8 },
        { "name": "Week 12", "week": 12 },
        { "name": "Week 16", "week": 16 },
        { "name": "Week 20", "week": 20 },
        { "name": "End of Study", "week": 24 }
      ],
      "totalDuration": 24
    },
    "stats": {
      "sampleSize": {
        "total": 100,
        "perArm": 50,
        "assumptions": {
          "alpha": 0.05,
          "power": 0.8,
          "dropout": 0.15
        }
      },
      "primaryEndpoint": "Change from baseline in HbA1c",
      "secondaryEndpoints": [
        "Fasting plasma glucose",
        "Body weight"
      ]
    }
  },
  "warnings": [],
  "meta": {
    "compound": "Metformin Hydrochloride",
    "indication": "Type 2 Diabetes Mellitus",
    "phase": "Phase 3",
    "inn": "Metformin",
    "kgSources": 5
  }
}
```

---

## Integration with Knowledge Graph

The Study Designer leverages the Knowledge Graph to:

1. **Auto-suggest indications** based on compound
2. **Rank endpoints** by confidence and relevance
3. **Provide formulation data** (routes, dosage forms, strengths)
4. **Suggest safety assessments** from similar trials
5. **Recommend visit schedules** based on indication and phase

---

## Sample Size Calculation

Simplified algorithm based on:
- **Phase**: Base sample size varies by phase
  - Phase 1: 40 patients
  - Phase 2: 100 patients
  - Phase 3: 300 patients
  - Phase 4: 200 patients
- **Budget Level**: Adjusts sample size
  - Low: 70% of base
  - Medium: 100% of base
  - High: 130% of base

**Assumptions**:
- Alpha: 0.05 (two-sided)
- Power: 0.80
- Dropout rate: 15%

---

## Study Flow Generation

Visit schedule based on:
- **Phase**: Determines visit frequency
- **Duration**: Total study length
- **Budget Level**: Affects visit intervals
  - Low: 8-week intervals
  - Medium: 4-week intervals
  - High: 2-week intervals

**Standard Visits**:
- Screening (Week -2)
- Baseline (Week 0)
- Follow-up visits (interval-based)
- End of Study (final week)

---

## Reference Protocol Integration

The designer uses RAG to extract content from:
- `clinical_reference/protocol_femilex.md`
- `clinical_reference/protocol_perindopril.md`
- `clinical_reference/protocol_sitaglipin.md`
- `clinical_reference/summary_podhaler.md`

**Extracted Elements**:
- Visit schedule structures
- Objectives phrasing
- Endpoints descriptions
- Safety assessment procedures
- Discontinuation criteria

---

## Configuration

### Environment Variables:

```bash
# Azure OpenAI (for AI completions)
AZURE_OPENAI_ENDPOINT=https://skillsy-east-ai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.1
AZURE_OPENAI_API_VERSION=2025-01-01-preview

# Supabase (for Knowledge Graph & RAG)
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-...
```

---

## Testing Scenarios

### Scenario 1: Metformin, Type 2 Diabetes, Phase 3
```json
{
  "compound": "Metformin",
  "indication": "Type 2 Diabetes Mellitus",
  "phase": "Phase 3"
}
```

**Expected**:
- Primary endpoint: HbA1c change
- Sample size: ~300 patients
- Duration: 24 weeks
- Visits: 7-8 visits

### Scenario 2: Bisoprolol, Hypertension, Phase 2
```json
{
  "compound": "Bisoprolol",
  "indication": "Hypertension resistant to therapy",
  "phase": "Phase 2"
}
```

**Expected**:
- Primary endpoint: Blood pressure reduction
- Sample size: ~100 patients
- Duration: 12 weeks
- Visits: 4-5 visits

### Scenario 3: Metronidazole, Bacterial Vaginosis, Phase 4
```json
{
  "compound": "Metronidazole",
  "indication": "Bacterial Vaginosis",
  "phase": "Phase 4"
}
```

**Expected**:
- Primary endpoint: Clinical cure rate
- Sample size: ~200 patients
- Duration: 4 weeks
- Visits: 3-4 visits

---

## Future Enhancements

1. **Advanced Statistics**: Integration with full statistics engine
2. **Cost Estimation**: Budget calculator based on procedures
3. **Timeline Projection**: Recruitment and completion estimates
4. **Risk Assessment**: Feasibility scoring
5. **Regulatory Checker**: Compliance validation

---

## License

Proprietary - Skaldi Clinical Documentation Engine
