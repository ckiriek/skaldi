# PHASE_H_UI_FULL_ROADMAP.md
Skaldi - Phase H.UI (v2–v4)  
Status: SPEC / TASK BLUEPRINT  
Target: Windsurf / Next.js 14 / Supabase / Azure OpenAI

---

## 0. Контекст и цель

### 0.1. Что уже есть (важно для Windsurf)

Backend и ядро Skaldi уже реализованы:

- **Документы**: Protocol, IB, ICF, SAP, CSR, Synopsis  
- **Движки**:
  - Knowledge Graph + RAG (OpenFDA, DailyMed, CT.gov, EMA, локальные протоколы)
  - Formulation Normalizer (INN, dosage form, route, strength)
  - Statistics Engine (sample size, test selection, SAP JSON)
  - Study Flow Engine (visits, procedures, Table of Procedures, auto-fix)
  - Cross-Document Engine (IB–Protocol–SAP–ICF–CSR, 40+ правил, автофиксы)
  - Validation Engine
- **Phase H.1–H.6**:
  - Clinical Knowledge Graph
  - RAG слой
  - API `/api/knowledge/*`
  - Formulation Normalizer в Project Create
- **UI H.UI v2 (частично)**:
  - Smart Formulation field
  - Indication suggestions
  - Базовый project create flow
  - Cross-Document вкладка v1
  - Study Flow Panel v1

ЭТОТ файл описывает, как поверх этого ядра собрать ПОЛНЫЙ ПРОДУКТНЫЙ UI:

- H.UI v3 – Protocol Editor (AI Copilot для протокола)  
- H.UI v4 – AI Study Designer Wizard  
- H.UI KG/RAG UI integration – умные поля, подсказки, snippets  
- Обновлённые панели Cross-Document и Study Flow (v2)  

---

## 1. High-Level UX Flows

### 1.1. Основные сценарии пользователя

1. **Создать проект**  
   - Ввести compound / drug name  
   - Ввести indication, phase, basic design  
   - Получить подсказки от Knowledge Graph (индикации, endpoints, safety и т.п.)

2. **Запустить AI Study Designer**  
   - Пройти 3–4 шага wizard  
   - Система генерирует: дизайн, visits, ToP, sample size, skeleton протокола/IB/SAP  

3. **Редактировать Protocol в AI-редакторе**  
   - Видеть структуру секций (outline)  
   - Печатать текст и получать AI-completion (inline)  
   - Получать snippets из референсных протоколов (RAG)  
   - Получать regulatory hints (на основе движков и правил)  

4. **Посмотреть Study Flow**  
   - Visits + окна  
   - Procedures по визитам  
   - ToP matrix  
   - Автофиксы для пропусков  

5. **Проверить Cross-Document Consistency**  
   - Запустить проверку  
   - Увидеть несоответствия  
   - Применить автофиксы  

6. **Экспорт документов**  
   - DOCX / PDF протокола и других документов  

---

## 2. File / Folder Structure (новые/обновляемые части)

**NB:** Путь/названия могут слегка отличаться от текущего проекта - Windsurf должен подстроиться по факту. Ниже - целевая структура.

