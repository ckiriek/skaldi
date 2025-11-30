/**
 * Context Builder Service
 * 
 * Formats aggregated data into structured context for prompts
 * - Prioritizes sources by relevance
 * - Limits by token budget
 * - Formats for readability
 * - Adds source citations
 * 
 * Version: 1.0.0
 * Date: 2025-11-24
 */

import type { AggregatedData } from './data-aggregator.types'
import { generateSampleSizeContext, generateVisitWindowsTable } from '../data/clinical-benchmarks'

// ============================================================================
// TYPES
// ============================================================================

export interface ContextConfig {
  maxTokens: number
  prioritySources: string[]
  includeFullText: boolean
  includeMetadata: boolean
  sectionId: string
  documentType: string
}

export interface FormattedContext {
  text: string
  tokenCount: number
  sourcesUsed: string[]
  sectionsIncluded: string[]
}

// Token estimation: ~4 characters per token
const CHARS_PER_TOKEN = 4

// ============================================================================
// CONTEXT BUILDER CLASS
// ============================================================================

export class ContextBuilder {
  /**
   * Build complete context from aggregated data
   */
  buildContext(
    data: AggregatedData,
    config: ContextConfig
  ): FormattedContext {
    console.log(`🏗️  Building context for ${config.documentType}/${config.sectionId}`)
    
    const sections: string[] = []
    const sourcesUsed: string[] = []
    const sectionsIncluded: string[] = []
    
    // Calculate token budget per source
    const budget = this.calculateBudget(config.maxTokens, config.prioritySources)
    
    // CRITICAL: Add Product Glossary at the VERY TOP of context
    // This ensures the model ALWAYS knows the compound name and key identifiers
    const glossary = this.buildProductGlossary(data)
    if (glossary) {
      sections.push(glossary)
      sectionsIncluded.push('Product Glossary')
    }
    
    // Build context sections in priority order
    if (config.prioritySources.includes('knowledgeGraph') && data.knowledgeGraph) {
      const kg = this.formatKnowledgeGraph(data.knowledgeGraph, budget.knowledgeGraph, config)
      if (kg) {
        sections.push(kg)
        sourcesUsed.push('Knowledge Graph')
        sectionsIncluded.push('Knowledge Graph')
      }
    }
    
    if (config.prioritySources.includes('clinicalTrials') && data.clinicalTrials.totalStudies > 0) {
      const trials = this.formatClinicalTrials(data.clinicalTrials, budget.clinicalTrials, config)
      if (trials) {
        sections.push(trials)
        sourcesUsed.push('ClinicalTrials.gov')
        sectionsIncluded.push('Clinical Trials')
      }
    }
    
    if (config.prioritySources.includes('safetyData') && data.safetyData.faersReports.length > 0) {
      const safety = this.formatSafetyData(data.safetyData, budget.safetyData, config)
      if (safety) {
        sections.push(safety)
        sourcesUsed.push('FAERS')
        sectionsIncluded.push('Safety Data')
      }
    }
    
    if (config.prioritySources.includes('fdaLabels') && data.fdaLabels.labels.length > 0) {
      const labels = this.formatFDALabels(data.fdaLabels, budget.fdaLabels, config)
      if (labels) {
        sections.push(labels)
        sourcesUsed.push('FDA Labels')
        sectionsIncluded.push('FDA Labels')
      }
    }
    
    if (config.prioritySources.includes('literature') && data.literature.pubmedArticles.length > 0) {
      const lit = this.formatLiterature(data.literature, budget.literature, config)
      if (lit) {
        sections.push(lit)
        sourcesUsed.push('PubMed')
        sectionsIncluded.push('Literature')
      }
    }
    
    if (data.ragReferences.structuralExamples.length > 0) {
      const rag = this.formatRAGReferences(data.ragReferences, budget.ragReferences, config)
      if (rag) {
        sections.push(rag)
        sourcesUsed.push('RAG')
        sectionsIncluded.push('RAG References')
      }
    }
    
    if (data.studyDesign) {
      const design = this.formatStudyDesign(data.studyDesign, budget.studyDesign, config)
      if (design) {
        sections.push(design)
        sourcesUsed.push('Study Design')
        sectionsIncluded.push('Study Design')
      }
    }
    
    // Add Study Flow if available (for Protocol, ICF, CSR)
    if (data.studyFlow && data.studyFlow.visits && data.studyFlow.visits.length > 0) {
      const studyFlowText = this.formatStudyFlow(data.studyFlow, budget.studyDesign || 2000, config)
      if (studyFlowText) {
        sections.push(studyFlowText)
        sourcesUsed.push('Study Flow')
        sectionsIncluded.push('Study Flow')
      }
    }
    
    // Add Related Documents for cross-reference (Synopsis → Protocol consistency)
    if (data.relatedDocuments) {
      const relatedText = this.formatRelatedDocuments(data.relatedDocuments, config)
      if (relatedText) {
        sections.push(relatedText)
        sourcesUsed.push('Related Documents')
        sectionsIncluded.push('Related Documents')
      }
      
      // For CRF: Extract specific data from Protocol to fill placeholders
      if (config.documentType === 'CRF' && data.relatedDocuments.protocol) {
        const crfDataText = this.extractCRFDataFromProtocol(data.relatedDocuments.protocol)
        if (crfDataText) {
          sections.push(crfDataText)
          sourcesUsed.push('Protocol-Extracted CRF Data')
          sectionsIncluded.push('CRF Protocol Data')
        }
      }
    }
    
    // Combine all sections
    const text = sections.join('\n\n---\n\n')
    const tokenCount = this.estimateTokens(text)
    
    console.log(`✅ Context built: ${tokenCount} tokens, ${sourcesUsed.length} sources`)
    
    return {
      text,
      tokenCount,
      sourcesUsed,
      sectionsIncluded
    }
  }
  
