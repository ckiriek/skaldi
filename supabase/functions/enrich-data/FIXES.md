# Enrich-Data Fixes Required

## Issues Found:

### 1. Labels Table Mismatch
**Problem:** Trying to upsert with `inchikey` field, but `labels` table doesn't have it.
**Schema:** `labels` has `product_id` (UUID), not `inchikey`
**Fix:** Remove `inchikey` from labels upsert, use proper conflict resolution

### 2. Trials Table - Missing project_id
**Problem:** Line 756-771 tries to insert `project_id` into trials
**Schema:** `trials` has `nct_id` (PK), `inchikey`, but NO `project_id`
**Fix:** Remove `project_id` from trials insert

### 3. Literature Table - Missing project_id  
**Problem:** Line 804-821 tries to insert `project_id` into literature
**Schema:** `literature` has `pmid` (PK), `inchikey`, but NO `project_id`
**Fix:** Remove `project_id` from literature insert

### 4. Missing external_data_cache population
**Problem:** No code to populate `external_data_cache` table
**Fix:** Add normalization and caching logic

## Required Changes:

### Change 1: Fix Labels Storage (Lines 658-669, 684-695)

**Before:**
```typescript
await supabaseClient
  .from('labels')
  .upsert({
    inchikey,  // ❌ Field doesn't exist
    ...dailymedLabel,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'inchikey' })  // ❌ No such constraint
```

**After:**
```typescript
// Labels table uses product_id, not inchikey
// We need to either:
// 1. Skip labels storage (not ideal)
// 2. Create product first, then link label
// 3. Store in external_data_cache instead

// For now, store label sections in external_data_cache
if (dailymedLabel?.sections) {
  const normalizer = new DataNormalizer()
  
  for (const [sectionName, content] of Object.entries(dailymedLabel.sections)) {
    if (!content) continue
    
    const normalized = normalizer.normalize(content as string, 'label_section')
    
    await supabaseClient
      .from('external_data_cache')
      .upsert({
        compound_name: project.compound_name,
        inchikey,
        source: 'fda_label',
        source_id: dailymedLabel.setid,
        source_url: dailymedLabel.source_url,
        content_type: 'label_section',
        section_name: sectionName,
        raw_content: content as string,
        normalized_content: normalized.normalized_content,
        payload: {
          label_type: dailymedLabel.label_type,
          effective_date: dailymedLabel.effective_date,
          ...normalized.metadata
        },
        confidence: 'high',
      }, {
        onConflict: 'compound_name,source,source_id,content_type,section_name'
      })
  }
}
```

### Change 2: Fix Trials Storage (Lines 756-771)

**Before:**
```typescript
const trialsToStore = nctIds.map(nctId => ({
  nct_id: nctId,
  inchikey,
  project_id,  // ❌ Field doesn't exist
  title: `Clinical Trial ${nctId}`,
  // ...
}))
```

**After:**
```typescript
const trialsToStore = nctIds.map(nctId => ({
  nct_id: nctId,
  inchikey,
  // project_id removed
  title: `Clinical Trial ${nctId}`,
  phase: null,
  status: null,
  enrollment: null,
  design: {},
  arms: {},
  outcomes_primary: {},
  outcomes_secondary: {},
  results: {},
  source: 'ClinicalTrials.gov',
  source_url: `https://clinicaltrials.gov/study/${nctId}`,
  retrieved_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}))
```

### Change 3: Fix Literature Storage (Lines 804-821)

**Before:**
```typescript
const publicationsToStore = pmids.map(pmid => ({
  pmid,
  inchikey,
  project_id,  // ❌ Field doesn't exist
  title: `PubMed Article ${pmid}`,
  // ...
}))
```

**After:**
```typescript
const publicationsToStore = pmids.map(pmid => ({
  pmid,
  inchikey,
  // project_id removed
  title: `PubMed Article ${pmid}`,
  authors: [],
  journal: null,
  publication_date: null,
  volume: null,
  issue: null,
  pages: null,
  doi: null,
  abstract: null,
  keywords: [],
  mesh_terms: [],
  relevance_score: null,
  source: 'PubMed',
  source_url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
  retrieved_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}))
```

### Change 4: Add external_data_cache for Trials

```typescript
// After storing trials, also cache in external_data_cache
for (const nctId of nctIds.slice(0, 5)) {  // Top 5 trials
  await supabaseClient
    .from('external_data_cache')
    .upsert({
      compound_name: project.compound_name,
      inchikey,
      source: 'ctgov',
      source_id: nctId,
      source_url: `https://clinicaltrials.gov/study/${nctId}`,
      content_type: 'trial_description',
      section_name: null,
      raw_content: `Clinical Trial ${nctId}`,  // Will be updated with full data later
      normalized_content: `Clinical Trial ${nctId}`,
      payload: { nct_id: nctId },
      confidence: 'medium',
    }, {
      onConflict: 'compound_name,source,source_id,content_type,section_name'
    })
}
```

### Change 5: Add external_data_cache for Literature

```typescript
// After storing literature, also cache abstracts in external_data_cache
// Note: We only have PMIDs, not abstracts yet
// This will be populated when we fetch full article data
```

## Implementation Priority:

1. ✅ **HIGH:** Fix trials storage (remove project_id)
2. ✅ **HIGH:** Fix literature storage (remove project_id)  
3. ✅ **HIGH:** Fix labels storage (use external_data_cache)
4. ⏳ **MEDIUM:** Add normalizer import
5. ⏳ **MEDIUM:** Populate external_data_cache for all sources
6. ⏳ **LOW:** Fetch full trial/literature data (future enhancement)
