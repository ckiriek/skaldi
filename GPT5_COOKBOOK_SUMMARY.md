# 📚 OpenAI Cookbook - GPT-5 Ключевые находки

**Источник:** https://github.com/openai/openai-cookbook  
**Дата:** 24 ноября 2025  
**Локация:** `/Users/mitchkiriek/skaldi/gpt5/`

---

## 🎯 Ключевые документы

1. **`gpt-5_new_params_and_tools.ipynb`** - Новые параметры GPT-5
2. **`gpt-5-1_prompting_guide.ipynb`** - Промптинг гайд для GPT-5.1
3. **`gpt-5_prompting_guide.ipynb`** - Промптинг гайд для GPT-5
4. **`gpt-5_troubleshooting_guide.ipynb`** - Troubleshooting
5. **`Build_a_coding_agent_with_GPT-5.1.ipynb`** - Coding agent

---

## 🆕 Новые параметры GPT-5 (КРИТИЧНО!)

### 1. **Verbosity Parameter** ✅
```python
verbosity: "low" | "medium" | "high"
```

**Назначение:**
- `low` → краткие ответы, минимум текста
- `medium` (default) → сбалансированная детальность
- `high` → подробные ответы (для аудитов, обучения)

**Для Skaldi:**
```python
# IB Clinical Studies (сложная секция)
verbosity: "high"

# IB Title Page (простая секция)
verbosity: "low"

# Protocol Synopsis (средняя)
verbosity: "medium"
```

---

### 2. **Reasoning Effort** ✅
```python
reasoning_effort: "none" | "minimal" | "low" | "medium" | "high"
```

**Назначение:**
- `none` → без reasoning (как GPT-4.1, для низкой латентности)
- `minimal` → минимум reasoning токенов (быстро)
- `low` → базовые рассуждения
- `medium` (default) → стандартные рассуждения
- `high` → глубокие рассуждения

**Для Skaldi:**
```python
# Простые секции (Title Page, Summary)
reasoning_effort: "minimal"

# Средние секции (Pharmacokinetics, Safety)
reasoning_effort: "medium"

# Сложные секции (Clinical Studies, Statistics)
reasoning_effort: "high"
```

---

### 3. **Preamble** ✅
```python
preamble: "string"
```

**Назначение:**
Инструкции, которые модель видит перед основным промптом.

**Для Skaldi:**
```python
preamble: """
You are generating regulatory-compliant clinical documentation.
Follow ICH-GCP, FDA, and EMA guidelines.
Use ONLY provided data from Knowledge Graph.
If data is missing, write [DATA_NEEDED].
"""
```

---

### 4. **Context-Free Grammar (CFG)** ✅
Для строгого форматирования вывода (JSON, SQL, код).

**Для Skaldi:**
Можем использовать для генерации таблиц в строгом формате.

---

## 🎨 GPT-5.1 Промптинг - Ключевые паттерны

### 1. **Миграция с GPT-5 на GPT-5.1**

**Проблемы GPT-5.1:**
- Может быть слишком кратким (в ущерб полноте)
- Может быть слишком многословным
- Нужно явно указывать на persistence и completeness

**Решения:**
```markdown
<solution_persistence>
- Persist until the task is fully handled end-to-end
- Do not stop at partial solutions
- Be extremely biased for action
- If data is missing, explicitly state what is needed
</solution_persistence>
```

---

### 2. **Управление личностью агента**

**Для клинической документации:**
```markdown
<personality>
You are a clinical documentation expert.
- Professional, precise, regulatory-compliant
- Objective, evidence-based, audit-ready
- No creative writing, no speculation
- Factual accuracy over eloquence
</personality>
```

---

### 3. **Управление длиной вывода**

**Вместо "Write X pages":**
```markdown
<output_verbosity_spec>
- Respond in plain text styled in Markdown
- Target: 1600-2000 tokens
- Use ## headings, **bold**, bullet points, tables
- Lead with key information, context only if needed
</output_verbosity_spec>
```

---

### 4. **User Updates (Preambles)**

**Для длинных задач:**
```markdown
<user_updates_spec>
- Send short updates (1-2 sentences) every few tool calls
- Post an update at least every 6 execution steps
- Always state at least one concrete outcome
- End with a brief recap
</user_updates_spec>
```

---

### 5. **Encouraging Complete Solutions**

**Критично для Skaldi:**
```markdown
<solution_persistence>
- Treat yourself as an autonomous senior expert
- Persist until the task is fully handled end-to-end
- Do not stop at analysis or partial fixes
- Be extremely biased for action
- If data is missing, explicitly state: [DATA_NEEDED: <parameter>]
</solution_persistence>
```

---

## 🔧 Применение к Skaldi

### Governing System Prompt (обновленный)

```typescript
export const GOVERNING_SYSTEM_PROMPT = `
You are Skaldi Clinical Documentation AI.

<personality>
- Professional clinical documentation expert
- Regulatory-compliant (ICH-GCP, FDA, EMA)
- Objective, evidence-based, audit-ready
- Factual accuracy over creativity
</personality>

<core_rules>
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
</core_rules>

<solution_persistence>
- Persist until the section is fully completed
- Do not stop at partial solutions
- If data is missing, explicitly state what is needed
- Be biased for completeness within token budget
</solution_persistence>

<output_verbosity_spec>
- Respond in Markdown with ## headings
- Target: {{targetTokens}} tokens
- Lead with key information, context only if needed
- Use tables for structured data
- Use bullet points for lists
</output_verbosity_spec>