  // ============================================================================
  // FORMATTING METHODS
  // ============================================================================
  
  private formatKnowledgeGraph(
    kg: AggregatedData['knowledgeGraph'],
    maxTokens: number,
    config: ContextConfig
  ): string | null {
    const parts: string[] = []
    
    parts.push('## KNOWLEDGE GRAPH DATA')
    parts.push(`**Compound:** ${kg.compound_name || 'See Study Design section'}`)
    
    if (kg.inchikey) {
      parts.push(`**InChIKey:** ${kg.inchikey}`)
    }
    
    // Chemistry
    if (kg.chemistry) {
      parts.push('\n### Chemistry')
      if (kg.chemistry.iupac_name) parts.push(`- **IUPAC Name:** ${kg.chemistry.iupac_name}`)
      if (kg.chemistry.molecular_formula) parts.push(`- **Formula:** ${kg.chemistry.molecular_formula}`)
      if (kg.chemistry.molecular_weight) parts.push(`- **MW:** ${kg.chemistry.molecular_weight}`)
    }
    
    // Pharmacology
    if (kg.class) {
      parts.push(`\n### Pharmacological Class\n${kg.class}`)
    }
    
    if (kg.moa) {
      parts.push('\n### Mechanism of Action')
      if (kg.moa.target) parts.push(`- **Target:** ${kg.moa.target}`)
      if (kg.moa.pathway) parts.push(`- **Pathway:** ${kg.moa.pathway}`)
      if (kg.moa.effects) parts.push(`- **Effects:** ${kg.moa.effects.join(', ')}`)
    }
    
    // Indications
    if (kg.indications && kg.indications.length > 0) {
      parts.push('\n### Approved Indications')
      kg.indications.forEach((ind: any) => {
        // Support both formats: ind.name (old) and ind.indication (new KG builder)
        const indicationName = ind.name || ind.indication || 'Unknown'
        const confidence = ind.confidence ? (ind.confidence * 100).toFixed(0) : '?'
        parts.push(`- ${indicationName} (confidence: ${confidence}%)`)
      })
    }
    
    // PK
    if (kg.pharmacokinetics) {
      parts.push('\n### Pharmacokinetics Summary')
      if (kg.pharmacokinetics.absorption) parts.push(`- **Absorption:** Available`)
      if (kg.pharmacokinetics.distribution) parts.push(`- **Distribution:** Available`)
      if (kg.pharmacokinetics.metabolism) parts.push(`- **Metabolism:** Available`)
      if (kg.pharmacokinetics.excretion) parts.push(`- **Excretion:** Available`)
    }
    
    // Safety
    if (kg.safety) {
      parts.push('\n### Safety Summary')
      if (kg.safety.common_aes) parts.push(`- **Common AEs:** ${kg.safety.common_aes.length} events`)
      if (kg.safety.warnings) parts.push(`- **Warnings:** ${kg.safety.warnings.length} warnings`)
    }
    
    // Trials
    if (kg.trials) {
      parts.push(`\n### Clinical Trials: ${kg.trials.total} studies`)
      if (kg.trials.by_phase) {
        Object.entries(kg.trials.by_phase).forEach(([phase, count]) => {
          parts.push(`- ${phase}: ${count} studies`)
        })
      }
    }
    
    const text = parts.join('\n')
    return this.truncateToTokens(text, maxTokens)
  }
  
