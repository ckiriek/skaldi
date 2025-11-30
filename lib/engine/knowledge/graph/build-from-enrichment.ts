/**
 * Build Knowledge Graph from Enrichment Data
 * 
 * This builds a KG snapshot from data already stored in the database
 * during the enrichment process, avoiding duplicate API calls.
 */

import { createClient } from '@/lib/supabase/server'
import type { KnowledgeGraphSnapshot } from '../types'

interface EnrichedData {
  trials: any[]
  literature: any[]
  adverseEvents: any[]
  labels: any[]
}

/**
 * Build Knowledge Graph from enriched data in database
 */
export async function buildKnowledgeGraphFromEnrichment(
  projectId: string,
  compoundName: string,
  inchikey?: string
): Promise<KnowledgeGraphSnapshot> {
  console.log(`🔨 Building Knowledge Graph from enrichment for ${compoundName}`)
  
  const supabase = await createClient()
  
  // Fetch all enriched data for this project/compound
  const [trialsResult, literatureResult, aeResult, labelsResult] = await Promise.all([
    // Clinical trials
    supabase
      .from('trials')
      .select('*')
      .or(`inchikey.eq.${inchikey},compound_name.ilike.%${compoundName}%`)
      .limit(50),
    
    // Literature
    supabase
      .from('literature')
      .select('*')
      .eq('inchikey', inchikey)
      .limit(50),
    
    // Adverse events
    supabase
      .from('adverse_events')
      .select('*')
      .eq('project_id', projectId)
      .limit(100),
    
    // FDA labels from cache
    supabase
      .from('external_data_cache')
      .select('*')
      .eq('source', 'fda_label')
      .ilike('compound_name', `%${compoundName}%`)
  ])
  
  const trials = trialsResult.data || []
  const literature = literatureResult.data || []
  const adverseEvents = aeResult.data || []
  const labels = labelsResult.data || []
  
  console.log(`📊 Enriched data: ${trials.length} trials, ${literature.length} pubs, ${adverseEvents.length} AEs, ${labels.length} label sections`)
  
  // Build KG snapshot
  const snapshot: KnowledgeGraphSnapshot = {
    compound_name: compoundName,
    inchikey: inchikey || undefined,
    sourcesUsed: [],
    indications: [],
    formulations: [],
    endpoints: [],
    procedures: [],
    eligibilityPatterns: [],
    safety: {
      common_aes: [],
      warnings: [],
      contraindications: []
    },
    trials: {
      total: trials.length,
      by_phase: {},
      by_status: {}
    },
    created_at: new Date().toISOString()
  }
  
  // Process trials
  if (trials.length > 0) {
    snapshot.sourcesUsed.push('ClinicalTrials.gov')
    
    // Extract indications from trials
    const indicationMap = new Map<string, { count: number, sources: string[] }>()
    
    for (const trial of trials) {
      // Count by phase
      if (trial.phase) {
        snapshot.trials.by_phase[trial.phase] = (snapshot.trials.by_phase[trial.phase] || 0) + 1
      }
      
      // Count by status
      if (trial.status) {
        snapshot.trials.by_status[trial.status] = (snapshot.trials.by_status[trial.status] || 0) + 1
      }
      
      // Extract conditions/indications
      const conditions = trial.conditions || trial.indication_candidates || []
      for (const condition of conditions) {
        if (typeof condition === 'string' && condition.length > 3) {
          const key = condition.toLowerCase().trim()
          if (!indicationMap.has(key)) {
            indicationMap.set(key, { count: 0, sources: [] })
          }
          const entry = indicationMap.get(key)!
          entry.count++
          if (!entry.sources.includes('ctgov')) {
            entry.sources.push('ctgov')
          }
        }
      }
      
      // Extract endpoints
      const primaryOutcomes = trial.outcomes_primary || []
      const secondaryOutcomes = trial.outcomes_secondary || []
      
      for (const outcome of [...primaryOutcomes, ...secondaryOutcomes]) {
        if (outcome && typeof outcome === 'object') {
          const title = outcome.measure || outcome.title || ''
          if (title.length > 5) {
            snapshot.endpoints.push({
              id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
              inn: compoundName,
              normalized: title,
              sources: ['ctgov'],
              confidence: primaryOutcomes.includes(outcome) ? 0.9 : 0.7
            })
          }
        }
      }
      
      // Extract eligibility patterns
      if (trial.eligibility_criteria) {
        snapshot.eligibilityPatterns.push({
          id: `elig-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          inn: compoundName,
          inclusionText: trial.eligibility_criteria.inclusion || '',
          exclusionText: trial.eligibility_criteria.exclusion || '',
          sources: ['ctgov']
        })
      }
    }
    
    // Convert indication map to array
    for (const [indication, data] of indicationMap) {
      snapshot.indications.push({
        id: `ind-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        inn: compoundName,
        indication: indication,
        sources: data.sources,
        confidence: Math.min(0.5 + (data.count * 0.1), 0.95)
      })
    }
  }
  
  // Process adverse events
  if (adverseEvents.length > 0) {
    snapshot.sourcesUsed.push('openFDA FAERS')
    
    // Sort by frequency and take top events
    const sortedAEs = adverseEvents
      .filter(ae => ae.term && ae.frequency)
      .sort((a, b) => parseInt(b.frequency) - parseInt(a.frequency))
      .slice(0, 20)
    
    snapshot.safety.common_aes = sortedAEs.map(ae => ({
      term: ae.term,
      frequency: ae.frequency,
      source: 'FAERS'
    }))
  }
  
  // Process FDA labels
  if (labels.length > 0) {
    snapshot.sourcesUsed.push('FDA Label')
    
    // Extract indications from label
    const indicationSections = labels.filter(l => 
      l.section_name?.toLowerCase().includes('indication') ||
      l.section_name?.toLowerCase().includes('usage')
    )
    
    for (const section of indicationSections) {
      if (section.normalized_content) {
        // Add as high-confidence indication
        snapshot.indications.push({
          id: `ind-fda-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          inn: compoundName,
          indication: section.normalized_content.substring(0, 200),
          sources: ['fda_label'],
          confidence: 1.0 // FDA label = highest confidence
        })
      }
    }
    
    // Extract warnings
    const warningSections = labels.filter(l =>
      l.section_name?.toLowerCase().includes('warning') ||
      l.section_name?.toLowerCase().includes('precaution')
    )
    
    for (const section of warningSections) {
      if (section.normalized_content) {
        snapshot.safety.warnings.push({
          text: section.normalized_content.substring(0, 500),
          source: 'FDA Label',
          severity: section.section_name?.toLowerCase().includes('boxed') ? 'high' : 'medium'
        })
      }
    }
    
    // Extract contraindications
    const contraSections = labels.filter(l =>
      l.section_name?.toLowerCase().includes('contraindication')
    )
    
    for (const section of contraSections) {
      if (section.normalized_content) {
        snapshot.safety.contraindications.push({
          text: section.normalized_content.substring(0, 300),
          source: 'FDA Label'
        })
      }
    }
  }
  
  // Deduplicate indications
  const uniqueIndications = new Map<string, typeof snapshot.indications[0]>()
  for (const ind of snapshot.indications) {
    const key = ind.indication.toLowerCase().substring(0, 50)
    if (!uniqueIndications.has(key) || uniqueIndications.get(key)!.confidence < ind.confidence) {
      uniqueIndications.set(key, ind)
    }
  }
  snapshot.indications = Array.from(uniqueIndications.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 20)
  
  // Deduplicate endpoints
  const uniqueEndpoints = new Map<string, typeof snapshot.endpoints[0]>()
  for (const ep of snapshot.endpoints) {
    const key = ep.normalized.toLowerCase().substring(0, 50)
    if (!uniqueEndpoints.has(key)) {
      uniqueEndpoints.set(key, ep)
    }
  }
  snapshot.endpoints = Array.from(uniqueEndpoints.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 30)
  
  console.log(`✅ Knowledge Graph built: ${snapshot.sourcesUsed.length} sources, ${snapshot.indications.length} indications, ${snapshot.endpoints.length} endpoints`)
  
  return snapshot
}
