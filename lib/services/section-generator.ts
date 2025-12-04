import { createClient } from '@/lib/supabase/server'
import fs from 'fs/promises'
import path from 'path'
import { ReferenceRetriever } from './reference-retriever'
import { DataAggregator } from './data-aggregator'
import { ContextBuilder } from './context-builder'
import { TokenBudgetCalculator } from './token-budget'
import { GOVERNING_SYSTEM_PROMPT_V3 } from '@/lib/prompts/governing-prompt-v3'
import { IB_SECTION_PROMPTS_V4 } from '@/lib/prompts/ib-prompts-v4'
import { IBEnrichmentService } from './ib-enrichment'
import { IBValidator } from './ib-validator'
import { PROTOCOL_SECTION_PROMPTS } from '@/lib/prompts/protocol-prompts'
import { CSR_SECTION_PROMPTS } from '@/lib/prompts/csr-prompts'
import { ICF_SECTION_PROMPTS } from '@/lib/prompts/icf-prompts'
import { SYNOPSIS_SECTION_PROMPTS } from '@/lib/prompts/synopsis-prompts'
import { SPC_SECTION_PROMPTS } from '@/lib/prompts/spc-prompts'
import { SAP_SECTION_PROMPTS } from '@/lib/prompts/sap-prompts'
import { CRF_SECTION_PROMPTS } from '@/lib/prompts/crf-prompts'

// Types based on our schema
export interface DocumentStructure {
  id: string
  section_id: string
  parent_section_id: string | null
  order_index: number
  title: string
  level: number
}

export interface DocumentTemplate {
  id: string
  section_id: string
  template_content: string | null
  prompt_text: string | null
  expected_inputs: string[]
  constraints: string[]
  version: number
}

export interface GenerationRequest {
  projectId: string
  documentType: string
  sectionId?: string // If null, generate whole document (sequential)
  inputs: Record<string, any>
}

export class SectionGenerator {
  private templatesDir: string
  private dataAggregator: DataAggregator
  private contextBuilder: ContextBuilder
  private tokenCalculator: TokenBudgetCalculator
  private ibEnrichment: IBEnrichmentService
  private ibValidator: IBValidator

  constructor() {
    // In production, we might fetch from DB only. 
    // For now, we can fallback to filesystem if DB is empty or for dev speed.
    this.templatesDir = path.join(process.cwd(), 'templates_en')
    
    // Initialize new services
    this.dataAggregator = new DataAggregator()
    this.contextBuilder = new ContextBuilder()
    this.tokenCalculator = new TokenBudgetCalculator()
    this.ibEnrichment = new IBEnrichmentService()
    this.ibValidator = new IBValidator()
  }

  /**
   * Get the Table of Contents (Structure) for a document type
   */
  async getDocumentStructure(documentType: string): Promise<DocumentStructure[]> {
    const supabase = await createClient()
    
    // Normalize to lowercase to match database convention
    const normalizedType = documentType.toLowerCase()
    
    const { data, error } = await supabase
      .from('document_structure')
      .select('*')
      .eq('document_type_id', normalizedType)
      .order('order_index', { ascending: true })

    if (error) {
      console.error(`Error fetching structure for ${documentType}:`, error)
      throw new Error(`Failed to fetch document structure: ${error.message}`)
    }

    return data || []
  }

