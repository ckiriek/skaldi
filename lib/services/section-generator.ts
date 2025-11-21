import { createClient } from '@/lib/supabase/server'
import fs from 'fs/promises'
import path from 'path'
import { ReferenceRetriever } from './reference-retriever'

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

  constructor() {
    // In production, we might fetch from DB only. 
    // For now, we can fallback to filesystem if DB is empty or for dev speed.
    this.templatesDir = path.join(process.cwd(), 'templates_en')
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
   * Construct the final prompt for the LLM with RAG reference material
   */
  async constructPrompt(
    template: DocumentTemplate, 
    context: Record<string, any>,
    options?: {
      includeReferences?: boolean
      sectionId?: string
      documentType?: string
    }
  ): Promise<string> {
    let prompt = template.prompt_text || ''
    
    // Simple variable substitution (Handlebars-like)
    // In a real implementation, use the TemplateEngine we already have
    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{{${key}}}`
      // Replace all occurrences
      prompt = prompt.split(placeholder).join(String(value || ''))
    }

    // Add RAG reference material if enabled
    if (options?.includeReferences !== false) {
      try {
        const retriever = new ReferenceRetriever()
        const references = await retriever.retrieveReferences({
          compoundName: context.compoundName,
          disease: context.disease || context.indication,
          sectionId: options?.sectionId,
          documentType: options?.documentType,
          topK: 3, // Top 3 most relevant chunks
          minSimilarity: 0.75, // Higher threshold for quality
        })

        if (references.combined.length > 0) {
          const referenceMaterial = retriever.formatReferencesForPrompt(references.combined)
          prompt += referenceMaterial
          console.log(`✅ Added ${references.combined.length} reference chunks to prompt`)
        } else {
          console.log(`⚠️ No reference material found for ${context.compoundName || 'unknown compound'}`)
        }
      } catch (error) {
        console.error('❌ Error retrieving references:', error)
        // Continue without references rather than failing
      }
    }

    // Add constraints as system instructions
    if (template.constraints && template.constraints.length > 0) {
        prompt += `\n\nCONSTRAINTS:\n`
        template.constraints.forEach(c => prompt += `- ${c}\n`)
    }

    return prompt
  }
}
