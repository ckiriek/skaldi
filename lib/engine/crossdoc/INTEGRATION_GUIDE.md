# 🔗 Cross-Document Intelligence - Integration Guide

## ✅ Quick Start (DONE!)

Минимальная интеграция уже выполнена:

### 1. Dashboard Tab Integration ✅

**Файл**: `/app/dashboard/projects/[id]/page.tsx`

**Что добавлено**:
```typescript
import { CrossDocPanel } from '@/components/crossdoc'

// В Tabs:
<TabsTrigger value="crossdoc" className="flex-1">Cross-Document</TabsTrigger>

// В TabsContent:
<TabsContent value="crossdoc">
  <CrossDocPanel
    projectId={project.id}
    documentIds={{
      ibId: documents?.find(d => d.type === 'IB')?.id,
      protocolId: documents?.find(d => d.type === 'Protocol')?.id,
      icfId: documents?.find(d => d.type === 'ICF')?.id,
      sapId: documents?.find(d => d.type === 'SAP')?.id,
      csrId: documents?.find(d => d.type === 'CSR')?.id,
    }}
  />
</TabsContent>
```

**Результат**:
- ✅ Новая вкладка "Cross-Document" в проекте
- ✅ Автоматически находит все документы проекта
- ✅ Готово к использованию!

---

## 🚀 Как использовать

### Для пользователя:

1. Открыть проект
2. Перейти на вкладку "Cross-Document"
3. Нажать "Run Validation"
4. Просмотреть найденные issues
5. (Опционально) Выбрать auto-fixable issues
6. Нажать "Apply Fixes"
7. Re-validate для проверки

### Требования:
- Минимум 2 документа в проекте
- Документы должны быть сгенерированы

---

## 📋 Дополнительные Интеграции (Опционально)

### Option 1: Post-Generation Validation

**Цель**: Автоматически проверять после генерации каждого документа

**Файл**: `/app/api/documents/generate/route.ts`

```typescript
// После успешной генерации документа
if (generatedDocument) {
  // Получить все документы проекта
  const { data: allDocs } = await supabase
    .from('documents')
    .select('id, type')
    .eq('project_id', projectId)
  
  // Если есть минимум 2 документа, запустить валидацию
  if (allDocs && allDocs.length >= 2) {
    try {
      const validationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/crossdoc/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ibId: allDocs.find(d => d.type === 'IB')?.id,
          protocolId: allDocs.find(d => d.type === 'Protocol')?.id,
          sapId: allDocs.find(d => d.type === 'SAP')?.id,
          icfId: allDocs.find(d => d.type === 'ICF')?.id,
          csrId: allDocs.find(d => d.type === 'CSR')?.id,
        }),
      })
      
      const validation = await validationResponse.json()
      
      // Сохранить результаты (опционально)
      if (validation.summary.critical > 0) {
        console.warn(`⚠️ ${validation.summary.critical} critical cross-document issues detected`)
      }
    } catch (error) {
      console.error('Cross-doc validation failed:', error)
    }
  }
}
```

**Преимущества**:
- Проактивное обнаружение проблем
- Пользователь сразу видит несоответствия
- Не блокирует генерацию

---

### Option 2: Pre-Generation Data Alignment

**Цель**: Использовать alignment для pre-fill данных при генерации

**Пример**: При генерации SAP, взять endpoints из Protocol

```typescript
// В генераторе SAP
import { loadProtocolForCrossDoc } from '@/lib/engine/crossdoc/loaders'

async function generateSAP(projectId: string) {
  // Загрузить Protocol
  const { data: protocolDoc } = await supabase
    .from('documents')
    .select('id')
    .eq('project_id', projectId)
    .eq('type', 'Protocol')
    .single()
  
  if (protocolDoc) {
    const protocolData = await loadProtocolForCrossDoc(protocolDoc.id)
    
    // Pre-fill SAP с данными из Protocol
    const sapPrompt = `
      Generate Statistical Analysis Plan with:
      
      Primary Endpoints:
      ${protocolData.endpoints
        .filter(ep => ep.type === 'primary')
        .map(ep => `- ${ep.name}: ${ep.description}`)
        .join('\n')}
      
      Secondary Endpoints:
      ${protocolData.endpoints
        .filter(ep => ep.type === 'secondary')
        .map(ep => `- ${ep.name}: ${ep.description}`)
        .join('\n')}
      
      Analysis Populations: ${protocolData.analysisPopulations?.join(', ')}
    `
    
    // Генерация с pre-filled данными
    const sap = await generateDocument(sapPrompt)
  }
}
```

**Преимущества**:
- Автоматическое согласование данных
- Меньше ошибок
- Экономия времени

---

### Option 3: Validation History

**Цель**: Сохранять историю валидаций

**Миграция**:
```sql
CREATE TABLE crossdoc_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  issues JSONB NOT NULL,
  summary JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crossdoc_project ON crossdoc_validations(project_id);
CREATE INDEX idx_crossdoc_created ON crossdoc_validations(created_at DESC);
```