  private formatClinicalTrials(
    trials: AggregatedData['clinicalTrials'],
    maxTokens: number,
    config: ContextConfig
  ): string | null {
    const parts: string[] = []
    
    parts.push('## CLINICAL TRIALS DATA')
    parts.push(`**Total Studies:** ${trials.totalStudies}`)
    
    // By phase
    if (Object.keys(trials.byPhase).length > 0) {
      parts.push('\n### Studies by Phase')
      Object.entries(trials.byPhase).forEach(([phase, studies]) => {
        parts.push(`\n**${phase}:** ${studies.length} studies`)
        
        // List top 5 studies per phase
        studies.slice(0, 5).forEach(study => {
          parts.push(`\n- **NCT${study.nctId}:** ${study.title}`)
          parts.push(`  - Status: ${study.status}`)
          parts.push(`  - Enrollment: ${study.enrollment}`)
          if (study.primaryEndpoint) parts.push(`  - Primary Endpoint: ${study.primaryEndpoint}`)
          if (study.results?.primaryOutcome) {
            parts.push(`  - Result: ${study.results.primaryOutcome.result}`)
            if (study.results.primaryOutcome.pValue) {
              parts.push(`  - p-value: ${study.results.primaryOutcome.pValue}`)
            }
          }
        })
        
        if (studies.length > 5) {
          parts.push(`  ... and ${studies.length - 5} more studies`)
        }
      })
    }
    
    // Endpoints
    if (trials.endpoints.length > 0) {
      parts.push('\n### Common Endpoints')
      trials.endpoints.slice(0, 10).forEach(ep => {
        parts.push(`- ${ep}`)
      })
      if (trials.endpoints.length > 10) {
        parts.push(`... and ${trials.endpoints.length - 10} more endpoints`)
      }
    }
    
    // Trial Results (statistical data from completed studies)
    if (trials.results && trials.results.length > 0) {
      parts.push('\n### TRIAL RESULTS (Statistical Data)')
      
      trials.results.slice(0, 5).forEach((result: any) => {
        if (!result) return;
        
        parts.push(`\n#### ${result.nct_id || 'Study'}`)
        
        // Participant flow
        if (result.participant_flow?.groups) {
          parts.push('\n**Treatment Groups:**')
          result.participant_flow.groups.slice(0, 4).forEach((g: any) => {
            parts.push(`- ${g.title}: ${g.description || 'N/A'}`)
          })
        }
        
        // Baseline characteristics
        if (result.baseline?.measures) {
          parts.push('\n**Baseline Characteristics:**')
          result.baseline.measures.slice(0, 5).forEach((m: any) => {
            parts.push(`- ${m.title}: ${m.units || ''} (${m.param_type || 'value'})`)
          })
        }
        
        // Outcome measures with statistical results
        if (result.outcomes?.measures) {
          parts.push('\n**Outcome Measures:**')
          result.outcomes.measures.slice(0, 8).forEach((om: any) => {
            parts.push(`\n**${om.type || 'Outcome'}: ${om.title}**`)
            if (om.time_frame) parts.push(`  - Time Frame: ${om.time_frame}`)
            if (om.units) parts.push(`  - Units: ${om.units}`)
            
            // Statistical analyses
            if (om.analyses && om.analyses.length > 0) {
              om.analyses.slice(0, 2).forEach((a: any) => {
                if (a.p_value) parts.push(`  - p-value: ${a.p_value}`)
                if (a.statistical_method) parts.push(`  - Method: ${a.statistical_method}`)
                if (a.ci_lower && a.ci_upper) {
                  parts.push(`  - 95% CI: [${a.ci_lower}, ${a.ci_upper}]`)
                }
              })
            }
          })
        }
        
        // Adverse events from trial results
        if (result.adverse_events) {
          if (result.adverse_events.serious_events?.length > 0) {
            parts.push(`\n**Serious Adverse Events:** ${result.adverse_events.serious_events.length} types`)
            result.adverse_events.serious_events.slice(0, 5).forEach((e: any) => {
              const stats = e.stats?.[0];
              if (stats) {
                parts.push(`- ${e.term}: ${stats.num_affected}/${stats.num_at_risk} (${e.organ_system || ''})`)
              } else {
                parts.push(`- ${e.term} (${e.organ_system || ''})`)
              }
            })
          }
          
          if (result.adverse_events.other_events?.length > 0) {
            parts.push(`\n**Other Adverse Events:** ${result.adverse_events.other_events.length} types (top 10)`)
            result.adverse_events.other_events.slice(0, 10).forEach((e: any) => {
              const stats = e.stats?.[0];
              if (stats) {
                parts.push(`- ${e.term}: ${stats.num_affected}/${stats.num_at_risk}`)
              } else {
                parts.push(`- ${e.term}`)
              }
            })
          }
        }
        
        // Limitations
        if (result.limitations) {
          parts.push(`\n**Limitations:** ${result.limitations}`)
        }
      })
      
      if (trials.results.length > 5) {
        parts.push(`\n... and ${trials.results.length - 5} more studies with results`)
      }
    }
    
    const text = parts.join('\n')
    return this.truncateToTokens(text, maxTokens)
  }
  
