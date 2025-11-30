# 🔧 План интеграции компонентов Skaldi

## Текущая проблема

Все компоненты реализованы, но **не связаны между собой**:

```
[Enrichment] → external_evidence ❌ не используется
[Knowledge Graph] → память ❌ не сохраняется  
[RAG] → пустые таблицы ❌ не загружено
[Generation] → generic templates ❌ нет контекста
```

---

## Решение: Связать все компоненты

### Шаг 1: Загрузить RAG (СЕЙЧАС)

```bash
# Запустить скрипт загрузки
npm run load-references

# Проверить результат
psql $DATABASE_URL -c "SELECT COUNT(*) FROM drug_reference_chunks;"
# Ожидается: >100 записей
```

**Что это даст:**
- AI увидит примеры из clinical_reference/
- Промпты получат контекст структуры документов

---

### Шаг 2: Сохранять Knowledge Graph в БД

#### 2.1 Миграция
```sql
-- supabase/migrations/20251124_persist_knowledge_graph.sql
CREATE TABLE IF NOT EXISTS knowledge_graphs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) UNIQUE NOT NULL,
  inn TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_kg_project ON knowledge_graphs(project_id);
CREATE INDEX idx_kg_inn ON knowledge_graphs(inn);
```

#### 2.2 Обновить Enrichment API
```typescript
// app/api/v1/enrich/route.ts

export async function POST(request: NextRequest) {
  // ... existing enrichment code ...
  
  // После успешного enrichment:
  try {
    // Build Knowledge Graph
    console.log('🧠 Building Knowledge Graph...')
    const kg = await buildKnowledgeGraph(project.compound_name)
    
    // Save to database
    await supabase
      .from('knowledge_graphs')
      .upsert({
        project_id: project.id,
        inn: project.compound_name,
        snapshot: kg
      })
    
    console.log('✅ Knowledge Graph saved')
  } catch (error) {
    console.error('❌ KG build failed:', error)
    // Don't fail enrichment if KG fails
  }
  
  return NextResponse.json({ success: true, ... })
}
```

---

### Шаг 3: Использовать KG в генерации

#### 3.1 Обновить DocumentOrchestrator
```typescript
// lib/services/document-orchestrator.ts

async generateDocument(request: OrchestrationRequest) {
  // ... existing code ...
  
  // Fetch Knowledge Graph
  const { data: kgData } = await supabase
    .from('knowledge_graphs')
    .select('snapshot')
    .eq('project_id', request.projectId)
    .single()
  
  const knowledgeGraph = kgData?.snapshot || null
  
  if (!knowledgeGraph) {
    console.warn('⚠️ No Knowledge Graph found for project')
  }
  
  // Build context WITH Knowledge Graph
  const context = this.buildContext(project, knowledgeGraph)
  
  // Generate sections
  for (const section of structure) {
    const prompt = await this.sectionGenerator.constructPrompt(
      template,
      context,
      {
        includeReferences: true,
        sectionId: section.section_id,
        documentType: request.documentType,
        knowledgeGraph  // ← НОВОЕ
      }
    )
    
    const content = await this.callAI(prompt, section.section_id)
    sections[section.section_id] = content
  }
}

// Обновить buildContext
private buildContext(project: any, knowledgeGraph: any): Record<string, any> {
  const design = project.design_json || {}
  
  return {
    compoundName: project.compound_name,
    indication: project.indication,
    disease: project.indication,
    phase: design.phase || 'Phase 3',
    studyDesign: design.study_design || 'Randomized, Double-Blind, Placebo-Controlled',
    
    // ← НОВОЕ: добавить KG данные
    knowledgeGraph: knowledgeGraph ? {
      indications: knowledgeGraph.indications?.slice(0, 5) || [],
      endpoints: knowledgeGraph.endpoints?.slice(0, 10) || [],
      procedures: knowledgeGraph.procedures?.slice(0, 10) || [],
      eligibility: knowledgeGraph.eligibilityPatterns?.slice(0, 5) || []
    } : null
  }
}
```

