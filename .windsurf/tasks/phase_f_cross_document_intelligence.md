Phase F - Cross-Document Intelligence

Goal:
Сделать Skaldi способным понимать не только отдельный документ, а целый клинический пакет: IB + Protocol + ICF + SAP + CSR - и проверять их между собой на логическую, статистическую и регуляторную согласованность.

Target:
Уровень CRO/фармы - чтобы это выглядело как часть eClinical-платформы уровня Veeva/IQVIA, а не как “умный редактор”.

0. Предпосылки

Считаем, что уже реализовано и работает в проде:

Clinical Engine - генерация и структура IB/Protocol/ICF/CSR

Validation Engine - валидация одного документа

Statistics Engine - sample size, endpoint mapping, SAP

Структурированные JSON-модели документов (sections/blocks/metadata)

REST API и UI для работы с отдельными документами

Phase F строится поверх этого как надстройка.

1. Архитектура Cross-Document Engine

Создать модуль:

/lib/engine/crossdoc/
  loaders/
    ib_loader.ts
    protocol_loader.ts
    icf_loader.ts
    sap_loader.ts
    csr_loader.ts
  alignment/
    objectives_map.ts
    endpoints_map.ts
    dose_map.ts
    arms_map.ts
    populations_map.ts
    visits_map.ts
    procedures_map.ts
  rules/
    ib_protocol_rules.ts
    protocol_icf_rules.ts
    protocol_sap_rules.ts
    protocol_csr_rules.ts
    global_rules.ts
  validators/
    severity.ts
    consistency_checker.ts
  changelog/
    change_tracker.ts
  types.ts
  index.ts

1.1 Основные сущности

В types.ts описать:

export type CrossDocDocumentType = 'IB' | 'PROTOCOL' | 'ICF' | 'SAP' | 'CSR';

export interface CrossDocDocumentRef {
  id: string;
  type: CrossDocDocumentType;
  version?: string;
}

export interface CrossDocBundle {
  ib?: StructuredIbDocument;
  protocol?: StructuredProtocolDocument;
  icf?: StructuredIcfDocument;
  sap?: StructuredSapDocument;
  csr?: StructuredCsrDocument;
}

export interface CrossDocIssueLocation {
  documentType: CrossDocDocumentType;
  sectionId?: string;
  blockId?: string;
  field?: string;
}

export type CrossDocSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface CrossDocIssue {
  code: string;                 // PRIMARY_ENDPOINT_DRIFT
  severity: CrossDocSeverity;
  message: string;              // human readable
  details?: string;
  locations: CrossDocIssueLocation[];
  suggestions?: CrossDocSuggestion[];
}

export interface CrossDocSuggestion {
  id: string;
  label: string;
  autoFixable: boolean;
  patches: CrossDocPatch[];
}

export interface CrossDocPatch {
  documentType: CrossDocDocumentType;
  blockId?: string;
  field?: string;
  newValue: string;
}

2. Loaders - нормализация документов

Задача - взять уже существующие модели IB/Protocol/ICF/SAP/CSR и привести их к общему формату, пригодному для сопоставления.

2.1 Файлы
/lib/engine/crossdoc/loaders/ib_loader.ts
/lib/engine/crossdoc/loaders/protocol_loader.ts
/lib/engine/crossdoc/loaders/icf_loader.ts
/lib/engine/crossdoc/loaders/sap_loader.ts
/lib/engine/crossdoc/loaders/csr_loader.ts


Каждый loader:

export async function loadIbForCrossDoc(docId: string): Promise<StructuredIbDocument> { ... }
export async function loadProtocolForCrossDoc(docId: string): Promise<StructuredProtocolDocument> { ... }
// etc

2.2 Что нужно извлечь

Для IB:

objectives

mechanism of action

target population

key risk profile

dosing information

Для Protocol:

objectives (primary/secondary/exploratory)

endpoints (primary/secondary)

arms/treatment regimens/dose

visit schedule

inclusion/exclusion criteria

analysis populations

Для ICF:

description of procedures

burden of visits

risks and benefits

description of treatments

Для SAP:

primary/secondary endpoints

tests

sample size driver endpoint

analysis populations

missing data strategy

multiplicity strategy

Для CSR:

actual methods used

analysis sets

reported primary/secondary endpoints

