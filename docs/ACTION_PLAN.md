# Skaldi Writer: Action Plan для команды

**Дата:** 2025-11-17  
**Цель:** Исправить генерацию документов и построить полноценный pipeline

---

## Текущая проблема

Сгенерированные документы содержат placeholder'ы вместо реальных данных:
- "[Insert Sponsor Name]"
- "Investigational Compound"
- Нет использования данных из PubMed, ClinicalTrials.gov, openFDA

**Пример из базы:**
```
Compound: Investigational Compound  ❌
Sponsor: [Insert Sponsor Name]      ❌
```

**Должно быть:**
```
Compound: Natalizumab               ✅
Sponsor: Biogen Inc.                ✅
```

---

## План действий (7 недель)

### Week 1-2: Фикс генерации документов

**Задача:** Убрать все placeholder'ы, использовать реальные данные проекта

**Что делать:**

1. **Создать `buildProjectContext()` функцию**
   ```typescript
   // /lib/ai/context-builder.ts
   async function buildProjectContext(projectId: string) {
     return {
       project: await getProject(projectId),
       extracted_entities: await getExtractedEntities(projectId),
       similar_trials: await getSimilarTrials(projectId),
       literature: await getLiterature(projectId),
       adverse_events: await getAdverseEvents(projectId)
     }
   }
   ```

2. **Переписать промпты в `/lib/prompts/`**
   - Добавить реальные данные проекта в промпты
   - Убрать generic инструкции
   - Добавить примеры из контекста

3. **Обновить `/functions/generate-document`**
   - Использовать `buildProjectContext()`
   - Передавать контекст в промпты
   - Генерировать section-by-section

4. **Добавить валидацию**
   ```typescript
   // /lib/ai/validator.ts
   function validateDocument(doc) {
     const issues = []
     
     // Проверка на placeholder'ы
     if (doc.content.includes('[Insert')) {
       issues.push({ error: 'Contains placeholders' })
     }
     
     // Проверка использования данных проекта
     if (!doc.content.includes(project.compound_name)) {
       issues.push({ error: 'Not using project data' })
     }
     
     return { passed: issues.length === 0, issues }
   }
   ```

**Результат:** Документы генерируются с реальными данными, без placeholder'ов

---

### Week 3-4: Data Enrichment Pipeline

**Задача:** Автоматически собирать данные из внешних источников

**Что делать:**

