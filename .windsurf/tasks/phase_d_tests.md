PHASE D — TESTING & QA PLAN
Skaldi Clinical Engine — Full Test Specification

Дата: 2025-11-21
Статус: Готово к исполнению Windsurf

0. Цель

Phase D проверяет, что весь Clinical Engine работает последовательно и безошибочно:

генерация → обогащение → RAG → валидация → автофиксы → повторная валидация → экспорт

корректность API

корректность UI взаимодействий

отсутствие регрессий

корректность логирования

безопасность

Все тесты должны быть автоматизированы (где возможно) или запускаться Windsurf последовательно.

---------------------------------------------------------
1. Общая структура тестов
---------------------------------------------------------

Каталог:

/tests/
  e2e/
  unit/
  api/
  ui/
  security/
  performance/

---------------------------------------------------------
2. E2E TESTS (End-to-End)
---------------------------------------------------------

Эти тесты — основа. Они проверяют весь жизненный цикл реального клинического документа.

E2E-01 — Full Cycle: Generate → Enrich → Validate → Fix → Revalidate → Export
Шаги:

Создать тестовый документ ib_test.json

Запустить генерацию

Выполнить enrichment:

PubMed

ClinicalTrials

PubChem

openFDA

Убедиться, что enrichment statuses → COMPLETED

Запустить validation

Проверить:

есть ошибки

есть warnings

issues содержат корректные location offsets

Выбрать первый suggestion → Apply Fix

Убедиться, что:

блок обновился

audit log записал изменение

Снова запустить validation

Экспортировать DOCX и PDF

Проверить:

файлы существуют

файлы корректные

нет битых ссылок

Ожидаемый результат:

цикл завершён без ошибок

все этапы выполнились корректно

экспортируемые файлы открываются

E2E-02 — Batch Operations

Шаги:

Создать 3 документа

Запустить batch generation

Убедиться, что:

concurrency control работает

прогресс отображается

Запустить batch validation

Проверить:

результаты собраны по каждому документу

Сделать batch export

Проверить ZIP архив

E2E-03 — Validation Highlighting Sync

Шаги:

Запустить validation

Перейти на документ

Кликнуть ошибку в панели

Проверить:

редактор скроллит к нужному блоку

подсветка совпадает с offsets

tooltip отображает message

---------------------------------------------------------
3. UNIT TESTS
---------------------------------------------------------

Каталог: /tests/unit/validation/

Rule tests:
UNIT-VAL-01 — Structural Rule

отсутствует обязательный раздел → error

пустой блок → warning

заполненный документ → success

UNIT-VAL-02 — Endpoint Consistency Rule

разные primary endpoints → error

одинаковые → success

частичное совпадение → warning

UNIT-VAL-03 — Population Rule

mismatch ITT definition → error

inconsistency in inclusion criteria → error

UNIT-VAL-04 — Dose/Regimen Rule

разные дозы в Methods и Drug Info → error

одинаковые → success

UNIT-VAL-05 — IB ↔ Protocol Consistency

разные indications → error

разные MoA → error

корректные → success

UNIT-SUGG-01 — Suggestion Engine

suggestion возвращает корректный patch формат

block_id совпадает

diff отображается

---------------------------------------------------------
4. API TESTS
---------------------------------------------------------

Каталог: /tests/api/

API-VAL-01 — POST /api/validation/run

корректный document_id → 200

отсутствующий → 404

пустой документ → 400

API-VAL-02 — GET /api/validation/result

корректный → 200

нет результата → empty object

API-DOC-01 — POST /api/document/update-block

обновление текста

проверка audit

проверка сохранения

API-SUG-01 — POST /api/validation/apply-suggestion

корректный suggestion → обновление блока

неверный id → 404

API-EXP-01 — Export Endpoints

DOCX экспорт → файл существует

PDF экспорт → файл существует

API-BATCH-01 — Batch Endpoints

correct payload → success

empty selection → error

---------------------------------------------------------
5. UI TESTS
---------------------------------------------------------

Каталог: /tests/ui/

UI-EDIT-01 — Inline Editing

клик в блок → editable

сохранение по blur

audit log пишется

UI-HIGHLIGHT-01 — Validation Markers

красная линия для error

жёлтая для warning

hover tooltip

UI-JUMP-01 — Jump to Block

клик → скролл

выделение работает

UI-DIFF-01 — Suggestion Diff

отобразить старый текст

отобразить предложенный текст

кнопка Apply Fix

---------------------------------------------------------
6. SECURITY TESTS
---------------------------------------------------------

Каталог: /tests/security/

SEC-01 — Input Sanitization

вставить HTML → должно экранироваться

вставить JS → не исполняется

SEC-02 — Rate limiting

100 запросов/мин → должен блокировать

SEC-03 — Secrets Check

убедиться, что .env не попадает в client bundle

SEC-04 — Access boundaries

невозможность запросить документ другого user_id

невозможность применить чужие suggestions

---------------------------------------------------------
7. PERFORMANCE TESTS
---------------------------------------------------------

Каталог: /tests/performance/

PERF-01 — Large Document Validation

Документ > 15,000 слов:

Ожидаемое время:

validation < 2s

highlighting < 100ms

PERF-02 — Batch Ops Performance

10 документов

concurrent = 3

generation не тормозит UI

---------------------------------------------------------
8. RUN INSTRUCTIONS
---------------------------------------------------------

В корне проекта создать:

/tests/run-tests.ts


Содержимое:

import { runE2E } from './e2e';
import { runUnit } from './unit';
import { runApi } from './api';
import { runUi } from './ui';
import { runSecurity } from './security';
import { runPerformance } from './performance';

async function runAll() {
  console.log("Running E2E tests...");
  await runE2E();

  console.log("Running Unit tests...");
  await runUnit();

  console.log("Running API tests...");
  await runApi();

  console.log("Running UI tests...");
  await runUi();

  console.log("Running Security tests...");
  await runSecurity();

  console.log("Running Performance tests...");
  await runPerformance();

  console.log("ALL TESTS COMPLETED");
}

runAll();


Запуск:

npm run test


(или Windsurf автоматически выполнит)

---------------------------------------------------------
9. Report Format
---------------------------------------------------------

После выполнения тестов Windsurf должен сформировать отчёт:

report_phase_d.json
{
  "timestamp": "2025-11-21T12:30:00Z",
  "summary": {
    "total_tests": 112,
    "passed": 108,
    "failed": 4,
    "coverage": "96%"
  },
  "failures": [
    {
      "test_id": "UI-HIGHLIGHT-01",
      "reason": "offset mismatch",
      "details": "start_offset in validation doesn't match rendered text"
    }
  ],
  "performance": {
    "validation_ms": 1200,
    "batch_export_ms": 3200
  }
}

report_phase_d.md

С понятным summary