```text
/app/
  dashboard/
    projects/
      [id]/
        page.tsx              # Project dashboard - расширяется
        protocol/
          page.tsx            # Новый Protocol Editor экран
        study-designer/
          page.tsx            # Новый Study Designer Wizard экран

/components/
  project/
    ProjectHeader.tsx         # (если нет) - заголовок проекта
    ProjectTabs.tsx           # Tabs: Overview / Documents / Study Flow / Cross-Doc / Protocol Editor / etc.
  smart-fields/
    FormulationSmartField.tsx # Уже есть (H.1/H.UI v2)
    IndicationSmartField.tsx  # Уже есть/расширить
    EndpointSmartField.tsx    # Новый / расширить
    SafetySmartField.tsx      # Новый / optional

  protocol-editor/
    ProtocolEditor.tsx
    ProtocolSection.tsx
    ProtocolOutlineSidebar.tsx
    SectionSuggestionBar.tsx
    InlineCompletion.tsx
    RegHintsPanel.tsx
    SourceSnippetBadge.tsx

  study-designer/
    StudyDesignerWizard.tsx
    StepIntro.tsx
    StepDrugIndication.tsx
    StepStudyStrategy.tsx
    StepRiskRegulatory.tsx
    StepOutputs.tsx
    DesignerSummary.tsx
    DesignerProgress.tsx
    DesignerPreviewPanel.tsx

  knowledge/
    KnowledgeGraphPanel.tsx       # optional viewer
    SuggestionsList.tsx
    SuggestionItem.tsx

  study-flow/
    StudyFlowPanel.tsx            # уже есть - обновить до v2
    VisitList.tsx
    ProcedureList.tsx
    TopMatrixTable.tsx
    StudyFlowStatsBar.tsx

  crossdoc/
    CrossDocPanel.tsx             # уже есть - обновить
    CrossDocIssueList.tsx
    CrossDocIssueDetails.tsx
    CrossDocFixSummary.tsx

/lib/
  engine/
    protocol-ui/
      section_schema.ts
      suggestion_engine.ts
      snippet_provider.ts
      reg_hint_engine.ts
      merge_strategy.ts
      types.ts

    knowledge/
      ... (уже есть H.2–H.6)

    studyflow/
      ... (Phase G - уже есть)

    statistics/
      ... (Phase E - уже есть)

    crossdoc/
      ... (Phase F - уже есть)

/app/api/
  protocol/
    suggest/
      route.ts
  study-designer/
    run/
      route.ts

/__tests__/
  protocol-editor/
    suggestion_engine.test.ts
    api_suggest.test.ts
  study-designer/
    api_run.test.ts
    wizard_flow.test.ts

3. H.UI v2 – Smart Fields & Project Creation (доразвитие)
3.1. Цель

Довести форму создания проекта до состояния:
"минимальный ввод → максимально богатый контекст",
используя Knowledge Graph и ML ранжирование.

3.2. Форма создания проекта

Файл (пример): /app/dashboard/projects/new/page.tsx

Поля:

Project Title

Compound / Drug Name (FormulationSmartField)

Sponsor

Phase

Indication (IndicationSmartField)

Countries

Study Design (basic: randomized, blinding, arms, duration)

Primary Endpoint (EndpointSmartField)

Secondary Endpoints (chips или textarea)

Safety Monitoring (SafetySmartField)

Analysis Populations

Требования:

FormulationSmartField:

использовать Formulation Normalizer (H.1)

сохранять:

raw_drug_input

api_name

dosage_form

route

strength

показывать badges с parsed данными

IndicationSmartField:

дергать /api/knowledge/indications

показывать ranked список (KG Confidence + Source Reliability)

сохранять:

indication_label

icd10_code (если есть)

kg_confidence

EndpointSmartField:

дергать /api/knowledge/endpoints

показывать:

тип endpoint (continuous / binary / time-to-event / ordinal / composite)

пример формулировки

типичный timepoint

сохранять:

endpoint_label

endpoint_type

timepoint

SafetySmartField:

опционально:

предлагать: vitals, ECG, labs, AE monitoring, pregnancy tests и т.п.

использовать Knowledge Graph + стандартные safety процедуры

Таск для Windsurf:

убедиться, что все smart fields:

используют H.2–H.6 API

умеют отображать ranked suggestions

умеют запоминать выбор пользователя (для feedback layer)

сохраняют данные в projects / project_metadata таблицы

4. H.UI v3 – Protocol Editor (AI Copilot)
4.1. Цель

Сделать полнофункциональный AI-редактор протокола, который:

отображает структуру протокола (15 секций)

позволяет редактировать текст каждой секции

даёт AI-подсказки:

inline completion

snippets из референсов (RAG)

шаблоны секций

регуляторные подсказки (reg hints)

использует:

Knowledge Graph

RAG

Statistics Engine

Study Flow Engine

Cross-Document Engine

4.2. Schema секций протокола

Файл: lib/engine/protocol-ui/section_schema.ts

export type ProtocolSectionId =
  | 'title'
  | 'synopsis'
  | 'background'
  | 'rationale'
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
  usesEngines?: Array<'knowledge' | 'rag' | 'stats' | 'studyflow' | 'crossdoc'>;
}

export const PROTOCOL_SECTIONS: ProtocolSectionDefinition[] = [ ... ];

4.3. Типы для UI протокола

Файл: lib/engine/protocol-ui/types.ts

export interface ProtocolSectionContent {
  id: ProtocolSectionId;
  title: string;
  text: string;
  lastUpdatedAt: string;
  generated?: boolean;
  completionQuality?: 'skeleton' | 'draft' | 'reviewed';
}

export interface SectionSuggestion {
  id: string;
  sectionId: ProtocolSectionId;
  type: 'snippet' | 'completion' | 'template' | 'reg_hint';
  title: string;
  preview: string;
  fullText: string;
  source: 'kg' | 'rag' | 'stats' | 'studyflow' | 'rule' | 'local_protocol' | 'llm';
  confidence: number; // 0..1
  referenceIds?: string[];
}

export interface RegHint {
  id: string;
  sectionId: ProtocolSectionId;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestion?: string;
  ruleId?: string;
}

4.4. Suggestion Engine

Файл: lib/engine/protocol-ui/suggestion_engine.ts

Функция:

export interface ProtocolSuggestionContext {
  projectId: string;
  sectionId: ProtocolSectionId;
  currentText: string;
  metadata?: Record<string, unknown>;
}

export interface ProtocolSuggestionResult {
  suggestions: SectionSuggestion[];
  regHints: RegHint[];
}

export async function getSectionSuggestions(
  ctx: ProtocolSuggestionContext
): Promise<ProtocolSuggestionResult> {
  // 1) собрать context: project, KG, endpoints, stats, studyflow
  // 2) запросить KG/RAG (knowledge/ & rag/)
  // 3) запросить Azure OpenAI (LLM completion) через существующий orchestrator
  // 4) прогнать reg_hint_engine
  // 5) объединить и отсортировать по confidence / relevance
}


Внутри использовать:

snippet_provider для RAG из референсных протоколов

reg_hint_engine для правил

statistics / studyflow при необходимости

4.5. Snippet Provider (RAG по референсам)

Файл: lib/engine/protocol-ui/snippet_provider.ts

Задача:

получать из RAG layer чанки по:

секции (например, 'eligibility')

индикации

фазе

конвертировать в SectionSuggestion с source: 'local_protocol' | 'rag'

Псевдокод:

export async function getReferenceSnippetsForSection(
  projectId: string,
  sectionId: ProtocolSectionId,
  currentText: string
): Promise<SectionSuggestion[]> {
  // 1) получить из projects: indication, phase, compound
  // 2) построить query для RAG (e.g. "inclusion criteria for Phase 3 T2D trial")
  // 3) вызвать rag.search()
  // 4) вернуть top-N как SectionSuggestion[]
}

4.6. Reg Hint Engine

Файл: lib/engine/protocol-ui/reg_hint_engine.ts

Использует:

crossdoc rules

studyflow validation

statistics validation

Пример:

если primary endpoint в секции не совпадает с SAP/Statistics → hint severity=critical

если visit schedule в протоколе не совпадает с Study Flow → hint severity=error

если нет описания AE/SAE reporting → hint severity=warning

4.7. API для Protocol Suggestions

Файл: /app/api/protocol/suggest/route.ts

Вход:

{
  "projectId": "uuid",
  "sectionId": "study_design",
  "currentText": "string"
}


Выход:

{
  "suggestions": SectionSuggestion[],
  "regHints": RegHint[]
}


Реализация:

проверка auth + доступа к проекту

вызов getSectionSuggestions()

обработка ошибок

4.8. Protocol Editor UI
4.8.1. Роут

Файл: /app/dashboard/projects/[id]/protocol/page.tsx

Функции:

загрузить:

project

protocol document (sections split)

рендерить ProtocolEditor

4.8.2. ProtocolEditor.tsx

Пример структуры:

export function ProtocolEditor({ projectId }: { projectId: string }) {
  const [sections, setSections] = useState<ProtocolSectionContent[]>(...)
  const [activeSectionId, setActiveSectionId] = useState<ProtocolSectionId>('synopsis')
  const [suggestions, setSuggestions] = useState<SectionSuggestion[]>([])
  const [regHints, setRegHints] = useState<RegHint[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // load sections from API / documents table

  const handleTextChange = (sectionId: ProtocolSectionId, text: string) => {
    // update local state
    // debounce запрос к /api/protocol/suggest
  }

  return (
    <div className="flex h-full">
      <ProtocolOutlineSidebar
        sections={sections}
        activeSectionId={activeSectionId}
        onSelectSection={setActiveSectionId}
      />

      <ProtocolSection
        section={sections.find(s => s.id === activeSectionId)!}
        onChange={text => handleTextChange(activeSectionId, text)}
        suggestions={suggestions.filter(s => s.sectionId === activeSectionId)}
      />

      <div className="w-80 border-l flex flex-col">
        <SectionSuggestionBar
          suggestions={suggestions.filter(s => s.sectionId === activeSectionId)}
          onApplySuggestion={...}
        />
        <RegHintsPanel
          hints={regHints.filter(h => h.sectionId === activeSectionId)}
        />
      </div>
    </div>
  )
}

4.8.3. InlineCompletion.tsx

принимает:

currentText

completionText (из suggestion type='completion')

отображает ghost-текст

обработка Tab/Esc

5. H.UI v4 – AI Study Designer Wizard
5.1. Цель

Wizard, который из минимального набора параметров проектирует:

дизайн исследования

endpoints

sample size

visits

procedures

ToP

skeleton документов

5.2. Роут

Файл: /app/dashboard/study-designer/page.tsx

экран, доступный из главного меню или отдельной кнопки “AI Study Designer”

после завершения создаёт project и редиректит на /dashboard/projects/[id]

5.3. Wizard Steps

Компоненты:

StudyDesignerWizard.tsx

StepIntro.tsx

StepDrugIndication.tsx

StepStudyStrategy.tsx

StepRiskRegulatory.tsx

StepOutputs.tsx

DesignerSummary.tsx

DesignerPreviewPanel.tsx

DesignerProgress.tsx

Step 1: Drug & Indication

Drug (FormulationSmartField)

Indication (IndicationSmartField)

Phase (select)

Key population notes (textarea)

Использовать KG для подсказок.

Step 2: Strategy

Objective type:

superiority / non-inferiority / equivalence / safety / PK

Comparator:

placebo / active / add-on / single-arm

Blinding:

open / single / double

Randomization: yes/no

Step 3: Constraints & Risk

Duration limit (weeks)

Recruitment size (target ballpark)

Budget level: low / medium / high (меняет density процедур)

Regulatory focus: FDA / EMA / both / generic

Step 4: Outputs

Документы: Protocol / IB / SAP / ICF

Уровень детализации: skeleton / full draft

Summary

Показать:

proposed design summary

estimated sample size

high-level visit schedule

показать, что будет создано: protocol, IB, SAP, studyflow

5.4. Backend Orchestration – /api/study-designer/run

Файл: /app/api/study-designer/run/route.ts

Пайплайн:

Нормализовать drug (Formulation Normalizer + KG)

Получить indications/endpoints из KG

Выбрать primary/secondary endpoints (ML ranking)

Запустить Statistics Engine для sample size + methods

Запустить Study Flow Engine для visits + procedures + ToP

Запустить Document Generator для skeleton Protocol / IB / SAP

Сохранить:

project

documents (protocol, ib, sap)

studyflow entries

statistics config

Вернуть:

{
  "projectId": "uuid",
  "documents": {
    "protocolId": "uuid",
    "ibId": "uuid",
    "sapId": "uuid"
  },
  "studyFlowId": "uuid",
  "statsSummary": {
    "totalSampleSize": 320,
    "perArm": 160,
    "alpha": 0.05,
    "power": 0.90
  },
  "warnings": [
    { "code": "MISSING_KG_DATA", "message": "No CT.gov trials found for indication X" }
  ]
}

5.5. StudyDesignerWizard.tsx логика

локальное состояние для шагов

при завершении - POST на /api/study-designer/run

показывать прогресс (DesignerProgress):

“Building Knowledge Graph”

“Selecting endpoints”

“Calculating sample size”

“Generating Study Flow”

“Creating documents”

После успеха:

redirect на /dashboard/projects/[projectId]

показывать баннер “AI Study Designer completed. Protocol, IB, SAP, Study Flow generated.”

6. KG/RAG UI Integration
6.1. KnowledgeGraphPanel (optional, но полезно)

Файл: /components/knowledge/KnowledgeGraphPanel.tsx

Функции:

показывать для текущего проекта:

compound / formulations

indications

endpoints

procedures

показывать источники:

FDA / EMA / CT.gov / DailyMed / Local protocols

показывать confidence scores

6.2. SuggestionsList / SuggestionItem

Файлы:

/components/knowledge/SuggestionsList.tsx

/components/knowledge/SuggestionItem.tsx

Используются:

в Smart Fields

в Protocol Editor (SectionSuggestionBar)

в Study Designer (preview suggestions)

7. Cross-Document & Study Flow UI v2
7.1. CrossDocPanel v2

Файл уже есть: /components/crossdoc/CrossDocPanel.tsx

Нужно:

убедиться, что:

вкладка Cross-Document есть в ProjectTabs

панель:

показывает summary (critical/error/warning/info)

позволяет фильтровать issues

позволяет выбирать auto-fixable issues

вызывать /api/crossdoc/auto-fix

отображать patch summary

7.2. StudyFlowPanel v2

Файл уже есть: /components/study-flow/StudyFlowPanel.tsx

Нужно:

tabs внутри:

Overview (статистика исследований)

Visits (список визитов)

Procedures (список процедур)

ToP (matrix)

Validation (issues, auto-fix)

8. Testing Strategy
8.1. Protocol Editor

/__tests__/protocol-editor/suggestion_engine.test.ts

тест:

getSectionSuggestions возвращает:

snippets

completion

reg hints

reg hints соответствуют явно созданным кейсам

/__tests__/protocol-editor/api_suggest.test.ts

тест /api/protocol/suggest:

валидный запрос

нет project

нет section

пустой текст

8.2. Study Designer

/__tests__/study-designer/api_run.test.ts

проверка:

типичный кейс: Metformin, T2D, Phase 3 → проект создаётся

отсутствующие KG данные → возвращается warning

/__tests__/study-designer/wizard_flow.test.ts

snapshot-тесты для шагов

проверка, что при завершении wizard вызывает API и редиректит

9. Порядок реализации (чтобы не утонуть)
Шаг 1 – Project UI стабилизация

Привести ProjectTabs к целевому виду:

Overview

Documents

Study Flow

Cross-Document

Protocol Editor

Убедиться, что smart fields на create-form работают с KG.

Шаг 2 – Study Designer Wizard

Реализовать /api/study-designer/run с простейшей логикой (минимально рабочей).

Реализовать StudyDesignerWizard и шаги.

Подтянуть движки по очереди (KG → stats → studyflow → documents).

Шаг 3 – Protocol Editor v3

Сделать split существующего протокола на секции (если не сделано) и API для чтения/записи.

Реализовать:

section_schema.ts

types.ts

suggestion_engine.ts (слой-адаптер к уже существующему orchestrator + KG/RAG)

/api/protocol/suggest

Реализовать компоненты:

ProtocolEditor

OutlineSidebar

ProtocolSection

SectionSuggestionBar

RegHintsPanel

InlineCompletion

Шаг 4 – Интеграция RAG/Refs

Убедиться, что snippet_provider берёт чанки из RAG слоя (H.2–H.6).

Добавить SourceSnippetBadge с источниками (FDA / EMA / CT.gov / Local Protocol).

Шаг 5 – Полиш и тесты

Добавить тесты для критических сценариев.

Добавить basic telemetry (log events на уровне API).

Финальный smoke test:

создать проект

пройти Study Designer

открыть Protocol Editor

отредактировать несколько секций

проверить Cross-Document и Study Flow

экспортировать протокол