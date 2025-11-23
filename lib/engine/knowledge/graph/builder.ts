/**
 * Phase H.4: Knowledge Graph Builder
 * 
 * Builds Knowledge Graph snapshots from multiple data sources
 */

import type {
  KnowledgeGraphSnapshot,
  KgFormulation,
  KgIndication,
  KgEndpoint,
  KgProcedure,
  KgEligibilityPattern
} from '../types'

import { fetchFdaLabelsByInn } from '../ingestion/fda_label'
import { fetchFdaNdcByInn } from '../ingestion/fda_ndc'
import { fetchDailyMedByInn } from '../ingestion/dailymed'
import { fetchCtGovStudies } from '../ingestion/ctgov'
import { normalizeIndication } from '../normalizers/indication_normalizer'
import { normalizeEndpoint } from '../normalizers/endpoint_normalizer'
import { normalizeEligibility } from '../normalizers/eligibility_normalizer'
import { normalizeProcedure } from '../normalizers/procedure_normalizer'
import { calculateConfidence, createEmptySnapshot } from './schema'

// Simple UUID generator (no external dependency)
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Knowledge Graph Builder
 */
export class KnowledgeGraphBuilder {
  private inn: string
  private snapshot: KnowledgeGraphSnapshot
  
  constructor(inn: string) {
    this.inn = inn
    this.snapshot = createEmptySnapshot(inn)
  }
  
  /**
   * Build complete Knowledge Graph for INN
   */
  async build(): Promise<KnowledgeGraphSnapshot> {
    console.log(`🔨 Building Knowledge Graph for ${this.inn}`)
    
    try {
      // Fetch data from all sources in parallel
      const [fdaLabels, fdaNdc, dailyMed, ctGov] = await Promise.allSettled([
        this.fetchFdaData(),
        this.fetchFdaNdcData(),
        this.fetchDailyMedData(),
        this.fetchCtGovData()
      ])
      
      // Process results
      if (fdaLabels.status === 'fulfilled') {
        this.processFdaLabels(fdaLabels.value)
      }
      
      if (fdaNdc.status === 'fulfilled') {
        this.processFdaNdc(fdaNdc.value)
      }
      
      if (dailyMed.status === 'fulfilled') {
        this.processDailyMed(dailyMed.value)
      }
      
      if (ctGov.status === 'fulfilled') {
        this.processCtGov(ctGov.value)
      }
      
      // Deduplicate and calculate final confidence scores
      this.deduplicateAndScore()
      
      console.log(`✅ Knowledge Graph built: ${this.snapshot.sourcesUsed.length} sources`)
      
      return this.snapshot
      
    } catch (error) {
      console.error(`❌ Failed to build Knowledge Graph:`, error)
      throw error
    }
  }
  
  /**
   * Fetch FDA Label data
   */
  private async fetchFdaData() {
    try {
      const labels = await fetchFdaLabelsByInn(this.inn)
      this.snapshot.sourcesUsed.push(`fda_label:${labels.length}`)
      return labels
    } catch (error) {
      console.error('FDA Label fetch failed:', error)
      return []
    }
  }
  
  /**
   * Fetch FDA NDC data
   */
  private async fetchFdaNdcData() {
    try {
      const ndc = await fetchFdaNdcByInn(this.inn)
      this.snapshot.sourcesUsed.push(`fda_ndc:${ndc.length}`)
      return ndc
    } catch (error) {
      console.error('FDA NDC fetch failed:', error)
      return []
    }
  }
  
  /**
   * Fetch DailyMed data
   */
  private async fetchDailyMedData() {
    try {
      const dailyMed = await fetchDailyMedByInn(this.inn)
      this.snapshot.sourcesUsed.push(`dailymed:${dailyMed.length}`)
      return dailyMed
    } catch (error) {
      console.error('DailyMed fetch failed:', error)
      return []
    }
  }
  
  /**
   * Fetch ClinicalTrials.gov data
   */
  private async fetchCtGovData() {
    try {
      const studies = await fetchCtGovStudies(this.inn, 10)
      this.snapshot.sourcesUsed.push(`ctgov:${studies.length}`)
      return studies
    } catch (error) {
      console.error('ClinicalTrials.gov fetch failed:', error)
      return []
    }
  }
  
  /**
   * Process FDA Label data
   */
  private processFdaLabels(labels: any[]) {
    for (const label of labels) {
      // Extract formulations
      if (label.routes || label.dosageForms) {
        this.snapshot.formulations.push({
          id: generateId(),
          inn: this.inn,
          routes: label.routes || [],
          dosageForms: label.dosageForms || [],
          strengths: [],
          sources: ['fda_label'],
          confidence: 0.95
        })
      }
      
      // Extract indications
      if (label.indicationsText) {
        const normalized = normalizeIndication(label.indicationsText)
        this.snapshot.indications.push({
          id: generateId(),
          inn: this.inn,
          indication: normalized.cleaned,
          icd10Code: normalized.icd10Code,
          sources: ['fda_label'],
          confidence: 0.95
        })
      }
    }
  }
  
  /**
   * Process FDA NDC data
   */
  private processFdaNdc(ndcRecords: any[]) {
    for (const ndc of ndcRecords) {
      // Extract formulations
      this.snapshot.formulations.push({
        id: generateId(),
        inn: this.inn,
        routes: ndc.routes || [],
        dosageForms: ndc.dosageForms || [],
        strengths: ndc.strengths || [],
        sources: ['fda_ndc'],
        confidence: 0.90
      })
    }
  }
  
