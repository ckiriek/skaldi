# 🔧 КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ ПРОМПТОВ

**Дата:** 24 ноября 2025  
**Статус:** Готово к применению

---

## 🧠 1. GOVERNING SYSTEM PROMPT (добавить везде)

**Файл:** Создать `lib/prompts/governing-prompt.ts`

```typescript
export const GOVERNING_SYSTEM_PROMPT = `
You are Skaldi Clinical Documentation AI.

**CORE RULES:**

1. FACTUAL ACCURACY OVER CREATIVITY
   - Use ONLY data from {{knowledgeGraph}} or {{ragReferences}}
   - If data missing: write [DATA_NEEDED: <parameter>]
   - NEVER invent: statistics, study IDs, patient numbers, p-values, doses

2. SOURCE HIERARCHY
   - {{knowledgeGraph}} = compound data (highest priority)
   - {{ragReferences}} = structure examples only (do NOT copy data)
   - {{userInput}} = explicit parameters

3. PLACEHOLDER PROTOCOL
   - Missing values: [VALUE_NEEDED: <parameter>]
   - Missing studies: [STUDY_DATA_NEEDED]
   - Missing stats: [STATISTICAL_ANALYSIS_PENDING]

4. OUTPUT CONSTRAINTS
   - Target: {{targetTokens}} tokens (±20%)
   - Format: Markdown (##, **, bullets, tables)
   - Style: Professional, regulatory-compliant

5. CRITICAL RULE
   If you cannot write with factual accuracy:
   "[INSUFFICIENT_DATA: This section requires <specific data>]"
`

---

## 🔧 2. ИСПРАВЛЕНИЯ ПО ФАЙЛАМ

### ❌ Убрать "pages", заменить на tokens

**Все IB промпты:**
```
БЫЛО: "Write 15-25 pages"
СТАЛО: "Target: 2400-3200 tokens"
```

**Mapping:**
- 1 page ≈ 500 words ≈ 650-700 tokens
- 15-25 pages = 9750-17500 tokens (НЕВОЗМОЖНО с max_completion_tokens: 4000!)
- Реалистично: 2400-3200 tokens = 3-5 pages

---

### ✅ Добавить "DO NOT INVENT" везде

**Добавить в каждый IB/Protocol промпт:**

```
**Critical rules:**
- Use ONLY data from {{knowledgeGraph}}
- If data is missing: [DATA_NEEDED: <section>]
- Do not invent: statistics, study IDs, patient numbers, p-values, dates, doses
- Target: <N> tokens
```

---

### 🔗 Добавить явные ссылки на KG/RAG

**Каждый промпт должен указывать источник:**

```
**Data source:** {{knowledgeGraph.pharmacokinetics}}

## Absorption
**Source:** {{knowledgeGraph.pk.absorption}}
- Bioavailability: {{knowledgeGraph.pk.absorption.bioavailability}} or [BIOAVAILABILITY_NEEDED]
- Tmax: {{knowledgeGraph.pk.absorption.tmax}} or [TMAX_NEEDED]

**Structure reference:** {{ragReferences}}
Use formatting from examples, but write about {{compoundName}} using {{knowledgeGraph}} data only.
```

---

## 📋 3. КОНКРЕТНЫЕ ИСПРАВЛЕНИЯ

### PROMPT-IB-007: Pharmacokinetics

**БЫЛО:**
```
Write the Pharmacokinetics section for {{compoundName}}.
Write about the ACTUAL drug {{compoundName}}, using real PK data.
Write 8-10 pages for {{compoundName}}.
```

**СТАЛО:**
```
Generate the Pharmacokinetics section for {{compoundName}}.

**Data source:** {{knowledgeGraph.pharmacokinetics}}
**Target:** 1600-2000 tokens

## 4.9 Absorption
**Source:** {{knowledgeGraph.pk.absorption}}
- Bioavailability: {{knowledgeGraph.pk.absorption.bioavailability}} or [BIOAVAILABILITY_NEEDED]
- Tmax: {{knowledgeGraph.pk.absorption.tmax}} or [TMAX_NEEDED]
- Cmax: {{knowledgeGraph.pk.absorption.cmax}} or [CMAX_NEEDED]

[... остальные subsections с явными источниками ...]

**Critical:**
- Use ONLY {{knowledgeGraph.pharmacokinetics}} data
- Do not invent PK parameters (Cmax, AUC, t½, Vd, CL)
- If subsection data missing: [PK_DATA_NEEDED: <subsection>]
```

---

### PROMPT-IB-009: Clinical Studies

**БЫЛО:**
```
Write 15-25 pages for {{compoundName}}.
Include specific study IDs, statistics, and data.
```

**СТАЛО:**
```
Generate the Clinical Studies section for {{compoundName}}.

**Data source:** {{knowledgeGraph.trials}}
**Target:** 2400-3200 tokens (NOT pages!)

### 5.2 Phase 1 Studies
**Source:** {{knowledgeGraph.trials.phase1}}

For each Phase 1 study in {{knowledgeGraph.trials.phase1}}:
- NCT ID: {{study.nct_id}}
- Design: {{study.design}}
- N: {{study.enrollment}}
- Key findings: {{study.results}}

If no Phase 1 data: [PHASE_1_DATA_NEEDED]

**Critical:**
- Use ONLY {{knowledgeGraph.trials}} data
- Include NCT IDs, actual N, actual p-values from KG
- Do not invent study IDs, patient numbers, or statistics
- Better to have [DATA_NEEDED] than invented numbers
```

---

### PROMPT-PROT-002: Synopsis

**БЫЛО:**
```
The synopsis must include:
1. Study Title and Phase
2. Objectives (Primary and Secondary)
[... no data sources ...]
```

**СТАЛО:**
```
Generate a Protocol Synopsis (tabular format).

**Data source:** {{studyDesign}}

| Field | Value |
|-------|-------|
| **Study Title** | A {{studyDesign.phase}} {{studyDesign.design_type}} Study of {{compoundName}} in {{indication}} |
| **Primary Objective** | {{studyDesign.primary_objective}} or [PRIMARY_OBJECTIVE_NEEDED] |
| **Primary Endpoint** | {{studyDesign.primary_endpoint}} or [PRIMARY_ENDPOINT_NEEDED] |
| **Sample Size** | {{studyDesign.sample_size}} or [SAMPLE_SIZE_NEEDED] |

**Critical:**
- Use ONLY {{studyDesign}} data
- If field missing: [DATA_NEEDED: <field>]
- Do not invent study parameters
- Must be consistent with Study Designer output
```

---

## 🎯 4. INTEGRATION С STUDY DESIGNER

**Проблема:** Protocol templates не синхронизированы с Study Designer

**Решение:** Все Protocol промпты должны использовать {{studyDesign}}

```typescript
// В section-generator.ts
const context = {
  compoundName: project.compound_name,
  indication: project.indication,
  studyDesign: project.study_design, // ← Добавить!
  knowledgeGraph: project.knowledge_graph, // ← Добавить!
  ragReferences: references.combined,
  targetTokens: calculateTargetTokens(sectionId),
}
```

---

## 📊 5. TOKEN TARGETS ПО СЕКЦИЯМ

### IB Sections:
```
- Title Page: 200-300 tokens
- Summary: 800-1200 tokens
- Introduction: 600-800 tokens
- Physical/Chemical: 600-800 tokens
- Pharmacodynamics: 1200-1600 tokens
- Pharmacokinetics: 1600-2000 tokens
- Toxicology: 1200-1600 tokens
- Clinical Studies: 2400-3200 tokens
- Safety: 1600-2000 tokens
```

### Protocol Sections:
```
- Title Page: 200-300 tokens
- Synopsis: 800-1200 tokens
- Introduction: 600-800 tokens
- Objectives: 600-800 tokens
- Study Design: 800-1200 tokens
- Eligibility: 800-1000 tokens
- Treatments: 600-800 tokens
- Procedures: 1200-1600 tokens
- Safety: 800-1000 tokens
- Statistics: 800-1200 tokens
- Ethics: 400-600 tokens
```

---

## 🚀 6. ПЛАН ВНЕДРЕНИЯ

### Шаг 1: Создать governing-prompt.ts
```bash
touch lib/prompts/governing-prompt.ts
```

### Шаг 2: Обновить generate-section Edge Function
```typescript
// supabase/functions/generate-section/index.ts
import { GOVERNING_SYSTEM_PROMPT } from '../../../lib/prompts/governing-prompt'

const systemPrompt = `${GOVERNING_SYSTEM_PROMPT}

You are generating the {{sectionId}} section for a {{documentType}} document.
Target: {{targetTokens}} tokens.
`
```

### Шаг 3: Обновить ALL_PROMPTS.md
- Убрать все "Write X pages"
- Добавить "Target: N tokens"
- Добавить "Data source: {{knowledgeGraph.X}}"
- Добавить "Critical: Do not invent..."
- Добавить placeholders для missing data

### Шаг 4: Запустить update-prompts
```bash
npm run update-prompts
```

### Шаг 5: Обновить section-generator.ts
Добавить в context:
- `studyDesign`
- `knowledgeGraph`
- `targetTokens`

### Шаг 6: Протестировать
```bash
# Тест 1: IB для Metformin
# Тест 2: Protocol для Sitagliptin
# Проверить: placeholders вместо галлюцинаций
```

---

## ✅ 7. ЧЕКЛИСТ ПРОВЕРКИ

После внедрения проверь:

- [ ] Governing prompt добавлен во все Edge Functions
- [ ] Все промпты имеют "Target: N tokens" вместо "pages"
- [ ] Все промпты имеют "Data source: {{knowledgeGraph.X}}"
- [ ] Все промпты имеют "Critical: Do not invent..."
- [ ] Все промпты используют placeholders [DATA_NEEDED]
- [ ] Protocol промпты используют {{studyDesign}}
- [ ] IB промпты используют {{knowledgeGraph}}
- [ ] RAG используется только для структуры, не данных
- [ ] Нет конфликтов между system и template промптами

---

## 📈 8. ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### До исправлений:
- ❌ Модель галлюцинирует цифры
- ❌ Модель выдумывает NCT IDs
- ❌ Модель копирует данные из RAG примеров
- ❌ Модель генерирует слишком много/мало текста
- ❌ Модель конфликтует между промптами

### После исправлений:
- ✅ Модель использует только KG данные
- ✅ Модель пишет [DATA_NEEDED] когда данных нет
- ✅ Модель генерирует правильный объем (tokens)
- ✅ Модель следует единому governing prompt
- ✅ Модель не копирует данные из RAG

---

**Готово к применению!**
