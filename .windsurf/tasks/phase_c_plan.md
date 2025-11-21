PHASE C — Clinical Engine (Updated After C1 UI Integration)
Папка: /tasks/windsurf/phase_c_plan_v2.md
0. Что уже сделано

Windsurf выполнил:

✔ C1.1: Validation Results Display

Созданы компоненты:

validation-panel.tsx

validation-summary.tsx

validation-check-item.tsx

validation-badge.tsx

Создан API:

app/api/validation/route.ts

Теперь у нас есть базовый UI для отображения валидации, но валидации как таковой ещё нет, нет подсветки в тексте, нет auto-fix, нет editable undo/redo, нет enrichment pipeline.

Следовательно, Phase C продолжаем, но с учётом текущего состояния.

------------------------------------------------------------
1. Новая структура Phase C (адаптированная)
------------------------------------------------------------

После C1.1 правильный порядок:

C0 — Clinical Engine Core (главное)

Структурированный документ

Validation Engine

Rules v1

Suggestion Engine

Inline update API

Audit

C1 (продолжение) — Inline Validation + Text Highlighting

Связка validation → editor

Подсветка текста

Suggestions UI → Apply Fix

C2 — Enrichment + RAG Improvements

PubMed

ClinicalTrials.gov

Chunking

Embeddings

Fix Awaiting Enrichment

C3 — Export Pipeline

DOCX

PDF

C4 — Optional: Batch Ops + UI Polish

------------------------------------------------------------
2. C0 — Clinical Engine Core
------------------------------------------------------------

Этот блок — фокус. Без него нет платформы.

📌 C0.1 Document Struct (ОБЯЗАТЕЛЬНО)

Создать модуль:

/engine/document_store


Документы хранятся как JSON:

{
  "document_id": "doc_123",
  "type": "IB",
  "sections": [
    {
      "section_id": "SUMMARY",
      "blocks": [
        {
          "block_id": "SUMMARY_P1",
          "type": "paragraph",
          "text": "..."
        }
      ]
    }
  ]
}


Почему важно:

юзер должен редактировать конкретные блоки

валидация должна возвращать точные ссылки на текст

подсветка работает только с этим форматом

📌 C0.2 Update Block API

Создать endpoint:

POST /api/document/update-block

Input:

{
  "document_id": "doc_123",
  "block_id": "SUMMARY_P1",
  "new_text": "Updated..."
}


Output → обновлённый документ.

📌 C0.3 Validation Engine (backend)

Файл:

/engine/validation/index.ts


Функция:

async function runValidation(documentJson): ValidationResult {}


ValidationResult формат:

{
  "errors": 2,
  "warnings": 1,
  "issues": [
    {
      "issue_id": "ISSUE001",
      "rule_id": "PRIMARY_ENDPOINT",
      "severity": "error",
      "message": "...",
      "locations": [
        {
          "section_id": "OBJ",
          "block_id": "OBJ_P3",
          "start_offset": 0,
          "end_offset": 45
        }
      ],
      "suggestions": [ ... ]
    }
  ]
}

📌 C0.4 Rules v1

В engine/validation/rules создать:

endpoints.ts

criteria.ts

dose_regimen.ts

structure.ts

Каждое правило — функция:

async function rule(documentJson): RuleResult

📌 C0.5 Suggestion Engine

Файл:

/engine/suggestions/index.ts


Работает так:

Входит issue

Забирает конфликтующий блок

Отдаёт LLM промпт

Получает new_text

Создаёт suggestion + patches

📌 C0.6 Audit Log

Файлы:

/engine/audit/index.ts

база: Supabase audit_log

Запись:

{
  "document_id": "ib_123",
  "action": "BLOCK_UPDATED",
  "block_id": "OBJ_P3",
  "timestamp": "...",
  "user_id": "system"
}

------------------------------------------------------------
3. C1 — Inline Validation & Text Highlighting
------------------------------------------------------------

Сейчас у нас есть панель валидации, но нет связки с редактором.

Нужно:

✔ C1.2 Подсветка текста в редакторе

Добавить поддержку маркировок:

<span class="error-underline">...</span>
<span class="warning-underline">...</span>


Используем locations[] из валидации:

ищем block по block_id

вставляем <span> по offset

✔ C1.3 Jump to location

В validation-panel, при клике:

скроллим к блоку

мигаем подсветкой

✔ C1.4 Suggestions Panel

Добавить компонент:
/components/validation/suggestions-panel.tsx

Функции:

показывать предложения

diff

кнопка Apply Fix → вызывает /api/validation/apply-suggestion

✔ C1.5 Re-validate button

После любых изменений:

кнопка “Re-run validation”

дергает /api/validation/run

------------------------------------------------------------
4. C2 — Enrichment & RAG
------------------------------------------------------------
C2.1 PubMed

Модуль:

/engine/enrichment/pubmed.ts


Используем:

NCBI E-utilities API

сохраняем abstract, title, MeSH

C2.2 ClinicalTrials.gov

Модуль:

/engine/enrichment/ctgov.ts


Данные:

design

interventions

endpoints

eligibility

C2.3 Enrichment Store

В Supabase или файлы:

{
  "source_id": "pubmed:12345",
  "status": "COMPLETED",
  "chunks": [ ... ]
}

C2.4 RAG Chunking + Embeddings

Модуль:

/engine/rag/index.ts


Задачи:

chunk 512–1024 токенов

сохранять embeddings (pgvector)

связывать с document_id

C2.5 Fix Awaiting Enrichment

Ввести статусы:

QUEUED

RUNNING

COMPLETED

FAILED

Публиковать их в UI:

<EnrichmentBadge status="RUNNING" />

------------------------------------------------------------
5. C3 — Export Pipeline
------------------------------------------------------------

Создать:

/engine/export/docx.ts
/engine/export/pdf.ts


DOCX:

генерировать HTML → DOCX (docx library)

PDF:

Headless browser (Puppeteer)

------------------------------------------------------------
6. C4 — Optional Phase
------------------------------------------------------------

Только после завершения C0–C3:

Bulk generation

Bulk validation

Bulk export

------------------------------------------------------------
7. Итоговая дорожная карта Windsurf
------------------------------------------------------------
Сделано

✔ C1.1 Validation Results Display

Делать сейчас

🔥 C0.1 Document Struct
🔥 C0.2 Update Block API
🔥 C0.3 Validation Engine
🔥 C0.4 Rules
🔥 C0.5 Suggestions
🔥 C0.6 Audit

После ядра

⭐ C1.2 Inline Highlighting
⭐ C1.3 Jump to Issue
⭐ C1.4 Suggestions Panel
⭐ C1.5 Re-validate

Потом

⚙️ C2 Enrichment
📄 C3 Export
📦 C4 Batch Ops