  private formatSafetyData(
    safety: AggregatedData['safetyData'],
    maxTokens: number,
    config: ContextConfig
  ): string | null {
    const parts: string[] = []
    
    parts.push('## SAFETY DATA (FAERS)')
    parts.push(`**Total Reports:** ${safety.faersReports.length}`)
    parts.push(`**Deaths:** ${safety.deaths}`)
    
    // Common AEs
    if (safety.commonAdverseEvents.length > 0) {
      parts.push('\n### Common Adverse Events (≥5%)')
      parts.push('\n| Adverse Event | Frequency | Count | Severity |')
      parts.push('|---------------|-----------|-------|----------|')
      
      safety.commonAdverseEvents.slice(0, 20).forEach(ae => {
        parts.push(`| ${ae.term} | ${ae.frequency.toFixed(1)}% | ${ae.count}/${ae.total} | ${ae.severity} |`)
      })
      
      if (safety.commonAdverseEvents.length > 20) {
        parts.push(`\n... and ${safety.commonAdverseEvents.length - 20} more common AEs`)
      }
    }
    
    // Serious AEs
    if (safety.seriousAdverseEvents.length > 0) {
      parts.push('\n### Serious Adverse Events')
      parts.push('\n| Adverse Event | Frequency | Count |')
      parts.push('|---------------|-----------|-------|')
      
      safety.seriousAdverseEvents.slice(0, 15).forEach(ae => {
        parts.push(`| ${ae.term} | ${ae.frequency.toFixed(1)}% | ${ae.count}/${ae.total} |`)
      })
      
      if (safety.seriousAdverseEvents.length > 15) {
        parts.push(`\n... and ${safety.seriousAdverseEvents.length - 15} more serious AEs`)
      }
    }
    
    // Warnings
    if (safety.labelWarnings.length > 0) {
      parts.push('\n### Label Warnings')
      safety.labelWarnings.forEach(warning => {
        parts.push(`- ${warning}`)
      })
    }
    
    const text = parts.join('\n')
    return this.truncateToTokens(text, maxTokens)
  }
  
  private formatFDALabels(
    labels: AggregatedData['fdaLabels'],
    maxTokens: number,
    config: ContextConfig
  ): string | null {
    const parts: string[] = []
    
    parts.push('## FDA LABEL DATA')
    parts.push(`**Total Labels:** ${labels.labels.length}`)
    if (labels.approvalDate) parts.push(`**Latest Approval:** ${labels.approvalDate}`)
    
    // Indications
    if (labels.indications.length > 0) {
      parts.push('\n### Approved Indications')
      labels.indications.forEach(ind => {
        parts.push(`- ${ind}`)
      })
    }
    
    // Sections
    if (Object.keys(labels.sections).length > 0) {
      parts.push('\n### Label Sections Available')
      
      // Priority sections for this document type
      const prioritySections = this.getPrioritySections(config.sectionId)
      
      prioritySections.forEach(sectionKey => {
        if (labels.sections[sectionKey]) {
          parts.push(`\n**${this.formatSectionName(sectionKey)}:**`)
          const content = labels.sections[sectionKey]
          // Truncate long sections
          if (content.length > 1000) {
            parts.push(content.substring(0, 1000) + '...')
          } else {
            parts.push(content)
          }
        }
      })
    }
    
    const text = parts.join('\n')
    return this.truncateToTokens(text, maxTokens)
  }
  
  private formatLiterature(
    lit: AggregatedData['literature'],
    maxTokens: number,
    config: ContextConfig
  ): string | null {
    const parts: string[] = []
    
    parts.push('## LITERATURE (PubMed)')
    parts.push(`**Total Articles:** ${lit.pubmedArticles.length}`)
    
    // Key findings
    if (lit.keyFindings.length > 0) {
      parts.push('\n### Key Findings')
      lit.keyFindings.slice(0, 10).forEach((finding, i) => {
        parts.push(`${i + 1}. ${finding}`)
      })
    }
    
    // Citations
    if (lit.citations.length > 0) {
      parts.push('\n### References')
      lit.citations.slice(0, 20).forEach((cit, i) => {
        parts.push(`${i + 1}. ${cit.authors} (${cit.year}). ${cit.title}. *${cit.journal}*. PMID: ${cit.pmid}`)
      })
      
      if (lit.citations.length > 20) {
        parts.push(`\n... and ${lit.citations.length - 20} more references`)
      }
    }
    
    const text = parts.join('\n')
    return this.truncateToTokens(text, maxTokens)
  }
  
  private formatRAGReferences(
    rag: AggregatedData['ragReferences'],
    maxTokens: number,
    config: ContextConfig
  ): string | null {
    const parts: string[] = []
    
    parts.push('## STRUCTURAL REFERENCE EXAMPLES')
    parts.push('*(Use these for formatting and organization - NOT for copying data)*')
    
    rag.structuralExamples.forEach((example, i) => {
      parts.push(`\n### Example ${i + 1} (from ${example.source})`)
      parts.push(example.content)
      parts.push('---')
    })
    
    const text = parts.join('\n')
    return this.truncateToTokens(text, maxTokens)
  }
  