  /**
   * Process DailyMed data
   */
  private processDailyMed(records: any[]) {
    for (const record of records) {
      // Extract indications
      if (record.indicationsText) {
        const normalized = normalizeIndication(record.indicationsText)
        this.snapshot.indications.push({
          id: generateId(),
          inn: this.inn,
          indication: normalized.cleaned,
          icd10Code: normalized.icd10Code,
          sources: ['dailymed'],
          confidence: 0.90
        })
      }
      
      // Extract formulations
      if (record.routes || record.dosageForms) {
        this.snapshot.formulations.push({
          id: generateId(),
          inn: this.inn,
          routes: record.routes || [],
          dosageForms: record.dosageForms || [],
          strengths: [],
          sources: ['dailymed'],
          confidence: 0.90
        })
      }
    }
  }
  
  /**
   * Process ClinicalTrials.gov data
   */
  private processCtGov(studies: any[]) {
    for (const study of studies) {
      // Extract indications
      for (const indication of study.indicationCandidates || []) {
        const normalized = normalizeIndication(indication)
        this.snapshot.indications.push({
          id: generateId(),
          inn: this.inn,
          indication: normalized.cleaned,
          icd10Code: normalized.icd10Code,
          sources: ['ctgov'],
          confidence: 0.85
        })
      }
      
      // Extract endpoints
      for (const endpoint of study.endpoints || []) {
        const normalized = normalizeEndpoint(endpoint.title, endpoint.timeFrame)
        this.snapshot.endpoints.push({
          id: generateId(),
          inn: this.inn,
          normalized,
          sources: ['ctgov'],
          confidence: 0.85
        })
      }
      
      // Extract eligibility
      if (study.eligibility) {
        this.snapshot.eligibilityPatterns.push({
          id: generateId(),
          inn: this.inn,
          inclusionText: study.eligibility.inclusionText,
          exclusionText: study.eligibility.exclusionText,
          sources: ['ctgov']
        })
      }
    }
  }
  
  /**
   * Deduplicate and recalculate confidence scores
   */
  private deduplicateAndScore() {
    // Deduplicate formulations
    this.snapshot.formulations = this.deduplicateFormulations(this.snapshot.formulations)
    
    // Deduplicate indications
    this.snapshot.indications = this.deduplicateIndications(this.snapshot.indications)
    
    // Deduplicate endpoints
    this.snapshot.endpoints = this.deduplicateEndpoints(this.snapshot.endpoints)
    
    // Sort by confidence
    this.snapshot.formulations.sort((a, b) => b.confidence - a.confidence)
    this.snapshot.indications.sort((a, b) => b.confidence - a.confidence)
    this.snapshot.endpoints.sort((a, b) => b.confidence - a.confidence)
  }
  
  /**
   * Deduplicate formulations
   */
  private deduplicateFormulations(formulations: KgFormulation[]): KgFormulation[] {
    const merged = new Map<string, KgFormulation>()
    
    for (const formulation of formulations) {
      const key = `${formulation.inn}:${formulation.routes.join(',')}:${formulation.dosageForms.join(',')}`
      
      if (!merged.has(key)) {
        merged.set(key, formulation)
      } else {
        const existing = merged.get(key)!
        const combinedSources = [...new Set([...existing.sources, ...formulation.sources])]
        merged.set(key, {
          ...existing,
          strengths: [...new Set([...existing.strengths, ...formulation.strengths])],
          sources: combinedSources,
          confidence: calculateConfidence(combinedSources)
        })
      }
    }
    
    return Array.from(merged.values())
  }
  
  /**
   * Deduplicate indications
   */
  private deduplicateIndications(indications: KgIndication[]): KgIndication[] {
    const merged = new Map<string, KgIndication>()
    
    for (const indication of indications) {
      const key = indication.indication.toLowerCase()
      
      if (!merged.has(key)) {
        merged.set(key, indication)
      } else {
        const existing = merged.get(key)!
        const combinedSources = [...new Set([...existing.sources, ...indication.sources])]
        merged.set(key, {
          ...existing,
          sources: combinedSources,
          confidence: calculateConfidence(combinedSources)
        })
      }
    }
    
    return Array.from(merged.values())
  }
  
  /**
   * Deduplicate endpoints
   */
  private deduplicateEndpoints(endpoints: KgEndpoint[]): KgEndpoint[] {
    const merged = new Map<string, KgEndpoint>()
    
    for (const endpoint of endpoints) {
      const key = endpoint.normalized.cleanedTitle.toLowerCase()
      
      if (!merged.has(key)) {
        merged.set(key, endpoint)
      } else {
        const existing = merged.get(key)!
        const combinedSources = [...new Set([...existing.sources, ...endpoint.sources])]
        merged.set(key, {
          ...existing,
          sources: combinedSources,
          confidence: calculateConfidence(combinedSources)
        })
      }
    }
    
    return Array.from(merged.values())
  }
}

/**
 * Build Knowledge Graph for INN
 */
export async function buildKnowledgeGraph(inn: string): Promise<KnowledgeGraphSnapshot> {
  const builder = new KnowledgeGraphBuilder(inn)
  return await builder.build()
}
