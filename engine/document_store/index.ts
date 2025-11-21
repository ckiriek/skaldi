/**
 * Document Store
 * 
 * Manages structured documents with block-level operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import {
  StructuredDocument,
  DocumentSection,
  DocumentBlock,
  BlockUpdate,
  BlockUpdateResult,
  BlockLocation
} from './types'

export class DocumentStore {
  private supabase: SupabaseClient<Database>

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
  }

  /**
   * Load document and convert to structured format
   */
  async loadDocument(documentId: string): Promise<StructuredDocument | null> {
    try {
      // Fetch document from database
      const { data: doc, error } = await this.supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (error || !doc) {
        console.error('Document not found:', error)
        return null
      }

      // Parse content if it's JSON
      let sections: DocumentSection[] = []
      
      if (doc.content) {
        try {
          const parsed = JSON.parse(doc.content)
          if (parsed.sections) {
            sections = parsed.sections
          } else {
            // Convert plain text to structured format
            sections = this.convertPlainTextToSections(doc.content)
          }
        } catch {
          // Not JSON, convert plain text
          sections = this.convertPlainTextToSections(doc.content)
        }
      }

      const structured: StructuredDocument = {
        document_id: doc.id,
        project_id: doc.project_id,
        type: doc.type as any,
        version: doc.version,
        status: doc.status as any,
        sections,
        metadata: {
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          created_by: doc.created_by
        }
      }

      return structured
    } catch (error) {
      console.error('Failed to load document:', error)
      return null
    }
  }

  /**
   * Save structured document back to database
   */
  async saveDocument(document: StructuredDocument): Promise<boolean> {
    try {
      const content = JSON.stringify({
        sections: document.sections,
        metadata: document.metadata
      }, null, 2)

      const { error } = await this.supabase
        .from('documents')
        .update({
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', document.document_id)

      if (error) {
        console.error('Failed to save document:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to save document:', error)
      return false
    }
  }

  /**
   * Find block by ID
   */
  findBlock(document: StructuredDocument, blockId: string): DocumentBlock | null {
    for (const section of document.sections) {
      const block = this.findBlockInSection(section, blockId)
      if (block) return block
    }
    return null
  }

  private findBlockInSection(section: DocumentSection, blockId: string): DocumentBlock | null {
    // Check blocks in this section
    for (const block of section.blocks) {
      if (block.block_id === blockId) {
        return block
      }
    }

    // Check subsections
    if (section.subsections) {
      for (const subsection of section.subsections) {
        const block = this.findBlockInSection(subsection, blockId)
        if (block) return block
      }
    }

    return null
  }

  /**
   * Update a specific block
   */
  async updateBlock(update: BlockUpdate): Promise<BlockUpdateResult> {
    try {
      // Load document
      const document = await this.loadDocument(update.document_id)
      if (!document) {
        throw new Error('Document not found')
      }

      // Find and update block
      const block = this.findBlock(document, update.block_id)
      if (!block) {
        throw new Error('Block not found')
      }

      // Update block text
      block.text = update.new_text
      if (update.metadata) {
        block.metadata = { ...block.metadata, ...update.metadata }
      }

      // Update document metadata
      document.metadata.updated_at = new Date().toISOString()

      // Save document
      const saved = await this.saveDocument(document)
      if (!saved) {
        throw new Error('Failed to save document')
      }

      return {
        success: true,
        document,
        updated_block: block,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to update block:', error)
      throw error
    }
  }

  /**
   * Convert plain text to structured sections
   */
  private convertPlainTextToSections(text: string): DocumentSection[] {
    const sections: DocumentSection[] = []
    const lines = text.split('\n')
    
    let currentSection: DocumentSection | null = null
    let blockCounter = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (!line) continue

      // Detect headings (lines starting with #)
      if (line.startsWith('#')) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection)
        }

        // Create new section
        const title = line.replace(/^#+\s*/, '')
        const sectionId = this.generateSectionId(title)
        
        currentSection = {
          section_id: sectionId,
          title,
          order_index: sections.length,
          blocks: []
        }
      } else {
        // Add as paragraph block
        if (!currentSection) {
          // Create default section if none exists
          currentSection = {
            section_id: 'SECTION_0',
            title: 'Content',
            order_index: 0,
            blocks: []
          }
        }

        currentSection.blocks.push({
          block_id: `BLOCK_${blockCounter++}`,
          type: 'paragraph',
          text: line
        })
      }
    }

    // Add last section
    if (currentSection) {
      sections.push(currentSection)
    }

    return sections
  }

  /**
   * Generate section ID from title
   */
  private generateSectionId(title: string): string {
    return title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  /**
   * Get block location (section + block IDs)
   */
  getBlockLocation(document: StructuredDocument, blockId: string): BlockLocation | null {
    for (const section of document.sections) {
      const location = this.getBlockLocationInSection(section, blockId)
      if (location) return location
    }
    return null
  }

  private getBlockLocationInSection(
    section: DocumentSection,
    blockId: string
  ): BlockLocation | null {
    // Check blocks in this section
    for (const block of section.blocks) {
      if (block.block_id === blockId) {
        return {
          section_id: section.section_id,
          block_id: blockId
        }
      }
    }

    // Check subsections
    if (section.subsections) {
      for (const subsection of section.subsections) {
        const location = this.getBlockLocationInSection(subsection, blockId)
        if (location) return location
      }
    }

    return null
  }

  /**
   * Calculate word count for document
   */
  calculateWordCount(document: StructuredDocument): number {
    let count = 0
    
    for (const section of document.sections) {
      count += this.calculateSectionWordCount(section)
    }

    return count
  }

  private calculateSectionWordCount(section: DocumentSection): number {
    let count = 0

    for (const block of section.blocks) {
      count += block.text.split(/\s+/).filter(w => w.length > 0).length
    }

    if (section.subsections) {
      for (const subsection of section.subsections) {
        count += this.calculateSectionWordCount(subsection)
      }
    }

    return count
  }
}

export * from './types'
