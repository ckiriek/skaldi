# 🔧 External Data & Document Generation Improvements

## 📋 Issues Identified

### 1️⃣ External Data Limit (10 items)
**Current:** Hardcoded limit of 10 results per API
**Problem:** Too few data points for comprehensive analysis

### 2️⃣ No Grouping
**Current:** All external data shown in one flat list
**Problem:** Hard to navigate and understand data sources

### 3️⃣ Missing Metadata
**Current:** Basic info only (title, date)
**Problem:** Missing publication venue, study centers, detailed info

### 4️⃣ No Country Filtering
**Current:** Generic search without country preference
**Problem:** May get irrelevant international data

### 5️⃣ No Loading Animations
**Current:** Silent API requests
**Problem:** User doesn't know if system is working

### 6️⃣ Dropdown Menu for Generation
**Current:** Single dropdown to select document type
**Problem:** Extra click, not intuitive

### 7️⃣ Documents Too Short ⚠️ **CRITICAL**
**Current:** `maxTokens: 8000` (~6,000 words, ~12-15 pages)
**Problem:** 
- IB should be ~100 pages (currently ~15 pages)
- Protocol should be ~200-300 pages (currently ~20 pages)
- ICF should be ~25-30 pages (currently ~10 pages)

---

## ✅ Solutions

### 1️⃣ Increase External Data Limits

**Change limits:**
```typescript
// OLD
const trials = await ctClient.searchByCondition(project.indication, 10)
const publications = await pubmedClient.search(searchTerm, 10)
const adverseEvents = await fdaClient.searchAdverseEvents(drug_class, 10)

// NEW
const trials = await ctClient.searchByCondition(project.indication, 50)
const publications = await pubmedClient.search(searchTerm, 30)
const adverseEvents = await fdaClient.searchAdverseEvents(drug_class, 100)
```

**Rationale:**
- ClinicalTrials.gov: 50 trials for better design patterns
- PubMed: 30 publications for comprehensive literature review
- openFDA: 100 events for robust safety analysis

**File:** `app/api/integrations/fetch-all/route.ts`

---

### 2️⃣ Group External Data into 3 Categories

**UI Changes:**

```tsx
// Current: Single list
<div>
  {evidenceSources.map(source => <SourceCard />)}
</div>

// New: Grouped by source type
<Tabs defaultValue="clinical-trials">
  <TabsList>
    <TabsTrigger value="clinical-trials">
      Clinical Trials ({clinicalTrials.length})
    </TabsTrigger>
    <TabsTrigger value="publications">
      Publications ({publications.length})
    </TabsTrigger>
    <TabsTrigger value="safety">
      Safety Data ({safetyData.length})
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="clinical-trials">
    {clinicalTrials.map(trial => <TrialCard />)}
  </TabsContent>
  
  <TabsContent value="publications">
    {publications.map(pub => <PublicationCard />)}
  </TabsContent>
  
  <TabsContent value="safety">
    {safetyData.map(event => <SafetyCard />)}
  </TabsContent>
</Tabs>
```

**File:** `app/dashboard/projects/[id]/page.tsx`

---

### 3️⃣ Add Metadata (Publication, Date, Centers)

**ClinicalTrials.gov - Add Centers:**

```typescript
interface ClinicalTrial {
  // ... existing fields
  
  // NEW
  locations?: {
    facility: string
    city: string
    state?: string
    country: string
  }[]
  leadSponsor?: string
  collaborators?: string[]
  studyFirstPostDate?: string
  resultsFirstPostDate?: string
}

// In parseStudies():
locations: study.protocolSection?.contactsLocationsModule?.locations?.map((loc: any) => ({
  facility: loc.facility,
  city: loc.city,
  state: loc.state,
  country: loc.country
})) || [],
leadSponsor: study.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name,
collaborators: study.protocolSection?.sponsorCollaboratorsModule?.collaborators?.map((c: any) => c.name) || [],
```

**PubMed - Add Journal & Publication Details:**

```typescript
interface Publication {
  // ... existing fields
  
  // NEW
  journal: string
  journalISSN?: string
  publicationType?: string[]
  meshTerms?: string[]
  affiliations?: string[]
  citationCount?: number
}

// In parseXML():
journal: this.extractTag(article, 'Journal/Title'),
journalISSN: this.extractTag(article, 'Journal/ISSN'),
publicationType: this.extractAllTags(article, 'PublicationType'),
meshTerms: this.extractAllTags(article, 'MeshHeading/DescriptorName'),
affiliations: this.extractAllTags(article, 'Affiliation'),
```

**openFDA - Add Report Details:**

```typescript
interface AdverseEvent {
  // ... existing fields
  
  // NEW
  reportSource?: string  // Physician, Consumer, etc.
  reportCountry?: string
  occurCountry?: string
  receiptDate?: string
  transmissionDate?: string
  seriousness?: {
    death?: boolean
    lifeThreatening?: boolean
    hospitalization?: boolean
    disability?: boolean
  }
}
```