  private formatStudyDesign(
    design: any,
    maxTokens: number,
    config: ContextConfig
  ): string | null {
    if (!design) return null
    
    const parts: string[] = []
    
    parts.push('## STUDY DESIGN AND PROJECT INFORMATION')
    
    // CRITICAL: Core project information - MUST be first
    parts.push('\n### Core Project Information')
    if (design.compound && design.compound !== 'Unknown') {
      parts.push(`**Compound Name:** ${design.compound}`)
    }
    if (design.indication && design.indication !== 'Unknown') {
      parts.push(`**Indication:** ${design.indication}`)
    }
    if (design.phase && design.phase !== 'Unknown') {
      // Handle both "3" and "Phase 3" formats
      const phaseValue = design.phase.toString().toLowerCase().startsWith('phase') 
        ? design.phase 
        : `Phase ${design.phase}`
      parts.push(`**Study Phase:** ${phaseValue}`)
    }
    if (design.sponsor && design.sponsor !== 'Unknown') {
      parts.push(`**Sponsor:** ${design.sponsor}`)
    }
    if (design.title && design.title !== 'Unknown') {
      parts.push(`**Project Title:** ${design.title}`)
    }
    
    // Formulation details
    if (design.dosage_form || design.route || design.strength) {
      parts.push('\n### Formulation Details')
      if (design.dosage_form) parts.push(`**Dosage Form:** ${design.dosage_form}`)
      if (design.route) parts.push(`**Route of Administration:** ${design.route}`)
      if (design.strength) parts.push(`**Strength:** ${design.strength}`)
    }
    
    // Study design parameters
    parts.push('\n### Study Design Parameters')
    if (design.design_type && design.design_type !== 'Unknown') {
      parts.push(`**Design Type:** ${design.design_type}`)
    }
    if (design.blinding && design.blinding !== 'Unknown') {
      parts.push(`**Blinding:** ${design.blinding}`)
    }
    if (design.arms && design.arms !== 'Unknown') {
      parts.push(`**Number of Arms:** ${design.arms}`)
    }
    if (design.duration_weeks && design.duration_weeks !== 'Unknown') {
      parts.push(`**Treatment Duration:** ${design.duration_weeks} weeks`)
    }
    if (design.sample_size) {
      parts.push(`**Planned Sample Size:** ${design.sample_size}`)
    }
    if (design.population) {
      parts.push(`**Target Population:** ${design.population}`)
    }
    
    // Comparator details - CRITICAL for Synopsis/Protocol
    parts.push('\n### Comparator Information')
    if (design.comparator_type) {
      parts.push(`**Comparator Type:** ${design.comparator_type}`)
    }
    if (design.comparator_name) {
      parts.push(`**Comparator Name:** ${design.comparator_name}`)
    }
    if (design.comparator && design.comparator !== 'Unknown') {
      parts.push(`**Comparator:** ${design.comparator}`)
    }
    
    // Randomization
    if (design.randomization_ratio) {
      parts.push(`**Randomization Ratio:** ${design.randomization_ratio}`)
    }
    
    // Rescue therapy
    if (design.rescue_allowed) {
      parts.push('\n### Rescue Therapy')
      parts.push(`**Rescue Allowed:** ${design.rescue_allowed}`)
      if (design.rescue_criteria) {
        parts.push(`**Rescue Criteria:** ${design.rescue_criteria}`)
      }
    }
    
    // Visit schedule
    if (design.visit_schedule) {
      parts.push('\n### Visit Schedule')
      parts.push(`**Visits:** ${design.visit_schedule}`)
    }
    
    // Safety monitoring
    if (design.safety_monitoring) {
      parts.push('\n### Safety Monitoring')
      parts.push(`**Safety Procedures:** ${design.safety_monitoring}`)
    }
    
    // Analysis populations
    if (design.analysis_populations) {
      parts.push('\n### Analysis Populations')
      parts.push(`**Populations:** ${design.analysis_populations}`)
    }
    
    // Endpoints
    parts.push('\n### Endpoints')
    if (design.primary_endpoint && design.primary_endpoint !== 'Unknown') {
      parts.push(`**Primary Endpoint:** ${design.primary_endpoint}`)
    }
    if (design.secondary_endpoints && design.secondary_endpoints.length > 0) {
      parts.push('**Secondary Endpoints:**')
      const endpoints = Array.isArray(design.secondary_endpoints) 
        ? design.secondary_endpoints 
        : design.secondary_endpoints.split(';').map((s: string) => s.trim())
      endpoints.forEach((ep: string) => {
        if (ep) parts.push(`- ${ep}`)
      })
    }
    
    // Add Sample Size Context for SAP documents
    // Uses clinical benchmarks based on indication and phase
    if (config.documentType === 'SAP' && design.indication && design.phase) {
      parts.push('\n---\n')
      const sampleSizeCtx = generateSampleSizeContext(
        design.indication,
        design.phase,
        design.sample_size,
        design.primary_endpoint
      )
      parts.push(sampleSizeCtx)
      
      // Add visit windows table if schedule is available
      if (design.visit_schedule) {
        parts.push('\n### Visit Windows Table')
        parts.push(generateVisitWindowsTable(design.visit_schedule))
      }
    }
    
    const text = parts.join('\n')
    return this.truncateToTokens(text, maxTokens)
  }
  
