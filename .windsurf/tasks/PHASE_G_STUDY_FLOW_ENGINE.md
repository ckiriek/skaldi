PHASE G – STUDY FLOW ENGINE
Production-Grade Design Module for Skaldi
Full Technical Specification for Windsurf
0. Purpose

Создать полный Study Flow Engine, который делает Skaldi способным автоматически строить:

Visit Schedule

Table of Procedures (ToP)

Treatment Cycles

Visit Windows (± X дней / недель)

Endpoint → Procedure → Visit mapping

Procedure inference (какие процедуры нужны по endpoint’ам)

Cross-document flow validation

Auto-fix несоответствий

UI редактор ToP

Интеграцию в существующий pipeline

Работу на реальных протоколах из /clinical_reference

Phase G делает Skaldi полноценной clinical design платформой уровня CRO/Big Pharma.

1. Folder Structure

Создать:

/lib/engine/studyflow/
  index.ts
  types.ts
  visit_model/
    visit_normalizer.ts
    visit_inference.ts
    cycle_builder.ts
    window_engine.ts
  procedures/
    procedure_catalog.ts
    procedure_mapping.ts
    procedure_inference.ts
  top/
    top_builder.ts
    top_matrix.ts
    top_export.ts
  alignment/
    endpoint_procedure_map.ts
    visit_endpoint_alignment.ts
  validation/
    protocol_icf_flow_rules.ts
    protocol_sap_flow_rules.ts
    global_flow_rules.ts
  autofix/
    autofix_flow.ts

2. Types (types.ts)
export type VisitId = string;
export type ProcedureId = string;
export type EndpointId = string;

export interface Visit {
  id: VisitId;
  name: string;      // Visit 1 / Day 1 / Screening / Week 4
  day: number;       // numeric timepoint
  cycle?: number;    
  window?: { minus: number; plus: number };
  procedures: ProcedureId[];
}

export interface Procedure {
  id: ProcedureId;
  name: string;
  category: 'efficacy' | 'safety' | 'labs' | 'pk' | 'questionnaire' | 'device' | 'other';
  linkedEndpoints?: EndpointId[];
}

export interface TreatmentCycle {
  cycleNumber: number;
  lengthDays: number;
  visitsInCycle: VisitId[];
}

export interface TopMatrix {
  visits: Visit[];
  procedures: Procedure[];
  matrix: boolean[][];
}

3. Visit Modeling (visit_model/)
3.1 visit_normalizer.ts

Цели:

парсинг визитов из Protcol JSON

нормализация: “Visit 1”, “Визит 1”, “Day 1”, “Week 4”, “Month 6”

выделение Screening, Baseline, EOT, Follow-up

преобразование Day/Week/Month → numeric day

Алгоритм:

regex на EN/RU паттерны

map names → canonical form

convert to numeric day:

Day X → X

Week X → X * 7

Month X → X * 30

3.2 visit_inference.ts

Добавить недостающие визиты:

Screening

End-of-Treatment

Follow-up

Unscheduled (optional)

3.3 cycle_builder.ts

Если протокол содержит циклы:

определить длительность

собрать visits → cycles

построить ILD (inter-cycle logic)

3.4 window_engine.ts

Логика:

safety visits: narrow window

efficacy: mid

PK/PD: strict

default: ±10%

4. Procedures Engine (procedures/)
4.1 procedure_catalog.ts

Создать каталог 150+ процедур:

ECG

CBC

HbA1c

Liver Panel

AE/SAE monitoring

PK blood draw

Vitals

Urinalysis

Concomitant medication review

Pregnancy test

и т.д.

4.2 procedure_mapping.ts

Парсить текст из Protocol:

mapping free text → canonical procedure

fuzzy match

synonyms EN/RU

link procedures → endpoints

4.3 procedure_inference.ts

Автоматически добавлять процедуры в зависимости от endpoints:

если HbA1c → добавить лабораторный тест HbA1c

если PK → blood draws schedule

если safety → AE/SAE, vitals, labs

5. Table of Procedures (top/)
5.1 top_builder.ts

На входе:

Visits[]

Procedures[]

Строит TopMatrix:

