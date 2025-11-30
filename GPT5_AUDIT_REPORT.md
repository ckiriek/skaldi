# 🔍 Аудит использования GPT-5.1 в Skaldi

**Дата:** 24 ноября 2025  
**Модель:** `gpt-5.1` (Azure OpenAI)  
**API Version:** `2025-01-01-preview`

---

## 📊 Резюме

### ✅ Что правильно:
- Используем `gpt-5.1` везде
- В большинстве мест убрали `temperature`
- Используем `max_completion_tokens` (правильно для reasoning models)

### ❌ Что нужно исправить:
- **7 файлов** все еще используют `temperature` (ОШИБКА!)
- **2 файла** используют устаревший `max_tokens` вместо `max_completion_tokens`
- **1 файл** использует неподдерживаемые параметры (`top_p`, `frequency_penalty`, `presence_penalty`)

---

## 🚨 Критические проблемы

### 1. Temperature НЕ поддерживается в GPT-5.1!

**Официальная документация Microsoft:**
> The following are currently unsupported with reasoning models:
> - `temperature`, `top_p`, `presence_penalty`, `frequency_penalty`, `logprobs`, `top_logprobs`, `logit_bias`, `max_tokens`

**Источник:** [Azure OpenAI Reasoning Models Documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/reasoning?view=foundry-classic)

**Что происходит при использовании:**
```
Error code: 400
{
  "error": {
    "message": "Unsupported value: 'temperature' does not support 0.2 with this model. Only the default (1) value is supported.",
    "type": "invalid_request_error",
    "param": "temperature"
  }
}
```

---

## 📁 Файлы с ошибками

### ❌ КРИТИЧНО: Используют `temperature`

#### 1. `lib/engine/protocol-ui/azure_completion.ts`
**Строка:** 51  
**Проблема:**
```typescript
temperature: 0.7,
top_p: 0.95,
frequency_penalty: 0,
presence_penalty: 0,
```

**Исправление:**
```typescript
// Удалить все эти параметры - GPT-5.1 не поддерживает
```

---

#### 2. `lib/agents/writer.ts`
**Строка:** 213  
**Проблема:**
```typescript
temperature: 0.3, // Low temperature for consistency
max_tokens: 4000,
top_p: 0.95,
frequency_penalty: 0,
presence_penalty: 0,
```

**Исправление:**
```typescript
max_completion_tokens: 4000,
// Удалить temperature, top_p, frequency_penalty, presence_penalty
```

---

#### 3. `lib/integrations/azure-openai.ts`
**Строки:** 68-72  
**Проблема:**
```typescript
temperature: options.temperature ?? 0.7,
max_tokens: options.maxTokens ?? 4000,
top_p: options.topP ?? 0.95,
frequency_penalty: options.frequencyPenalty ?? 0,
presence_penalty: options.presencePenalty ?? 0,
```

**Исправление:**
```typescript
max_completion_tokens: options.maxTokens ?? 4000,
// Удалить все остальные параметры
```

**Также исправить:**
```typescript
// Строка 138
temperature: 0.3, // ❌ Удалить
```

---

#### 4. `scripts/test-rag-generation.ts`
**Строки:** 61, 113, 160  
**Проблема:**
```typescript
temperature: 0.7
```

**Исправление:**
```typescript
// Удалить параметр temperature
```

---

#### 5. `scripts/test-simple-generation.ts`
**Строка:** 41  
**Проблема:**
```typescript
temperature: 0.7
```

**Исправление:**
```typescript
// Удалить параметр temperature
```

---

### ⚠️ ВАЖНО: Используют устаревший `max_tokens`

#### 6. `lib/engine/protocol-ui/azure_completion.ts`
**Строка:** 50  
**Проблема:**
```typescript
max_tokens: maxTokens,
```

**Исправление:**
```typescript
max_completion_tokens: maxTokens,
```

---

#### 7. `lib/agents/writer.ts`
**Строка:** 214  
**Проблема:**
```typescript
max_tokens: 4000,
```

**Исправление:**
```typescript
max_completion_tokens: 4000,
```

---

## ✅ Правильные примеры

### 1. `supabase/functions/generate-section/index.ts`
```typescript
// ✅ Правильно - нет temperature, нет max_tokens
messages: [
  {
    role: 'system',
    content: systemPrompt
  },
  {
    role: 'user',
    content: prompt
  }
],
// Нет параметров - используются дефолтные значения GPT-5.1
```

---

### 2. `lib/services/document-orchestrator.ts`
```typescript
// ✅ Правильно - temperature явно удален с комментарием
body: {
  prompt,
  sectionId,
  documentType: this.currentDocumentType || 'Protocol',
  maxTokens,
  // temperature removed - gpt-5.1 only supports default value
},
```

---

### 3. `engine/suggestions/index.ts`
```typescript
// ✅ Правильно - использует max_completion_tokens
max_completion_tokens: 1000
```

---

## 📋 Рекомендации OpenAI/Microsoft

### Для GPT-5.1 (reasoning model):

#### ✅ ПОДДЕРЖИВАЕТСЯ:
- `max_completion_tokens` (вместо `max_tokens`)
- `messages` (system, user, assistant)
- `reasoning_effort` (minimal, low, medium, high)
- `verbosity` (low, medium, high)
- `preamble`
- `tool_choice`
- `stream`
- `response_format`

