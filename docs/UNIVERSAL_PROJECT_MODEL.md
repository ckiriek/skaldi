# Universal Project Model - Documentation

## Overview

The Universal Project Model is a compound-agnostic architecture for clinical document generation in Skaldi. It supports Phase 2/3/4 clinical trials (Phase 1 is explicitly excluded) and handles small molecules, biologics, biosimilars, and ATMPs.

## Key Principles

1. **Compound-Agnostic**: No hardcoded drug names in generation logic
2. **Phase 2/3/4 Only**: Phase 1 trials are never included
3. **Class Fallbacks**: When specific data unavailable, use therapeutic class data
4. **Biologic Support**: Full support for biologics including immunogenicity

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  /api/v2/ib/generate    /api/v2/enrichment                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    IB Generator v2                               │
│  UniversalIBGenerator.generate(projectId)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    IB Input Builder                              │
│  buildIBInput(projectId) → IBInput                              │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ CMC Enricher  │   │Clinical Enrich│   │Safety Enricher│
│ (by compound  │   │(Phase 1 excl.)│   │(Label+FAERS)  │
│  type)        │   │               │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Class Fallbacks                               │
│  SSRI, mAb, PPI, Anti-TNF, DEFAULT                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Core Data Models                              │
│  UniversalProject, UniversalCompound, UniversalCMC, etc.        │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
/lib/core/                          # Universal data models
├── compound-model.ts               # CompoundType, TherapeuticClass
├── project-model.ts                # StudyPhase (2/3/4 only)
├── cmc-model.ts                    # CMC for small mol + biologics
├── nonclinical-model.ts            # Nonclinical/toxicology
├── clinical-model.ts               # Clinical trials (Phase 1 excluded)
├── pkpd-model.ts                   # PK/PD parameters
├── safety-model.ts                 # AE, warnings, interactions
├── references-model.ts             # Auto-generated references
├── ib-input.ts                     # Unified IBInput object
└── index.ts                        # Central exports

/lib/enrichment/                    # Universal enrichers
├── cmc-enricher.ts                 # CMC enrichment
├── clinical-enricher.ts            # Clinical trials (Phase 1 excluded)
├── pkpd-enricher.ts                # PK/PD enrichment
├── safety-enricher.ts              # Safety enrichment
├── nonclinical-enricher.ts         # Nonclinical enrichment
├── ib-input-builder.ts             # Main orchestrator
├── index.ts                        # Central exports
└── class-fallbacks/                # Therapeutic class fallbacks
    ├── types.ts                    # ClassFallbackData interface
    ├── ssri.ts                     # SSRI fallback
    ├── mab.ts                      # mAb fallback
    ├── ppi.ts                      # PPI fallback
    ├── anti-tnf.ts                 # Anti-TNF fallback
    ├── default.ts                  # Default fallback
    └── index.ts                    # Registry and getters

/lib/services/
└── ib-generator-v2.ts              # Universal IB generator

/app/api/v2/
├── ib/generate/route.ts            # IB generation endpoint
└── enrichment/route.ts             # Enrichment endpoint
```

## Usage

### Generate IB Document

```typescript
// Via API
const response = await fetch('/api/v2/ib/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'your-project-id',
    configOverrides: {
      target_length: 'standard',  // 'abbreviated' | 'standard' | 'extended'
      include_appendices: true
    }
  })
})

// Direct usage
import { universalIBGenerator } from '@/lib/services/ib-generator-v2'

const result = await universalIBGenerator.generate({
  projectId: 'your-project-id',
  userId: 'user-id'
})
```

### Run Enrichment

```typescript
// Full project enrichment
import { buildIBInput } from '@/lib/enrichment'

const ibInput = await buildIBInput(projectId)

// Quick compound enrichment (for testing)
import { quickEnrichCompound } from '@/lib/enrichment'

const ibInput = await quickEnrichCompound(
  'adalimumab',
  'rheumatoid arthritis',
  'biologic',
  'ANTI_TNF'
)
```

### Access Class Fallbacks

```typescript
import { 
  getClassFallback,
  getClassSafetyFallback,
  hasSpecificFallback 
} from '@/lib/enrichment'

// Get full fallback for a class
const ssriFallback = getClassFallback('SSRI')

// Get specific section fallback
const safetyData = getClassSafetyFallback('ANTI_TNF')