**Files:**
- `lib/integrations/clinicaltrials.ts`
- `lib/integrations/pubmed.ts`
- `lib/integrations/openfda.ts`

---

### 4️⃣ Country Filtering for External Data

**Add country parameter to search:**

```typescript
// In fetch-all/route.ts

// Get project countries
const countries = project.countries || []

// 1. ClinicalTrials.gov - Filter by country
const trials = await ctClient.searchByCondition(project.indication, 50)

// Filter: First try project countries, then multicenter international
const localTrials = trials.filter(t => 
  t.locations?.some(loc => countries.includes(loc.country))
)

const internationalTrials = trials.filter(t => 
  t.locations && t.locations.length > 1 && // Multicenter
  new Set(t.locations.map(l => l.country)).size > 1 // International
)

// Priority: local first, then international
const filteredTrials = [
  ...localTrials,
  ...internationalTrials.filter(t => !localTrials.includes(t))
].slice(0, 50)

// 2. PubMed - Add country to search query
const countryQuery = countries.length > 0 
  ? ` AND (${countries.map(c => `${c}[AD]`).join(' OR ')})`
  : ''
  
const searchTerm = `${project.title} ${project.indication}${countryQuery}`

// 3. openFDA - Filter by report country
const events = await fdaClient.searchAdverseEvents(drug_class, 100)
const filteredEvents = countries.length > 0
  ? events.filter(e => countries.includes(e.occurCountry || e.reportCountry))
  : events
```

**File:** `app/api/integrations/fetch-all/route.ts`

---

### 5️⃣ Loading Animations for API Requests

**Add loading states:**

```tsx
// In FetchExternalDataButton component

const [loading, setLoading] = useState(false)
const [progress, setProgress] = useState({
  clinicalTrials: 'pending',
  publications: 'pending',
  safetyData: 'pending'
})

const handleFetch = async () => {
  setLoading(true)
  
  // Show loading dialog
  return (
    <Dialog open={loading}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fetching External Data</DialogTitle>
          <DialogDescription>
            Please wait while we gather data from multiple sources...
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <LoadingItem 
            label="ClinicalTrials.gov" 
            status={progress.clinicalTrials}
            icon={<FlaskConical />}
          />
          <LoadingItem 
            label="PubMed" 
            status={progress.publications}
            icon={<BookOpen />}
          />
          <LoadingItem 
            label="openFDA" 
            status={progress.safetyData}
            icon={<Shield />}
          />
        </div>
        
        <Progress value={calculateProgress()} />
      </DialogContent>
    </Dialog>
  )
}

// LoadingItem component
function LoadingItem({ label, status, icon }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span className="flex-1">{label}</span>
      {status === 'pending' && <Loader2 className="animate-spin" />}
      {status === 'loading' && <Loader2 className="animate-spin text-blue-500" />}
      {status === 'success' && <CheckCircle className="text-green-500" />}
      {status === 'error' && <XCircle className="text-red-500" />}
    </div>
  )
}
```

**Files:**
- `components/fetch-external-data-button.tsx` (new)
- `app/api/integrations/fetch-all/route.ts` (add progress updates)

---

### 6️⃣ Individual Generate Buttons (No Dropdown)

**Replace dropdown with individual buttons:**

```tsx
// OLD
<DropdownMenu>
  <DropdownMenuTrigger>
    <Button>Generate Document</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => generate('Synopsis')}>Synopsis</DropdownMenuItem>
    <DropdownMenuItem onClick={() => generate('IB')}>IB</DropdownMenuItem>
    <DropdownMenuItem onClick={() => generate('Protocol')}>Protocol</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// NEW
<div className="flex gap-2">
  <Button 
    onClick={() => generate('Synopsis')}
    disabled={!hasExternalData || generating}
  >
    <FileText className="w-4 h-4 mr-2" />
    Generate Synopsis
  </Button>
  
  <Button 
    onClick={() => generate('IB')}
    disabled={!hasExternalData || generating}
  >
    <Book className="w-4 h-4 mr-2" />
    Generate IB
  </Button>
  
  <Button 
    onClick={() => generate('Protocol')}
    disabled={!hasExternalData || generating}
  >
    <FileCheck className="w-4 h-4 mr-2" />
    Generate Protocol
  </Button>
</div>
```

**File:** `app/dashboard/projects/[id]/page.tsx`

---

### 7️⃣ Fix Document Length ⚠️ **CRITICAL**

**Problem Analysis:**

Current: `maxTokens: 8000`
- GPT-4 tokens: ~0.75 words per token
- 8000 tokens = ~6,000 words
- At ~500 words/page = ~12 pages

