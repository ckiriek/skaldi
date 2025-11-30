# ✅ RAG Архитектура исправлена

## Проблема (было):
```
RAG → Ищет референсы по compound_name="Sitagliptin"
    → Находит только примеры про Sitagliptin
    → Работает только для Sitagliptin ❌
```

## Решение (стало):
```
RAG → Ищет структурные примеры (ЛЮБЫЕ IB/Protocol/CSR)
    → Показывает AI КАК форматировать
    → Knowledge Graph → Дает данные о КОНКРЕТНОМ препарате
    → Работает для ЛЮБОГО препарата ✅
```

---

## Что изменено:

### 1. `scripts/load-references.ts`
```typescript
// БЫЛО:
compound_name: extractCompoundName(file)  // "Sitagliptin"

// СТАЛО:
compound_name: 'STRUCTURE_EXAMPLE',  // Универсальный маркер
metadata: {
  purpose: 'structure_example',
  usage: 'Show AI section structure, formatting, length, and style'
}
```

**Результат:** Все референсы загружаются как универсальные примеры структуры.

---

### 2. `lib/services/reference-retriever.ts`

#### retrieveDrugReferences()
```typescript
// БЫЛО:
const queryText = `${compoundName} ${sectionId}`
filteredData = data.filter(row => row.compound_name === compoundName)  // ❌

// СТАЛО:
const queryText = `${documentType} ${sectionId} structure example formatting`
filteredData = data.filter(row => 
  row.compound_name === 'STRUCTURE_EXAMPLE' ||  // ✅
  row.metadata?.purpose === 'structure_example'
)
```

#### retrieveReferences()
```typescript
// БЫЛО:
params.compoundName ? this.retrieveDrugReferences(params) : []  // ❌

// СТАЛО:
this.retrieveDrugReferences(params)  // ВСЕГДА получаем примеры ✅
```

#### formatReferencesForPrompt()
```typescript
// БЫЛО:
**Reference Material:**
[1] clinical_reference: ...

// СТАЛО:
**STRUCTURE REFERENCE EXAMPLES:**
(Use these to understand formatting, length, and organization - NOT for copying data)

**Example 1** (from bcd-089_IB.md):
## 4.2 Pharmacokinetics
...
```

**Результат:** RAG возвращает структурные примеры для ЛЮБОГО препарата.

---

### 3. `lib/services/section-generator.ts`

#### constructPrompt()
```typescript
// Новая архитектура промпта:

1. Template prompt_text
   "Write Pharmacokinetics for {{compoundName}}..."

2. STRUCTURE EXAMPLES (из RAG)
   **STRUCTURE REFERENCE EXAMPLES:**
   **Example 1** (from bcd-089_IB.md):
   ## 4.2 Pharmacokinetics
   Absorption: ...
   [2-3 pages]

3. KNOWLEDGE GRAPH DATA (для конкретного препарата)
   **KNOWLEDGE GRAPH DATA FOR Metformin:**
   - Indications: Type 2 Diabetes (95%)
   - Endpoints: HbA1c reduction, FPG reduction
   - Procedures: Oral administration, BID dosing

4. CRITICAL INSTRUCTION:
   Write about the ACTUAL compound Metformin.
   - Use STRUCTURE from examples (formatting, length)
   - Use ACTUAL DATA for Metformin from Knowledge Graph
   - DO NOT copy data from examples
```

**Результат:** AI понимает разницу между структурой и данными.

---

## Как это работает:

### Пример: Генерация IB для Metformin

```
1. User создает проект: Metformin, Type 2 Diabetes

2. Enrichment собирает данные:
   - ClinicalTrials.gov → 500+ trials
   - OpenFDA → Label data
   - PubMed → Publications

3. Knowledge Graph строится:
   {
     inn: "Metformin",
     indications: ["Type 2 Diabetes", "PCOS"],
     endpoints: ["HbA1c reduction", "FPG reduction"],
     procedures: ["Oral administration", "BID dosing"]
   }

4. Generation вызывает section-generator:
   
   a) RAG ищет структурные примеры:
      Query: "IB pharmacokinetics section structure example"
      Finds: bcd-089_IB.md → ## 4.2 Pharmacokinetics
      
   b) Промпт собирается:
      - Template: "Write PK for {{compoundName}}"
      - Structure: [пример из bcd-089_IB.md]
      - KG Data: [данные о Metformin]
      - Instruction: "Write about ACTUAL Metformin"
   
   c) AI генерирует:
      ## 4.2 Pharmacokinetics
      
      Metformin is rapidly absorbed following oral administration.
      Peak plasma concentrations (Cmax) are achieved within 2-3 hours.
      Absolute bioavailability is approximately 50-60%.
      
      [Использует структуру из примера, но данные о Metformin]

5. Результат: Документ про Metformin с правильной структурой ✅
```

---

## Преимущества:

### ✅ Универсальность
- Работает для ЛЮБОГО препарата (Metformin, Sitagliptin, Aspirin, etc)
- Не нужно загружать референсы для каждого препарата

### ✅ Качество структуры
- AI видит примеры правильного форматирования
- Понимает ожидаемую длину и стиль
- Следует регуляторным стандартам

### ✅ Актуальные данные
- Данные о препарате из Knowledge Graph (свежие)
- Не копирует устаревшие данные из примеров

### ✅ Масштабируемость
- 14 файлов в clinical_reference/ → 100+ структурных примеров
- Покрывают все типы документов (IB, Protocol, CSR, ICF)
- Один раз загрузили → работает для всех препаратов

---

## Следующие шаги:

1. ✅ Загрузить RAG: `npm run load-references`
2. ⏳ Создать таблицу knowledge_graphs
3. ⏳ Обновить Enrichment API (сохранять KG)
4. ⏳ Обновить DocumentOrchestrator (использовать KG)
5. ⏳ Тестировать на разных препаратах

После этого система будет генерировать качественные документы для ЛЮБОГО препарата!