// Check if specific fallback exists
if (hasSpecificFallback('STATIN')) {
  // Use specific fallback
} else {
  // Use DEFAULT fallback
}
```

## Compound Types

| Type | Description | CMC Fields | Immunogenicity |
|------|-------------|------------|----------------|
| `small_molecule` | Traditional small molecule drugs | pKa, logP, MW | No |
| `biologic` | Monoclonal antibodies, proteins | Expression system, glycosylation | Yes |
| `biosimilar` | Biosimilar products | Same as biologic + reference product | Yes |
| `atmp` | Gene therapies, CAR-T | Specialized | Yes |

## Therapeutic Classes

### Small Molecules
- `SSRI` - Selective Serotonin Reuptake Inhibitors
- `SNRI` - Serotonin-Norepinephrine Reuptake Inhibitors
- `PPI` - Proton Pump Inhibitors
- `STATIN` - HMG-CoA Reductase Inhibitors
- `NSAID` - Non-Steroidal Anti-Inflammatory Drugs
- And more...

### Biologics
- `mAb` - Monoclonal Antibodies (general)
- `ANTI_TNF` - TNF-alpha Inhibitors
- `PD1_INHIBITOR` - PD-1/PD-L1 Inhibitors
- `IL_INHIBITOR` - Interleukin Inhibitors
- And more...

## IBInput Object

The unified input object for IB generation:

```typescript
interface IBInput {
  project: UniversalProject
  compound: UniversalCompound
  cmc: UniversalCMC
  nonclinical: UniversalNonclinical
  clinical_trials: UniversalClinicalTrials  // Phase 2+ only
  pk: UniversalPK
  pd: UniversalPD
  safety: UniversalSafety
  references: UniversalReferences
  generation_config: IBGenerationConfig
  enriched_at: string
  completeness: {
    cmc: number
    nonclinical: number
    clinical: number
    pk: number
    pd: number
    safety: number
    overall: number
  }
  enrichment_warnings: string[]
}
```

## Phase 1 Exclusion

Phase 1 trials are **always** excluded from clinical data:

```typescript
// In clinical-enricher.ts
const filterCriteria: TrialFilterCriteria = {
  compound_name: compound.inn_name,
  indication: project.indication,
  phases_included: [2, 3, 4], // NEVER includes Phase 1
  // ...
}

// In clinical-model.ts
export function filterTrials(
  trials: ClinicalTrial[],
  criteria: TrialFilterCriteria
): ClinicalTrial[] {
  return trials.filter(trial => {
    // CRITICAL: Exclude Phase 1
    if (!trial.phase || trial.phase < 2) {
      return false
    }
    // ...
  })
}
```

## Database Schema

New columns added to `projects` table:

| Column | Type | Description |
|--------|------|-------------|
| `compound_type` | enum | small_molecule, biologic, biosimilar, atmp |
| `therapeutic_class` | enum | SSRI, mAb, PPI, etc. |
| `study_phase` | integer | 2, 3, or 4 only (constraint enforced) |
| `population_type` | text | adults, pediatric, geriatric |
| `population_age_min` | integer | Minimum age |
| `population_age_max` | integer | Maximum age |
| `route_of_administration` | text | oral, iv, sc, etc. |
| `treatment_duration_weeks` | integer | Treatment duration |
| `enrichment_completed_at` | timestamp | Last enrichment time |
| `ib_enrichment_data` | jsonb | Cached IBInput |

## Migration

Run the migration:

```bash
supabase db push
# or
psql -f supabase/migrations/20251202_universal_project_model.sql
```

## Testing

```bash
# Run unit tests
npm test -- --testPathPattern="lib/core"
npm test -- --testPathPattern="lib/enrichment"

# Run specific test file
npm test -- __tests__/lib/enrichment/class-fallbacks.test.ts
```

## API Endpoints

### POST /api/v2/ib/generate

Generate IB document using universal model.

**Request:**
```json
{
  "projectId": "uuid",
  "configOverrides": {
    "target_length": "standard",
    "include_appendices": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "documentId": "uuid",
  "sectionsCount": 9,
  "completeness": {
    "cmc": 0.8,
    "nonclinical": 0.7,
    "clinical": 0.9,
    "pk": 0.6,
    "pd": 0.5,
    "safety": 0.85,
    "overall": 0.75
  },
  "validation": { ... },
  "enrichment_warnings": [],
  "duration_ms": 45000
}
```

### POST /api/v2/enrichment

Run enrichment for a project or compound.

**Request (project):**
```json
{
  "projectId": "uuid"
}
```

**Request (quick compound):**
```json
{
  "compoundName": "adalimumab",
  "indication": "rheumatoid arthritis",
  "compoundType": "biologic",
  "therapeuticClass": "ANTI_TNF"
}
```

### GET /api/v2/enrichment?projectId=xxx

Get enrichment status for a project.

## Version History

- **v2.0.0** (2025-12-02): Initial Universal Project Model implementation
  - Core data models
  - Class fallbacks (SSRI, mAb, PPI, Anti-TNF, DEFAULT)
  - Universal enrichers
  - IB Generator v2
  - API endpoints v2