  private formatStudyFlow(
    studyFlow: AggregatedData['studyFlow'],
    maxTokens: number,
    config: ContextConfig
  ): string | null {
    if (!studyFlow || !studyFlow.visits || studyFlow.visits.length === 0) return null
    
    const parts: string[] = []
    
    parts.push('## STUDY FLOW (Visit Schedule & Procedures)')
    parts.push(`**Total Duration:** ${studyFlow.totalDuration} days (${Math.round(studyFlow.totalDuration / 7)} weeks)`)
    parts.push(`**Total Visits:** ${studyFlow.visits.length}`)
    parts.push(`**Total Procedures:** ${studyFlow.procedures?.length || 0}`)
    
    // Visit Schedule Table
    parts.push('\n### Visit Schedule')
    parts.push('| Visit | Day | Type | Key Procedures |')
    parts.push('|-------|-----|------|----------------|')
    
    studyFlow.visits.forEach(visit => {
      const keyProcs = visit.procedures.slice(0, 3)
        .map(p => p.replace('proc_', '').replace(/_/g, ' '))
        .join(', ')
      parts.push(`| ${visit.name} | Day ${visit.day} | ${visit.type} | ${keyProcs || 'TBD'} |`)
    })
    
    // Procedures List
    if (studyFlow.procedures && studyFlow.procedures.length > 0) {
      parts.push('\n### Procedures')
      studyFlow.procedures.forEach(proc => {
        parts.push(`- **${proc.name}** (${proc.category})`)
      })
    }
    
    const text = parts.join('\n')
    return this.truncateToTokens(text, maxTokens)
  }
  
