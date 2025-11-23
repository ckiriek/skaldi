# Phase H - Clinical Knowledge Graph & Data Ingestion Layer  
Version: H.2–H.6  
Status: DESIGN SPEC  
Context: H.1 (Formulation Normalizer + Indication Intelligence) уже реализована и задеплоена в продакшен

---

## 0. Scope и общая идея

Эта спецификация описывает Phase H после уже реализованной части H.1.

- H.1: Formulation Normalizer + Indication Intelligence - УЖЕ СДЕЛАНО  
  - Разбор строки с препаратом  
  - Выделение INN (api_name)  
  - dosage_form, route, strength  
  - хранение этих полей в `projects`  
  - базовые подсказки по indication  
- H.2–H.6: Clinical Knowledge Graph & Data Ingestion Layer - НАДО СДЕЛАТЬ  

Цель Phase H.2–H.6 - построить поверх H.1 полноценный слой клинического знания:

- Интеграция с внешними публичными источниками (OpenFDA, DailyMed, ClinicalTrials.gov, EMA EPAR)  
- Извлечение сущностей из локальных референсных протоколов (папка `/mnt/data`)  
- Нормализация данных (формуляции, показания, эндпоинты, процедуры, eligibility, safety)  
- Построение Knowledge Graph (единая модель данных, confidence scores)  
- Подготовка данных для RAG (чанки, эмбеддинги, индексация)  
- API и UI-интеграции, которые позволяют Skaldi:
  - предлагать валидные endpoints  
  - предлагать визитную структуру  
  - предлагать safety/процедуры/eligibility  
  - использовать knowledge graph в генерации и валидациях  

---

## 1. Reference Corpus - локальные файлы для обучения

Эти файлы считаются "reference protocols" и "reference regulatory docs".  
Windsurf должен использовать их для извлечения реальных паттернов (endpoints, visits, procedures, dosing, safety, ICF-тексты и т.п.).

Расположение: /Users/mitchkiriek/skaldi/clinical_reference

Список файлов использовать весь.

Требования:

- Определить тип документа: Protocol, IB, CSR, ICF, EMA product info, Clinical Overview, Report.  
- Реализовать extractor, который собирает из них:
  - primary/secondary endpoints  
  - visit schedule  
  - procedures/Table of Procedures  
  - dosing regimens  
  - safety assessments  
  - inclusion/exclusion criteria  
  - ключевые safety statements (ICF/IB level)  

---

## 2. Директории и структура кода Phase H

Создать директорию:

