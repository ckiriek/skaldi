# 🚀 Vercel Setup для Asetria

## ✅ Проект подключен

**Project ID**: `prj_CWUq9EbaRnmcojybijZFUhRqVBdJ`

**GitHub Repo**: https://github.com/ckiriek/asetria

---

## 📋 Environment Variables

Добавь следующие переменные в Vercel Dashboard:

### 1. Зайди в настройки
https://vercel.com/ckiriek/asetria/settings/environment-variables

### 2. Добавь переменные

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL
Value: https://qtlpjxjlwrjindgybsfd.supabase.co
Environments: Production, Preview, Development
```

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: [твой anon key из Supabase Dashboard]
Environments: Production, Preview, Development
```

#### Azure OpenAI
```
AZURE_OPENAI_ENDPOINT
Value: https://skillsy-east-ai.openai.azure.com/
Environments: Production, Preview, Development
```

```
AZURE_OPENAI_API_KEY
Value: [твой Azure OpenAI API key]
Environments: Production, Preview, Development
```

```
AZURE_OPENAI_DEPLOYMENT_NAME
Value: gpt-4.1
Environments: Production, Preview, Development
```

```
AZURE_OPENAI_API_VERSION
Value: 2025-01-01-preview
Environments: Production, Preview, Development
```

---

## 🚀 Deploy

### Автоматический deploy
Vercel автоматически deploy'ит при каждом push в `main` branch.

### Ручной deploy
```bash
vercel --prod
```

---

## ✅ Checklist

После добавления environment variables:

1. [ ] Все 6 переменных добавлены
2. [ ] Выбраны все environments (Production, Preview, Development)
3. [ ] Нажата кнопка "Save"
4. [ ] Запущен redeploy (Settings → Deployments → последний deploy → "Redeploy")

---

## 🔗 Полезные ссылки

- **Dashboard**: https://vercel.com/ckiriek/asetria
- **Deployments**: https://vercel.com/ckiriek/asetria/deployments
- **Settings**: https://vercel.com/ckiriek/asetria/settings
- **Environment Variables**: https://vercel.com/ckiriek/asetria/settings/environment-variables
- **Domains**: https://vercel.com/ckiriek/asetria/settings/domains

---

## 📊 После deploy

### Проверь:
1. ✅ Build успешный
2. ✅ Production URL работает
3. ✅ Auth работает
4. ✅ Document generation работает
5. ✅ File upload работает
6. ✅ Export DOCX/PDF работает

### Production URL:
https://asetria-ckiriek.vercel.app (или твой custom domain)

---

## 🎉 Ready to Launch!

После добавления environment variables и успешного deploy - **MVP в production!** 🚀