deviations overview

3. Alignment - сопоставление сущностей

Модуль /alignment отвечает за то, чтобы связать сущности между документами.

3.1 Сущности для маппинга

Objectives

Endpoints

Doses / Arms / Regimens

Populations

Visits / Procedures

Analysis sets / populations

3.2 Пример: objectives_map.ts
export interface ObjectiveLink {
  ibObjectiveId?: string;
  protocolObjectiveId?: string;
  type: 'primary' | 'secondary' | 'exploratory';
  similarityScore: number; // 0-1
}

export async function mapObjectives(
  ib?: StructuredIbDocument,
  protocol?: StructuredProtocolDocument
): Promise<ObjectiveLink[]> {
  // 1) взять списки objectives
  // 2) привести к нормализованному виду (lowercase, remove stopwords)
  // 3) посчитать text similarity (простая метрика для начала)
  // 4) вернуть пары с similarityScore > threshold
}


Аналогично:

endpoints_map.ts - линковать endpoints между Protocol и SAP

dose_map.ts - dose/regimen между IB - Protocol - SAP

populations_map.ts - population definitions между IB - Protocol - SAP

visits_map.ts и procedures_map.ts - schedule vs ICF

4. Rules - набор регуляторно-клинических правил

Каждый файл в /rules - набор функций:

export interface CrossDocRuleContext {
  bundle: CrossDocBundle;
  alignments: CrossDocAlignments;
}

export type CrossDocRule = (ctx: CrossDocRuleContext) => Promise<CrossDocIssue[]>;


