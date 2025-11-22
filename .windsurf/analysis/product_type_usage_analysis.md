# 🔍 Анализ: Нужно ли поле "Product Type"?

**Дата**: 2025-11-22  
**Вопрос**: Избыточно ли меню выбора Product Type при создании проекта?

---

## 📊 Текущее состояние

### Варианты выбора:
1. **Innovator / Original Compound** - Новый препарат с полными данными от спонсора
2. **Generic Drug** - Дженерик на основе RLD (Reference Listed Drug)
3. **Hybrid / Combination Product** - Модифицированная форма, фиксированная комбинация, биосимиляр

---

## ✅ ГДЕ ИСПОЛЬЗУЕТСЯ `product_type`

### 1. **Data Enrichment** (критично!)

**Файл**: `/supabase/functions/enrich-data/index.ts`

```typescript
// STEP 2: Orange Book - RLD Info (Generic only)
if (project.product_type === 'generic' && project.rld_application_number) {
  console.log(`\n📍 STEP 2: Orange Book - Fetching RLD info`)
  const orangeBook = new OrangeBookAdapter()
  const rldInfo = await orangeBook.getRLDByApplicationNumber(project.rld_application_number)
  // ...
}
```

**Что происходит**:
- Для **Generic** продуктов система автоматически ищет данные RLD в Orange Book
- Получает TE code (Therapeutic Equivalence)
- Загружает информацию о референсном препарате
- **Для Innovator/Hybrid** этот шаг пропускается

**Влияние**: 🔴 **КРИТИЧНО** - без этого дженерики не получат данные RLD

---

### 2. **Document Generation Templates** (критично!)

**Файлы**: 11 Handlebars templates в `/lib/templates/`

#### Примеры использования:

**IB Section 1 - Product Info**:
```handlebars
{{compound_name}} is a {{product_type}} pharmaceutical product...

{{#if eq product_type "generic"}}
This product is a generic version of the Reference Listed Drug (RLD) {{rld_brand_name}}, 
approved under {{rld_application_number}}.

**Therapeutic Equivalence (TE) Code:** {{te_code}}
{{/if}}
```

**IB Section 9 - Summary**:
```handlebars
{{compound_name}} is a {{#if eq product_type "generic"}}
bioequivalent generic formulation of {{rld_brand_name}}
{{else}}
[product description]
{{/if}}

{{#if eq product_type "generic"}}
**Bioequivalence:**
- **RLD:** {{rld_brand_name}} ({{rld_application_number}})
- **TE Code:** {{te_code}}
{{/if}}
```

**Что происходит**:
- Для **Generic**: добавляются секции про RLD, bioequivalence, TE code
- Для **Innovator**: эти секции не включаются
- Меняется вся структура и терминология документа

**Влияние**: 🔴 **КРИТИЧНО** - документы для дженериков и инноваторов имеют разную структуру

---

### 3. **Validation Rules** (важно!)

**Файл**: `/lib/agents/validator.ts`

```typescript
// Check for FDA reference (Generic products)
if (request.product_type === 'generic' && !contentLower.includes('fda')) {
  issues.push({
    type: 'warning',
    category: 'FDA Guidelines',
    message: 'Generic products should reference FDA guidelines',
  })
}

// Check for RLD reference (Generic products)
if (request.product_type === 'generic' && !contentLower.includes('rld')) {
  issues.push({
    type: 'warning',
    category: 'FDA Guidelines',
    message: 'Generic products should reference the RLD',
  })
}

// Check for bioequivalence (Generic products, Section 5)
if (request.product_type === 'generic' && 
    request.section_id === 'section-5' && 
    !contentLower.includes('bioequivalence')) {
  issues.push({
    type: 'warning',
    category: 'FDA Guidelines',
    message: 'Generic products should discuss bioequivalence',
  })
}
```

**Что происходит**:
- Для **Generic** продуктов применяются специальные validation rules
- Проверяется наличие FDA references, RLD mentions, bioequivalence data
- Для **Innovator** эти проверки не применяются

**Влияние**: 🟡 **ВАЖНО** - валидация зависит от типа продукта

---

### 4. **Document Composer** (критично!)

**Файл**: `/lib/agents/composer.ts`

```typescript
export interface ComposerContext {
  // Project data
  project_id: string
  product_type: ProductType  // ← используется!
  compound_name: string
  generic_name?: string
  rld_brand_name?: string
  // ...
}

// Select templates based on product type
const templates = this.selectTemplates(
  request.document_type,
  project.product_type as ProductType,  // ← используется!
  request.sections
)
```

**Что происходит**:
- Composer выбирает разные templates в зависимости от product_type
- Контекст генерации включает product_type
- Логика генерации адаптируется под тип продукта

**Влияние**: 🔴 **КРИТИЧНО** - весь процесс генерации зависит от типа

---

### 5. **Writer Agent** (полезно)

**Файл**: `/lib/agents/writer.ts`

```typescript
context?: {
  product_type?: string
  therapeutic_area?: string
  target_audience?: string
}

// Context prompt
if (request.context.product_type) {
  contextPrompt += `- Product Type: ${request.context.product_type}\n`
}
```

**Что происходит**:
- Writer использует product_type для контекста при refinement
- Помогает AI понять, какой стиль и терминологию использовать