**Сохранение результатов**:
```typescript
// В CrossDocPanel после валидации
const saveValidation = async (result: CrossDocValidationResult) => {
  await supabase.from('crossdoc_validations').insert({
    project_id: projectId,
    issues: result.issues,
    summary: result.summary,
    metadata: {
      documents_validated: Object.keys(documentIds).filter(k => documentIds[k]).length,
      timestamp: new Date().toISOString(),
    },
  })
}
```

**Компонент истории**:
```typescript
// components/crossdoc/ValidationHistory.tsx
export function ValidationHistory({ projectId }: { projectId: string }) {
  const [history, setHistory] = useState([])
  
  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('crossdoc_validations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      setHistory(data || [])
    }
    
    fetchHistory()
  }, [projectId])
  
  return (
    <div className="space-y-2">
      {history.map(validation => (
        <Card key={validation.id}>
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <span>{new Date(validation.created_at).toLocaleString()}</span>
              <Badge>{validation.summary.total} issues</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

---

### Option 4: Email Notifications

**Цель**: Уведомлять о critical issues

```typescript
// lib/email/crossdoc-alerts.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendCrossDocAlert(
  userEmail: string,
  projectName: string,
  criticalIssues: number
) {
  await resend.emails.send({
    from: 'Skaldi <alerts@skaldi.co>',
    to: userEmail,
    subject: `⚠️ Critical Cross-Document Issues in ${projectName}`,
    html: `
      <h2>Cross-Document Validation Alert</h2>
      <p>Found <strong>${criticalIssues} critical issues</strong> in project ${projectName}.</p>
      <p>Please review and fix these issues before proceeding.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/projects/${projectId}?tab=crossdoc">
        View Issues
      </a>
    `,
  })
}
```

**Использование**:
```typescript
// После валидации
if (result.summary.critical > 0) {
  await sendCrossDocAlert(
    user.email,
    project.title,
    result.summary.critical
  )
}
```

---

## 🧪 Тестирование

### Manual Testing:

1. Создать проект с несколькими документами
2. Открыть вкладку "Cross-Document"
3. Запустить валидацию
4. Проверить фильтры
5. Применить auto-fix
6. Re-validate

### Automated Testing:

```bash
# Unit tests
npm test -- crossdoc/alignment
npm test -- crossdoc/rules

# API tests
npm test -- api/crossdoc

# E2E tests
npx playwright test crossdoc
```

---

## 📊 Monitoring

### Metrics to Track:

1. **Validation Frequency**: Сколько раз запускается валидация
2. **Issue Distribution**: Распределение по severity
3. **Auto-fix Success Rate**: % успешных auto-fix
4. **Performance**: Время валидации

### Logging:

```typescript
// В API endpoints
console.log('[CrossDoc] Validation started', {
  projectId,
  documentCount: Object.values(documentIds).filter(Boolean).length,
})

console.log('[CrossDoc] Validation complete', {
  projectId,
  duration: Date.now() - startTime,
  issuesFound: result.summary.total,
  critical: result.summary.critical,
})
```

---

## 🎯 Best Practices

1. **Run validation after each document generation**
2. **Fix critical issues before generating next document**
3. **Use auto-fix for simple issues**
4. **Manual review for complex issues**
5. **Keep validation history for audit trail**
6. **Monitor performance and optimize if needed**

---

## 🔧 Troubleshooting

### Issue: "At least 2 documents required"
**Solution**: Generate at least 2 documents before running validation

### Issue: Validation takes too long
**Solution**: Check document sizes, optimize loaders

### Issue: Auto-fix not working
**Solution**: Check that issue has `autoFixable: true` in suggestions

### Issue: No issues found but documents are misaligned
**Solution**: Check that loaders are extracting data correctly

---

## 📚 Resources

- **Types**: `/lib/engine/crossdoc/types.ts`
- **Rules**: `/lib/engine/crossdoc/rules/`
- **Tests**: `/__tests__/unit/crossdoc/`
- **Complete Guide**: `/lib/engine/crossdoc/PHASE_F_COMPLETE.md`

---

## ✅ Integration Checklist

- [x] Dashboard tab added
- [x] CrossDocPanel component integrated
- [x] Document IDs passed correctly
- [ ] (Optional) Post-generation validation
- [ ] (Optional) Pre-generation alignment
- [ ] (Optional) Validation history
- [ ] (Optional) Email notifications
- [ ] (Optional) Monitoring & logging

---

## 🎉 Ready to Use!

Cross-Document Intelligence is now integrated and ready for production use! 🚀

Users can:
- ✅ Validate document consistency
- ✅ Filter and review issues
- ✅ Apply automatic fixes
- ✅ Track validation history (if implemented)

**Next Steps**: Test with real projects and gather user feedback! 💪
