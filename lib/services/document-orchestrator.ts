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
import { buildKnowledgeGraph } from '@/lib/engine/knowledge'
import { generateStudyFlowForProject } from './study-flow-generator'
import { generateDocumentExports, generateProjectBundle } from './document-export-service'

export interface OrchestrationRequest {
  projectId: string
  documentType: string
  userId: string
  supabase?: any // Optional: pass Supabase client from API route
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
    console.log(`   Project ID: ${request.projectId}`)
    console.log(`   User ID: ${request.userId}`)

    try {
      // Use provided Supabase client or create new one
      const supabase = request.supabase || await createClient()

      // 1. Fetch project data
      console.log(`📊 Step 1: Fetching project data...`)
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', request.projectId)
        .single()

      if (projectError) {
        console.error(`❌ Project fetch error:`, projectError)
        throw new Error(`Project fetch failed: ${projectError.message}`)
      }
      
      if (!project) {
        console.error(`❌ Project not found: ${request.projectId}`)
        throw new Error(`Project not found: ${request.projectId}`)
      }
      
      console.log(`✅ Project found: ${project.title}`)

      // 1.5. Build Knowledge Graph BEFORE generation (if compound is known)
      if (project.compound_name) {
        console.log(`🧠 Step 1.5: Building Knowledge Graph for ${project.compound_name}...`)
        try {
          const kgSnapshot = await buildKnowledgeGraph(project.compound_name)
          console.log(`✅ Knowledge Graph built:`)
          console.log(`   - Sources: ${kgSnapshot.sourcesUsed.length}`)
          console.log(`   - Indications: ${kgSnapshot.indications.length}`)
          console.log(`   - Endpoints: ${kgSnapshot.endpoints.length}`)
          console.log(`   - Formulations: ${kgSnapshot.formulations.length}`)
          console.log(`   - Procedures: ${kgSnapshot.procedures.length}`)
          
          // Store KG snapshot in project for data aggregator to use
          // This ensures all sections have access to external data
          try {
            await supabase
              .from('projects')
              .update({ 
                knowledge_graph: kgSnapshot,
                kg_built_at: new Date().toISOString()
              })
              .eq('id', request.projectId)
            
            console.log(`✅ Knowledge Graph saved to project`)
          } catch (saveError) {
            // Column might not exist yet - store in memory for this session
            console.warn(`⚠️ Could not save KG to project (column may not exist):`, saveError)
            // Store in a class property for this generation session
            ;(this as any)._kgSnapshot = kgSnapshot
          }
        } catch (kgError) {
          console.warn(`⚠️ Knowledge Graph build failed (continuing without):`, kgError)
          // Don't fail the whole generation if KG fails
        }
      } else {
        console.log(`⚠️ No compound_name in project, skipping Knowledge Graph`)
      }

      // 1.6. Generate Study Flow for Protocol, ICF, CSR (if not exists)
      const studyFlowDocTypes = ['Protocol', 'ICF', 'CSR']
      if (studyFlowDocTypes.includes(request.documentType)) {
        console.log(`📅 Step 1.6: Generating Study Flow for ${request.documentType}...`)
        try {
          const studyFlow = await generateStudyFlowForProject(request.projectId, supabase)
          if (studyFlow) {
            console.log(`✅ Study Flow generated:`)
            console.log(`   - Visits: ${studyFlow.visits.length}`)
            console.log(`   - Procedures: ${studyFlow.procedures.length}`)
            console.log(`   - Duration: ${studyFlow.totalDuration} days`)
            
            // Store for context injection
            ;(this as any)._studyFlow = studyFlow
          }
        } catch (sfError) {
          console.warn(`⚠️ Study Flow generation failed (continuing without):`, sfError)
        }
      }

      // 2. Get document structure (TOC)
      console.log(`📊 Step 2: Fetching document structure...`)
      const structure = await this.sectionGenerator.getDocumentStructure(request.documentType)
      
      if (structure.length === 0) {
        throw new Error(`No structure defined for document type: ${request.documentType}`)
      }

      console.log(`📊 Found ${structure.length} sections to generate`)

      // 3. Build context from project
      const context = this.buildContext(project)

      // 4. Generate each section with FULL data integration
      const sections: Record<string, string> = {}
      const errors: Array<{ section: string; error: string }> = []

      for (let i = 0; i < structure.length; i++) {
        const section = structure[i]
        
        // Add delay between sections to avoid rate limiting (except first)
        if (i > 0) {
          console.log(`⏳ Waiting 2s before next section to avoid rate limiting...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        try {
          console.log(`🎨 Generating section ${i + 1}/${structure.length}: ${section.section_id}`)
          
          // Use NEW method with full data integration
          const promptPackage = await this.sectionGenerator.generateSectionWithFullData(
            request.projectId,
            request.documentType,
            section.section_id
          )

          console.log(`📦 Prompt package ready:`)
          console.log(`   - Sources: ${promptPackage.metadata.sourcesUsed.join(', ')}`)
          console.log(`   - Config: reasoning=${promptPackage.config.reasoning_effort}, verbosity=${promptPackage.config.verbosity}`)
          console.log(`   - max_completion_tokens: ${promptPackage.config.max_completion_tokens}`)

          // Call AI with retry logic
          let generatedContent: string | null = null
          let lastError: Error | null = null
          
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              generatedContent = await this.callAIWithFullConfig(
                promptPackage.systemPrompt,
                promptPackage.userPrompt,
                section.section_id,
                promptPackage.config
              )
              break // Success, exit retry loop
            } catch (err) {
              lastError = err instanceof Error ? err : new Error(String(err))
              console.warn(`⚠️  Attempt ${attempt}/3 failed for ${section.section_id}: ${lastError.message}`)
              
              if (attempt < 3) {
                const delay = attempt * 5000 // 5s, 10s backoff
                console.log(`⏳ Retrying in ${delay/1000}s...`)
                await new Promise(resolve => setTimeout(resolve, delay))
              }
            }
          }
          
          if (generatedContent) {
            sections[section.section_id] = generatedContent
          } else {
            throw lastError || new Error('Generation failed after 3 attempts')
          }

        } catch (error) {
          console.error(`❌ Error generating ${section.section_id}:`, error)
          
          // Special handling for TOC sections - generate automatically from structure
          if (section.section_id.includes('toc') || section.section_id.includes('table_of_contents')) {
            console.log(`📋 Auto-generating TOC from document structure...`)
            const tocContent = this.generateAutoTOC(structure, request.documentType)
            sections[section.section_id] = tocContent
            console.log(`✅ Auto-generated TOC with ${structure.length} entries`)
          } else {
            errors.push({
              section: section.section_id,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            // Add error placeholder to sections
            sections[section.section_id] = `[Generation Error for ${section.section_id}]\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }
      }

      // 5. Run QC validation
      console.log(`🔍 Running QC validation...`)
      const validationResult = await this.qcValidator.validate(request.documentType, sections)
      
      console.log(`✅ Validation complete: ${validationResult.passed ? 'PASSED' : 'FAILED'} (${validationResult.issues.length} issues)`)

      // 6. Get next version number for this document type in project
      const { data: existingDocs } = await supabase
        .from('documents')
        .select('version')
        .eq('project_id', request.projectId)
        .eq('type', request.documentType)
        .order('version', { ascending: false })
        .limit(1)

      const nextVersion = (existingDocs?.[0]?.version || 0) + 1
      console.log(`📝 Creating ${request.documentType} v${nextVersion}`)

      // 7. Create document record
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          project_id: request.projectId,
          type: request.documentType,
          status: 'draft',
          version: nextVersion,
          content: JSON.stringify(sections), // Store sections as JSON for now
          created_by: request.userId
        })
        .select()
        .single()

