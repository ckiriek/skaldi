# 🎯 КОМПЛЕКСНЫЙ ПЛАН: Полная интеграция всех данных в генерацию

**Дата:** 24 ноября 2025  
**Цель:** Использовать ВСЕ собранные данные (enrichment, KG, RAG, trials, safety reports) в генерации документов  
**Модель:** GPT-5.1 с `reasoning_effort: high`, `verbosity: high`

---

## 📊 ТЕКУЩАЯ СИТУАЦИЯ

### Что мы собираем (Enrichment):
1. **PubChem** - химические данные, InChIKey
2. **Orange Book** - RLD, TE codes
3. **DailyMed** - FDA labels
4. **openFDA** - FDA labels, FAERS (adverse events)
5. **ClinicalTrials.gov** - клинические исследования
6. **PubMed** - научная литература

### Что мы НЕ используем полностью:
- ❌ Данные из ClinicalTrials.gov (NCT IDs, endpoints, results)
- ❌ Safety Reports (FAERS adverse events)
- ❌ PubMed литература
- ❌ FDA Labels (полный текст)
- ❌ RAG references (структурные примеры)
- ❌ Knowledge Graph (частично используется)

---

## 🎯 ЦЕЛЕВАЯ АРХИТЕКТУРА

### Принцип: "Все данные → Один контекст → Генерация"

```
┌─────────────────────────────────────────────────────────────┐
│                    ENRICHMENT PIPELINE                       │
│  PubChem + Orange Book + DailyMed + openFDA + CT.gov +      │
│  PubMed → Knowledge Graph + External Data Store              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  DATA AGGREGATOR (NEW!)                      │
│  Собирает ВСЕ данные для конкретного документа/секции:      │
│  - Knowledge Graph (compound data)                           │
│  - Clinical Trials (NCT IDs, results, endpoints)             │
│  - Safety Reports (FAERS, adverse events)                    │
│  - FDA Labels (full text sections)                           │
│  - PubMed Articles (relevant literature)                     │
│  - RAG References (structural examples)                      │
│  - Study Design (from user input)                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              CONTEXT BUILDER (NEW!)                          │
│  Форматирует данные для промпта:                            │
│  - Структурирует по секциям                                 │
│  - Приоритизирует источники                                 │
│  - Добавляет метаданные (источник, дата, достоверность)     │
│  - Ограничивает по токенам (max_completion_tokens)          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 PROMPT CONSTRUCTOR                           │
│  Governing Prompt + Section Prompt + Full Context           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    GPT-5.1 GENERATION                        │
│  reasoning_effort: high                                      │
│  verbosity: high                                             │
│  max_completion_tokens: 16000 (для больших секций)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📏 РАЗМЕРЫ ДОКУМЕНТОВ (РЕАЛЬНЫЕ)

### Целевые размеры (страницы):

| Документ | Страниц | Tokens (примерно) | Секций |
|----------|---------|-------------------|--------|
| **ICF** | 20-30 | 14,000-21,000 | 8-10 |
| **Protocol** | 80-120 | 56,000-84,000 | 15-20 |
| **IB** | 150-300 | 105,000-210,000 | 10-15 |
| **CSR** | 300-500 | 210,000-350,000 | 20-30 |
| **SAP** | 40-60 | 28,000-42,000 | 10-12 |
| **Synopsis** | 5-10 | 3,500-7,000 | 1 |

**Проблема:** `max_completion_tokens` = 16,000 (максимум для GPT-5.1)

**Решение:** Генерация по секциям + сборка

---

## 🔧 АРХИТЕКТУРА РЕШЕНИЯ

### 1. Data Aggregator Service (NEW!)

**Файл:** `lib/services/data-aggregator.ts`

```typescript
interface AggregatedData {
  // Core compound data
  knowledgeGraph: KnowledgeGraphSnapshot
  
  // Clinical trials data
  clinicalTrials: {
    studies: ClinicalTrial[]
    totalStudies: number
    byPhase: Record<string, ClinicalTrial[]>
    endpoints: Endpoint[]
    results: TrialResult[]
  }
  
