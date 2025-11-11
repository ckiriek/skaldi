/**
 * Composer Agent
 * 
 * Responsible for:
 * 1. Template selection based on document type and product type
 * 2. Data fetching from Regulatory Data Layer
 * 3. Context preparation for template rendering
 * 4. Orchestration of template engine
 * 
 * Version: 1.0.0
 * Date: 2025-11-11
 */

import { createClient } from '@/lib/supabase/client'
import { TemplateEngine } from '@/lib/template-engine'

// ============================================================================
// TYPES
// ============================================================================

export type DocumentType = 
  | 'investigator_brochure'
  | 'clinical_protocol'
  | 'informed_consent'
  | 'study_synopsis'

export type ProductType = 'innovator' | 'generic' | 'hybrid'

export interface ComposerRequest {
  project_id: string
  document_type: DocumentType
  sections?: string[] // Optional: specific sections to generate
}

export interface ComposerContext {
  // Project data
  project_id: string
  product_type: ProductType
  compound_name: string
  generic_name?: string
  rld_brand_name?: string
  rld_application_number?: string
  te_code?: string
  inchikey?: string
  
  // Regulatory data
  compound?: any
  product?: any
  labels?: any[]
  clinical_summary?: any
  nonclinical_summary?: any
  trials?: any[]
  adverse_events?: any[]
  literature?: any[]
  
  // Metadata
  enrichment_status?: string
  enrichment_metadata?: any
  generated_at: string
}

export interface ComposerResult {
  success: boolean
  document_type: DocumentType
  sections_generated: string[]
  content: Record<string, string> // section_id -> rendered content
  context: ComposerContext
  errors?: Array<{
    section: string
    error: string
  }>
  duration_ms: number
}

// ============================================================================
// TEMPLATE MAPPINGS
// ============================================================================

const IB_GENERIC_SECTIONS = {
  'section-1': 'ib-generic-section-1-product-info', // ✅ Complete
  'section-2': 'ib-generic-section-2-introduction', // ✅ Complete
  'section-3': 'ib-generic-section-3-physical-chemical', // ✅ Complete
  'section-4': 'ib-generic-section-4-nonclinical', // ✅ Complete
  'section-5': 'ib-generic-section-5-clinical-pharmacology', // ✅ Complete
  'section-6': 'ib-generic-section-6-safety', // ✅ Complete
  'section-7': 'ib-generic-section-7-efficacy', // ✅ Complete
  'section-8': 'ib-generic-section-8-marketed-experience', // ⏳ Coming soon
  'section-9': 'ib-generic-section-9-summary', // ⏳ Coming soon
  'section-10': 'ib-generic-section-10-references', // ⏳ Coming soon
}

const IB_INNOVATOR_SECTIONS = {
  // Future: innovator-specific templates
  ...IB_GENERIC_SECTIONS,
}

const TEMPLATE_MAPPINGS: Record<DocumentType, Record<ProductType, Record<string, string>>> = {
  investigator_brochure: {
    generic: IB_GENERIC_SECTIONS,
    innovator: IB_INNOVATOR_SECTIONS,
    hybrid: IB_GENERIC_SECTIONS, // Use generic as default
  },
  clinical_protocol: {
    // Future: protocol templates
    generic: {},
    innovator: {},
    hybrid: {},
  },
  informed_consent: {
    // Future: ICF templates
    generic: {},
    innovator: {},
    hybrid: {},
  },
  study_synopsis: {
    // Future: synopsis templates
    generic: {},
    innovator: {},
    hybrid: {},
  },
}

// ============================================================================
// COMPOSER AGENT
// ============================================================================

export class ComposerAgent {
  private supabase = createClient()
  private templateEngine = new TemplateEngine()