Где CrossDocAlignments - агрегирует результаты из alignment/*.

4.1 ib_protocol_rules.ts

Примеры правил:

IB_PROTOCOL_OBJECTIVE_MISMATCH

primary objective в IB не совпадает с primary objective в Protocol

IB_PROTOCOL_POPULATION_DRIFT

target population в IB сильно расходится с аналитической популяцией в Protocol

IB_PROTOCOL_DOSE_INCONSISTENT

дозировка или режим введения не совпадает

4.2 protocol_icf_rules.ts

ICF_SCHEDULE_MISMATCH

в ICF не упомянута часть процедур из visit schedule

ICF_RISK_MISSING

описаны инвазивные процедуры, но риск не объяснён

4.3 protocol_sap_rules.ts

PRIMARY_ENDPOINT_DRIFT

primary endpoint в SAP отличается от Protocol

TEST_MISMATCH

в SAP указан тест, не подходящий для endpoint (stat engine уже знает mapping)

SAMPLE_SIZE_DRIVER_MISMATCH

endpoint, использованный для sample size, не совпадает с declared primary

4.4 protocol_csr_rules.ts

CSR_METHOD_MISMATCH

в CSR описан метод анализа, отличный от SAP

CSR_ENDPOINT_MISMATCH

primary endpoint results описаны для другого endpoint, чем в Protocol/SAP

4.5 global_rules.ts

Общие правила:

GLOBAL_PURPOSE_DRIFT

цель исследования меняется от IB к CSR

GLOBAL_POPULATION_INCOHERENT

клиническая популяция “плавает” между документами

5. CrossDocEngine - основной движок

Файл: /lib/engine/crossdoc/index.ts

export class CrossDocEngine {
  constructor(private rules: CrossDocRule[]) {}

  static createDefault(): CrossDocEngine {
    return new CrossDocEngine([
      ...ibProtocolRules,
      ...protocolIcfRules,
      ...protocolSapRules,
      ...protocolCsrRules,
      ...globalRules,
    ]);
  }

  async run(bundle: CrossDocBundle): Promise<CrossDocIssue[]> {
    const alignments = await buildAlignments(bundle);
    const ctx: CrossDocRuleContext = { bundle, alignments };

    const issues: CrossDocIssue[] = [];
    for (const rule of this.rules) {
      const ruleIssues = await rule(ctx);
      issues.push(...ruleIssues);
    }
    return issues;
  }
}

6. Auto-fix - предложения и патчи

Цель - не только находить ошибки, но и предлагать исправления.

Примеры:

первичный endpoint в SAP отличается от Protocol - предложить выровнять текст SAP под Protocol

dose в SAP отличается от Protocol - предложить привести SAP к Protocol

Реализовать:

/lib/engine/crossdoc/changelog/change_tracker.ts

фиксировать, какие поля изменяются

строить человеческое описание изменений

/api/crossdoc/auto-fix:

принимает список issueIds

возвращает обновлённые документы + diff

7. REST API для Cross-Document Engine

Создать:

/app/api/crossdoc/validate/route.ts
/app/api/crossdoc/auto-fix/route.ts

7.1 POST /api/crossdoc/validate

Input:

{
  "ibId": "ib_123",
  "protocolId": "prot_456",
  "icfId": "icf_789",
  "sapId": "sap_1011",
  "csrId": "csr_1213"
}


Output:

{
  "issues": [
    {
      "code": "PRIMARY_ENDPOINT_DRIFT",
      "severity": "error",
      "message": "Primary endpoint differs between Protocol and SAP.",
      "locations": [
        { "documentType": "PROTOCOL", "sectionId": "ENDPOINTS", "blockId": "PE1" },
        { "documentType": "SAP", "sectionId": "PRIMARY_ANALYSIS", "blockId": "PE1" }
      ],
      "suggestions": [
        {
          "id": "SUGG_ALIGN_SAP_PE",
          "label": "Align SAP primary endpoint with Protocol",
          "autoFixable": true
        }
      ]
    }
  ]
}

7.2 POST /api/crossdoc/auto-fix

Input:

{
  "issueIds": ["PRIMARY_ENDPOINT_DRIFT", "DOSE_INCONSISTENT"],
  "strategy": "align_to_protocol"
}


Output:

обновлённые документы

список применённых патчей

8. UI - новый Cross-Document Integrity таб

Добавить новый экран/таб в UI:

Cross-Document Integrity или Study Consistency

Компоненты:

/components/crossdoc/CrossDocPanel.tsx
/components/crossdoc/CrossDocIssueList.tsx
/components/crossdoc/CrossDocIssueDetails.tsx
/components/crossdoc/CrossDocFixSummary.tsx


Функционал:

запуск cross-doc validation по кнопке

список issues по категориям:

IB - Protocol

Protocol - ICF

Protocol - SAP

SAP - CSR

Global

фильтры по severity

клик по issue - переход к соответствующим документам/блокам

кнопка “Apply auto-fix” для autoFixable issues

отображение diff перед применением

9. Логирование и аудит

Каждый запуск crossdoc-валидации и автофикса должен логироваться:

кто запустил

какие документы участвовали

какие issues найдены

какие auto-fixes применены

Таблица в Supabase, например: crossdoc_audit_log.

10. Тесты

Создать:

/tests/unit/crossdoc/
/tests/api/crossdoc/
/tests/e2e/crossdoc/

10.1 Unit

отдельные alignment модули

отдельные rules (ib_protocol_rules, protocol_sap_rules и т.д.)

10.2 API

/api/crossdoc/validate - happy path, missing docs, invalid ids

/api/crossdoc/auto-fix - разные стратегии

10.3 E2E

Сценарий:

IB, Protocol, SAP, ICF загружены с небольшими специально внесёнными несоответствиями

Запуск crossdoc-валидации

Получаем ожидаемый набор issue-кодов

Применяем auto-fix

Запускаем повторную валидацию - issues либо исчезают, либо меняют severity на info

11. Performance & Constraints

Время выполнения cross-doc валидации - желательно до 2–3 секунд на пакет из 3–4 документов среднего размера

Алгоритмы нужна сделать детерминированными - одинаковый вход → одинаковый output

Никакой зависимости от внешних API в validation path (всё на наших данных)

12. Acceptance Criteria - когда Phase F считается завершённой

Phase F - DONE, если:

 Есть CrossDocEngine, который принимает IB/Protocol/ICF/SAP/CSR и возвращает список issues

 Есть минимум:

5+ правил IB - Protocol

5+ правил Protocol - SAP

3+ правил Protocol - ICF

3+ правил Protocol - CSR

3+ global правил

 Есть UI таб, где видно все cross-doc issues, с навигацией по документам

 Есть auto-fix для хотя бы 3 ключевых типов ошибок:

PRIMARY_ENDPOINT_DRIFT

DOSE_INCONSISTENT

SAP_METHOD_MISMATCH

 Есть API- и E2E-тесты, которые проходят

 Всё работает на проде без ошибок в логах