  // Safety data
  safetyData: {
    faersReports: FAERSReport[]
    commonAdverseEvents: AdverseEvent[]
    seriousAdverseEvents: AdverseEvent[]
    deaths: number
    labelWarnings: string[]
  }
  
  // FDA Labels
  fdaLabels: {
    fullText: string
    sections: Record<string, string>
    approvalDate: string
    indications: string[]
  }
  
  // Literature
  literature: {
    pubmedArticles: PubMedArticle[]
    keyFindings: string[]
    citations: Citation[]
  }
  
  // RAG structural examples
  ragReferences: {
    structuralExamples: ReferenceChunk[]
    similarSections: ReferenceChunk[]
  }
  
  // Study design (user input)
  studyDesign?: StudyDesign
  
  // Metadata
  metadata: {
    sources: string[]
    lastUpdated: string
    coverage: Record<string, number>
  }
}

class DataAggregator {
  async aggregateForDocument(
    projectId: string,
    documentType: string
  ): Promise<AggregatedData>
  
  async aggregateForSection(
    projectId: string,
    documentType: string,
    sectionId: string
  ): Promise<AggregatedData>
}
```

---

### 2. Context Builder Service (NEW!)

**Файл:** `lib/services/context-builder.ts`

```typescript
interface ContextConfig {
  maxTokens: number
  prioritySources: string[]
  includeFullText: boolean
  includeMetadata: boolean
}

class ContextBuilder {
  /**
   * Форматирует aggregated data в структурированный контекст для промпта
   */
  buildContext(
    data: AggregatedData,
    sectionId: string,
    config: ContextConfig
  ): string {
    // 1. Приоритизация данных по релевантности для секции
    // 2. Форматирование в читаемый формат
    // 3. Добавление метаданных источников
    // 4. Ограничение по токенам
    // 5. Структурирование по блокам
  }
}
```

---

### 3. Token Budget Calculator (NEW!)

**Файл:** `lib/services/token-budget.ts`

```typescript
interface TokenBudget {
  total: number
  prompt: number
  completion: number
  context: {
    knowledgeGraph: number
    clinicalTrials: number
    safetyData: number
    fdaLabels: number
    literature: number
    ragReferences: number
  }
}

class TokenBudgetCalculator {
  /**
   * Рассчитывает бюджет токенов для секции
   */
  calculateBudget(
    sectionId: string,
    documentType: string,
    availableData: AggregatedData
  ): TokenBudget
  