      if (docError) {
        throw new Error(`Failed to create document: ${docError.message}`)
      }

      // 8. Generate PDF/DOCX exports in background (don't block)
      console.log(`📄 Generating PDF/DOCX exports...`)
      generateDocumentExports(document.id).then(async result => {
        if (result.pdfPath && result.docxPath) {
          console.log(`✅ Exports generated: PDF=${result.pdfPath}, DOCX=${result.docxPath}`)
          
          // Try to generate project bundle (will succeed if all docs have exports)
          console.log(`📦 Checking if bundle can be generated...`)
          const bundlePath = await generateProjectBundle(request.projectId)
          if (bundlePath) {
            console.log(`✅ Project bundle updated: ${bundlePath}`)
          }
        } else if (result.error) {
          console.warn(`⚠️ Export generation failed: ${result.error}`)
        }
      }).catch(err => {
        console.error(`❌ Export generation error:`, err)
      })

      const duration = Date.now() - startTime
      console.log(`✅ Orchestrator: Completed in ${duration}ms`)

      // Success if no generation errors
      // QC validation issues are informational - document is still created
      // Only fail if there are actual generation errors
      const hasGenerationErrors = errors.length > 0
      const hasQCErrors = validationResult.issues.some(i => i.severity === 'error')
      
      console.log(`   Orchestrator result: { success: ${!hasGenerationErrors}, sections: ${Object.keys(sections).length}, qc_issues: ${validationResult.issues.length}, qc_errors: ${hasQCErrors} }`)