#### ❌ НЕ ПОДДЕРЖИВАЕТСЯ:
- `temperature` ❌
- `top_p` ❌
- `presence_penalty` ❌
- `frequency_penalty` ❌
- `logprobs` ❌
- `top_logprobs` ❌
- `logit_bias` ❌
- `max_tokens` ❌ (используй `max_completion_tokens`)

---

## 🔧 План исправлений

### Приоритет 1: КРИТИЧНО (ломает API)

1. **Удалить `temperature` из всех файлов:**
   - `lib/engine/protocol-ui/azure_completion.ts`
   - `lib/agents/writer.ts`
   - `lib/integrations/azure-openai.ts`
   - `scripts/test-rag-generation.ts`
   - `scripts/test-simple-generation.ts`

2. **Удалить другие неподдерживаемые параметры:**
   - `top_p`
   - `frequency_penalty`
   - `presence_penalty`

### Приоритет 2: ВАЖНО (deprecated)

3. **Заменить `max_tokens` на `max_completion_tokens`:**
   - `lib/engine/protocol-ui/azure_completion.ts`
   - `lib/agents/writer.ts`
   - `lib/integrations/azure-openai.ts`

### Приоритет 3: УЛУЧШЕНИЯ

4. **Рассмотреть использование новых параметров GPT-5.1:**
   - `reasoning_effort` - контроль глубины рассуждений
   - `verbosity` - контроль детальности ответа
   - `preamble` - инструкции перед основным промптом

---

## 💡 Новые возможности GPT-5.1

### 1. `reasoning_effort`
Контролирует глубину рассуждений модели:
- `minimal` - быстрые ответы
- `low` - базовые рассуждения
- `medium` - стандартные рассуждения (дефолт)
- `high` - глубокие рассуждения

**Пример использования:**
```typescript
{
  model: "gpt-5.1",
  messages: [...],
  reasoning_effort: "high", // Для сложных клинических документов
  max_completion_tokens: 8000
}
```

---

### 2. `verbosity`
Контролирует детальность reasoning summary:
- `low` - краткое резюме
- `medium` - стандартное (дефолт)
- `high` - подробное

**Пример:**
```typescript
{
  model: "gpt-5.1",
  messages: [...],
  verbosity: "high", // Для аудита и QC
  max_completion_tokens: 8000
}
```

---

### 3. `preamble`
Инструкции которые модель видит перед основным промптом:
```typescript
{
  model: "gpt-5.1",
  messages: [
    {
      role: "developer",
      content: "You are a clinical documentation expert..."
    },
    {
      role: "user",
      content: "Write the Pharmacokinetics section..."
    }
  ],
  preamble: "Focus on regulatory compliance and ICH-GCP guidelines.",
  max_completion_tokens: 8000
}
```

---

## 📊 Сравнение: Было vs Должно быть

### ❌ БЫЛО (неправильно):
```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'api-key': apiKey,
  },
  body: JSON.stringify({
    messages: [...],
    temperature: 0.7,           // ❌ Не поддерживается
    max_tokens: 4000,           // ❌ Устарело
    top_p: 0.95,                // ❌ Не поддерживается
    frequency_penalty: 0,       // ❌ Не поддерживается
    presence_penalty: 0,        // ❌ Не поддерживается
  }),
})
```

### ✅ ДОЛЖНО БЫТЬ (правильно):
```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'api-key': apiKey,
  },
  body: JSON.stringify({
    messages: [...],
    max_completion_tokens: 4000,  // ✅ Правильно
    reasoning_effort: "medium",   // ✅ Опционально
    verbosity: "medium",          // ✅ Опционально
  }),
})
```

---

## 🎯 Итоговая статистика

### Файлы требующие исправления:

| Файл | Проблема | Приоритет |
|------|----------|-----------|
| `lib/engine/protocol-ui/azure_completion.ts` | temperature, max_tokens, top_p, penalties | 🔴 КРИТИЧНО |
| `lib/agents/writer.ts` | temperature, max_tokens, top_p, penalties | 🔴 КРИТИЧНО |
| `lib/integrations/azure-openai.ts` | temperature, max_tokens, top_p, penalties | 🔴 КРИТИЧНО |
| `scripts/test-rag-generation.ts` | temperature | 🟡 ВАЖНО |
| `scripts/test-simple-generation.ts` | temperature | 🟡 ВАЖНО |

**ИТОГО:** 5 файлов требуют исправления

---

## 🚀 Следующие шаги

1. ✅ Создать этот отчет
2. ⏳ Исправить все файлы с `temperature`
3. ⏳ Заменить `max_tokens` на `max_completion_tokens`
4. ⏳ Удалить неподдерживаемые параметры
5. ⏳ Протестировать генерацию документов
6. ⏳ Рассмотреть использование `reasoning_effort` и `verbosity`

---

## 📚 Источники

1. [Azure OpenAI Reasoning Models Documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/reasoning?view=foundry-classic)
2. [OpenAI GPT-5 Feature Guide](https://platform.openai.com/docs/guides/latest-model)
3. [OpenAI Community: Temperature in GPT-5](https://community.openai.com/t/temperature-in-gpt-5-models/1337133)
4. [OpenAI Community: GPT-5 Temperature Issues](https://community.openai.com/t/gpt-5-models-temperature/1337957)

---

**Конец отчета**