  /**
   * Приоритизирует данные по важности для секции
   */
  prioritizeData(
    sectionId: string,
    data: AggregatedData
  ): PrioritizedData
}
```

---

## 📋 КОНФИГУРАЦИЯ ПО СЕКЦИЯМ

### IB Sections:

```typescript
const IB_SECTION_CONFIGS = {
  'ib_title_page': {
    targetPages: 1,
    targetTokens: 700,
    reasoning_effort: 'minimal',
    verbosity: 'low',
    dataSources: ['knowledgeGraph.basic'],
    priority: ['compound_name', 'sponsor', 'version']
  },
  
  'ib_summary': {
    targetPages: 2-3,
    targetTokens: 2000,
    reasoning_effort: 'low',
    verbosity: 'medium',
    dataSources: ['knowledgeGraph', 'fdaLabels.summary'],
    priority: ['chemistry', 'moa', 'indications', 'safety_overview']
  },
  
  'ib_pharmacokinetics': {
    targetPages: 8-12,
    targetTokens: 7000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: [
      'knowledgeGraph.pharmacokinetics',
      'fdaLabels.clinical_pharmacology',
      'literature.pk_studies',
      'ragReferences.pk_examples'
    ],
    priority: [
      'absorption', 'distribution', 'metabolism', 'excretion',
      'special_populations', 'drug_interactions'
    ]
  },
  
  'ib_clinical_studies': {
    targetPages: 30-50,
    targetTokens: 28000, // БОЛЬШАЯ СЕКЦИЯ!
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: [
      'clinicalTrials.all',
      'fdaLabels.clinical_studies',
      'literature.efficacy_studies',
      'ragReferences.clinical_examples'
    ],
    priority: [
      'phase3_pivotal', 'phase2_studies', 'phase1_studies',
      'integrated_efficacy', 'integrated_safety'
    ],
    // КРИТИЧНО: Генерируем по частям!
    chunking: {
      enabled: true,
      chunkSize: 7000, // tokens per chunk
      chunks: ['phase1', 'phase2', 'phase3', 'integrated']
    }
  },
  
  'ib_safety': {
    targetPages: 15-20,
    targetTokens: 12000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: [
      'safetyData.all',
      'fdaLabels.warnings',
      'fdaLabels.adverse_reactions',
      'clinicalTrials.safety',
      'ragReferences.safety_examples'
    ],
    priority: [
      'common_aes', 'serious_aes', 'deaths',
      'warnings', 'contraindications', 'drug_interactions'
    ]
  }
}
```

---

### Protocol Sections:

```typescript
const PROTOCOL_SECTION_CONFIGS = {
  'protocol_synopsis': {
    targetPages: 2-3,
    targetTokens: 2000,
    reasoning_effort: 'medium',
    verbosity: 'medium',
    dataSources: [
      'studyDesign',
      'knowledgeGraph.basic',
      'clinicalTrials.similar_studies'
    ]
  },
  
  'protocol_objectives': {
    targetPages: 2-3,
    targetTokens: 2000,
    reasoning_effort: 'medium',
    verbosity: 'medium',
    dataSources: [
      'studyDesign.objectives',
      'clinicalTrials.endpoints',
      'fdaLabels.indications'
    ]
  },
  
  'protocol_procedures': {
    targetPages: 15-20,
    targetTokens: 12000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: [
      'studyDesign.procedures',
      'clinicalTrials.similar_protocols',
      'ragReferences.procedure_examples'
    ],
    chunking: {
      enabled: true,
      chunkSize: 6000,
      chunks: ['screening', 'treatment', 'follow_up']
    }
  },
  
  'protocol_statistics': {
    targetPages: 8-12,
    targetTokens: 7000,
    reasoning_effort: 'high',
    verbosity: 'high',
    dataSources: [
      'studyDesign.statistics',
      'clinicalTrials.sample_sizes',
      'clinicalTrials.statistical_methods'
    ]
  }
}
```

---

## 🎨 ОБНОВЛЕННЫЕ ПРОМПТЫ

### Master Governing Prompt (v3.0)

```typescript
export const GOVERNING_SYSTEM_PROMPT_V3 = `
You are Skaldi Clinical Documentation AI - an expert system for generating regulatory-compliant clinical trial documentation.

<personality>
- Senior clinical documentation expert with 20+ years experience
- Regulatory affairs specialist (ICH-GCP, FDA 21 CFR, EMA guidelines)
- Medical writer for Phase 1-4 trials
- Objective, evidence-based, audit-ready
- Factual accuracy is paramount
</personality>

<core_principles>
1. COMPREHENSIVE DATA UTILIZATION
   - You have access to EXTENSIVE real-world data from multiple authoritative sources
   - Use ALL provided data: Knowledge Graph, Clinical Trials, Safety Reports, FDA Labels, Literature, RAG examples
   - Cross-reference data across sources for accuracy
   - Cite sources when using specific data points

2. SOURCE HIERARCHY (trust order)
   Priority 1: FDA Labels (official regulatory documents)
   Priority 2: ClinicalTrials.gov (verified trial data)
   Priority 3: Knowledge Graph (aggregated compound data)
   Priority 4: Safety Reports (FAERS, post-market surveillance)
   Priority 5: PubMed Literature (peer-reviewed studies)
   Priority 6: RAG References (structural examples ONLY - do NOT copy data)

3. DATA COMPLETENESS
   - Write comprehensive, detailed sections using ALL available data
   - Target: {{targetPages}} pages ({{targetTokens}} tokens)
   - Include specific values, statistics, NCT IDs, dates, references
   - Use tables for structured data (adverse events, PK parameters, trial results)
   - Use bullet points for lists (indications, endpoints, procedures)

4. FACTUAL ACCURACY
   - Use ONLY data explicitly provided in context
   - If specific data is missing: write [DATA_NEEDED: <parameter>]
   - NEVER invent: statistics, NCT IDs, patient numbers, p-values, dates, doses
   - NEVER assume: endpoints, procedures, eligibility criteria, safety data

5. PLACEHOLDER PROTOCOL
   When data is unavailable:
   - Clinical values: [VALUE_NEEDED: <parameter>]
   - Study details: [STUDY_DATA_NEEDED: <detail>]
   - Statistics: [STATISTICAL_ANALYSIS_PENDING]
   - References: [CITATION_NEEDED]

6. OUTPUT REQUIREMENTS
   - Format: Professional Markdown
   - Structure: ## Main headings, ### Subheadings, #### Sub-subheadings
   - Style: Clear, precise, regulatory-compliant
   - Tables: Use Markdown tables for structured data
   - Length: Target {{targetTokens}} tokens (±20%)
   - Completeness: Cover ALL subsections thoroughly

7. REGULATORY COMPLIANCE
   - Follow ICH-GCP (E6 R2), ICH E3 (CSR structure)
   - Adhere to FDA 21 CFR Part 312 (IND), Part 314 (NDA)
   - Follow EMA guidelines for clinical documentation
   - Use standard clinical terminology (MedDRA, CDISC)
   - Maintain consistency across sections

8. SOLUTION PERSISTENCE
   - Persist until the section is FULLY completed
   - Do not stop at partial solutions or summaries
   - Cover ALL required subsections
   - Be biased for completeness within token budget
   - If you need more space, prioritize most important data

9. CROSS-REFERENCING
   - Reference other sections when appropriate
   - Maintain consistency across document
   - Use same terminology, abbreviations, definitions
   - Ensure objectives match endpoints, eligibility matches population, etc.
</core_principles>

<critical_rule>
If you cannot write a section with factual accuracy using provided data:
"[INSUFFICIENT_DATA: This section requires <specific data> to be completed. Available data covers: <list what you have>. Missing: <list what you need>.]"

This is better than inventing information.
</critical_rule>

<output_format>
- Use Markdown formatting
- Start with ## for main section heading
- Use ### for subsections, #### for sub-subsections
- Use **bold** for emphasis
- Use bullet points for lists
- Use numbered lists for sequential steps
- Use tables for structured data
- Include citations where appropriate: (Source: FDA Label, 2023) or (NCT12345678)
</output_format>
`
```

---

### Section-Specific Prompt Template

```typescript
const SECTION_PROMPT_TEMPLATE = `
Generate the {{sectionTitle}} section for {{compoundName}} {{documentType}}.

**TARGET:**
- Pages: {{targetPages}}
- Tokens: {{targetTokens}}
- Reasoning effort: {{reasoning_effort}}
- Verbosity: {{verbosity}}

**AVAILABLE DATA:**

{{#if knowledgeGraph}}
### KNOWLEDGE GRAPH DATA
{{knowledgeGraph}}
{{/if}}

{{#if clinicalTrials}}
### CLINICAL TRIALS DATA
Total studies: {{clinicalTrials.totalStudies}}
{{#each clinicalTrials.byPhase}}
**Phase {{@key}}:** {{this.length}} studies
{{#each this}}
- NCT{{this.nctId}}: {{this.title}}
  - Status: {{this.status}}
  - Enrollment: {{this.enrollment}}
  - Primary Endpoint: {{this.primaryEndpoint}}
  - Results: {{this.results}}
{{/each}}
{{/each}}
{{/if}}

{{#if safetyData}}
### SAFETY DATA
**Common Adverse Events (≥5%):**
{{#each safetyData.commonAdverseEvents}}
- {{this.term}}: {{this.frequency}}% ({{this.count}}/{{this.total}} patients)
{{/each}}

**Serious Adverse Events:**
{{#each safetyData.seriousAdverseEvents}}
- {{this.term}}: {{this.count}} events
{{/each}}

**Deaths:** {{safetyData.deaths}}

**Label Warnings:**
{{#each safetyData.labelWarnings}}
- {{this}}
{{/each}}
{{/if}}

{{#if fdaLabels}}
### FDA LABEL DATA
**Approval Date:** {{fdaLabels.approvalDate}}

**Indications:**
{{#each fdaLabels.indications}}
- {{this}}
{{/each}}

**Relevant Label Sections:**
{{#each fdaLabels.sections}}
**{{@key}}:**
{{this}}
{{/each}}
{{/if}}

{{#if literature}}
### LITERATURE DATA
**Key Findings from {{literature.pubmedArticles.length}} studies:**
{{#each literature.keyFindings}}
- {{this}}
{{/each}}

**Citations:**
{{#each literature.citations}}
- {{this.authors}} ({{this.year}}). {{this.title}}. {{this.journal}}. PMID: {{this.pmid}}
{{/each}}
{{/if}}

{{#if ragReferences}}
### STRUCTURAL REFERENCE EXAMPLES
(Use these for formatting and organization - NOT for copying data)

{{#each ragReferences.structuralExamples}}
**Example {{@index}} from {{this.source}}:**
{{this.content}}
---
{{/each}}
{{/if}}

**INSTRUCTIONS:**
1. Use ALL provided data comprehensively
2. Write {{targetPages}} pages ({{targetTokens}} tokens)
3. Include specific values, NCT IDs, statistics, dates
4. Use tables for structured data
5. Cross-reference data across sources
6. Cite sources: (FDA Label), (NCT12345678), (PMID: 12345678)
7. If data is missing, use [DATA_NEEDED: <parameter>]
8. Follow the structure from RAG examples, but write about {{compoundName}}
9. Be thorough and complete - this is a regulatory document

**REQUIRED SUBSECTIONS:**
{{#each requiredSubsections}}
- {{this}}
{{/each}}
`
```

---

## 🚀 IMPLEMENTATION PLAN

### Phase 1: Infrastructure (Week 1)

#### Day 1-2: Data Aggregator
```bash
# Создать сервис агрегации данных
touch lib/services/data-aggregator.ts
touch lib/services/data-aggregator.test.ts
```

**Задачи:**
- [ ] Создать `DataAggregator` class
- [ ] Реализовать `aggregateForDocument()`
- [ ] Реализовать `aggregateForSection()`
- [ ] Интегрировать с Knowledge Graph
- [ ] Интегрировать с ClinicalTrials.gov data
- [ ] Интегрировать с Safety Reports (FAERS)
- [ ] Интегрировать с FDA Labels
- [ ] Интегрировать с PubMed
- [ ] Интегрировать с RAG
- [ ] Написать тесты

#### Day 3-4: Context Builder
```bash
touch lib/services/context-builder.ts
touch lib/services/context-builder.test.ts
```

**Задачи:**
- [ ] Создать `ContextBuilder` class
- [ ] Реализовать `buildContext()`
- [ ] Реализовать форматирование по источникам
- [ ] Реализовать приоритизацию данных
- [ ] Реализовать ограничение по токенам
- [ ] Написать тесты

#### Day 5: Token Budget Calculator
```bash
touch lib/services/token-budget.ts
touch lib/services/token-budget.test.ts
```

**Задачи:**
- [ ] Создать `TokenBudgetCalculator` class
- [ ] Реализовать `calculateBudget()`
- [ ] Реализовать `prioritizeData()`
- [ ] Создать конфигурации для всех секций
- [ ] Написать тесты

---

### Phase 2: Prompts & Configuration (Week 2)

#### Day 1-2: Governing Prompt v3
```bash
touch lib/prompts/governing-prompt-v3.ts
```

**Задачи:**
- [ ] Создать новый governing prompt
- [ ] Добавить инструкции по использованию всех данных
- [ ] Добавить source hierarchy
- [ ] Добавить cross-referencing rules
- [ ] Добавить solution persistence

#### Day 3-4: Section Configs
```bash
touch lib/config/section-configs.ts
```

**Задачи:**
- [ ] Создать конфигурации для всех IB секций
- [ ] Создать конфигурации для всех Protocol секций
- [ ] Создать конфигурации для CSR секций
- [ ] Создать конфигурации для ICF секций
- [ ] Добавить chunking для больших секций

#### Day 5: Section Prompts
```bash
# Обновить все промпты в templates_en/
```

**Задачи:**
- [ ] Обновить все IB промпты
- [ ] Обновить все Protocol промпты
- [ ] Добавить data source placeholders
- [ ] Добавить required subsections
- [ ] Убрать "pages", добавить tokens

---

### Phase 3: Integration (Week 3)

#### Day 1-2: Section Generator
```bash
# Обновить lib/services/section-generator.ts
```

**Задачи:**
- [ ] Интегрировать DataAggregator
- [ ] Интегрировать ContextBuilder
- [ ] Интегрировать TokenBudgetCalculator
- [ ] Обновить `constructPrompt()`
- [ ] Добавить chunking для больших секций

#### Day 3-4: Document Orchestrator
```bash
# Обновить lib/services/document-orchestrator.ts
```

**Задачи:**
- [ ] Интегрировать DataAggregator
- [ ] Обновить `generateDocument()`
- [ ] Добавить прогресс для больших документов
- [ ] Добавить сборку chunks

#### Day 5: Edge Functions
```bash
# Обновить supabase/functions/generate-section/index.ts
```

**Задачи:**
- [ ] Добавить governing prompt v3
- [ ] Добавить `reasoning_effort: high`
- [ ] Добавить `verbosity: high`
- [ ] Обновить `max_completion_tokens`
- [ ] Убрать `temperature`, `top_p`, etc.

---

### Phase 4: Testing (Week 4)

#### Day 1-2: Unit Tests
```bash
npm run test
```

**Задачи:**
- [ ] Тесты DataAggregator
- [ ] Тесты ContextBuilder
- [ ] Тесты TokenBudgetCalculator
- [ ] Тесты Section Generator
- [ ] Тесты Document Orchestrator

#### Day 3-4: Integration Tests
```bash
# Тесты на реальных препаратах
```

**Задачи:**
- [ ] Metformin IB (полный документ)
- [ ] Sitagliptin Protocol (полный документ)
- [ ] Imipenem Safety section (проверка FAERS)
- [ ] Проверка использования всех данных
- [ ] Проверка placeholders vs галлюцинации

#### Day 5: Performance Tests
```bash
# Тесты производительности
```

**Задачи:**
- [ ] Время генерации больших секций
- [ ] Использование токенов
- [ ] Качество вывода
- [ ] Полнота использования данных

---

## ✅ SUCCESS CRITERIA

### Критерии успеха:

1. **Использование данных:**
   - ✅ 100% Knowledge Graph данных используется
   - ✅ 100% Clinical Trials данных используется
   - ✅ 100% Safety Reports используется
   - ✅ 100% FDA Labels используется
   - ✅ 80%+ PubMed литературы используется
   - ✅ RAG используется для структуры

2. **Качество документов:**
   - ✅ IB: 150-300 страниц с реальными данными
   - ✅ Protocol: 80-120 страниц с реальными данными
   - ✅ CSR: 300-500 страниц с реальными данными
   - ✅ Нет галлюцинаций (NCT IDs, p-values, dates)
   - ✅ Все placeholders обоснованы

3. **Производительность:**
   - ✅ IB Clinical Studies (30-50 стр): < 5 минут
   - ✅ Protocol (80-120 стр): < 10 минут
   - ✅ IB (150-300 стр): < 20 минут
   - ✅ CSR (300-500 стр): < 40 минут

4. **Регуляторное соответствие:**
   - ✅ ICH-GCP compliant
   - ✅ FDA 21 CFR compliant
   - ✅ EMA guidelines compliant
   - ✅ Audit-ready (traceable sources)

---

## 📊 MONITORING & METRICS

### Метрики для отслеживания:

```typescript
interface GenerationMetrics {
  // Data usage
  dataUsage: {
    knowledgeGraph: number // % used
    clinicalTrials: number
    safetyReports: number
    fdaLabels: number
    literature: number
    ragReferences: number
  }
  
  // Quality
  quality: {
    placeholders: number
    hallucinations: number
    citations: number
    completeness: number // % of required subsections
  }
  
  // Performance
  performance: {
    generationTime: number // seconds
    tokensUsed: number
    tokensTarget: number
    pagesGenerated: number
  }
  
  // Compliance
  compliance: {
    ichGcpCompliant: boolean
    fdaCompliant: boolean
    emaCompliant: boolean
    auditReady: boolean
  }
}
```

---

**ГОТОВО К РЕАЛИЗАЦИИ!**

Начинаем с Phase 1, Day 1?