  /**
   * Main composition method
   */
  async compose(request: ComposerRequest): Promise<ComposerResult> {
    const startTime = Date.now()
    
    console.log(`🎼 Composer Agent: Starting composition for project ${request.project_id}`)

    try {
      // 1. Fetch project data
      const project = await this.fetchProject(request.project_id)
      
      if (!project) {
        throw new Error(`Project not found: ${request.project_id}`)
      }

      // 2. Build context
      const context = await this.buildContext(project)

      // 3. Select templates
      const templates = this.selectTemplates(
        request.document_type,
        project.product_type as ProductType,
        request.sections
      )

      console.log(`📋 Selected ${Object.keys(templates).length} templates`)

      // 4. Render sections
      const content: Record<string, string> = {}
      const errors: Array<{ section: string; error: string }> = []

      for (const [sectionId, templateName] of Object.entries(templates)) {
        try {
          console.log(`🎨 Rendering section: ${sectionId} (${templateName})`)
          const rendered = await this.templateEngine.render(templateName, context)
          content[sectionId] = rendered
        } catch (error) {
          console.error(`❌ Error rendering ${sectionId}:`, error)
          errors.push({
            section: sectionId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      const duration = Date.now() - startTime

      console.log(`✅ Composer Agent: Completed in ${duration}ms`)
      console.log(`📊 Generated ${Object.keys(content).length}/${Object.keys(templates).length} sections`)

      return {
        success: errors.length === 0,
        document_type: request.document_type,
        sections_generated: Object.keys(content),
        content,
        context,
        errors: errors.length > 0 ? errors : undefined,
        duration_ms: duration,
      }

    } catch (error) {
      console.error('Composer Agent error:', error)
      
      return {
        success: false,
        document_type: request.document_type,
        sections_generated: [],
        content: {},
        context: {
          project_id: request.project_id,
          product_type: 'generic',
          compound_name: '',
          generated_at: new Date().toISOString(),
        },
        errors: [{
          section: 'general',
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
        duration_ms: Date.now() - startTime,
      }
    }
  }

  /**
   * Fetch project from database
   */
  private async fetchProject(projectId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error) {
      console.error('Error fetching project:', error)
      throw new Error(`Failed to fetch project: ${error.message}`)
    }

    return data
  }

  /**
   * Build complete context for template rendering
   */
  private async buildContext(project: any): Promise<ComposerContext> {
    console.log(`🔨 Building context for project ${project.id}`)

    const context: ComposerContext = {
      // Project data
      project_id: project.id,
      product_type: project.product_type,
      compound_name: project.compound_name,
      generic_name: project.generic_name,
      rld_brand_name: project.rld_brand_name,
      rld_application_number: project.rld_application_number,
      te_code: project.te_code,
      inchikey: project.inchikey,
      enrichment_status: project.enrichment_status,
      enrichment_metadata: project.enrichment_metadata,
      generated_at: new Date().toISOString(),
    }

    // If no InChIKey, return basic context
    if (!project.inchikey) {
      console.warn('⚠️ No InChIKey found, returning basic context')
      return context
    }

    // Fetch regulatory data
    try {
      // Compound
      const { data: compound } = await this.supabase
        .from('compounds')
        .select('*')
        .eq('inchikey', project.inchikey)
        .single()
      
      if (compound) {
        context.compound = compound
        console.log('✅ Loaded compound data')
      }

      // Labels
      const { data: labels } = await this.supabase
        .from('labels')
        .select('*')
        .eq('inchikey', project.inchikey)
        .order('effective_date', { ascending: false })
      
      if (labels && labels.length > 0) {
        context.labels = labels
        console.log(`✅ Loaded ${labels.length} label(s)`)
      }

      // Clinical summary
      const { data: clinicalSummary } = await this.supabase
        .from('clinical_summaries')
        .select('*')
        .eq('inchikey', project.inchikey)
        .single()
      
      if (clinicalSummary) {
        context.clinical_summary = clinicalSummary
        console.log('✅ Loaded clinical summary')
      }

      // Nonclinical summary
      const { data: nonclinicalSummary } = await this.supabase
        .from('nonclinical_summaries')
        .select('*')
        .eq('inchikey', project.inchikey)
        .single()
      
      if (nonclinicalSummary) {
        context.nonclinical_summary = nonclinicalSummary
        console.log('✅ Loaded nonclinical summary')
      }

      // Trials
      const { data: trials } = await this.supabase
        .from('trials')
        .select('*')
        .eq('inchikey', project.inchikey)
        .order('start_date', { ascending: false })
        .limit(10)
      
      if (trials && trials.length > 0) {
        context.trials = trials
        console.log(`✅ Loaded ${trials.length} trial(s)`)
      }

      // Adverse events
      const { data: adverseEvents } = await this.supabase
        .from('adverse_events')
        .select('*')
        .eq('inchikey', project.inchikey)
        .order('incidence_pct', { ascending: false })
        .limit(20)
      
      if (adverseEvents && adverseEvents.length > 0) {
        context.adverse_events = adverseEvents
        console.log(`✅ Loaded ${adverseEvents.length} adverse event(s)`)
      }

      // Literature
      const { data: literature } = await this.supabase
        .from('literature')
        .select('*')
        .eq('inchikey', project.inchikey)
        .order('publication_date', { ascending: false })
        .limit(20)
      
      if (literature && literature.length > 0) {
        context.literature = literature
        console.log(`✅ Loaded ${literature.length} literature reference(s)`)
      }

    } catch (error) {
      console.error('Error fetching regulatory data:', error)
      // Continue with partial context
    }

    console.log(`✅ Context built successfully`)
    return context
  }

  /**
   * Select templates based on document type and product type
   */
  private selectTemplates(
    documentType: DocumentType,
    productType: ProductType,
    requestedSections?: string[]
  ): Record<string, string> {
    const allTemplates = TEMPLATE_MAPPINGS[documentType]?.[productType] || {}

    // If specific sections requested, filter
    if (requestedSections && requestedSections.length > 0) {
      const filtered: Record<string, string> = {}
      for (const section of requestedSections) {
        if (allTemplates[section]) {
          filtered[section] = allTemplates[section]
        }
      }
      return filtered
    }

    // Return all templates for this document type
    return allTemplates
  }

  /**
   * Get available sections for a document type
   */
  getAvailableSections(documentType: DocumentType, productType: ProductType): string[] {
    const templates = TEMPLATE_MAPPINGS[documentType]?.[productType] || {}
    return Object.keys(templates)
  }

  /**
   * Check if templates are available for a document type
   */
  hasTemplates(documentType: DocumentType, productType: ProductType): boolean {
    const templates = TEMPLATE_MAPPINGS[documentType]?.[productType] || {}
    return Object.keys(templates).length > 0
  }
}

// Export singleton instance
export const composerAgent = new ComposerAgent()
