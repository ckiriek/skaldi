# 🏥 Asetria Writer - AI-Powered Regulatory Documentation Platform

**Next-generation platform for automated regulatory document generation**

Asetria Writer - AI-платформа для автоматизации подготовки регуляторной документации с использованием multi-agent architecture и template-based generation.

**Миссия**: Сократить цикл подготовки документов с недель до часов при сохранении качества и regulatory compliance.

## 🎉 Latest Achievement: Backend Complete (Nov 11, 2025)

**Status:** ✅ 85% PILOT READY  
**Progress:** Backend infrastructure 95% complete  
**Timeline:** Ready for integration testing

### Session Highlights:
- ✅ Workflow Orchestration (4 tables, state machine)
- ✅ Versioning System (3 tables, diff tracking)
- ✅ Error Handling (standardized format)
- ✅ Evidence Locker (2 tables, [EV-XX] system)
- ✅ Workflow Executor (6 agents)
- ✅ 16 API Endpoints
- ✅ 3 Core UI Components
- ✅ ~10,000 lines of code total

[📊 View System Overview](./docs/SYSTEM_OVERVIEW.md)

## ✨ Основные возможности

### 📄 Генерация документов (AI-powered)
- **Investigator's Brochure (IB)** - ICH E6 (R2) compliant
- **Clinical Trial Protocol** - ICH E6 Section 6
- **Informed Consent Form (ICF)** - FDA 21 CFR Part 50
- **Study Synopsis** - ICH E3 Section 2

### 🤖 Multi-Agent Architecture & Data Sources

**6 Intelligent Agents:**
1. **RegData Agent** ✅ - Multi-source data enrichment (10 min timeout)
2. **Composer Agent** ✅ - Template selection and structure generation (5 min)
3. **Writer Agent** ⏳ - Content generation and refinement (30 min) - TODO
4. **Validator Agent** ✅ - ICH/FDA compliance checking (5 min)
5. **Assembler Agent** ✅ - Document assembly and TOC (5 min)
6. **Export Agent** ✅ - PDF/DOCX generation (5 min)

**6 Data Sources (All Critical Complete!):**
- ✅ **PubChem** - Chemical structure, InChIKey resolution
- ✅ **openFDA** - FDA labels, FAERS adverse events
- ✅ **Orange Book** - RLD identification, TE codes
- ✅ **DailyMed** - Current FDA labels (daily updates)
- ✅ **ClinicalTrials.gov** - Clinical trial data
- ✅ **PubMed** - Scientific literature, citations

### 📁 Управление файлами
- Drag & drop загрузка (PDF, DOCX, TXT, CSV)
- Автоматический парсинг контента
- AI entity extraction (10 типов)
- Supabase Storage (50MB limit)

### 📊 Экспорт
- **DOCX** - редактируемый Microsoft Word
- **PDF** - профессиональный формат для распространения
- One-click download

### 🎨 UI/UX
- Markdown viewer с Table of Contents
- Scroll spy navigation
- Syntax highlighting
- Responsive design

### 🔒 Безопасность & Compliance
- Row Level Security (RLS)
- Audit trail для всех действий
- Version control
- ICH/FDA guidelines compliance

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI**: Azure OpenAI GPT-4
- **APIs**: ClinicalTrials.gov, PubMed, openFDA
- **Export**: docx, html-pdf-node, marked
- **Deployment**: Vercel

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/yourusername/asetria.git
cd asetria

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

## 🔧 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=your_azure_endpoint
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
```

## 🚢 Deployment на Vercel

### 1. Подготовка

```bash
# Убедитесь что все изменения закоммичены
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Vercel Setup

1. Зайдите на [vercel.com](https://vercel.com)
2. Нажмите "New Project"
3. Import вашего GitHub репозитория
4. Configure project:
   - Framework: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next

### 3. Environment Variables

Добавьте в Vercel Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_API_KEY
AZURE_OPENAI_DEPLOYMENT_NAME
```

### 4. Deploy

Нажмите "Deploy" и дождитесь завершения build.

### 5. Supabase Edge Functions

```bash
# Deploy Edge Functions
npx supabase functions deploy generate-document
npx supabase functions deploy extract-entities
```

## 📖 Usage

### Создание проекта
1. Dashboard → New Project
2. Заполните: Title, Phase, Indication
3. Настройте Study Design

### Загрузка данных
1. Fetch External Data → получить данные из API
2. Upload Files → загрузить документы
3. Extract Entities → извлечь сущности AI

### Генерация документов
1. Generate Document → выбрать тип
2. Подождать 10-30 секунд
3. Просмотр в Markdown UI
4. Export DOCX/PDF

## 🧪 Testing

```bash
# Run tests
npm test

# Run specific test suite
npx tsx scripts/test-stages.ts
```

## 📊 Project Structure

```
asetria/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Dashboard pages
│   ├── api/              # API routes
│   └── auth/             # Auth pages
├── components/            # React components
├── lib/                   # Utilities
│   ├── prompts/          # AI prompts
│   ├── integrations/     # External APIs
│   └── export/           # Export utilities
├── supabase/
│   └── functions/        # Edge Functions
└── public/               # Static assets
```

## 🎯 MVP Features (Completed)

✅ AI-powered document generation (4 types)  
✅ External API integrations (3 sources)  
✅ File upload & storage  
✅ Entity extraction  
✅ DOCX/PDF export  
✅ Markdown UI with TOC  
✅ Audit trail  
✅ Version control  

## 🔄 Roadmap

### Phase 2
- [ ] Advanced entity extraction (NER)
- [ ] Real-time collaboration
- [ ] Template customization
- [ ] Batch operations

### Phase 3
- [ ] Knowledge Graph
- [ ] Terminology validation
- [ ] Multi-language support
- [ ] Mobile app

## 📝 License

Proprietary - All rights reserved

## 👥 Team

Built with ❤️ by Asetria team

## 📞 Support

For questions and support: support@asetria.com