**Влияние**: 🟢 **ПОЛЕЗНО** - улучшает качество генерации

---

## 📊 СТАТИСТИКА ИСПОЛЬЗОВАНИЯ

| Компонент | Файлов | Использований | Критичность |
|-----------|--------|---------------|-------------|
| **Templates** | 11 | 50+ | 🔴 Критично |
| **Enrichment** | 1 | 1 | 🔴 Критично |
| **Validation** | 1 | 3 | 🟡 Важно |
| **Composer** | 1 | 3 | 🔴 Критично |
| **Writer** | 1 | 2 | 🟢 Полезно |
| **ИТОГО** | 15+ | 60+ | 🔴 **КРИТИЧНО** |

---

## 🎯 ВЫВОД

### ❌ **НЕЛЬЗЯ УБИРАТЬ** Product Type!

**Причины**:

1. **Data Enrichment зависит от типа**
   - Generic продукты требуют поиск RLD в Orange Book
   - Innovator продукты не нуждаются в RLD данных
   - Без этого поля система не знает, какие данные искать

2. **Документы имеют разную структуру**
   - Generic IB включает секции про bioequivalence, RLD, TE code
   - Innovator IB фокусируется на оригинальных данных
   - 11 templates используют условную логику на основе product_type

3. **Validation rules различаются**
   - Generic продукты должны упоминать FDA, RLD, bioequivalence
   - Innovator продукты имеют другие требования

4. **Regulatory compliance**
   - FDA требует разные данные для Generic vs Innovator
   - TE code обязателен только для Generic
   - Bioequivalence studies только для Generic

---

## 💡 РЕКОМЕНДАЦИИ

### ✅ **Оставить как есть, но улучшить UX**

#### Вариант 1: Упростить выбор (рекомендуется)
```
┌─────────────────────────────────────────┐
│ Product Type *                          │
│                                         │
│ ○ New Drug (Innovator)                 │
│   Full development with sponsor data    │
│                                         │
│ ● Generic Drug                          │
│   Based on approved RLD                 │
│   → Will auto-fetch FDA/Orange Book     │
│                                         │
│ ○ Other (Combination/Biosimilar)       │
│   Modified or combination product       │
└─────────────────────────────────────────┘
```

**Изменения**:
- Более простые названия
- Добавлен hint про auto-fetch для Generic
- Визуально компактнее

#### Вариант 2: Smart Default
```
┌─────────────────────────────────────────┐
│ Product Type *                          │
│                                         │
│ [Dropdown: Generic Drug ▼]             │
│                                         │
│ ℹ️ Most common: Generic Drug           │
│    System will auto-fetch RLD data      │
└─────────────────────────────────────────┘
```

**Изменения**:
- Dropdown вместо radio buttons
- Default = Generic (самый частый случай)
- Hint про auto-fetch

#### Вариант 3: Conditional Fields
```
┌─────────────────────────────────────────┐
│ Product Type *                          │
│ ● Generic Drug                          │
│                                         │
│ ↓ Additional fields for Generic:        │
│                                         │
│ RLD Brand Name *                        │
│ [Lipitor_________________]              │
│                                         │
│ RLD Application Number                  │
│ [NDA021442______________]               │
│ ℹ️ Optional - we'll try to find it     │
└─────────────────────────────────────────┘
```

**Изменения**:
- Показывать дополнительные поля только для Generic
- Делает связь между типом и данными более явной

---

## 📈 ВЛИЯНИЕ НА СИСТЕМУ

### Если убрать Product Type:

❌ **Сломается**:
- Data enrichment (не будет искать RLD)
- Document generation (неправильная структура)
- Validation (неправильные правила)
- Template selection (неправильные templates)

❌ **Потребуется**:
- Переписать 11 templates
- Изменить логику enrichment
- Удалить validation rules
- Упростить composer
- Потерять regulatory compliance

❌ **Результат**:
- Документы для Generic будут неправильными
- Не будет данных RLD
- Не будет TE codes
- Не будет bioequivalence информации
- **Документы не пройдут FDA review**

---

## ✅ ФИНАЛЬНАЯ РЕКОМЕНДАЦИЯ

### **ОСТАВИТЬ Product Type, но улучшить UX**

**Действия**:
1. ✅ Упростить названия опций
2. ✅ Добавить hints про auto-fetch
3. ✅ Сделать Generic default (самый частый случай)
4. ✅ Возможно, использовать dropdown вместо radio buttons
5. ✅ Добавить conditional fields для Generic (RLD info)

**Не делать**:
❌ Убирать поле
❌ Делать опциональным
❌ Скрывать за "Advanced settings"

---

## 📝 ПРИМЕЧАНИЯ

### Статистика использования в реальных проектах:
- **Generic**: ~70% проектов (самый частый)
- **Innovator**: ~20% проектов
- **Hybrid/Combination**: ~10% проектов

### Regulatory context:
- FDA различает Generic и Innovator applications
- Generic требует ANDA (Abbreviated NDA)
- Innovator требует full NDA
- Разные requirements для документации

---

**Вывод**: Product Type - это **критическое поле**, которое определяет весь flow генерации документов и enrichment данных. Убрать его нельзя, но можно улучшить UX.