1. **ClinicalTrials.gov API**
   ```typescript
   // /lib/api/clinicaltrials.ts
   async function fetchSimilarTrials(indication: string, compound: string) {
     const response = await fetch(
       `https://clinicaltrials.gov/api/v2/studies?` +
       `query.cond=${indication}&query.intr=${compound}&pageSize=20`
     )
     return response.json()
   }
   ```

2. **PubMed API**
   ```typescript
   // /lib/api/pubmed.ts
   async function fetchLiterature(compound: string, indication: string) {
     // 1. Search for PMIDs
     const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?` +
       `db=pubmed&term=${compound}+AND+${indication}&retmax=30&retmode=json`
     
     // 2. Fetch full articles
     const articles = await fetchPubMedArticles(pmids)
     return articles
   }
   ```

3. **openFDA API**
   ```typescript
   // /lib/api/openfda.ts
   async function fetchAdverseEvents(compound: string) {
     const response = await fetch(
       `https://api.fda.gov/drug/event.json?` +
       `search=patient.drug.medicinalproduct:"${compound}"&limit=100`
     )
     return response.json()
   }
   ```

4. **Background Job**
   ```typescript
   // /functions/enrich-project/index.ts
   export default async function enrichProject(projectId: string) {
     const project = await getProject(projectId)
     
     // Fetch from all sources
     const [trials, literature, adverseEvents] = await Promise.all([
       fetchSimilarTrials(project.indication, project.compound_name),
       fetchLiterature(project.compound_name, project.indication),
       fetchAdverseEvents(project.compound_name)
     ])
     
     // Save to database
     await saveEnrichmentData(projectId, { trials, literature, adverseEvents })
     
     // Update project status
     await updateProjectStatus(projectId, 'ready')
   }
   ```

**Результат:** При создании проекта автоматически собираются данные из 3+ источников

---

### Week 5-6: Additional Documents

**Задача:** Добавить генерацию Protocol, ICF, SAP, CSR, CRF

**Что делать:**

1. **Создать шаблоны для каждого документа**
   ```
   /lib/templates/protocol-template.ts
   /lib/templates/icf-template.ts
   /lib/templates/sap-template.ts
   /lib/templates/csr-template.ts
   /lib/templates/crf-template.ts
   ```

2. **Создать промпты для каждого типа**
   ```
   /lib/prompts/generator-protocol.ts
   /lib/prompts/generator-icf.ts
   /lib/prompts/generator-sap.ts
   /lib/prompts/generator-csr.ts
   /lib/prompts/generator-crf.ts
   ```

3. **Обновить UI**
   - Кнопки для генерации каждого типа документа
   - Статусы для каждого документа
   - Валидация для каждого типа

**Результат:** Можно генерировать все 9 типов документов

---

### Week 7: UX & Polish

**Задача:** Улучшить пользовательский опыт

**Что делать:**

1. **3-step Project Wizard**
   - Step 1: Basic Info
   - Step 2: Study Design
   - Step 3: Additional Data

2. **Project Page Tabs**
   - Overview
   - Documents
   - Data Sources
   - Files
   - Validation

3. **Document Editor**
   - Markdown editor with preview
   - Version history
   - Comments

4. **ZIP Export**
   - All documents in MD, PDF, DOCX
   - README, SOURCES.csv, VALIDATION_REPORT.pdf

**Результат:** Удобный UI для всего workflow

---

## Приоритетные задачи (начать сейчас)

### 1. Фикс промптов (1 день)
**Файлы:**
- `/lib/prompts/ib-generator.ts`
- `/lib/prompts/synopsis-generator.ts`

**Что сделать:**
```typescript
// Было:
const prompt = "Generate an Investigator's Brochure"

// Должно быть:
const prompt = `
Generate Section 5 (Pharmacology) of IB.

PROJECT:
- Compound: ${project.compound_name}
- Indication: ${project.indication}
- Sponsor: ${project.sponsor}

DATA:
${context.extracted_entities.pharmacology}

LITERATURE:
${context.literature.map(a => `- ${a.title}: ${a.abstract}`).join('\n')}

Use ONLY this data. NO placeholders.
`
```

### 2. Создать `buildProjectContext()` (1 день)
**Файл:** `/lib/ai/context-builder.ts`

**Что сделать:**
- Собрать все данные проекта в один JSON
- Использовать в промптах

### 3. Добавить валидацию (1 день)
**Файл:** `/lib/ai/validator.ts`

**Что сделать:**
- Проверка на placeholder'ы
- Проверка использования данных проекта
- Проверка обязательных секций

---

## Метрики успеха

**После Week 2:**
- ✅ 0% placeholder'ов в документах
- ✅ 100% использование данных проекта

**После Week 4:**
- ✅ Автоматическое обогащение из 3+ источников
- ✅ < 2 минут на обогащение проекта

**После Week 6:**
- ✅ Генерация всех 9 типов документов
- ✅ Прохождение ICH/GCP/FDA валидации

**После Week 7:**
- ✅ Полный workflow от создания до экспорта
- ✅ < 10 минут от создания проекта до готового IB

---

## Следующие шаги

1. **Сегодня:** Начать с фикса промптов
2. **Завтра:** Создать `buildProjectContext()`
3. **Послезавтра:** Добавить валидацию
4. **Через неделю:** Запустить enrichment pipeline

**Вопросы?** Смотри `/docs/USER_FLOW_TECHNICAL_SPEC.md` для деталей.
