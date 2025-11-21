/**
 * Document Orchestrator
 * 
 * Responsible for:
 * 1. Fetching document structure from DB
 * 2. Coordinating section-by-section generation
 * 3. Calling AI for each section
 * 4. Assembling final document
 */

import { SectionGenerator } from './section-generator'
import { QCValidator } from './qc-validator'
import { createClient } from '@/lib/supabase/server'

export interface OrchestrationRequest {
  projectId: string
  documentType: string
  userId: string
}

export interface OrchestrationResult {
  success: boolean
  documentId?: string
  sections: Record<string, string> // section_id -> generated content
  errors?: Array<{ section: string; error: string }>
  validation?: {
    passed: boolean
    issues: Array<{
      section_id?: string
      rule_id: string
      severity: 'error' | 'warning' | 'info'
      message: string
    }>
  }
  duration_ms: number
}

export class DocumentOrchestrator {
  private sectionGenerator: SectionGenerator
  private qcValidator: QCValidator
  private currentDocumentType: string = 'Protocol'

  constructor() {
    this.sectionGenerator = new SectionGenerator()
    this.qcValidator = new QCValidator()
  }

  /**
   * Main orchestration method
   */
  async generateDocument(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const startTime = Date.now()
    this.currentDocumentType = request.documentType
    console.log(`📋 Orchestrator: Starting generation for ${request.documentType}`)

    try {
      const supabase = await createClient()

      // 1. Fetch project data
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', request.projectId)
        .single()

      if (projectError || !project) {
        throw new Error(`Project not found: ${request.projectId}`)
      }

      // 2. Get document structure (TOC)
      const structure = await this.sectionGenerator.getDocumentStructure(request.documentType)
      
      if (structure.length === 0) {
        throw new Error(`No structure defined for document type: ${request.documentType}`)
      }

      console.log(`📊 Found ${structure.length} sections to generate`)

      // 3. Build context from project
      const context = this.buildContext(project)

      // 4. Generate each section
      const sections: Record<string, string> = {}
      const errors: Array<{ section: string; error: string }> = []

      for (const section of structure) {
        try {
          console.log(`🎨 Generating section: ${section.section_id}`)
          
          const template = await this.sectionGenerator.getTemplate(
            request.documentType,
            section.section_id
          )

          if (!template) {
            console.warn(`⚠️ No template found for ${section.section_id}, skipping`)
            continue
          }

          // Construct prompt with RAG references
          const prompt = await this.sectionGenerator.constructPrompt(template, context, {
            includeReferences: true,
            sectionId: section.section_id,
            documentType: request.documentType
          })

          // Call AI (placeholder - in production, call Edge Function or AI service)
          const generatedContent = await this.callAI(prompt, section.section_id)

          sections[section.section_id] = generatedContent

        } catch (error) {
          console.error(`❌ Error generating ${section.section_id}:`, error)
          errors.push({
            section: section.section_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // 5. Run QC validation
      console.log(`🔍 Running QC validation...`)
      const validationResult = await this.qcValidator.validate(request.documentType, sections)
      
      console.log(`✅ Validation complete: ${validationResult.passed ? 'PASSED' : 'FAILED'} (${validationResult.issues.length} issues)`)

      // 6. Create document record
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          project_id: request.projectId,
          type: request.documentType,
          status: 'draft',
          version: 1,
          content: JSON.stringify(sections), // Store sections as JSON for now
          created_by: request.userId
        })
        .select()
        .single()

      if (docError) {
        throw new Error(`Failed to create document: ${docError.message}`)
      }

      const duration = Date.now() - startTime
      console.log(`✅ Orchestrator: Completed in ${duration}ms`)

      return {
        success: errors.length === 0 && validationResult.passed,
        documentId: document.id,
        sections,
        errors: errors.length > 0 ? errors : undefined,
        validation: validationResult,
        duration_ms: duration
      }

    } catch (error) {
      console.error('Orchestrator error:', error)
      
      return {
        success: false,
        sections: {},
        errors: [{
          section: 'general',
          error: error instanceof Error ? error.message : 'Unknown error'
        }],
        duration_ms: Date.now() - startTime
      }
    }
  }

  /**
   * Build context from project data
   */
  private buildContext(project: any): Record<string, any> {
    // Extract design_json if it exists
    const design = project.design_json || {}

    return {
      projectId: project.id,
      projectTitle: project.title,
      compoundName: project.compound_name,
      indication: project.indication,
      phase: project.phase,
      sponsor: project.sponsor,
      productType: project.product_type,
      
      // Design parameters
      design_type: design.design_type || 'randomized',
      blinding: design.blinding || 'double-blind',
      arms: design.arms || 2,
      duration_weeks: design.duration_weeks || 24,
      primaryEndpoint: design.primary_endpoint || 'Change from baseline',
      
      // Additional fields
      rld_brand_name: project.rld_brand_name,
      inchikey: project.inchikey,
      
      // Metadata
      currentDate: new Date().toISOString().split('T')[0],
      
      // Placeholders for future enrichment
      publications: [], // TODO: Fetch from evidence_sources
      clinicalTrials: [], // TODO: Fetch from trials table
      secondaryEndpoints: [], // TODO: Extract from entities or design
      population: [], // TODO: Extract from project or entities
      dosages: [] // TODO: Extract from entities
    }
  }

  /**
   * Call AI service to generate content via Edge Function
   */
  private async callAI(prompt: string, sectionId: string): Promise<string> {
    console.log(`🤖 AI Call for ${sectionId} (${prompt.length} chars)`)
    
    try {
      const supabase = await createClient()
      
      // Call generate-section Edge Function
      const { data, error } = await supabase.functions.invoke('generate-section', {
        body: {
          prompt,
          sectionId,
          documentType: this.currentDocumentType || 'Protocol',
          maxTokens: 2000,
          temperature: 0.7,
        },
      })

      if (error) {
        console.error(`❌ Edge Function error for ${sectionId}:`, error)
        throw new Error(`AI generation failed: ${error.message}`)
      }

      if (!data?.success || !data?.content) {
        throw new Error('No content returned from AI')
      }

      console.log(`✅ AI generated ${data.content.length} chars in ${data.latency}ms (${data.usage?.totalTokens} tokens)`)
      
      return data.content

    } catch (error) {
      console.error(`❌ Error calling AI for ${sectionId}:`, error)
      // Fallback to placeholder in case of error
      return `[AI Generation Error for ${sectionId}]\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check Edge Function logs and ensure Azure OpenAI is configured (AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY).`
    }
  }
}

// Export singleton
export const documentOrchestrator = new DocumentOrchestrator()
