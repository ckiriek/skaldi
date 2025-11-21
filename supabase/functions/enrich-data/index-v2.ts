/**
 * Enrich Data Edge Function v2.1 - FIXED
 * 
 * Fixes:
 * - Removed project_id from trials and literature (field doesn't exist)
 * - Fixed labels storage (use external_data_cache instead)
 * - Added DataNormalizer integration
 * - Populate external_data_cache for all sources
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { DataNormalizer } from './normalizer.ts'

// ... (keep all adapter classes unchanged: PubChemAdapter, OrangeBookAdapter, etc.)
// ... (lines 1-502 remain the same)

// CHANGES START AT LINE 645 (Labels Storage)

// ========================================================================
// STEP 3: DAILYMED - Latest Label + Cache
// ========================================================================
console.log(`\n📍 STEP 3: DailyMed - Fetching latest label`)
const dailymed = new DailyMedAdapter()
let dailymedLabel = null

if (project.rld_application_number) {
  dailymedLabel = await dailymed.fetchLatestLabelByApplicationNumber(project.rld_application_number)
  if (dailymedLabel) {
    metrics.sources_used.push('DailyMed')
    metrics.records_fetched.labels++
    
    // Store label sections in external_data_cache (labels table uses product_id, not inchikey)
    if (dailymedLabel.sections) {
      const normalizer = new DataNormalizer()
      
      for (const [sectionName, content] of Object.entries(dailymedLabel.sections)) {
        if (!content || typeof content !== 'string') continue
        
        const normalized = normalizer.normalize(content, 'label_section')
        
        try {
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
              raw_content: content,
              normalized_content: normalized.normalized_content,
              payload: {
                label_type: dailymedLabel.label_type,
                effective_date: dailymedLabel.effective_date,
                version: dailymedLabel.version,
                ...normalized.metadata
              },
              confidence: 'high',
            }, {
              onConflict: 'compound_name,source,source_id,content_type,section_name',
              ignoreDuplicates: false
            })
          
          console.log(`✅ Cached label section: ${sectionName}`)
        } catch (error) {
          console.error(`❌ Error caching label section ${sectionName}:`, error)
        }
      }
    }
    
    console.log(`✅ Stored DailyMed label in cache`)
  }
}

// ========================================================================
// STEP 4: OPENFDA - FDA Label (fallback) + Cache
// ========================================================================
if (!dailymedLabel && project.rld_application_number) {
  console.log(`\n📍 STEP 4: openFDA - Fetching FDA label (fallback)`)
  const openfda = new OpenFDAAdapter()
  const openfdaLabel = await openfda.fetchLabelByApplicationNumber(project.rld_application_number)

  if (openfdaLabel) {
    metrics.sources_used.push('openFDA')
    metrics.records_fetched.labels++
    
    // Store label sections in external_data_cache
    if (openfdaLabel.sections) {
      const normalizer = new DataNormalizer()
      
      for (const [sectionName, content] of Object.entries(openfdaLabel.sections)) {
        if (!content || typeof content !== 'string') continue
        
        const normalized = normalizer.normalize(content, 'label_section')
        
        try {
          await supabaseClient
            .from('external_data_cache')
            .upsert({
              compound_name: project.compound_name,
              inchikey,
              source: 'fda_label',
              source_id: openfdaLabel.setid,
              source_url: openfdaLabel.source_url,
              content_type: 'label_section',
              section_name: sectionName,
              raw_content: content,
              normalized_content: normalized.normalized_content,
              payload: {
                label_type: openfdaLabel.label_type,
                effective_date: openfdaLabel.effective_date,
                ...normalized.metadata
              },
              confidence: 'high',
            }, {
              onConflict: 'compound_name,source,source_id,content_type,section_name',
              ignoreDuplicates: false
            })
          
          console.log(`✅ Cached label section: ${sectionName}`)
        } catch (error) {
          console.error(`❌ Error caching label section ${sectionName}:`, error)
        }
      }
    }
    
    console.log(`✅ Stored openFDA label in cache`)
  }
}

if (metrics.records_fetched.labels > 0) {
  metrics.coverage.labels = 1.0
}

// ... (FAERS section remains the same: lines 702-741)

// ========================================================================
// STEP 5: CLINICALTRIALS.GOV - Trial Data + Cache
// ========================================================================
console.log(`\n📍 STEP 5: ClinicalTrials.gov - Fetching trials`)
const clinicaltrials = new ClinicalTrialsAdapter()
const nctIds = await clinicaltrials.searchTrialsByDrug(project.compound_name, 20)

if (nctIds.length > 0) {
  metrics.sources_used.push('ClinicalTrials.gov')
  metrics.records_fetched.trials = nctIds.length
  metrics.coverage.clinical = Math.min(nctIds.length / 20, 1.0)
  
  // Store trial IDs (FIXED: removed project_id)
  const trialsToStore = nctIds.map(nctId => ({
    nct_id: nctId,
    inchikey,
    // project_id removed - field doesn't exist in trials table
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
  
  // Upsert trials
  const { error: trialsError } = await supabaseClient
    .from('trials')
    .upsert(trialsToStore, { onConflict: 'nct_id', ignoreDuplicates: false })
  
  if (trialsError) {
    console.error('Error storing trials:', trialsError)
    metrics.errors.push({
      code: 'E501_TRIALS_STORAGE_FAILED',
      message: `Failed to store trials: ${trialsError.message}`,
      source: 'ClinicalTrials.gov',
      severity: 'warning',
    })
  } else {
    console.log(`✅ Stored ${nctIds.length} trials`)
    
    // Also cache top 5 trials in external_data_cache
    for (const nctId of nctIds.slice(0, 5)) {
      try {
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
            raw_content: `Clinical Trial ${nctId}`,
            normalized_content: `Clinical Trial ${nctId}`,
            payload: { nct_id: nctId },
            confidence: 'medium',
          }, {
            onConflict: 'compound_name,source,source_id,content_type,section_name',
            ignoreDuplicates: false
          })
      } catch (error) {
        console.error(`Error caching trial ${nctId}:`, error)
      }
    }
    console.log(`✅ Cached ${Math.min(nctIds.length, 5)} trials`)
  }
}

// ========================================================================
// STEP 6: PUBMED - Literature + Cache
// ========================================================================
console.log(`\n📍 STEP 6: PubMed - Fetching literature`)
const pubmed = new PubMedAdapter()
const pmids = await pubmed.searchByDrug(project.compound_name, 30)

if (pmids.length > 0) {
  metrics.sources_used.push('PubMed')
  metrics.records_fetched.literature = pmids.length
  metrics.coverage.literature = Math.min(pmids.length / 30, 1.0)
  
  // Store publication IDs (FIXED: removed project_id)
  const publicationsToStore = pmids.map(pmid => ({
    pmid,
    inchikey,
    // project_id removed - field doesn't exist in literature table
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
  
  // Upsert publications
  const { error: pubsError } = await supabaseClient
    .from('literature')
    .upsert(publicationsToStore, { onConflict: 'pmid', ignoreDuplicates: false })
  
  if (pubsError) {
    console.error('Error storing publications:', pubsError)
    metrics.errors.push({
      code: 'E601_LITERATURE_STORAGE_FAILED',
      message: `Failed to store publications: ${pubsError.message}`,
      source: 'PubMed',
      severity: 'warning',
    })
  } else {
    console.log(`✅ Stored ${pmids.length} publications`)
    
    // Cache in external_data_cache (abstracts will be populated later when we fetch full data)
    for (const pmid of pmids.slice(0, 10)) {
      try {
        await supabaseClient
          .from('external_data_cache')
          .upsert({
            compound_name: project.compound_name,
            inchikey,
            source: 'pubmed',
            source_id: pmid,
            source_url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
            content_type: 'abstract',
            section_name: null,
            raw_content: `PubMed Article ${pmid}`,  // Will be updated with abstract later
            normalized_content: `PubMed Article ${pmid}`,
            payload: { pmid },
            confidence: 'medium',
          }, {
            onConflict: 'compound_name,source,source_id,content_type,section_name',
            ignoreDuplicates: false
          })
      } catch (error) {
        console.error(`Error caching publication ${pmid}:`, error)
      }
    }
    console.log(`✅ Cached ${Math.min(pmids.length, 10)} publications`)
  }
}

// ... (rest of the file remains the same: lines 842-903)
