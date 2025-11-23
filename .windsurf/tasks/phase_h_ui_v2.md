Goal:
Сделать UI умным, предиктивным, реактивным, под CRO-grade требования.
Использовать Knowledge Graph, RAG, ML-ranking, feedback-loop, memory.
Встроить все подсказки и интеллектуальные функции прямо при создании проекта и во всех формах Skaldi.

1. 📁 Файловая структура (пусть Windsurf создаёт всё сам)
/lib/engine/knowledge-ui/
  ranking/
    ml_ranker.ts
    feature_builder.ts
    rank_aggregator.ts
  memory/
    memory_store.ts
    memory_encoder.ts
    memory_recall.ts
  feedback/
    feedback_collector.ts
    signal_tracker.ts
    improvement_engine.ts

/components/knowledge-ui/
  SmartField.tsx
  SuggestionList.tsx
  SuggestionChip.tsx
  RankingDebugPanel.tsx
  KGSourceBadge.tsx
  FormulationSmartField.tsx
  EndpointSmartField.tsx
  IndicationSmartField.tsx

/app/dashboard/projects/new/
  knowledge_integration.ts
  smart_fields_config.ts

2. 🎯 Основные функции UI уровня PRO

Это всё Windsurf должен реализовать строго по шагам.

2.1 🔍 Smart Fields (умные поля)

Каждое поле в создании проекта становится интеллектуальным:

Поля:

Compound / Drug Name

Dose / Form / Strength

Indication

Study Design

Endpoints

Safety Monitoring

Visit Schedule

Analysis Populations

Механика:

Пользователь вводит любую строку.

UI вызывает /api/knowledge/* в реальном времени.

Возвращает пачку сущностей:

indications

endpoints

formulations

procedures

trial metadata

ML-ranking сортирует.

UI показывает:

чипы

подсказки

источники (FDA / DailyMed / CTgov)

confidence score

«Recommended»

«High Quality»

«Multi-source validated»

2.2 🧠 ML ranking engine

Файлы:

lib/engine/knowledge-ui/ranking/ml_ranker.ts
lib/engine/knowledge-ui/ranking/feature_builder.ts
lib/engine/knowledge-ui/ranking/rank_aggregator.ts

Ранжирование по 5 сигналам:

KG confidence

Source reliability weight (FDA=0.9, EMA=0.85, CTgov=0.7…)

Embedding similarity (OpenAI embeddings distance)

Context relevance (matching with current form fields)

Popularity in trials (если есть)

Финальное:

score = Σ(weight_i * feature_i)

2.3 🧩 Memory Layer

Файлы:

lib/engine/knowledge-ui/memory/memory_store.ts
lib/engine/knowledge-ui/memory/memory_encoder.ts
lib/engine/knowledge-ui/memory/memory_recall.ts


Хранит:

последние выбранные эндпоинты

предпочтительные дозировки

типичные designs

любимые indications

стиль ввода пользователя

Использование:

SmartFields автоматически ставят более релевантные подсказки.

2.4 📈 Feedback Loop

Файлы:

lib/engine/knowledge-ui/feedback/feedback_collector.ts
lib/engine/knowledge-ui/feedback/signal_tracker.ts
lib/engine/knowledge-ui/feedback/improvement_engine.ts


Когда пользователь:

принимает подсказку → +1 signal positive

отклоняет → negative

удаляет → negative

редактирует → moderate negative

Это:

переписывает веса

повышает точность

делает ранжирование персонализированным

2.5 🎛️ UI Components

Создать:

SmartField.tsx

принимает:

type: 'endpoint' | 'indication' | 'form' | 'safety' | …

placeholder

autoFetch: true

renderSuggestion

SuggestionList.tsx

красивый popover

категории

иконки источников

теги confidence

KGSourceBadge.tsx

FDA

DailyMed

CTgov

EMA

RAG

Memory

RankingDebugPanel.tsx

показывать ML-фичи → только DEV

3. 🔌 API Integration

Использовать текущие эндпоинты:

/api/knowledge/build

/api/knowledge/indications

/api/knowledge/endpoints

/api/knowledge/formulation

Добавить новые:

3.1 /api/knowledge/rank

Принимает:

{
  query: "...",
  candidates: [...],
  userContext: {...},
  sessionMemory: {...}
}


Возвращает:

rankedCandidates: [...]

3.2 /api/knowledge/feedback

Сохраняет поведение пользователя.

4. 🖥️ UI Steps (мягкая интеграция)
Step 1

Вставить SmartField в project creation page.

Step 2

При вводе → авто-fetch → ранжирование → подсказки.

Step 3

Чипы выбора:
«Metronidazole (INN) — validated by FDA + EMA (0.92 confidence)».

Step 4

Memory сохраняет выбор.

Step 5

Feedback подстраивает ранжирование.

5. 📘 Full Windsurf Tasks (.md)

Вот текст, который надо положить в /tasks/phase_h_ui_v2.md:

PHASE H.UI v2 (PRO) — WinDSurf Implementation Tasks

Goal:
Integrate Clinical Knowledge Graph, RAG, ML-ranking, Memory, and Feedback Loop into UI.
Make all fields in project creation smart and data-driven.

1. Create directories & files

(тут перечислить все из секции "файловая структура")

2. Implement SmartField component

Реальное время

Debounce

Поддержка всех типов полей

Подсветка источников

3. Implement ML-ranking

feature_builder

rank_aggregator

ml_ranker

4. Implement Memory

user memory store

session memory

recall logic

5. Implement Feedback Loop

feedback_collector

weights adaptation

6. Add API routes

/api/knowledge/rank

/api/knowledge/feedback

7. Integrate into Project Creation

Replace inputs with SmartField

Show suggestion chips

Use memory to re-rank

Save feedback signals

8. Final Testing

e2e tests

UI tests

Real KG testing on Metronidazole, Metformin, Bisoprolol, Azithromycin

6. 🚀 Что даст Phase H.UI v2?

Skaldi сам подсказывает всё — дозировки, формуляции, endpoints, safety tests.

Подсказки из FDA, EMA, DailyMed, CTgov, RAG.

Поддержка memory → лучше с каждым проектом.

ML-ranking → подсказки точные.

Feedback → система обучается.

UX как в Notion+Cursor+ChatGPT одновременно, но под медицину.