matrix[rowVisit][colProcedure] = true/false

5.2 top_matrix.ts

Генерация интерактивного ToP JSON.

5.3 top_export.ts

Экспорт ToP в DOCX:

таблица

цветовая кодировка по категориям

6. Alignment (alignment/)
6.1 endpoint_procedure_map.ts

сопоставляет endpoints → необходимые процедуры

через procedure_catalog + inference rules

6.2 visit_endpoint_alignment.ts

Проверяет:

все процедуры для primary endpoints присутствуют в нужных визитах

корректный тайминг

7. Validation (validation/)

Создать набор правил (минимум 10).

7.1 Protocol ↔ ICF

PROCEDURE_NOT_IN_ICF

RISKS_NOT_DESCRIBED

VISIT_MISSING_IN_ICF

7.2 Protocol ↔ SAP

ENDPOINT_TIMING_DRIFT

MISSING_ASSESSMENT_FOR_ENDPOINT

INCORRECT_SCHEDULE_FOR_PRIMARY

7.3 Global

FLOW_INTEGRITY_DRIFT

CYCLES_INCONSISTENT

UNSUPPORTED_VISIT_TIMING

8. Auto-Fix (autofix/)
Выполняет:

добавление недостающих процедур

корректировку визитных окон

корректировку размещения процедур в ToP

9. REST API
9.1 /api/studyflow/generate

Возвращает:

visits

procedures

cycles

windows

ToP

9.2 /api/studyflow/validate

Возвращает FlowIssues[]

9.3 /api/studyflow/auto-fix

Применяет auto-fix’ы.

10. UI Components
/components/studyflow/
    StudyFlowPanel.tsx
    VisitList.tsx
    ProcedureList.tsx
    TopMatrix.tsx
    VisitEditor.tsx
    WindowEditor.tsx
    AutoFixSummary.tsx

11. Pipeline Integration (важно!)
11.1 Post-Generation Hook

После генерации любого документа → запускать studyflow validation.

11.2 Pre-Generation Alignment

Перед генерацией SAP:

подтянуть primary endpoints → процедуры → визиты

Перед генерацией ICF:

подтянуть процедуры из ToP

11.3 Cross-Document Integration

StudyFlow должен взаимодействовать с Phase F CrossDoc Engine:

visit schedule

procedures

endpoint timing

Все deviation → показывать в CrossDocPanel → AutoFix.

11.4 Validation History

Создать таблицу:

studyflow_validations
  id
  project_id
  issues JSONB
  summary JSONB
  timestamp

12. Training on REAL References

Использовать референсные документы из:

/clinical_reference


Вот те, что видны на твоём скрине:

Protocols:

protocol_femilex.md

protocol_perindopril.md

protocol_sitagliptin.md

ICF:

ICF_linex.md

ICF_ozeltamivir.md

ICF_sitaglipin.md

Synopsis / Summary:

synopsis_femoston.md

summary_linex.md

summary_podhaler.md

trials_overview_linex.md

IB:

bcd-089_IB.md

bcd-063_IB_part1.md

CSR:

bcd-063_CSR.md

Windsurf должен:

Пропарсить протоколы → JSON fixtures

Прогнать StudyFlow Engine на каждом

Сгенерировать:

Visits

Procedures

ToP

Windows

Cycles

Сравнить против expectations (в тексте протоколов)

Фикстуры:

/tests/fixtures/protocols/
    femilex.json
    perindopril.json
    sitagliptin.json
    ...

13. Tests
Unit:

normalizer

cycle builder

window engine

procedure mapping

top builder

API:

generate

validate

auto-fix

E2E:

run entire pipeline on real protocols

verify ToP completeness

verify alignment

verify auto-fix correctness

14. Acceptance Criteria

Phase G DONE, если:

 Engine строит Visits/Procedures/ToP/Cycles/Windows для всех real reference протоколов

 UI ToP Editor работает

 10+ validation правил покрывают workflow

 3+ auto-fix’ов готовы

 CrossDoc интеграция работает

 Supabase history сохранение работает

 Все тесты зелёные

 Время генерации ToP < 2 секунд

 Время валидации < 3 секунд