  /**
   * Format Related Documents for cross-reference
   * Ensures consistency between Synopsis → Protocol → ICF/CSR
   */
  private formatRelatedDocuments(
    relatedDocs: { synopsis?: string; protocol?: string; ib?: string },
    config: ContextConfig
  ): string | null {
    const parts: string[] = []
    
    parts.push('## RELATED DOCUMENTS (for consistency)')
    parts.push('**CRITICAL: Ensure consistency with these previously generated documents.**')
    parts.push('')
    
    if (relatedDocs.synopsis) {
      parts.push('### Previously Generated Synopsis')
      parts.push('Use this Synopsis as the authoritative source for:')
      parts.push('- Study title and protocol number')
      parts.push('- Primary and secondary objectives/endpoints')
      parts.push('- Study design (randomization, blinding, arms)')
      parts.push('- Sample size and population')
      parts.push('')
      parts.push('```')
      parts.push(relatedDocs.synopsis)
      parts.push('```')
      parts.push('')
    }
    
    if (relatedDocs.protocol) {
      parts.push('### Previously Generated Protocol')
      parts.push('Use this Protocol as the authoritative source for:')
      parts.push('- Detailed procedures and visit schedule')
      parts.push('- Eligibility criteria')
      parts.push('- Safety monitoring requirements')
      parts.push('')
      parts.push('```')
      parts.push(relatedDocs.protocol)
      parts.push('```')
      parts.push('')
    }
    
    if (relatedDocs.ib) {
      parts.push('### Previously Generated Investigator\'s Brochure')
      parts.push('Use this IB as the authoritative source for:')
      parts.push('- Compound pharmacology and mechanism')
      parts.push('- Safety profile and adverse events')
      parts.push('- Clinical study results')
      parts.push('')
      parts.push('```')
      parts.push(relatedDocs.ib)
      parts.push('```')
      parts.push('')
    }
    
    // Only return if we have at least one related document
    if (!relatedDocs.synopsis && !relatedDocs.protocol && !relatedDocs.ib) {
      return null
    }
    
    return parts.join('\n')
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  /**
   * Build Product Glossary - CRITICAL for eliminating placeholders
   * This goes at the TOP of every context to ensure the model knows:
   * - Compound name (never use [INVESTIGATIONAL PRODUCT])
   * - Indication (never use [DATA_NEEDED: indication])
   * - Phase (never use [DATA_NEEDED: phase])
   * - Key identifiers
   */
  private buildProductGlossary(data: AggregatedData): string | null {
    const parts: string[] = []
    
    parts.push('# PRODUCT GLOSSARY — USE THESE VALUES THROUGHOUT')
    parts.push('**DO NOT use placeholders like [INVESTIGATIONAL PRODUCT] or [DATA_NEEDED: Product name]**')
    parts.push('')
    
    // Get compound name from multiple sources (priority order)
    // Note: studyDesign and knowledgeGraph are primary sources
    // FDA labels may have compound info in sections or indications text
    const compoundName = 
      data.studyDesign?.compound ||
      data.knowledgeGraph?.compound_name ||
      null
    
    if (compoundName) {
      parts.push(`**Investigational Product:** ${compoundName}`)
      parts.push(`**Use this name:** "${compoundName}" — NEVER use "[INVESTIGATIONAL PRODUCT]"`)
    }
    
    // Get indication
    const indication = 
      data.studyDesign?.indication ||
      data.knowledgeGraph?.indications?.[0]?.name ||
      data.knowledgeGraph?.indications?.[0]?.indication ||
      data.fdaLabels?.indications?.[0] ||
      null
    
    if (indication) {
      parts.push(`**Indication:** ${indication}`)
    }
    
    // Get phase
    const phase = data.studyDesign?.phase || null
    if (phase) {
      const phaseStr = phase.toString().toLowerCase().startsWith('phase') ? phase : `Phase ${phase}`
      parts.push(`**Study Phase:** ${phaseStr}`)
    }
    
    // Get sponsor
    const sponsor = data.studyDesign?.sponsor || null
    if (sponsor) {
      parts.push(`**Sponsor:** ${sponsor}`)
    }
    
    // FAERS summary (critical for safety sections)
    if (data.safetyData && data.safetyData.faersReports.length > 0) {
      parts.push('')
      parts.push('**FAERS Safety Data Summary:**')
      parts.push(`- Total Reports: ${data.safetyData.faersReports.length}`)
      parts.push(`- Deaths Reported: ${data.safetyData.deaths}`)
      
      // Calculate total exposed from common AEs
      const totalExposed = data.safetyData.commonAdverseEvents?.[0]?.total || 0
      if (totalExposed > 0) {
        parts.push(`- Total Exposed Patients: ${totalExposed}`)
      }
      
      // Top 5 AEs with frequencies
      if (data.safetyData.commonAdverseEvents.length > 0) {
        parts.push('- **Top Adverse Events (USE THESE IN TABLES):**')
        data.safetyData.commonAdverseEvents.slice(0, 5).forEach(ae => {
          parts.push(`  - ${ae.term}: ${ae.frequency.toFixed(1)}% (${ae.count}/${ae.total})`)
        })
      }
    }
    
    // Clinical trials count
    if (data.clinicalTrials && data.clinicalTrials.totalStudies > 0) {
      parts.push('')
      parts.push(`**Clinical Trials:** ${data.clinicalTrials.totalStudies} studies registered`)
      
      // Count by phase
      const phaseCount = Object.entries(data.clinicalTrials.byPhase)
        .map(([p, studies]) => `${p}: ${(studies as any[]).length}`)
        .join(', ')
      if (phaseCount) {
        parts.push(`- By Phase: ${phaseCount}`)
      }
    }
    
    // FDA Label info
    if (data.fdaLabels && data.fdaLabels.labels.length > 0) {
      parts.push('')
      parts.push(`**FDA Label:** Available (${data.fdaLabels.labels.length} label(s))`)
      if (data.fdaLabels.approvalDate) {
        parts.push(`- Approval Date: ${data.fdaLabels.approvalDate}`)
      }
    }
    
    parts.push('')
    parts.push('---')
    parts.push('')
    
    // Only return if we have at least compound name
    if (!compoundName) {
      console.warn('⚠️ No compound name found for Product Glossary')
      return null
    }
    
    return parts.join('\n')
  }

  private calculateBudget(maxTokens: number, prioritySources: string[]): Record<string, number> {
    // Allocate token budget based on priority
    const weights: Record<string, number> = {
      knowledgeGraph: 0.15,
      clinicalTrials: 0.25,
      safetyData: 0.20,
      fdaLabels: 0.20,
      literature: 0.10,
      ragReferences: 0.05,
      studyDesign: 0.05
    }
    
    const budget: Record<string, number> = {}
    
    prioritySources.forEach(source => {
      budget[source] = Math.floor(maxTokens * (weights[source] || 0.1))
    })
    
    return budget
  }
  
  private getPrioritySections(sectionId: string): string[] {
    const map: Record<string, string[]> = {
      // IB sections
      'ib_pharmacokinetics': [
        'clinical_pharmacology',
        'pharmacokinetics',
        'pharmacodynamics',
        'mechanism_of_action',
        'drug_interactions'
      ],
      'ib_clinical_studies': [
        'clinical_studies',
        'clinical_pharmacology',
        'indications_and_usage'
      ],
      'ib_safety': [
        'warnings_and_precautions',
        'adverse_reactions',
        'boxed_warning',
        'contraindications',
        'overdosage',
        'use_in_specific_populations'
      ],
      'ib_introduction': [
        'description',
        'indications_and_usage',
        'clinical_pharmacology'
      ],
      'ib_nonclinical': [
        'nonclinical_toxicology',
        'clinical_pharmacology'
      ],
      // Protocol sections
      'protocol_safety': [
        'warnings_and_precautions',
        'adverse_reactions',
        'boxed_warning'
      ],
      'protocol_background': [
        'description',
        'indications_and_usage',
        'clinical_pharmacology',
        'clinical_studies'
      ],
      'protocol_objectives': [
        'indications_and_usage',
        'clinical_studies'
      ],
      // ICF sections
      'icf_risks': [
        'warnings_and_precautions',
        'adverse_reactions',
        'boxed_warning'
      ],
      // CSR sections
      'csr_efficacy': [
        'clinical_studies',
        'indications_and_usage'
      ],
      'csr_safety': [
        'adverse_reactions',
        'warnings_and_precautions',
        'boxed_warning'
      ]
    }
    
    return map[sectionId] || [
      'indications_and_usage',
      'clinical_pharmacology',
      'adverse_reactions',
      'warnings_and_precautions',
      'clinical_studies'
    ]
  }
  
  private formatSectionName(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN)
  }
  
  private truncateToTokens(text: string, maxTokens: number): string {
    const maxChars = maxTokens * CHARS_PER_TOKEN
    if (text.length <= maxChars) return text
    
    return text.substring(0, maxChars) + '\n\n[... truncated for token limit ...]'
  }