#### 3.2 Обновить SectionGenerator
```typescript
// lib/services/section-generator.ts

async constructPrompt(
  template: any,
  context: Record<string, any>,
  options?: {
    includeReferences?: boolean
    sectionId?: string
    documentType?: string
    knowledgeGraph?: any  // ← НОВОЕ
  }
): Promise<string> {
  let prompt = template.prompt_text || ''
  
  // 1. Replace placeholders
  prompt = prompt.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return context[key] || match
  })
  
  // 2. Add Knowledge Graph data (НОВОЕ)
  if (options?.knowledgeGraph && context.knowledgeGraph) {
    prompt += this.formatKnowledgeGraphForPrompt(context.knowledgeGraph)
  }
  
  // 3. Add RAG references (existing)
  if (options?.includeReferences !== false) {
    try {
      const retriever = new ReferenceRetriever()
      const references = await retriever.retrieveReferences({
        compoundName: context.compoundName,
        disease: context.disease || context.indication,
        sectionId: options?.sectionId,
        documentType: options?.documentType,
        topK: 5,
        minSimilarity: 0.7,
      })
      
      if (references.combined.length > 0) {
        prompt += retriever.formatReferencesForPrompt(references.combined)
      }
    } catch (error) {
      console.error('RAG retrieval failed:', error)
    }
  }
  
  return prompt
}

// Новый метод
private formatKnowledgeGraphForPrompt(kg: any): string {
  if (!kg) return ''
  
  let kgText = '\n\n**Knowledge Graph Data:**\n\n'
  
  if (kg.indications && kg.indications.length > 0) {
    kgText += '**Approved Indications:**\n'
    kg.indications.forEach((ind: any) => {
      kgText += `- ${ind.name} (confidence: ${(ind.confidence * 100).toFixed(0)}%)\n`
    })
    kgText += '\n'
  }
  
  if (kg.endpoints && kg.endpoints.length > 0) {
    kgText += '**Common Endpoints:**\n'
    kg.endpoints.forEach((ep: any) => {
      kgText += `- ${ep.name} (${ep.type})\n`
    })
    kgText += '\n'
  }
  
  if (kg.procedures && kg.procedures.length > 0) {
    kgText += '**Typical Procedures:**\n'
    kg.procedures.forEach((proc: any) => {
      kgText += `- ${proc.name}\n`
    })
    kgText += '\n'
  }
  
  if (kg.eligibility && kg.eligibility.length > 0) {
    kgText += '**Eligibility Patterns:**\n'
    kg.eligibility.forEach((elig: any) => {
      kgText += `- ${elig.criterion}\n`
    })
    kgText += '\n'
  }
  
  kgText += 'Use this data to generate specific, evidence-based content for the actual drug.\n'
  
  return kgText
}
```

---

### Шаг 4: Улучшить промпты

#### 4.1 Принципы новых промптов
```
1. Короткие (< 500 символов)
2. Директивные ("Write about ACTUAL drug")
3. Конкретные (список что включить)
4. Без сложных структур
```

#### 4.2 Пример хорошего промпта
```json
{
  "prompt_text": "Write the Pharmacokinetics section for {{compoundName}} Investigator's Brochure.

YOU ARE WRITING ABOUT THE ACTUAL DRUG {{compoundName}}, NOT A TEMPLATE.

Use real PK data from FDA label, clinical pharmacology studies, and literature.

Include:
- Absorption: bioavailability, Tmax, Cmax, food effect
- Distribution: Vd, protein binding
- Metabolism: CYP enzymes, metabolites
- Excretion: half-life, clearance
- Special populations: renal/hepatic impairment

Format in Markdown with ## headings. Include specific values with units."
}
```

---

### Шаг 5: Улучшить валидацию