      return {
        success: !hasGenerationErrors, // Success if all sections generated, even with QC warnings
        documentId: document.id,
        sections,
        errors: errors.length > 0 ? errors : undefined,
        validation: validationResult,
        duration_ms: duration
      }

    } catch (error) {
      console.error('❌ Orchestrator error:', error)
      console.error('   Error type:', typeof error)
      console.error('   Error stack:', error instanceof Error ? error.stack : 'N/A')
      
      return {
        success: false,
        sections: {},
        errors: [{
          section: 'general',
          error: error instanceof Error ? error.message : String(error)
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
   * Call AI service with full configuration (NEW METHOD)
   * Uses GPT-5.1 with proper parameters: reasoning_effort, verbosity
   * Calls Azure OpenAI DIRECTLY to avoid Supabase Edge Function timeout limits
   * Timeout: 5 minutes (300 seconds) to allow for high-quality generation
   */
  private async callAIWithFullConfig(
    systemPrompt: string,
    userPrompt: string,
    sectionId: string,
    config: {
      max_completion_tokens: number
      reasoning_effort: string
      verbosity: string
    }
  ): Promise<string> {
    console.log(`🤖 AI Call for ${sectionId}`)
    console.log(`   - System prompt: ${systemPrompt.length} chars`)
    console.log(`   - User prompt: ${userPrompt.length} chars`)
    console.log(`   - Config: ${JSON.stringify(config)}`)
    
    const startTime = Date.now()
    
    try {
      // Get Azure OpenAI credentials from environment
      const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT
      const azureKey = process.env.AZURE_OPENAI_API_KEY
      const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5.1'
      const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'

      if (!azureEndpoint || !azureKey) {
        throw new Error('Azure OpenAI not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY')
      }

      // Create AbortController with 5 minute timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes

      const url = `${azureEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
      
      // Build request body with GPT-5.1 parameters
      const requestBody: Record<string, unknown> = {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: config.max_completion_tokens,
      }

      // Add GPT-5.1 specific parameters
      if (config.reasoning_effort && config.reasoning_effort !== 'none') {
        requestBody.reasoning_effort = config.reasoning_effort
      }
      if (config.verbosity) {
        requestBody.verbosity = config.verbosity
      }

      console.log(`📤 Calling Azure OpenAI directly: ${deployment}`)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': azureKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Azure OpenAI API error: ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      
      // Debug: log full response structure
      console.log(`📥 Azure response structure:`, JSON.stringify({
        id: data.id,
        model: data.model,
        choices_count: data.choices?.length,
        first_choice: data.choices?.[0] ? {
          finish_reason: data.choices[0].finish_reason,
          message_role: data.choices[0].message?.role,
          content_length: data.choices[0].message?.content?.length,
          refusal: data.choices[0].message?.refusal,
        } : null,
        usage: data.usage,
        error: data.error,
      }, null, 2))
      
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        // Log full response for debugging
        console.error(`❌ Empty content. Full response:`, JSON.stringify(data, null, 2).slice(0, 2000))
        throw new Error(`No content generated from Azure OpenAI. Finish reason: ${data.choices?.[0]?.finish_reason || 'unknown'}`)
      }

      const latency = Date.now() - startTime
      const tokens = data.usage?.total_tokens || 0

      console.log(`✅ AI generated ${content.length} chars in ${latency}ms (${tokens} tokens)`)
      
      return content

    } catch (error) {
      const latency = Date.now() - startTime
      console.error(`❌ Error calling AI for ${sectionId} after ${latency}ms:`, error)
      
      // Check if it was a timeout
      if (error instanceof Error && error.name === 'AbortError') {
        return `[AI Generation Timeout for ${sectionId}]\n\nThe AI generation took longer than 5 minutes. This may happen for complex sections. Please try again.`
      }
      
      // Fallback to placeholder in case of error
      return `[AI Generation Error for ${sectionId}]\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease ensure Azure OpenAI is configured (AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY).`
    }
  }

  /**
   * DEPRECATED: Old callAI method - kept for backward compatibility
   * Use callAIWithFullConfig instead
   */
  private async callAI(prompt: string, sectionId: string): Promise<string> {
    console.warn(`⚠️  Using deprecated callAI method for ${sectionId}. Migrate to callAIWithFullConfig.`)
    
    // Fallback to new method with simplified config
    // NO TOKEN BUDGETING - model decides output length
    return this.callAIWithFullConfig(
      'You are a clinical documentation expert.',
      prompt,
      sectionId,
      {
        max_completion_tokens: 64000, // High limit - model self-regulates
        reasoning_effort: 'medium', // Medium reduces overthinking per GPT-5.1 cookbook
        verbosity: 'high'
      }
    )
  }

  /**
   * Generate automatic Table of Contents from document structure
   * Used as fallback when AI generation fails for TOC sections
   */
  private generateAutoTOC(
    structure: Array<{ section_id: string; title: string; order_index: number; level?: number }>,
    documentType: string
  ): string {
    const lines: string[] = [
      `## Table of Contents`,
      '',
      `*${documentType} Document Structure*`,
      ''
    ]

    let sectionNum = 0
    for (const section of structure) {
      // Skip TOC itself
      if (section.section_id.includes('toc') || section.section_id.includes('table_of_contents')) {
        continue
      }
      
      sectionNum++
      const level = section.level || 1
      const indent = '  '.repeat(level - 1)
      const prefix = level === 1 ? `${sectionNum}.` : '-'
      
      lines.push(`${indent}${prefix} ${section.title}`)
    }

    lines.push('')
    lines.push('---')
    lines.push('*Table of Contents auto-generated from document structure*')

    return lines.join('\n')
  }
}

// Export singleton
export const documentOrchestrator = new DocumentOrchestrator()
