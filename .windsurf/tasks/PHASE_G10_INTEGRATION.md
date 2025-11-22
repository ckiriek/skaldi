PHASE G.10 — FULL PIPELINE INTEGRATION
Complete Technical Specification for Windsurf
0. Purpose

Интегрировать:

Study Flow Engine (Phase G)

Cross-Document Intelligence Engine (Phase F)

Existing Document Generation Pipeline (IB → Protocol → ICF → SAP → CSR)

в единый production workflow.

Цель:
каждый документ автоматически проверяется, выравнивается, улучшает downstream документы и сохраняет историю.

1. Integration Overview (high-level)

После G.10:

✔ При генерации Protocol → автоматически создаётся StudyFlow
✔ При генерации SAP → auto pre-fill из Protocol + StudyFlow
✔ При генерации ICF → процедуры берутся из ToP
✔ После генерации каждого документа → CrossDoc Validation
✔ Все валидации сохраняются в Supabase
✔ CrossDoc и StudyFlow показывают баннеры (warnings/errors)
✔ Пользователь может применить AutoFix (Phase F+G)
✔ Pipeline становится audit-ready для FDA/EMA
2. File Structure To Add
/tasks/windsurf/PHASE_G10_INTEGRATION.md
/app/api/documents/hook/post_generation.ts
/app/api/documents/hook/pre_generation.ts
/lib/integration/
    run_post_generation_checks.ts
    run_pre_generation_alignment.ts
    history_logger.ts
    banners.ts
/components/integration/
    DocumentStatusBanner.tsx
    ValidationHistory.tsx

3. DATABASE MIGRATIONS (Supabase)
3.1 Create table: studyflow_validations
CREATE TABLE IF NOT EXISTS studyflow_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  document_id UUID,
  issues JSONB NOT NULL,
  summary JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

3.2 Create table: crossdoc_validations
CREATE TABLE IF NOT EXISTS crossdoc_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  issues JSONB NOT NULL,
  summary JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

3.3 Add new fields to documents table:
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'clean',
ADD COLUMN IF NOT EXISTS validation_summary JSONB;

4. POST-GENERATION HOOK (critical)

Файл:

/app/api/documents/hook/post_generation.ts


Логика:

export async function runPostGenerationChecks({ projectId, documentId }) {
  
  // 1. Run StudyFlow validation
  const sf = await fetch('/api/studyflow/validate', ...)
  const sfResult = await sf.json()

  await supabase.from('studyflow_validations').insert({
    project_id: projectId,
    document_id: documentId,
    issues: sfResult.issues,
    summary: sfResult.summary
  })

  // 2. Run CrossDoc validation
  const cd = await fetch('/api/crossdoc/validate', ...)
  const cdResult = await cd.json()

  await supabase.from('crossdoc_validations').insert({
    project_id: projectId,
    issues: cdResult.issues,
    summary: cdResult.summary
  })

  // 3. Update document validation status
  let status = 'clean'
  if (cdResult.summary.critical > 0) status = 'critical'
  else if (cdResult.summary.error > 0) status = 'error'
  else if (cdResult.summary.warning > 0) status = 'warning'

  await supabase.from('documents')
    .update({
      validation_status: status,
      validation_summary: cdResult.summary
    })
    .eq('id', documentId)

  return { studyflow: sfResult, crossdoc: cdResult }
}

5. PRE-GENERATION ALIGNMENT

Файл:

/app/api/documents/hook/pre_generation.ts

5.1 SAP Pre-fill

SAP must receive:

primary endpoints from Protocol

timepoints from StudyFlow

procedure sets from alignment

Псевдокод:

export async function prefillSAP({ protocolId, studyflow }) {
  return {
    primaryEndpoints: protocol.primaryEndpoints,
    visitSchedule: studyflow.visits,
    procedures: studyflow.procedures,
    topMatrix: studyflow.top,
    analysisPopulations: protocol.analysisPopulations
  }
}

5.2 ICF Pre-fill

ICF must receive:

procedures required for baseline

procedures required for safety

procedure descriptions (from catalog)

6. UI Integration
6.1 Document Status Banner

Файл:

/components/integration/DocumentStatusBanner.tsx


Показывает:

🟥 Critical issues

🟧 Errors

🟨 Warnings

🟩 Clean

Пример:

<DocumentStatusBanner
  status={document.validation_status}
  summary={document.validation_summary}
/>

Appearance:

If critical: red banner → “X critical cross-document issues detected”

If error: orange banner → “Document may be inconsistent”

If warning: yellow banner → “Recommended improvements available”

If clean: green banner → “Document validated — no issues”

6.2 Validation History UI

Файл:

/components/integration/ValidationHistory.tsx


Показывает:

список всех validation runs

timestamp

errors/warnings count

button “Show details”

7. INTEGRATION INTO DOCUMENT GENERATION PIPELINE

Вставить:

import { runPostGenerationChecks } from '@/lib/integration/run_post_generation_checks'
import { runPreGenerationAlignment } from '@/lib/integration/run_pre_generation_alignment'

7.1 On Document Generation (after saving):
await runPostGenerationChecks({ projectId, documentId })

7.2 Before SAP/ICF generation:
const alignedInput = await runPreGenerationAlignment(...)

8. CROSSDOC + STUDYFLOW AUTO-FIX PIPELINE

После валидации система должна:

показывать auto-fix options

применять auto-fix

перегенерировать StudyFlow (если изменились visits/procedures)

перегенерировать SAP/ICF (если изменились schedules)

Это “self-healing pipeline”.

API:

POST /api/studyflow/auto-fix
POST /api/crossdoc/auto-fix


Pipeline:

AutoFix → Refresh StudyFlow → Revalidate → Update Document → Save History

9. PIPELINE CI CHECKS

Добавить новый тест:

/__tests__/pipeline/integration.test.ts


Тестирует:

generation → studyflow → crossdoc → autofix → regeneration

all real reference protocols (Femilex, Perindopril, Sitagliptin, etc.)

expected consistency after auto-fix

10. REAL REFERENCE PROTOCOLS (MANDATORY)

Использовать файлы из проекта:

/clinical_reference/
  protocol_femilex.md
  protocol_perindopril.md
  protocol_sitaglipin.md
  ICF_sitaglipin.md
  ICF_linex.md
  synopsis_femoston.md
  summary_linex.md
  trials_overview_linex.md
  bcd-089_IB.md
  bcd-063_CSR.md

Windsurf обязан:

Пропарсить протоколы → JSON

Прогнать StudyFlow Engine

Прогнать CrossDoc Engine

Проверить, что pipeline не ломается

Проверить авто-fix → everything correct

Создать regression tests based on these real documents

11. ACCEPTANCE CRITERIA – PHASE G.10 COMPLETE

Phase G.10 DONE when:

✔ Every generated document automatically validated
✔ CrossDoc + StudyFlow run together
✔ AutoFix pipeline works end-to-end
✔ History tracked in DB
✔ Status banner shows correct status
✔ SAP/ICF prefill implemented
✔ Real clinical protocols fully supported
✔ All regression tests pass