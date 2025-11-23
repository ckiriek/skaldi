# Phase H.UI v3-v4 - Protocol Autocomplete & AI Study Designer

Status: DESIGN SPEC  
Context:  
- Backend H.1-H.6 - готово (KG, RAG, stats, studyflow, crossdoc, ingestion)  
- H.UI v2 - умные поля при создании проекта, KG-интеграция, ранжирование, memory, feedback  

Эта спецификация добавляет два слоя поверх уже существующей логики:

- Phase H.UI v3 - Autocomplete Protocol  
- Phase H.UI v4 - AI-driven Study Designer  

Цель - чтобы Skaldi умел:
- дописывать протокол за пользователя, по сути как "Copilot для протокола"  
- собирать дизайн исследования целиком из минимального ввода, используя все движки  

---

## 0. Общая архитектура

У нас уже есть:
- Knowledge Graph + RAG: lib/engine/knowledge/*
- Statistics Engine: lib/engine/statistics/*
- Study Flow Engine: lib/engine/studyflow/*
- Cross-Document Engine: lib/engine/crossdoc/*
- Formulation Normalizer: H.1

Теперь добавляем два UI слоя:

1) Autocomplete Protocol Editor
2) Study Designer Wizard

Оба слоя должны:

- использовать существующие движки, НЕ дублировать логику  
- работать через новые API-эндпоинты  
- быть модульными, чтобы потом можно было использовать компоненты и в IB, и в SAP  

---

## 1. Phase H.UI v3 - Autocomplete Protocol

### 1.1 Цель

Сделать интерактивный редактор протокола, где:

- каждая секция получает AI-подсказки из:
  - Knowledge Graph
  - RAG по референсным протоколам (локальные файлы из /mnt/data)
  - статистического движка
  - studyflow
- пользователь печатает - система предлагает:
  - автодополнение фразами
  - целые абзацы
  - шаблоны секций
  - регуляторные hints  

Важно: это НЕ редактор с нуля. Это надстройка над тем, что у нас уже есть для генерации протоколов.

---

### 1.2 Файл-структура UI v3

Создать:

```text
/components/protocol-editor/
  ProtocolEditor.tsx
  ProtocolSection.tsx
  ProtocolOutlineSidebar.tsx
  SectionSuggestionBar.tsx
  InlineCompletion.tsx
  RegHintsPanel.tsx
  SourceSnippetBadge.tsx

/lib/engine/protocol-ui/
  section_schema.ts
  suggestion_engine.ts
  snippet_provider.ts
  reg_hint_engine.ts
  merge_strategy.ts

/app/dashboard/projects/[id]/protocol/  (новый маршрут)
  page.tsx
  loader.ts
1.3 Модель секций протокола

Файл: lib/engine/protocol-ui/section_schema.ts

Определить структуру:

export type ProtocolSectionId =
  | 'title'
  | 'synopsis'
  | 'objectives'
  | 'endpoints'
  | 'study_design'
  | 'study_population'
  | 'eligibility'
  | 'treatments'
  | 'study_flow'
  | 'efficacy_assessments'
  | 'safety_assessments'
  | 'statistics'
  | 'admin'
  | 'ethics'
  | 'icf_summary';

export interface ProtocolSectionDefinition {
  id: ProtocolSectionId;
  title: string;
  required: boolean;
  order: number;
  dependsOn?: ProtocolSectionId[];
  usesEngines?: Array<'knowledge' | 'stats' | 'studyflow' | 'crossdoc'>;
}

export const PROTOCOL_SECTIONS: ProtocolSectionDefinition[] = [ ... ];

1.4 Suggestion Engine

Файл: lib/engine/protocol-ui/suggestion_engine.ts

Задачи:

получать контекст:

project (drug, indication, phase, design, endpoints)

текущая секция

уже написанный текст секции

дергать движки:

Knowledge Graph RAG

statistics engine

studyflow engine

crossdoc engine (для консистентности с IB/SAP)

возвращать предложения:

export interface SectionSuggestion {
  id: string;
  sectionId: ProtocolSectionId;
  type: 'snippet' | 'completion' | 'template' | 'reg_hint';
  title: string;
  preview: string;
  fullText: string;
  source: 'kg' | 'rag' | 'stats' | 'studyflow' | 'rule' | 'local_protocol';
  confidence: number; // 0..1
  referenceIds?: string[]; // ссылки на underlying sources
}


Механика:

Берем current text → отправляем в /api/protocol/suggest

Получаем список SectionSuggestion[]

UI показывает:

шаблоны секций

inline completion (как в GitHub Copilot)

панель с опциями

1.5 Snippet Provider - референсные протоколы

Файл: lib/engine/protocol-ui/snippet_provider.ts

Использовать:

локальные протоколы из /mnt/data/...

уже существующий RAG слой: lib/engine/knowledge/rag/*

Задача:

по запросу вида:

"safety assessments in Phase 3 T2D trial"

"inclusion criteria for metformin T2D"

находить релевантные чанки из:

/Users/mitchkiriek/skaldi/clinical_reference

1.6 RegHints Engine

Файл: lib/engine/protocol-ui/reg_hint_engine.ts

Использовать:

knowledge of ICH E6, E3, E9 (у нас уже заложено в движках)

crossdoc validation rules

statistics engine rules

Задача:

анализировать текст секции и выдавать подсказки:

"Primary endpoint should be explicitly linked to sample size assumptions"

"Visit schedule should match Study Flow and ICF"

"Safety section must describe AE/SAE handling and reporting"

Под формат:

export interface RegHint {
  id: string;
  sectionId: ProtocolSectionId;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestion?: string;
  ruleId?: string;
}

1.7 ProtocolEditor UI

Файл: components/protocol-editor/ProtocolEditor.tsx

Функционал:

левая панель: ProtocolOutlineSidebar - список секций, статус (complete/partial/missing)

центральная зона: ProtocolSection - текстовый редактор + подсказки

правая панель: SectionSuggestionBar + RegHintsPanel

Требования:

автосохранение в БД

интеграция с existing protocol document моделью

возможность:

принять подсказку полностью

принять кусок

вставить как отдельный абзац

1.8 InlineCompletion

Файл: components/protocol-editor/InlineCompletion.tsx

Поведение:

пользователь печатает текст

suggestion_engine возвращает type: 'completion'

показываем "призрачный" текст серым, как в Copilot

клавиши:

Tab - принять

Esc - отклонить

1.9 API для Autocomplete

Новый эндпоинт:

/app/api/protocol/suggest/route.ts

Вход:

{
  "projectId": "uuid",
  "sectionId": "study_design",
  "currentText": "string",
  "cursorContext": "optional string"
}


Выход:

{
  "suggestions": SectionSuggestion[],
  "regHints": RegHint[]
}

2. Phase H.UI v4 - AI-driven Study Designer

Теперь делаем надстройку уровнем выше: "Study Designer" - wizard, который строит весь проект.

2.1 Цель

Сделать режим:

"Я ввожу минимум входных данных - Skaldi проектирует само исследование":

дизайн

визиты

ToP

sample size

endpoints

протокол skeleton

SAP skeleton

IB skeleton

На выходе - уже заполненный проект с:

протоколом

IB

SAP

study flow

stats блоками

2.2 Роутинг и структура

Новый маршрут:

/app/dashboard/study-designer/page.tsx

Компоненты:

/components/study-designer/
  StudyDesignerWizard.tsx
  StepIntro.tsx
  StepDrugIndication.tsx
  StepStudyStrategy.tsx
  StepRiskRegulatory.tsx
  StepOutputs.tsx
  DesignerSummary.tsx
  DesignerProgress.tsx
  DesignerPreviewPanel.tsx

2.3 Логика Wizard
Шаг 1 - Basic info

Собираем:

Drug / Compound (используем FormulationSmartField из H.UI v2)

Indication (IndicationSmartField)

Phase

Geography (countries)

Population high level (adults/peds, key comorbidities)

Шаг 2 - Strategy

Собираем:

primary objective type:

efficacy

safety

non-inferiority

PK/PD

comparator strategy:

placebo

active comparator

add-on

randomization:

yes/no

blinding:

open-label / single / double

Шаг 3 - Constraints & Risk

Собираем:

максимальная длительность

бюджетный уровень (low/medium/high - пока просто тег, мапится на "lean" или "rich" процедуры)

регуляторный приоритет:

FDA focus

EMA focus

generic/phase 4

Шаг 4 - Output scope

Собираем:

какие документы генерировать:

Protocol

IB

SAP

ICF skeleton

какой уровень детализации:

skeleton only

full draft

2.4 Backend Orchestration

Новый эндпоинт:

/app/api/study-designer/run/route.ts

Пайплайн:

Нормализуем drug через Formulation Normalizer + Knowledge Graph

Берем индикацию и формируем endpoint candidates:

из KG

из CT.gov

Выбираем primary/secondary endpoints:

ML ranking

если пользователь подтвердил вручную - используем его выбор

Запускаем Statistics Engine:

рассчитываем sample size

выбираем тесты

генерируем статистический JSON

Запускаем Study Flow Engine:

строим визиты

процедуры

ToP

Собираем initial Protocol skeleton:

с помощью существующего clinical engine + новых suggestion_tools

Собираем IB skeleton:

на основе IB engine

Собираем SAP skeleton:

на основе stats engine

Сохраняем все в новый project:

projects

documents

studyflow

statistics

Выход API:

{
  "projectId": "uuid",
  "generated": {
    "protocol": { "documentId": "uuid", "quality": "draft" },
    "ib": { "documentId": "uuid", "quality": "skeleton" },
    "sap": { "documentId": "uuid", "quality": "draft" },
    "studyflow": { "id": "uuid" },
    "stats": { "sampleSize": { ... }, "methods": [ ... ] }
  },
  "warnings": [
    { "code": "MISSING_KG_DATA", "message": "No CT.gov trials found for indication X" }
  ]
}

2.5 UI: StudyDesignerWizard

Файл: components/study-designer/StudyDesignerWizard.tsx

Функции:

многошаговый wizard

справа - DesignerPreviewPanel:

показывает:

рекомендуемый дизайн (Phase 2 RCT, 2 arms, 24 weeks)

типичный визитный график

rough sample size estimate

внизу - DesignerProgress - индикатор стадий:

KG

endpoints

stats

studyflow

documents

По завершении:

создаем project

редиректим на project dashboard

показываем баннер "AI Study Designer completed. Protocol, IB, SAP, Study Flow generated."

2.6 Использование референсных протоколов

Важно: Designer должен использовать локальные референсы:

/Users/mitchkiriek/skaldi/clinical_reference/protocol_femilex.md
/Users/mitchkiriek/skaldi/clinical_reference/protocol_perindopril.md
/Users/mitchkiriek/skaldi/clinical_reference/protocol_sitaglipin.md
/Users/mitchkiriek/skaldi/clinical_reference/summary_podhaler.md

Через уже существующий RAG, как в H.2-H.6.

Из них вытаскиваем:

типовые структуры visit schedule

примеры фраз для objectives, endpoints, safety, AE handling, discontinuation criteria и т.п.

2.7 Testing

Создать:

__tests__/study-designer/api.test.ts
__tests__/study-designer/ui.test.ts

Проверить сценарии:

метформин, T2D, Phase 3

бисопролол, hypertension resistant to therapy

метронидазол, вагиноз (через generic indication, пока KG может не знать конкретики)

3. Итоговая картина

После реализации H.UI v3-v4 Skaldi будет уметь:

на уровне одного поля - подсказывать формуляцию, индикации, endpoints, safety

на уровне секции протокола - дописывать текст, предлагать абзацы и шаблоны, давать регуляторные подсказки

на уровне всего проекта - проектировать целиковый дизайн исследования, считать статистику, строить визиты, ToP и генерировать skeleton документов

Это превращает Skaldi из "AI, который пишет текст" в "AI CRO engine".

4. Checkpoints для завершения Phase H.UI v3-v4

Новый Protocol Editor:

секции

inline completion

snippet suggestions

reg hints

Study Designer:

wizard

backend orchestration

интеграция со всеми движками

Тесты:

unit

integration

e2e протокольных сценариев

Документация:

protocol-editor/README.md

study-designer/README.md

После этого H.UI можно считать полностью закрытым.