<critical_rule>
If you cannot write with factual accuracy:
"[INSUFFICIENT_DATA: This section requires <specific data>]"
</critical_rule>
`
```

---

### Параметры для разных секций

```typescript
// lib/services/section-generator.ts

const SECTION_CONFIGS = {
  // IB Sections
  'ib_title_page': {
    targetTokens: 250,
    reasoning_effort: 'minimal',
    verbosity: 'low'
  },
  'ib_summary': {
    targetTokens: 1000,
    reasoning_effort: 'low',
    verbosity: 'medium'
  },
  'ib_pharmacokinetics': {
    targetTokens: 1800,
    reasoning_effort: 'medium',
    verbosity: 'high'
  },
  'ib_clinical_studies': {
    targetTokens: 2800,
    reasoning_effort: 'high',
    verbosity: 'high'
  },
  
  // Protocol Sections
  'protocol_synopsis': {
    targetTokens: 1000,
    reasoning_effort: 'low',
    verbosity: 'medium'
  },
  'protocol_objectives': {
    targetTokens: 700,
    reasoning_effort: 'low',
    verbosity: 'medium'
  },
  'protocol_statistics': {
    targetTokens: 1000,
    reasoning_effort: 'high',
    verbosity: 'high'
  }
}
```

---

### Обновленный вызов Azure OpenAI

```typescript
// supabase/functions/generate-section/index.ts

const response = await fetch(azureUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'api-key': apiKey,
  },
  body: JSON.stringify({
    messages: [
      {
        role: 'system',
        content: GOVERNING_SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: sectionPrompt
      }
    ],
    max_completion_tokens: config.targetTokens * 1.5, // Buffer
    reasoning_effort: config.reasoning_effort,
    verbosity: config.verbosity,
    // NO temperature, top_p, frequency_penalty, presence_penalty!
  }),
})
```

---

## 📊 Сравнение: Было vs Должно быть

### ❌ БЫЛО (неправильно):
```typescript
{
  messages: [...],
  temperature: 0.7,           // ❌ Не поддерживается
  max_tokens: 4000,           // ❌ Устарело
  top_p: 0.95,                // ❌ Не поддерживается
  frequency_penalty: 0,       // ❌ Не поддерживается
  presence_penalty: 0,        // ❌ Не поддерживается
}
```

### ✅ ДОЛЖНО БЫТЬ (правильно):
```typescript
{
  messages: [...],
  max_completion_tokens: 4000,  // ✅ Правильно
  reasoning_effort: "medium",   // ✅ Новый параметр
  verbosity: "high",            // ✅ Новый параметр
  preamble: "...",              // ✅ Опционально
}
```

---

## 🚀 План внедрения

### Шаг 1: Обновить governing-prompt.ts
```bash
# Создать файл с новым governing prompt
touch lib/prompts/governing-prompt.ts
```

### Шаг 2: Добавить SECTION_CONFIGS
```typescript
// lib/services/section-generator.ts
// Добавить конфигурации для каждой секции
```

### Шаг 3: Обновить Edge Functions
```typescript
// supabase/functions/generate-section/index.ts
// Добавить reasoning_effort и verbosity
```

### Шаг 4: Исправить все файлы с temperature
```bash
# Убрать temperature из 5 файлов (см. GPT5_AUDIT_REPORT.md)
```

### Шаг 5: Обновить промпты
```bash
# Применить изменения из PROMPT_FIXES.md
npm run update-prompts
```

### Шаг 6: Тестировать
```bash
# Тест на разных препаратах
# Проверить: placeholders вместо галлюцинаций
# Проверить: правильная длина вывода
```

---

## ✅ Чеклист внедрения

- [ ] Создать `lib/prompts/governing-prompt.ts` с новым промптом
- [ ] Добавить `SECTION_CONFIGS` в `section-generator.ts`
- [ ] Обновить Edge Functions (добавить `reasoning_effort`, `verbosity`)
- [ ] Убрать `temperature` из всех файлов
- [ ] Заменить `max_tokens` на `max_completion_tokens`
- [ ] Обновить все промпты (убрать "pages", добавить tokens)
- [ ] Добавить явные источники данных в промпты
- [ ] Добавить "DO NOT INVENT" во все промпты
- [ ] Протестировать на Metformin, Sitagliptin, Imipenem
- [ ] Проверить: нет галлюцинаций, есть placeholders

---

## 📚 Полезные ссылки

1. **GPT-5 New Params:** `/Users/mitchkiriek/skaldi/gpt5/examples/gpt-5/gpt-5_new_params_and_tools.ipynb`
2. **GPT-5.1 Prompting:** `/Users/mitchkiriek/skaldi/gpt5/examples/gpt-5/gpt-5-1_prompting_guide.ipynb`
3. **GPT-5 Prompting:** `/Users/mitchkiriek/skaldi/gpt5/examples/gpt-5/gpt-5_prompting_guide.ipynb`
4. **Troubleshooting:** `/Users/mitchkiriek/skaldi/gpt5/examples/gpt-5/gpt-5_troubleshooting_guide.ipynb`
5. **Coding Agent:** `/Users/mitchkiriek/skaldi/gpt5/examples/Build_a_coding_agent_with_GPT-5.1.ipynb`

---

**Готово! Теперь у нас есть полная документация OpenAI по GPT-5/5.1.**
