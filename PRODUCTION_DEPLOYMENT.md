# 🚀 PRODUCTION DEPLOYMENT PLAN

**Date:** 2025-11-21  
**Status:** Ready for Deployment  
**Target:** Vercel + Supabase

---

## 📋 Pre-Deployment Checklist

### ✅ Code Ready
- [x] Phase A: Foundation Complete
- [x] Phase B: RAG & Validation Complete
- [x] Phase C: Advanced Features Complete
- [x] Phase D: Testing Complete
- [x] All tests passing (15/15)
- [x] No critical bugs
- [x] TypeScript compiled

### ✅ Environment
- [ ] Supabase project created
- [ ] Azure OpenAI configured
- [ ] Vercel account ready
- [ ] Environment variables prepared
- [ ] Domain configured (optional)

---

## 🎯 Deployment Steps

### Step 1: Supabase Setup (15 min)

#### 1.1 Create Production Project
```bash
# Go to https://supabase.com/dashboard
# Click "New Project"
# Name: skaldi-production
# Region: Choose closest to users
# Database Password: Generate strong password
```

#### 1.2 Run Migrations
```bash
# Connect to Supabase
cd supabase

# Run all migrations in order
supabase db push

# Or manually run each migration:
# 00001_initial_schema.sql
# 00002_rls_policies.sql
# 00003_add_version_to_documents.sql
# ... (all 18 migrations)
```

#### 1.3 Create Storage Buckets
```sql
-- In Supabase SQL Editor

-- Documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Terms bucket (for MedDRA)
INSERT INTO storage.buckets (id, name, public)
VALUES ('terms', 'terms', false);
```

#### 1.4 Setup RLS Policies
```sql
-- Already in migrations, but verify:
-- Check that all tables have RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All should show rowsecurity = true
```

#### 1.5 Create Service Role Key
```bash
# In Supabase Dashboard:
# Settings > API
# Copy:
# - Project URL (NEXT_PUBLIC_SUPABASE_URL)
# - anon/public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
# - service_role key (SUPABASE_SERVICE_ROLE_KEY)
```

---

### Step 2: Azure OpenAI Setup (10 min)

#### 2.1 Verify Deployment
```bash
# Check Azure Portal
# Cognitive Services > Your OpenAI Resource
# Verify deployments:
# - gpt-5.1 (or gpt-4)
# - text-embedding-ada-002
```

#### 2.2 Get Credentials
```bash
# From Azure Portal:
# Keys and Endpoint section
# Copy:
# - Endpoint URL (AZURE_OPENAI_ENDPOINT)
# - Key 1 (AZURE_OPENAI_API_KEY)
# - Deployment name (AZURE_OPENAI_DEPLOYMENT)
# - Embedding deployment (AZURE_OPENAI_EMBEDDING_DEPLOYMENT)
```

---

### Step 3: Environment Variables (5 min)

Create `.env.production`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-5.1
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002

# External APIs (Optional)
PUBMED_API_KEY=your-pubmed-key
PUBMED_EMAIL=your-email@domain.com

# App Config
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

---

### Step 4: Vercel Deployment (10 min)

#### 4.1 Install Vercel CLI
```bash
npm install -g vercel
```

#### 4.2 Login to Vercel
```bash
vercel login
```

#### 4.3 Link Project
```bash
# In project root
vercel link

# Follow prompts:
# - Setup and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name: skaldi
# - Directory: ./
```

#### 4.4 Add Environment Variables
```bash
# Option 1: Via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add AZURE_OPENAI_ENDPOINT
vercel env add AZURE_OPENAI_API_KEY
vercel env add AZURE_OPENAI_DEPLOYMENT
vercel env add AZURE_OPENAI_EMBEDDING_DEPLOYMENT

# Option 2: Via Dashboard
# Go to vercel.com/dashboard
# Select project > Settings > Environment Variables
# Add all variables from .env.production
```

#### 4.5 Deploy
```bash
# Deploy to production
vercel --prod

# Wait for deployment...
# Note the deployment URL
```

---

### Step 5: Supabase Edge Functions (15 min)

#### 5.1 Link Supabase Project
```bash
# In project root
supabase link --project-ref your-project-ref
```

#### 5.2 Set Secrets
```bash
# Azure OpenAI secrets
supabase secrets set AZURE_OPENAI_ENDPOINT=your-endpoint
supabase secrets set AZURE_OPENAI_API_KEY=your-key
supabase secrets set AZURE_OPENAI_DEPLOYMENT=gpt-5.1
supabase secrets set AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
```

#### 5.3 Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy generate-section
supabase functions deploy enrich-data
supabase functions deploy export-document
supabase functions deploy extract-entities

# Verify deployment
supabase functions list
```

---

### Step 6: Post-Deployment Verification (10 min)

#### 6.1 Health Checks
```bash
# Check homepage
curl https://your-domain.vercel.app

# Check API
curl https://your-domain.vercel.app/api/health

