# Protocol Editor Engine

**Phase H.UI v3**: AI-powered protocol autocomplete system

---

## Overview

The Protocol Editor provides intelligent suggestions for protocol sections using:
- Knowledge Graph data
- RAG search in reference protocols
- Template library
- Regulatory validation rules

---

## Architecture

```
protocol-ui/
├── section_schema.ts      # 15 protocol sections with dependencies
├── suggestion_engine.ts   # AI suggestion generation
├── snippet_provider.ts    # RAG-based snippets from clinical_reference
├── reg_hint_engine.ts     # Regulatory compliance hints
└── README.md             # This file
```

---

## Components

### 1. Section Schema

Defines 15 protocol sections:
- Title, Synopsis, Objectives, Endpoints
- Study Design, Population, Eligibility
- Treatments, Study Flow, Assessments
- Statistics, Admin, Ethics, ICF

Each section has:
- `id`: Unique identifier
- `title`: Display name
- `required`: Boolean
- `order`: Sequence number
- `dependsOn`: Array of prerequisite sections
- `usesEngines`: Which engines to query (knowledge, stats, studyflow, crossdoc)

### 2. Suggestion Engine

Generates suggestions for protocol sections:

**Input**:
```typescript
{
  projectId: string
  sectionId: ProtocolSectionId
  currentText: string
  projectData: {
    compound?: string
    indication?: string
    phase?: string
    endpoints?: string[]
  }
}
```

**Output**:
```typescript
{
  suggestions: SectionSuggestion[]
  regHints: RegHint[]
}
```

**Suggestion Types**:
- `template`: Pre-built section templates
- `snippet`: RAG-retrieved text from reference protocols
- `completion`: AI-generated text continuation
- `reg_hint`: Regulatory compliance suggestion

### 3. Snippet Provider

Searches reference protocols using RAG:

**Reference Files**:
- `/clinical_reference/protocol_femilex.md`
- `/clinical_reference/protocol_perindopril.md`
- `/clinical_reference/protocol_sitaglipin.md`
- `/clinical_reference/summary_podhaler.md`

**Usage**:
```typescript
const snippets = await getProtocolSnippets(
  'safety assessments Phase 3',
  'safety_assessments',
  5
)
```

### 4. RegHints Engine

Validates protocol sections against regulatory requirements:

**Rules**:
- Objectives: Primary objective must be stated
- Endpoints: Primary endpoint + timepoint required
- Eligibility: Inclusion + exclusion criteria required
- Safety: AE/SAE reporting procedures required
- Statistics: Sample size calculation required

**Severity Levels**:
- `info`: Informational guidance
- `warning`: Recommended but not critical
- `critical`: Must be addressed

---

## API Endpoints

### POST /api/protocol/suggest

Generate suggestions for a protocol section.

**Request**:
```json
{
  "projectId": "uuid",
  "sectionId": "objectives",
  "currentText": "Primary Objective:\n",
  "projectData": {
    "compound": "Metformin",
    "indication": "Type 2 Diabetes",
    "phase": "Phase 3"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "template-objectives-0",
        "sectionId": "objectives",
        "type": "template",
        "title": "Primary Objective Template",
        "preview": "To evaluate the efficacy of...",
        "fullText": "...",
        "source": "rule",
        "confidence": 0.9
      }
    ],
    "regHints": [
      {
        "id": "hint-objectives-obj-primary-defined",
        "sectionId": "objectives",
        "severity": "critical",
        "message": "Primary objective must be explicitly stated",
        "suggestion": "Add a clear statement of the primary objective"
      }
    ]
  }
}
```

---

## Usage Example

### In Protocol Editor Component:

```typescript
import { ProtocolEditor } from '@/components/protocol-editor/ProtocolEditor'

<ProtocolEditor
  projectId="proj-123"
  initialSections={{
    synopsis: "This is a Phase 3 study...",
    objectives: "Primary Objective: ..."
  }}
  onSave={(sections) => {
    // Save to database
  }}
/>
```

### Programmatic Suggestion Generation:

```typescript
import { generateSuggestions } from '@/lib/engine/protocol-ui/suggestion_engine'

const suggestions = await generateSuggestions({
  projectId: 'proj-123',
  sectionId: 'safety_assessments',
  currentText: 'Safety will be assessed by...',
  projectData: {
    compound: 'Metformin',
    indication: 'Type 2 Diabetes',
    phase: 'Phase 3'
  }
})
```

---

## Templates

Built-in templates for common sections:

- **Objectives**: Primary/Secondary objectives
- **Endpoints**: Primary/Secondary endpoints
- **Eligibility**: Inclusion/Exclusion criteria
- **Safety**: AE/SAE reporting, labs, vitals
- **Statistics**: Sample size calculation

---

## Integration with Other Engines

### Knowledge Graph
- Provides indication-specific endpoints
- Suggests formulation details
- Offers safety monitoring procedures

### RAG Layer
- Searches clinical_reference for similar text
- Returns relevant snippets with similarity scores
- Tracks source files

### Statistics Engine
- Sample size calculations
- Statistical method suggestions
- Analysis population definitions

### StudyFlow Engine
- Visit schedule suggestions
- Procedure timing
- Assessment schedules

---

## Future Enhancements

1. **Azure OpenAI Integration**: Real-time text completion
2. **Auto-save**: Periodic saving to database
3. **Version Control**: Track section changes
4. **Collaboration**: Multi-user editing
5. **Export**: PDF/DOCX generation

---

## Configuration

### Environment Variables

```bash
# Azure OpenAI (for completions)
AZURE_OPENAI_ENDPOINT=https://skillsy-east-ai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.1
AZURE_OPENAI_API_VERSION=2025-01-01-preview

# Supabase (for RAG)
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## License

Proprietary - Skaldi Clinical Documentation Engine