  /**
   * Load a template for a specific section
   * Strategy: Try DB first, fallback to FS (or specific logic)
   */
  async getTemplate(documentType: string, sectionId: string): Promise<DocumentTemplate | null> {
    const supabase = await createClient()

    // Normalize to lowercase to match database convention
    const normalizedType = documentType.toLowerCase()

    // 1. Try DB
    const { data: dbTemplate, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('document_type_id', normalizedType)
      .eq('section_id', sectionId)
      .eq('is_active', true)
      .single()

    if (dbTemplate) {
      return {
        id: dbTemplate.id,
        section_id: dbTemplate.section_id,
        template_content: dbTemplate.template_content,
        prompt_text: dbTemplate.prompt_text,
        expected_inputs: dbTemplate.expected_inputs,
        constraints: dbTemplate.constraints,
        version: dbTemplate.version
      }
    }

    // 2. Fallback to File System (templates_en)
    // This is useful during development before we seed the DB fully
    try {
      const filePath = path.join(this.templatesDir, normalizedType, `${sectionId.replace(`${normalizedType}_`, '')}.json`)
      // Mapping: protocol_synopsis -> templates_en/protocol/synopsis.json
      // We need a smarter mapping if IDs don't match filenames exactly.
      // Current convention: section_id = "protocol_synopsis", file = "synopsis.json" inside "protocol/" folder?
      
      // Let's try to find the file by walking the directory or simple convention
      const simpleName = sectionId.replace(`${normalizedType}_`, '') // e.g. 'synopsis'
      const distinctPath = path.join(this.templatesDir, normalizedType, `${simpleName}.json`)
      
      const fileContent = await fs.readFile(distinctPath, 'utf-8')
      const json = JSON.parse(fileContent)

      return {
        id: 'fs-fallback',
        section_id: sectionId,
        template_content: null, // JSONs currently don't have handlebars content, mostly prompt_text
        prompt_text: json.prompt_text,
        expected_inputs: json.expected_inputs,
        constraints: json.constraints,
        version: json.version
      }

    } catch (fsError) {
      console.warn(`Template not found in FS for ${documentType}/${sectionId}`)
      return null
    }
  }

  /**
   * Construct the final prompt for the LLM
   * 
   * ARCHITECTURE:
   * 1. Template prompt_text with placeholders
   * 2. STRUCTURE EXAMPLES from RAG (universal, not compound-specific)
   * 3. COMPOUND DATA from Knowledge Graph (specific to this drug)
   * 4. Clear instruction to use structure but write about actual compound
   */
  async constructPrompt(
    template: DocumentTemplate, 
    context: Record<string, any>,
    options?: {
      includeReferences?: boolean
      sectionId?: string
      documentType?: string
      knowledgeGraph?: any  // Knowledge Graph data for this compound
    }
  ): Promise<string> {
    let prompt = template.prompt_text || ''
    
    // 1. Simple variable substitution (Handlebars-like)
    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{{${key}}}`
      prompt = prompt.split(placeholder).join(String(value || ''))
    }

    // 2. Add STRUCTURE EXAMPLES from RAG (universal examples)
    if (options?.includeReferences !== false) {
      try {
        const retriever = new ReferenceRetriever()
        const references = await retriever.retrieveReferences({
          sectionId: options?.sectionId,
          documentType: options?.documentType,
          topK: 2,  // Just 1-2 structure examples
          minSimilarity: 0.6,
        })

        if (references.combined.length > 0) {
          const structureExamples = retriever.formatReferencesForPrompt(references.combined)
          prompt += structureExamples
          console.log(`✅ Added ${references.combined.length} structure examples to prompt`)
        } else {
          console.log(`⚠️ No structure examples found for ${options?.documentType}/${options?.sectionId}`)
        }
      } catch (error) {
        console.error('❌ Error retrieving structure examples:', error)
      }
    }

    // 3. Add KNOWLEDGE GRAPH DATA (compound-specific)
    if (options?.knowledgeGraph && context.knowledgeGraph) {
      prompt += this.formatKnowledgeGraphForPrompt(context.knowledgeGraph, context.compoundName)
    }

    // 4. Add explicit instruction
    prompt += `\n\n**CRITICAL INSTRUCTION:**
Write about the ACTUAL compound ${context.compoundName || '[compound]'}.
- Use the STRUCTURE from examples above (formatting, length, organization)
- Use ACTUAL DATA for ${context.compoundName || '[compound]'} from Knowledge Graph
- DO NOT copy data from structure examples - they are just for format reference
- Include specific values, statistics, and references where available\n`

    // Add constraints as system instructions
    if (template.constraints && template.constraints.length > 0) {
        prompt += `\n\nCONSTRAINTS:\n`
        template.constraints.forEach(c => prompt += `- ${c}\n`)
    }

    return prompt
  }

  /**
   * Format Knowledge Graph data for prompt
   */
  private formatKnowledgeGraphForPrompt(kg: any, compoundName?: string): string {
    if (!kg) return ''
    
    let kgText = `\n\n**KNOWLEDGE GRAPH DATA FOR ${compoundName || 'THIS COMPOUND'}:**\n\n`
    
    if (kg.indications && kg.indications.length > 0) {
      kgText += '**Approved Indications:**\n'
      kg.indications.forEach((ind: any) => {
        // Support both formats: ind.name (old) and ind.indication (new KG builder)
        const indicationName = ind.name || ind.indication || 'Unknown'
        const confidence = ind.confidence ? (ind.confidence * 100).toFixed(0) : '?'
        kgText += `- ${indicationName} (confidence: ${confidence}%)\n`
      })
      kgText += '\n'
    }
    
    if (kg.endpoints && kg.endpoints.length > 0) {
      kgText += '**Common Endpoints:**\n'
      kg.endpoints.forEach((ep: any) => {
        // Support both formats: ep.name (old) and ep.normalized (new KG builder)
        const endpointName = ep.name || ep.normalized || 'Unknown'
        const endpointType = ep.type || ''
        kgText += `- ${endpointName}${endpointType ? ` (${endpointType})` : ''}\n`
      })
      kgText += '\n'
    }
    
    if (kg.procedures && kg.procedures.length > 0) {
      kgText += '**Typical Procedures:**\n'
      kg.procedures.forEach((proc: any) => {
        kgText += `- ${proc.name}\n`
      })
      kgText += '\n'
    }
    
    if (kg.eligibility && kg.eligibility.length > 0) {
      kgText += '**Eligibility Patterns:**\n'
      kg.eligibility.forEach((elig: any) => {
        kgText += `- ${elig.criterion}\n`
      })
      kgText += '\n'
    }
    
    return kgText
  }

  /**
   * NEW METHOD: Generate section with FULL data integration
   * Uses Data Aggregator, Context Builder, and new prompts
   */
  async generateSectionWithFullData(
    projectId: string,
    documentType: string,
    sectionId: string
  ): Promise<{
    systemPrompt: string
    userPrompt: string
    config: {
      max_completion_tokens: number
      reasoning_effort: string
      verbosity: string
    }
    metadata: {
      sourcesUsed: string[]
      tokenBudget: any
    }
  }> {
    console.log(`🚀 Generating ${documentType}/${sectionId} with FULL data integration`)

    // 1. Get section configuration (with fallback)
    let sectionConfig = this.tokenCalculator.getSectionConfig(documentType, sectionId)
    if (!sectionConfig) {
      console.warn(`⚠️  No config for ${documentType}/${sectionId}, using default`)
      // Create a default config for unknown sections
      sectionConfig = {
        sectionId,
        sectionTitle: sectionId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        targetPages: 3,
        targetTokens: 2000,
        contextTokens: 3000,
        completionTokens: 2000,
        reasoning_effort: 'high' as const,
        verbosity: 'high' as const,
        dataSources: ['studyDesign', 'knowledgeGraph'],
        priority: []
      }
    }

    // 2. Token budget - NO LONGER USED, keeping for metadata only
    // All sections now get unlimited context and 16000 completion tokens
    console.log(`💰 Token budget: UNLIMITED (no restrictions)`)

    // 3. Aggregate ALL data
    console.log(`📊 Aggregating data from all sources...`)
    const aggregatedData = await this.dataAggregator.aggregateForSection(
      projectId,
      documentType,
      sectionId
    )
    
    console.log(`📊 Aggregated data summary:`)
    console.log(`   - KG compound: ${aggregatedData.knowledgeGraph?.compound_name || 'none'}`)
    console.log(`   - Clinical trials: ${aggregatedData.clinicalTrials.totalStudies}`)
    console.log(`   - Safety reports: ${aggregatedData.safetyData.faersReports.length}`)
    console.log(`   - FDA labels: ${aggregatedData.fdaLabels.labels.length}`)
    console.log(`   - Literature: ${aggregatedData.literature.pubmedArticles.length}`)
    console.log(`   - RAG refs: ${aggregatedData.ragReferences.structuralExamples.length}`)

    // 4. Build formatted context
    // NO TOKEN LIMIT - include ALL available data, let the model use what it needs
    console.log(`🏗️  Building formatted context (NO TOKEN LIMIT)...`)
    const formattedContext = this.contextBuilder.buildContext(aggregatedData, {
      maxTokens: 100000,  // Effectively unlimited - include ALL data
      prioritySources: ['studyDesign', 'knowledgeGraph', 'clinicalTrials', 'safetyData', 'fdaLabels', 'literature', 'ragReferences'],  // ALL sources
      includeFullText: true,  // Include full text, not truncated
      includeMetadata: true,
      sectionId,
      documentType
    })

    console.log(`✅ Context built: ${formattedContext.tokenCount} tokens, ${formattedContext.sourcesUsed.length} sources`)
    
    // DEBUG: Log actual context content
    console.log(`📝 CONTEXT TEXT (first 2000 chars):`)
    console.log(formattedContext.text.substring(0, 2000))
    console.log(`--- END CONTEXT PREVIEW ---`)

    // 5. Get section-specific prompt
    const sectionPrompt = this.getSectionPrompt(documentType, sectionId)

    // 6. Extract key identifiers for prompt substitution
    // These MUST be substituted to eliminate placeholders like [INVESTIGATIONAL PRODUCT]
    // Primary sources: studyDesign (from project) and knowledgeGraph (from enrichment)
    const compoundName = 
      aggregatedData.studyDesign?.compound ||
      aggregatedData.knowledgeGraph?.compound_name ||
      '[Compound Name Not Available]'
    
    const indication = 
      aggregatedData.studyDesign?.indication ||
      aggregatedData.knowledgeGraph?.indications?.[0]?.name ||
      aggregatedData.knowledgeGraph?.indications?.[0]?.indication ||
      aggregatedData.fdaLabels?.indications?.[0] ||
      '[Indication Not Specified]'
    
    const phase = aggregatedData.studyDesign?.phase || '[Phase Not Specified]'
    const phaseStr = phase.toString().toLowerCase().startsWith('phase') ? phase : `Phase ${phase}`
    
    console.log(`🏷️  Product identifiers for prompt:`)
    console.log(`   - Compound: ${compoundName}`)
    console.log(`   - Indication: ${indication}`)
    console.log(`   - Phase: ${phaseStr}`)

    // 7. Substitute variables in section prompt
    // NOTE: Token budgeting REMOVED - model decides output length based on content needs
    const userPrompt = sectionPrompt
      .replace(/\{\{dataContext\}\}/g, formattedContext.text)
      .replace(/\{\{compoundName\}\}/g, compoundName)
      .replace(/\{\{indication\}\}/g, indication)
      .replace(/\{\{phase\}\}/g, phaseStr)

    // 8. Return complete prompt package
    // NO TOKEN BUDGETING - model decides how much to write based on:
    // - Section complexity and regulatory requirements
    // - Available data richness
    // - Clinical documentation standards
    // max_completion_tokens is set high to allow full content generation
    const UNIFIED_MAX_TOKENS = 64000 // High limit - model self-regulates output length
    
    return {
      systemPrompt: GOVERNING_SYSTEM_PROMPT_V3,
      userPrompt,
      config: {
        max_completion_tokens: UNIFIED_MAX_TOKENS, // Includes reasoning + content tokens
        reasoning_effort: 'medium', // Medium for clinical docs - reduces overthinking
        verbosity: 'high' // Keep high for completeness
      },
      metadata: {
        sourcesUsed: formattedContext.sourcesUsed,
        tokenBudget: { total: 'unlimited', prompt: 'unlimited', completion: 16000 }
      }
    }
  }

  /**
   * Get section-specific prompt from new prompt library
   * IB uses v4 prompts with strict structure and no placeholders
   */
  private getSectionPrompt(documentType: string, sectionId: string): string {
    const prompts: Record<string, Record<string, string>> = {
      'IB': IB_SECTION_PROMPTS_V4,  // Use v4 prompts for IB
      'Protocol': PROTOCOL_SECTION_PROMPTS,
      'CSR': CSR_SECTION_PROMPTS,
      'ICF': ICF_SECTION_PROMPTS,
      'Synopsis': SYNOPSIS_SECTION_PROMPTS,
      'SPC': SPC_SECTION_PROMPTS,
      'SAP': SAP_SECTION_PROMPTS,
      'CRF': CRF_SECTION_PROMPTS
    }

    const docPrompts = prompts[documentType]
    if (!docPrompts) {
      console.warn(`⚠️  No prompts found for document type: ${documentType}`)
      return 'Generate the section based on provided data.'
    }

    const prompt = docPrompts[sectionId]
    if (!prompt) {
      console.warn(`⚠️  No prompt found for section: ${sectionId}`)
      return 'Generate the section based on provided data.'
    }

    return prompt
  }

  /**
   * Validate and auto-fix IB content
   */
  validateIBContent(content: string, context?: {
    compoundName?: string
    indication?: string
    phase?: string
  }): { isValid: boolean; fixedContent: string; issues: any[] } {
    // First validate
    const validation = this.ibValidator.validate(content)
    
    if (!validation.isValid || validation.summary.placeholders > 0) {
      // Auto-fix if there are issues
      const fixResult = this.ibValidator.autoFix(content, {
        ...context,
        drugClass: 'DEFAULT' // Will be detected from compound name
      })
      
      return {
        isValid: fixResult.remainingIssues.filter(i => i.type === 'error').length === 0,
        fixedContent: fixResult.fixedContent,
        issues: fixResult.remainingIssues
      }
    }
    
    return {
      isValid: true,
      fixedContent: content,
      issues: validation.issues
    }
  }

  /**
   * Get IB-specific enrichment data
   * This provides structured data for IB generation including:
   * - Label data (PK, PD, warnings, AE)
   * - Toxicology profile
   * - CMC data
   * - PK/PD data
   * - Relevant trials (filtered by indication)
   */
  async getIBEnrichment(
    projectId: string,
    drugName: string,
    indication: string,
    phase: string
  ) {
    return this.ibEnrichment.enrichForIB(projectId, drugName, indication, phase)
  }
}