# Check Supabase connection
curl https://your-domain.vercel.app/api/test-db
```

#### 6.2 Smoke Test
1. **Open App:** https://your-domain.vercel.app
2. **Register:** Create test account
3. **Create Project:**
   - Compound: Test Compound
   - Indication: Test Indication
   - Phase: Phase 2
4. **Generate Document:**
   - Type: IB
   - Wait for generation
5. **Run Validation:**
   - Click Validate
   - Check for issues
6. **Export:**
   - Export DOCX
   - Export PDF
   - Verify downloads

#### 6.3 Performance Check
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.vercel.app

# Expected:
# - Homepage: < 2s
# - API calls: < 5s
# - Document generation: < 30s
```

---

### Step 7: Monitoring Setup (10 min)

#### 7.1 Vercel Analytics
```bash
# Enable in Vercel Dashboard
# Project > Analytics
# Enable Web Analytics
```

#### 7.2 Error Tracking
```bash
# Option 1: Vercel Logs
# Dashboard > Logs
# Monitor real-time logs

# Option 2: Sentry (Optional)
npm install @sentry/nextjs
# Configure in next.config.js
```

#### 7.3 Supabase Monitoring
```bash
# Supabase Dashboard
# Database > Logs
# Monitor queries and errors
```

---

## 🔒 Security Checklist

### Environment
- [ ] All secrets in environment variables (not in code)
- [ ] `.env.local` in `.gitignore`
- [ ] Service role key never exposed to client
- [ ] CORS configured correctly

### Database
- [ ] RLS policies enabled on all tables
- [ ] Row-level security tested
- [ ] No public access to sensitive data
- [ ] Backup strategy configured

### API
- [ ] Rate limiting configured
- [ ] Authentication required for sensitive endpoints
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention

### Application
- [ ] HTTPS enforced
- [ ] Secure headers configured
- [ ] XSS protection enabled
- [ ] CSRF protection enabled

---

## 📊 Performance Optimization

### Next.js
```javascript
// next.config.js
module.exports = {
  // Enable SWC minification
  swcMinify: true,
  
  // Image optimization
  images: {
    domains: ['your-project.supabase.co'],
  },
  
  // Compression
  compress: true,
  
  // Production optimizations
  productionBrowserSourceMaps: false,
}
```

### Vercel
```json
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## 🔄 CI/CD Setup (Optional)

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 📝 Rollback Plan

### If Deployment Fails:

#### 1. Immediate Rollback
```bash
# Via Vercel Dashboard
# Deployments > Previous deployment > Promote to Production

# Or via CLI
vercel rollback
```

#### 2. Database Rollback
```bash
# If migration failed
supabase db reset

# Restore from backup
# Supabase Dashboard > Database > Backups
```

#### 3. Verify Rollback
```bash
# Check app is working
curl https://your-domain.vercel.app

# Check database
# Run smoke test
```

---

## 🎯 Success Criteria

### Deployment Successful If:
- [ ] App loads at production URL
- [ ] User can register/login
- [ ] Project creation works
- [ ] Document generation works
- [ ] Validation runs successfully
- [ ] Export (DOCX/PDF) works
- [ ] No console errors
- [ ] Response times acceptable
- [ ] All tests passing in production

---

## 📞 Support & Troubleshooting

### Common Issues:

#### 1. Environment Variables Not Working
```bash
# Verify in Vercel Dashboard
# Redeploy after adding variables
vercel --prod
```

#### 2. Supabase Connection Failed
```bash
# Check URL and keys
# Verify RLS policies
# Check network/CORS
```

#### 3. Azure OpenAI Errors
```bash
# Verify endpoint and key
# Check deployment names
# Verify quota/limits
```

#### 4. Build Failures
```bash
# Check build logs in Vercel
# Verify all dependencies installed
# Check TypeScript errors
```

---

## 📈 Post-Deployment Tasks

### Week 1:
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Fix critical bugs

### Month 1:
- [ ] Analyze usage patterns
- [ ] Optimize slow queries
- [ ] Add missing features
- [ ] Improve documentation

### Ongoing:
- [ ] Regular backups
- [ ] Security updates
- [ ] Performance monitoring
- [ ] Feature improvements

---

## 🎊 Deployment Timeline

| Step | Duration | Status |
|------|----------|--------|
| Supabase Setup | 15 min | ⏳ Pending |
| Azure OpenAI | 10 min | ⏳ Pending |
| Environment Vars | 5 min | ⏳ Pending |
| Vercel Deploy | 10 min | ⏳ Pending |
| Edge Functions | 15 min | ⏳ Pending |
| Verification | 10 min | ⏳ Pending |
| Monitoring | 10 min | ⏳ Pending |
| **Total** | **75 min** | ⏳ Ready |

---

## 🚀 Quick Start Commands

```bash
# 1. Setup Supabase
supabase link --project-ref YOUR_REF
supabase db push

# 2. Deploy to Vercel
vercel --prod

# 3. Deploy Edge Functions
supabase functions deploy generate-section
supabase functions deploy enrich-data

# 4. Verify
curl https://your-domain.vercel.app
```

---

**Status:** 📋 READY FOR DEPLOYMENT  
**Estimated Time:** 75 minutes  
**Risk Level:** Low (all tests passing)  
**Rollback Plan:** Available  

**🚀 READY TO DEPLOY TO PRODUCTION! 🚀**
