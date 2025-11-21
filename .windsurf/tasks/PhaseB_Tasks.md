Phase B – Clinical Engine Expansion & External Data Integration

Version 1.0 – 20 Nov 2025

Overview

Phase B расширяет Clinical Engine за пределы Proof-of-Concept для Protocol и приводит систему к production-уровню: полноценный генератор всех клинических документов (Protocol, IB, ICF, Synopsis, CSR, SPC), с поддержкой внешних данных, ссылок на источники, нормализованной информацией о заболевании и препарате, использованием regulatory BEP-структур (FDA/EMA), а также реальным RAG-уровнем.

Фаза B полностью совместима с Azure OpenAI (все генерации только через Azure) и текущей архитектурой Supabase Edge Functions.

Phase B – Task Specification (for Windsurf)
B1 – Expand Orchestrator to All Document Types

Цель: раскатать весь pipeline (section → AI → QC → persist) на все типы документов.

Что сделать:

В таблице document_structure убедиться, что добавлены структуры для:

ib

icf

synopsis

csr

spc

Обновить DocumentOrchestrator:

добавить поддержку всех типов документов (с нормализацией к lowercase)

auto-selection структуры и шаблонов из Supabase по document_type

В api/generate/route.ts:

включить orchestrator для всех типов документов

legacy path оставить как fallback

Добавить feature flag:

USE_ORCHESTRATOR_FOR_ALL=true


Ожидаемый результат: любой документ генерируется через новую архитектуру, как Protocol.

B2 – Disease & Drug Reference Engine (Chunking + RAG Layer)

Цель: научить систему использовать внешние материалы по заболеванию, механизму, фарме, доклинике и безопасности, чтобы генерировать описательные части с корректными ссылками.

Что внедрить:

Создать таблицу drug_reference_chunks:

id

compound_name

source (fda_label, pubmed, ctgov, epar, local_docs)

content

embedding

url

Создать ingestion-скрипт:

берёт внешний документ

режет на чанки (400–900 токенов)

делает embedding через Azure OpenAI (deployment: text-embedding-3-large)

складывает в drug_reference_chunks

Создать ReferenceRetriever:

принимает: compound_name, disease, section

ищет top-N чанков по embedding similarity

возвращает контент + ссылки

В SectionGenerator:

добавить step “inject evidence chunks”

перед созданием промпта добавить поле:

reference_material = <top chunks>


Обновить шаблоны всех документов:

добавить placeholder: {{reference_material}}

убедиться что в текст попадают ссылки (URL или citation-style)

B3 – External Data Pipeline Fix: FDA / PubMed / CT.gov

Цель: привести fetch внешних данных в полный рабочий поток.

Что сделать Windsurf:

Проверить текущие файлы:

supabase/functions/enrich-data
supabase/functions/extract-entities
supabase/functions/validate-document


Исправить enrich-data:

убедиться что вызываются fetch-модули:

FDA: search + SPL label

PubMed: ESearch → EFetch → extract abstract

ClinicalTrials.gov: API v2 (study design, endpoints)

Добавить новый модуль scrub-external-sources:

нормализует текст

убирает HTML

приводит дозировки/единицы к единому виду (mg, mcg, ml)

В enrich-data результат должен писать в таблицу:

external_data_cache:
- id
- compound_name
- disease
- source
- payload (JSON)
- created_at


Проверить: используются ли эти данные?

Сейчас: нет (использовались только metadata extraction).

После Phase B:

RAG слой использует как evidence chunks.

Оркестратор вставляет их в секции.

QC проверяет ссылки.

B4 – Add “Disease Overview” & “Mechanism” Modules

Цель: автоматизировать большие описательные блоки — как в настоящих протоколах и брошюрах.

Должны генерироваться:

Disease Background

Epidemiology

Pathophysiology

Standard of Care

Unmet Need

Drug Mechanism

План:

Создать в Supabase таблицу:

disease_reference
drug_reference


Заполнить ingestion-скриптом (как в B2) внутренние документы:

FDA labels

EPAR

IBs + SPCs (пользовательские)

Добавить в шаблоны IБ и Protocol placeholders:

{{disease_overview}}
{{mechanism}}


SectionGenerator:

достаёт контент из retriever

добавляет в промпт

B5 – Cross-Section Consistency Validation

Цель: QC должен ловить несостыковки между секциями.

Добавить в QCValidator:

Проверки дозировок:

dose в Treatments = dose в Statistics assumptions

Проверки дизайна:

arms одинаковые в Design / Schedule / Statistics

Проверки чисел:

sample size одинаковый во всех секциях

Проверки популяций:

критерии = populations assumptions

B6 – Rollout Plan to All Documents

Как раскатывать новую архитектуру на остальные документы:

Принцип:

1 тип документа = 3 шага

Добавить структуры → document_structure

Создать шаблоны → document_templates

Подключить orchestrator → api/generate

Порядок:

1. IB → 2. Synopsis → 3. ICF → 4. SPC → 5. CSR



B7 – Azure Edge Optimization

Все генерации должны идти через Azure:

Убедиться:

generate-section вызывает Azure OpenAI

embeddings через Azure

secrets хранятся в Supabase Secrets

Нужно:

Добавить retry-механику

Добавить latency logging

Добавить failover (если Azure rate-limit → ждать 3 секунды и retry)

B8 – Final Deliverable for Phase B

Windsurf должен сгенерировать:

clinical_guidelines/
    PhaseB/
        architecture_diagram.md
        rag_pipeline.md
        reference_ingestion.md
        qc_rules_v2.md
        rollout_plan.md
        external_data_usage.md
        azure_optimization.md

Appendix A — Why External Data Is Mandatory

Описательные блоки Protocol и IB (особенно Disease Background, Epidemiology, Mechanism) в реальной жизни берутся:

FDA labels

EMA EPAR

PubMed

ClinicalTrials.gov

Company IB/SPC

Без этих источников документ будет неполным и невалидным для регулятора.

Поэтому Phase B интегрирует external data в генерацию и QC.