**Target lengths:**
- Synopsis: 2-3 pages ✅ (current is OK)
- IB: 100 pages = ~50,000 words = ~66,000 tokens
- Protocol: 200-300 pages = ~100,000-150,000 words = ~133,000-200,000 tokens
- ICF: 25-30 pages = ~12,500-15,000 words = ~16,000-20,000 tokens

**Solution: Increase maxTokens**

```typescript
// lib/integrations/azure-openai.ts

export async function generateDocument(
  documentType: string,
  context: any
): Promise<string> {
  const messages = [
    { role: 'system', content: getSystemPrompt(documentType) },
    { role: 'user', content: getUserPrompt(documentType, context) }
  ]

  // OLD
  const response = await this.generateCompletion(messages, {
    temperature: 0.3,
    maxTokens: 8000,  // ❌ Too small!
  })

  // NEW
  const tokenLimits = {
    'Synopsis': 4000,      // ~3,000 words, ~6 pages
    'IB': 80000,           // ~60,000 words, ~120 pages
    'Protocol': 150000,    // ~112,000 words, ~224 pages
    'ICF': 20000,          // ~15,000 words, ~30 pages
  }

  const response = await this.generateCompletion(messages, {
    temperature: 0.3,
    maxTokens: tokenLimits[documentType] || 8000,
  })

  return response.content
}
```

**Important Notes:**

1. **Azure OpenAI Limits:**
   - GPT-4: Max 128K tokens per request
   - GPT-4 Turbo: Max 128K tokens per request
   - Check your deployment's max tokens

2. **Cost Impact:**
   - IB: 80K tokens × $0.03/1K = $2.40 per generation
   - Protocol: 150K tokens × $0.03/1K = $4.50 per generation
   - Total: ~$7-8 per full document set (vs current ~$0.50)

3. **Generation Time:**
   - IB: ~5-7 minutes (vs current ~2-3 min)
   - Protocol: ~10-15 minutes (vs current ~5-7 min)

**Alternative: Chunked Generation**

For very long documents, generate in sections:

```typescript
async function generateLongDocument(
  documentType: string,
  context: any
): Promise<string> {
  const sections = getSections(documentType)
  const generatedSections: string[] = []
  
  for (const section of sections) {
    const sectionContent = await generateSection(
      documentType,
      section,
      context,
      generatedSections // Previous sections for context
    )
    generatedSections.push(sectionContent)
  }
  
  return generatedSections.join('\n\n')
}
```

**File:** `lib/integrations/azure-openai.ts`

---

## 📊 Implementation Priority

### 🔴 CRITICAL (Do First):
1. **Fix document length** - Increase maxTokens
   - Impact: Documents will be proper length
   - Time: 30 minutes
   - Risk: Low (just config change)

2. **Add loading animations** - Better UX
   - Impact: Users know system is working
   - Time: 2 hours
   - Risk: Low

### 🟡 HIGH (Do Soon):
3. **Increase external data limits** - More data
   - Impact: Better quality documents
   - Time: 30 minutes
   - Risk: Low (may hit rate limits)

4. **Group external data** - Better organization
   - Impact: Easier to navigate
   - Time: 2 hours
   - Risk: Low

5. **Individual generate buttons** - Better UX
   - Impact: More intuitive
   - Time: 1 hour
   - Risk: Low

### 🟢 MEDIUM (Do Later):
6. **Add metadata** - More detailed info
   - Impact: Richer data display
   - Time: 4 hours
   - Risk: Medium (API changes)

7. **Country filtering** - Localized data
   - Impact: More relevant results
   - Time: 3 hours
   - Risk: Medium (complex logic)

---

## 🎯 Expected Results

### Before:
- ❌ 10 items per source
- ❌ Flat list of all data
- ❌ Basic metadata only
- ❌ No country filtering
- ❌ Silent API requests
- ❌ Dropdown menu for generation
- ❌ Documents ~12-20 pages (too short!)

### After:
- ✅ 50 trials, 30 publications, 100 safety events
- ✅ Grouped by source type (3 tabs)
- ✅ Rich metadata (journals, centers, dates)
- ✅ Country-filtered results
- ✅ Beautiful loading animations
- ✅ Individual generate buttons
- ✅ Documents proper length:
  - Synopsis: ~6 pages
  - IB: ~120 pages
  - Protocol: ~224 pages
  - ICF: ~30 pages

---

## 💰 Cost Impact

### Current:
- External data fetch: Free
- Document generation: ~$0.50 per project
- Total: ~$0.50 per project

### After:
- External data fetch: Free (more API calls but within limits)
- Document generation: ~$7-8 per project
- Total: ~$7-8 per project

**ROI:** Proper-length regulatory documents worth the cost!

---

## 📝 Next Steps

1. Review this plan
2. Prioritize changes
3. Implement critical fixes first
4. Test thoroughly
5. Deploy incrementally

---

**Ready to implement?** 🚀