  /**
   * Extract CRF-specific data from Protocol document
   * This provides concrete values to fill CRF placeholders
   */
  private extractCRFDataFromProtocol(protocolContent: string): string | null {
    const parts: string[] = []
    
    parts.push('## CRF DATA EXTRACTED FROM PROTOCOL')
    parts.push('**CRITICAL: Use these EXACT values from the Protocol. DO NOT use [DATA_NEEDED] placeholders.**')
    parts.push('')

    // Extract Visit Schedule
    const visitScheduleMatch = protocolContent.match(/visit\s*schedule[^]*?(?=\n##|\n#\s|$)/i)
    if (visitScheduleMatch) {
      parts.push('### Visit Schedule (from Protocol)')
      parts.push(visitScheduleMatch[0].substring(0, 3000))
      parts.push('')
    }

    // Extract Screening Window
    const screeningMatch = protocolContent.match(/screening\s*(?:visit|period|window)[^]*?(?:day\s*-?\d+[^]*?day\s*-?\d+|within\s*\d+\s*(?:days|weeks))/i)
    if (screeningMatch) {
      parts.push('### Screening Window')
      parts.push(screeningMatch[0])
      parts.push('')
    }

    // Extract EDSS criteria (for MS studies)
    const edssMatch = protocolContent.match(/EDSS[^]*?(?:\d+\.?\d*\s*(?:to|–|-)\s*\d+\.?\d*|\d+\.?\d*\s*or\s*(?:less|lower|below))/i)
    if (edssMatch) {
      parts.push('### EDSS Inclusion Criteria')
      parts.push(edssMatch[0])
      parts.push('')
    }

    // Extract Inclusion Criteria
    const inclusionMatch = protocolContent.match(/inclusion\s*criteria[^]*?(?=exclusion\s*criteria|##|$)/i)
    if (inclusionMatch) {
      parts.push('### Inclusion Criteria')
      parts.push(inclusionMatch[0].substring(0, 4000))
      parts.push('')
    }

    // Extract Exclusion Criteria
    const exclusionMatch = protocolContent.match(/exclusion\s*criteria[^]*?(?=##|\n#\s|study\s*procedures|$)/i)
    if (exclusionMatch) {
      parts.push('### Exclusion Criteria')
      parts.push(exclusionMatch[0].substring(0, 4000))
      parts.push('')
    }

    // Extract Relapse Definition (for MS studies)
    const relapseMatch = protocolContent.match(/(?:relapse|exacerbation)\s*(?:definition|criteria)[^]*?(?:\d+\s*hours?|\d+\s*days?)/i)
    if (relapseMatch) {
      parts.push('### Relapse Definition')
      parts.push(relapseMatch[0])
      parts.push('')
    }

    // Extract Laboratory Assessments
    const labMatch = protocolContent.match(/laboratory\s*(?:assessments?|tests?|parameters?)[^]*?(?=\n##|\n#\s|vital\s*signs|$)/i)
    if (labMatch) {
      parts.push('### Laboratory Assessments')
      parts.push(labMatch[0].substring(0, 2000))
      parts.push('')
    }

    // Extract Vital Signs
    const vitalMatch = protocolContent.match(/vital\s*signs?[^]*?(?=\n##|\n#\s|physical\s*exam|$)/i)
    if (vitalMatch) {
      parts.push('### Vital Signs')
      parts.push(vitalMatch[0].substring(0, 1500))
      parts.push('')
    }

    // Extract Washout Periods
    const washoutMatch = protocolContent.match(/washout\s*(?:period|requirement)?[^]*?(?:\d+\s*(?:days?|weeks?|months?))/i)
    if (washoutMatch) {
      parts.push('### Washout Periods')
      parts.push(washoutMatch[0])
      parts.push('')
    }

    // Extract Prohibited Medications
    const prohibitedMatch = protocolContent.match(/prohibited\s*(?:medications?|therapies?|treatments?)[^]*?(?=\n##|\n#\s|$)/i)
    if (prohibitedMatch) {
      parts.push('### Prohibited Medications')
      parts.push(prohibitedMatch[0].substring(0, 2000))
      parts.push('')
    }

    // Extract Rescue Therapy
    const rescueMatch = protocolContent.match(/rescue\s*(?:therapy|medication|treatment)[^]*?(?=\n##|\n#\s|$)/i)
    if (rescueMatch) {
      parts.push('### Rescue Therapy')
      parts.push(rescueMatch[0].substring(0, 1500))
      parts.push('')
    }

    // Extract Dosing Information
    const dosingMatch = protocolContent.match(/(?:dose|dosing|dosage)[^]*?(?:\d+\s*mg[^]*?(?:daily|once|twice|weekly))/i)
    if (dosingMatch) {
      parts.push('### Dosing Information')
      parts.push(dosingMatch[0])
      parts.push('')
    }

    // Extract Injection Site (for injectable products)
    const injectionMatch = protocolContent.match(/injection\s*site[^]*?(?:abdomen|thigh|arm|hip|deltoid)/i)
    if (injectionMatch) {
      parts.push('### Injection Sites')
      parts.push(injectionMatch[0])
      parts.push('')
    }

    // If we found any data, return it
    if (parts.length > 3) {
      parts.push('')
      parts.push('---')
      parts.push('**INSTRUCTION: Use the above extracted data to fill ALL CRF fields. Do NOT use [DATA_NEEDED] placeholders when data is available above.**')
      return parts.join('\n')
    }

    return null
  }
}