#### 5.1 Добавить проверки использования enrichment
```typescript
// lib/services/qc-validator.ts

async validate(
  documentType: string,
  sections: Record<string, string>,
  projectId?: string  // ← НОВОЕ
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = []
  
  // Existing checks
  // ...
  
  // NEW: Check enrichment data usage
  if (projectId) {
    const enrichmentIssues = await this.validateEnrichmentUsage(
      sections,
      projectId
    )
    issues.push(...enrichmentIssues)
  }
  
  return {
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues
  }
}

private async validateEnrichmentUsage(
  sections: Record<string, string>,
  projectId: string
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []
  
  // Fetch enrichment data
  const supabase = await createClient()
  const { data: evidence } = await supabase
    .from('external_evidence')
    .select('*')
    .eq('project_id', projectId)
  
  if (!evidence || evidence.length === 0) {
    return issues  // No enrichment data to validate
  }
  
  // Check clinical_studies section
  if (sections.ib_clinical_studies) {
    const nctNumbers = this.extractNCTNumbers(sections.ib_clinical_studies)
    const trials = evidence.filter(e => e.source === 'clinicaltrials')
    
    if (trials.length > 0 && nctNumbers.length === 0) {
      issues.push({
        section_id: 'ib_clinical_studies',
        rule_id: 'missing_trial_references',
        severity: 'error',
        message: `Found ${trials.length} trials in enrichment data but none referenced in document. Expected NCT numbers.`
      })
    }
  }
  
  // Check safety section
  if (sections.ib_safety) {
    const fdaData = evidence.filter(e => e.source === 'openfda')
    if (fdaData.length > 0) {
      const hasFdaReference = sections.ib_safety.toLowerCase().includes('fda')
      if (!hasFdaReference) {
        issues.push({
          section_id: 'ib_safety',
          rule_id: 'missing_fda_reference',
          severity: 'warning',
          message: 'FDA safety data available in enrichment but not referenced in document'
        })
      }
    }
  }
  
  return issues
}

private extractNCTNumbers(text: string): string[] {
  const nctPattern = /NCT\d{8}/g
  return text.match(nctPattern) || []
}
```

#### 5.2 Обновить вызов валидации
```typescript
// lib/services/document-orchestrator.ts

async generateDocument(request: OrchestrationRequest) {
  // ... generation code ...
  
  // Run QC validation WITH project ID
  const validationResult = await this.qcValidator.validate(
    request.documentType,
    sections,
    request.projectId  // ← НОВОЕ
  )
  
  return {
    success: errors.length === 0 && validationResult.passed,
    documentId: document.id,
    sections,
    errors,
    validation: validationResult,
    duration_ms: duration
  }
}
```

---

## Порядок внедрения

### Сессия 1 (2-3 часа) - СЕГОДНЯ
1. ✅ Загрузить RAG (`npm run load-references`)
2. ✅ Создать миграцию для knowledge_graphs
3. ✅ Обновить Enrichment API (сохранять KG)
4. ✅ Тестировать: Enrich → проверить KG в БД

### Сессия 2 (2-3 часа) - СЕГОДНЯ/ЗАВТРА
5. ✅ Обновить DocumentOrchestrator (читать KG)
6. ✅ Обновить SectionGenerator (форматировать KG)
7. ✅ Исправить все промпты
8. ✅ Тестировать: Generate IB → проверить контент

### Сессия 3 (1-2 часа) - ЗАВТРА
9. ✅ Добавить enrichment валидацию
10. ✅ End-to-end тест
11. ✅ Документация

---

## Ожидаемый результат

После внедрения:

```
Пользователь → МНН + дизайн
    ↓
Enrichment → external_evidence + knowledge_graphs ✅
    ↓
Generation → читает KG + RAG + enrichment ✅
    ↓
AI генерирует: "Sitagliptin is a DPP-4 inhibitor... NCT00123456..." ✅
    ↓
Validation → проверяет использование enrichment ✅
    ↓
Документ готов ✅
```

**Качество документов:** 80-90% готовности к подаче  
**Время генерации:** 3-5 минут  
**Использование данных:** 100% enrichment + KG + RAG