```text
lib/engine/knowledge/
  ingestion/
    fda_label.ts
    fda_ndc.ts
    dailymed.ts
    ctgov.ts
    ema_pdf.ts
    local_protocols.ts

  normalizers/
    indication_normalizer.ts
    endpoint_normalizer.ts
    eligibility_normalizer.ts
    procedure_normalizer.ts
    safety_normalizer.ts
    // formulation_normalizer.ts - уже существует, расширять при необходимости

  graph/
    schema.ts
    builder.ts
    merge.ts
    search.ts

  rag/
    chunker.ts
    embeddings.ts
    indexer.ts

  reference_learning/
    extract_from_protocol.ts
    endpoints_from_protocol.ts
    visits_from_protocol.ts
    procedures_from_protocol.ts

  api/
    dto.ts
    mappers.ts
    validators.ts

index.ts
README.md
Требование: не ломать уже существующую реализацию H.1, а использовать её как источник нормализованной формуляции.

3. Data Ingestion Layer (H.2)
3.1 Общие принципы

Все ingestion модули - чистые функции типа:

async function fetchXByInn(inn: string): Promise<RawXData[]>

Никаких прямых вызовов из UI - только через backend API.

Все внешние API должны быть обернуты:

ретраи (до 3 попыток)

таймауты (например, 5–10 секунд)

логирование ошибок

3.2 OpenFDA - Drug Label

Файл: lib/engine/knowledge/ingestion/fda_label.ts

Функция:

export async function fetchFdaLabelsByInn(inn: string): Promise<FdaLabelRecord[]> { ... }


Базовый эндпоинт:

GET https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{{INN}}"


Извлекаемые поля:

openfda.generic_name[]

openfda.brand_name[]

openfda.route[]

openfda.dosage_form[]

indications_and_usage

dosage_and_administration

warnings

precautions

adverse_reactions

Структура FdaLabelRecord:

export interface FdaLabelRecord {
  innCandidates: string[];
  brandNames: string[];
  routes: string[];
  dosageForms: string[];
  indicationsText?: string;
  dosageAndAdministrationText?: string;
  warningsText?: string;
  precautionsText?: string;
  adverseReactionsText?: string;
  rawJson: any;
}

3.3 OpenFDA - NDC

Файл: ingestion/fda_ndc.ts

Эндпоинт:

GET https://api.fda.gov/drug/ndc.json?search=generic_name:"{{INN}}"


Поля:

generic_name

brand_name

route_name

dosage_form

active_ingredients[].strength

pharm_class[]

Интерфейс:

export interface FdaNdcRecord {
  inn: string;
  brandNames: string[];
  routes: string[];
  dosageForms: string[];
  strengths: string[]; // raw strength strings
  pharmClasses: string[];
  rawJson: any;
}

3.4 DailyMed

Файл: ingestion/dailymed.ts

Поиск по действующему веществу:

GET https://dailymed.nlm.nih.gov/dailymed/services/v2/search.json?ingredient={{INN}}


Получение SPL:

GET https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/{{setid}}.json


Интерфейс:

export interface DailyMedRecord {
  setId: string;
  innCandidates: string[];
  routes: string[];
  dosageForms: string[];
  indicationsText?: string;
  dosageAndAdministrationText?: string;
  clinicalPharmacologyText?: string;
  warningsText?: string;
  adverseReactionsText?: string;
  rawJson: any;
}

3.5 ClinicalTrials.gov

Файл: ingestion/ctgov.ts

Поиск исследований:

GET https://clinicaltrials.gov/api/v2/studies?query={{INN or indication}}


Детали по NCT:

GET https://clinicaltrials.gov/api/v2/studies/{{nctId}}


Нужно вытащить:

primary/secondary endpoints

arms/interventions

design (allocation, masking)

eligibility criteria

Интерфейс:

export interface CtGovEndpoint {
  title: string;
  description?: string;
  timeFrame?: string;
  type: 'primary' | 'secondary' | 'other';
}

export interface CtGovStudyDesign {
  allocation?: string;
  masking?: string;
}

export interface CtGovEligibility {
  inclusionText?: string;
  exclusionText?: string;
}

export interface CtGovRecord {
  nctId: string;
  title: string;
  indicationCandidates: string[];
  endpoints: CtGovEndpoint[];
  design?: CtGovStudyDesign;
  eligibility?: CtGovEligibility;
  rawJson: any;
}

3.6 EMA EPAR PDF

Файл: ingestion/ema_pdf.ts

Получение PDF (URL будет задаваться вручную или браться из уже загруженных файлов)

Использовать существующий PDF-парсер из проекта

Извлечь блоки:

Indications

Posology and method of administration

Contraindications

Special warnings and precautions for use

Pharmacodynamic properties

Pharmacokinetic properties

Интерфейс:

export interface EmaEparRecord {
  sourcePath: string; // локальный путь PDF
  innCandidates: string[];
  indicationsText?: string;
  posologyText?: string;
  contraindicationsText?: string;
  warningsText?: string;
  pharmacodynamicText?: string;
  pharmacokineticText?: string;
}

3.7 Local Protocols

Файл: ingestion/local_protocols.ts

Задача - пройтись по файлам из раздела 1 и:

распарсить текст (doc/docx/pdf)

извлечь:

endpoints

visit schedule

procedures

dosing

safety

eligibility

Результаты передавать в модули reference_learning/.

4. Normalizers (H.3)

Все normalizer-ы должны использовать явные enum-и и четкую логику.

4.1 indication_normalizer.ts
export interface NormalizedIndication {
  original: string;
  cleaned: string;
  icd10Code?: string;
  tags: string[]; // например: ['diabetes', 'metabolic']
}

export function normalizeIndication(raw: string): NormalizedIndication { ... }


Требования:

убрать служебные слова: "treatment of", "for the treatment of", "therapy of"

привести к lower case + потом нормализованный capital case

попытаться сматчить на ICD-10 (локальная таблица маппинга)

4.2 endpoint_normalizer.ts
export type EndpointType = 'continuous' | 'binary' | 'time_to_event' | 'ordinal' | 'count';

export interface NormalizedEndpoint {
  originalTitle: string;
  cleanedTitle: string;
  type: EndpointType;
  timepoint?: string; // 'Week 12', 'Day 28'
  variableName?: string; // 'hba1c_change'
}


Правила:

если endpoint содержит "change from baseline" и единицы измерения - чаще всего continuous

если "proportion of patients" или "percentage of patients" - binary

если "time to" - time_to_event

4.3 eligibility_normalizer.ts

Разбивает criteria на inclusion/exclusion, чистит форматирование.

5. Knowledge Graph (H.4)

Файл: graph/schema.ts

Определить основные сущности:

export interface KgFormulation {
  id: string;
  inn: string;
  routes: string[];
  dosageForms: string[];
  strengths: string[];
  sources: string[]; // ['fda_label', 'fda_ndc', 'dailymed', 'reference_protocol']
  confidence: number; // 0..1
}

export interface KgIndication {
  id: string;
  inn?: string;
  indication: string;
  icd10Code?: string;
  sources: string[];
  confidence: number;
}

export interface KgEndpoint {
  id: string;
  indication?: string;
  inn?: string;
  normalized: NormalizedEndpoint;
  sources: string[];
  confidence: number;
}

export interface KgProcedure {
  id: string;
  name: string;
  category: string;
  loincCode?: string;
  synonyms: string[];
  sources: string[];
  confidence: number;
}

export interface KgEligibilityPattern {
  id: string;
  inn?: string;
  indication?: string;
  inclusionText?: string;
  exclusionText?: string;
  sources: string[];
}


Файл: graph/builder.ts

Методы:

export class KnowledgeGraphBuilder {
  async buildForInn(inn: string): Promise<KnowledgeGraphSnapshot> { ... }
}


KnowledgeGraphSnapshot - агрегированная структура со всеми сущностями для данного INN.

Файл: graph/merge.ts:

объединяет источники

расставляет confidence

удаляет дубли

6. RAG Layer (H.5)

Директория: lib/engine/knowledge/rag/

6.1 chunker.ts

Функция:

export function chunkText(sourceId: string, text: string, options?: { maxTokens?: number; overlapTokens?: number }): TextChunk[]


TextChunk:

export interface TextChunk {
  id: string;
  sourceId: string;
  sourceType: 'fda_label' | 'dailymed' | 'ctgov' | 'ema' | 'reference_protocol';
  text: string;
  order: number;
}

6.2 embeddings.ts

Использовать существующую обертку над OpenAI embeddings.

export async function embedChunks(chunks: TextChunk[]): Promise<EmbeddedChunk[]>

6.3 indexer.ts

Сохранять эмбеддинги в Supabase vector table, например knowledge_rag_index.

7. API Contract (H.6)

Все ответы - JSON. Все ошибки - унифицированный формат.

7.1 Общий формат ошибок
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message",
    "details": { "optional": "payload" }
  }
}

7.2 DTO (lib/engine/knowledge/api/dto.ts)
export interface KnowledgeRequestByInn {
  inn: string;
  indicationHint?: string;
}

export interface KnowledgeFormulationResponse {
  inn: string;
  normalizedFormulation: {
    inn: string;
    dosageForm?: string;
    route?: string;
    strength?: string;
  };
  kgFormulation?: KgFormulation;
}

export interface KnowledgeEndpointsResponse {
  inn?: string;
  indication?: string;
  endpoints: KgEndpoint[];
}

export interface KnowledgeIndicationsResponse {
  inn: string;
  indications: KgIndication[];
}

7.3 API endpoints
7.3.1 POST /api/knowledge/formulation

Вход: { projectId: string } или { inn: string, rawInput?: string }

Выход: KnowledgeFormulationResponse

Использует уже существующий Formulation Normalizer (H.1) + Knowledge Graph.

7.3.2 POST /api/knowledge/indications

Вход: KnowledgeRequestByInn

Выход: KnowledgeIndicationsResponse

Логика:

взять inn

подтянуть indications из:

OpenFDA label

DailyMed

ClinicalTrials.gov

reference protocols

7.3.3 POST /api/knowledge/endpoints

Вход: { inn?: string; indication?: string }

Выход: KnowledgeEndpointsResponse

7.3.4 POST /api/knowledge/refresh

Админский эндпоинт:

Вход: { inn: string }

Действие:

запускает ingestion + normalizers + builder

сохраняет snapshot в БД

8. UI Integration

Скрин создания проекта (/dashboard/projects/new):

к уже работающему Formulation Normalizer добавить:

кнопку "Fetch from Knowledge Graph"

авто-подстановку endpoints/indication, если пользователь согласен

В протокол-генерации:

использовать KgEndpoints и KgIndications для:

секции "Endpoints"

"Objectives"

связки с Study Flow Engine

9. Testing

Создать тесты:

__tests__/knowledge/ingestion.test.ts

моки ответов от OpenFDA, DailyMed, CT.gov

__tests__/knowledge/graph.test.ts

merge, confidence, dedupe

__tests__/knowledge/rag.test.ts

чанкинг и индексирование

10. Monitoring и безопасная эксплуатация

Логировать:

запросы к внешним API

ошибки/timeouts

Вести простую метрику:

сколько раз для INN удалось собрать полный snapshot

В будущем:

можно вынести ingestion в cron jobs

кэшировать Knowledge Graph snapshots в отдельной таблице

11. Что не трогаем

Уже реализованный H.1: Formulation Normalizer + Indication Intelligence

Существующие API для генерации IB/Protocol/ICF/SAP

Валидационные движки (Phase C–G) - только добавляем опции использовать Knowledge Graph как источник нормализованных данных

12. Цель Phase H по итогам

После реализации Phase H.2–H.6 Skaldi должен уметь:

по одной строке с препаратом + базовой индикации:

нормализовать INN, форму, route, дозу (уже есть)

подтянуть:

реальные indications

типичные endpoints

типичные визиты/процедуры

основные safety-блоки

типовые eligibility

использовать это:

в генерации протоколов

в SAP-генерации

в cross-document validation

в Study Flow Engine

Skaldi перестает быть просто генератором текста и становится системой с клиническим knowledge layer.
Помни, что все генерации должны использовать нормализованные данные из Knowledge Graph вместо прямого парсинга текстов.
Также убедись, что все новые модули интегрируются с существующими валидационными движками (Phase C–G).
Убедись, что все API endpointы корректно обрабатывают ошибки и возвращают унифицированный формат ответов.
Не забудь протестировать все новые интеграции и мониторинг на реальных данных.
Все изменения должны быть обратно совместимы с существующими системами и не ломать текущую логику работы.
Убедись, что документация обновлена и отражает новые возможности системы.
Проверь, что все новые компоненты соответствуют стандартам качества и безопасности.
Генерация OpenAI должна идти через Azure OpenAI Service для всех новых запросов.