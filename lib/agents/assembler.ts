/**
 * Assembler Agent
 * 
 * Responsible for:
 * 1. Document assembly from sections
 * 2. Table of Contents generation
 * 3. Section ordering
 * 4. Formatting and styling
 * 5. Metadata insertion
 * 
 * Version: 1.0.0
 * Date: 2025-11-11
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AssemblerRequest {
  project_id: string
  document_type: string
  sections: Record<string, string> // section_id -> content
  options?: {
    include_toc?: boolean
    include_cover?: boolean
    include_metadata?: boolean
    page_numbers?: boolean
    section_numbers?: boolean
  }
}

export interface AssemblerResult {
  success: boolean
  document_type: string
  assembled_content: string
  toc: string
  metadata: {
    title: string
    version: string
    date: string
    sections_included: string[]
    word_count: number
    page_count_estimate: number
  }
  duration_ms: number
}

// ============================================================================
// SECTION ORDER
// ============================================================================

const SECTION_ORDER = {
  investigator_brochure: [
    'cover',
    'toc',
    'abbreviations',
    'section-1',
    'section-2',
    'section-3',
    'section-4',
    'section-5',
    'section-6',
    'section-7',
    'section-8',
    'section-9',
    'section-10',
  ],
}

const SECTION_TITLES = {
  'section-1': 'Product Information',
  'section-2': 'Introduction',
  'section-3': 'Physical, Chemical, and Pharmaceutical Properties',
  'section-4': 'Nonclinical Studies',
  'section-5': 'Clinical Pharmacology',
  'section-6': 'Safety and Tolerability',
  'section-7': 'Efficacy and Clinical Outcomes',
  'section-8': 'Marketed Experience',
  'section-9': 'Summary and Conclusions',
  'section-10': 'References',
}

// ============================================================================
// ASSEMBLER AGENT
// ============================================================================

export class AssemblerAgent {
  /**
   * Main assembly method
   */
  async assemble(request: AssemblerRequest): Promise<AssemblerResult> {
    const startTime = Date.now()

    console.log(`📦 Assembler Agent: Assembling ${request.document_type}`)
    console.log(`   Sections: ${Object.keys(request.sections).length}`)

    try {
      const options = {
        include_toc: true,
        include_cover: true,
        include_metadata: true,
        page_numbers: true,
        section_numbers: true,
        ...request.options,
      }

      // 1. Order sections
      const orderedSections = this.orderSections(
        request.sections,
        request.document_type
      )

      // 2. Generate TOC
      const toc = options.include_toc
        ? this.generateTOC(orderedSections)
        : ''

      // 3. Generate cover page
      const cover = options.include_cover
        ? await this.generateCoverPage(request)
        : ''

      // 4. Assemble document
      let assembled = ''

      if (cover) {
        assembled += cover + '\n\n---\n\n'
      }

      if (toc) {
        assembled += toc + '\n\n---\n\n'
      }

      // Add sections
      for (const [sectionId, content] of orderedSections) {
        assembled += content + '\n\n---\n\n'
      }

      // 5. Add metadata
      if (options.include_metadata) {
        assembled += this.generateMetadataSection(request)
      }

      // 6. Calculate metadata
      const wordCount = this.countWords(assembled)
      const pageCountEstimate = Math.ceil(wordCount / 500) // ~500 words per page

      const metadata = {
        title: await this.getDocumentTitle(request),
        version: '1.0',
        date: new Date().toISOString().split('T')[0],
        sections_included: Object.keys(request.sections),
        word_count: wordCount,
        page_count_estimate: pageCountEstimate,
      }

      const duration = Date.now() - startTime

      console.log(`✅ Assembler Agent: Completed in ${duration}ms`)
      console.log(`   Word Count: ${wordCount}`)
      console.log(`   Estimated Pages: ${pageCountEstimate}`)

      return {
        success: true,
        document_type: request.document_type,
        assembled_content: assembled,
        toc,
        metadata,
        duration_ms: duration,
      }

    } catch (error) {
      console.error('Assembler Agent error:', error)
      
      return {
        success: false,
        document_type: request.document_type,
        assembled_content: '',
        toc: '',
        metadata: {
          title: 'Error',
          version: '0.0',
          date: new Date().toISOString().split('T')[0],
          sections_included: [],
          word_count: 0,
          page_count_estimate: 0,
        },
        duration_ms: Date.now() - startTime,
      }
    }
  }

  /**
   * Order sections according to document type
   */
  private orderSections(
    sections: Record<string, string>,
    documentType: string
  ): Array<[string, string]> {
    const order = SECTION_ORDER[documentType as keyof typeof SECTION_ORDER] || []
    const ordered: Array<[string, string]> = []

    for (const sectionId of order) {
      if (sections[sectionId]) {
        ordered.push([sectionId, sections[sectionId]])
      }
    }

    // Add any sections not in the order
    for (const [sectionId, content] of Object.entries(sections)) {
      if (!order.includes(sectionId)) {
        ordered.push([sectionId, content])
      }
    }

    return ordered
  }

  /**
   * Generate Table of Contents
   */
  private generateTOC(sections: Array<[string, string]>): string {
    let toc = '# TABLE OF CONTENTS\n\n'

    let sectionNumber = 1

    for (const [sectionId, content] of sections) {
      if (sectionId.startsWith('section-')) {
        const title = SECTION_TITLES[sectionId as keyof typeof SECTION_TITLES] || sectionId
        
        // Extract subsections
        const subsections = this.extractSubsections(content)
        
        toc += `${sectionNumber}. **${title.toUpperCase()}**\n`
        
        if (subsections.length > 0) {
          for (let i = 0; i < Math.min(subsections.length, 10); i++) {
            toc += `   ${sectionNumber}.${i + 1} ${subsections[i]}\n`
          }
        }
        
        toc += '\n'
        sectionNumber++
      }
    }

    return toc
  }

  /**
   * Extract subsections from content
   */
  private extractSubsections(content: string): string[] {
    const subsections: string[] = []
    const lines = content.split('\n')

    for (const line of lines) {
      const match = line.match(/^##\s+\d+\.\d+\s+(.+)$/)
      if (match) {
        subsections.push(match[1])
      }
    }

    return subsections
  }

  /**
   * Generate cover page
   */
  private async generateCoverPage(request: AssemblerRequest): Promise<string> {
    const title = await this.getDocumentTitle(request)
    const date = new Date().toISOString().split('T')[0]

    return `# ${title}

**Document Type:** ${this.formatDocumentType(request.document_type)}

**Version:** 1.0

**Date:** ${date}

**Status:** Draft

---

## Document Information

**Prepared by:** Asetria Writer System

**Prepared for:** Clinical Research

**Purpose:** ${this.getDocumentPurpose(request.document_type)}

**Compliance:** ICH E6 (R2), FDA Guidelines

---

## Confidentiality Notice

This document contains confidential information. Distribution is restricted to authorized personnel only.

---
`
  }

  /**
   * Generate metadata section
   */
  private generateMetadataSection(request: AssemblerRequest): string {
    const date = new Date().toISOString()

    return `---

## Document Metadata

**Generated:** ${date}

**System:** Asetria Writer v1.0

**Document Type:** ${request.document_type}

**Sections Included:** ${Object.keys(request.sections).length}

**Generation Method:** AI-Powered Template-Based Generation

**Data Sources:**
- PubChem (Chemical Data)
- FDA Orange Book (RLD Information)
- DailyMed (Current Labels)
- openFDA (FDA Data)
- ClinicalTrials.gov (Trial Data)
- PubMed (Scientific Literature)

**Quality Assurance:**
- Template Engine: Handlebars with 20+ custom helpers
- Validation: ICH E6 (R2) and FDA compliance checks
- Provenance: Full data source tracking
- Review: AI-powered content refinement

---

*This document was generated using Asetria Writer, an AI-powered regulatory document generation system.*

*For questions or support, please contact the document administrator.*
`
  }

  /**
   * Get document title
   */
  private async getDocumentTitle(request: AssemblerRequest): Promise<string> {
    // In production, fetch from project
    const typeTitle = this.formatDocumentType(request.document_type)
    return `${typeTitle} - [Product Name]`
  }

  /**
   * Format document type
   */
  private formatDocumentType(type: string): string {
    const titles: Record<string, string> = {
      investigator_brochure: "Investigator's Brochure",
      clinical_protocol: 'Clinical Trial Protocol',
      informed_consent: 'Informed Consent Form',
      study_synopsis: 'Study Synopsis',
    }
    return titles[type] || type
  }

  /**
   * Get document purpose
   */
  private getDocumentPurpose(type: string): string {
    const purposes: Record<string, string> = {
      investigator_brochure: 'To provide investigators and others involved in the trial with information to facilitate understanding of the rationale for, and compliance with, key features of the protocol.',
      clinical_protocol: 'To describe the objectives, design, methodology, statistical considerations, and organization of a clinical trial.',
      informed_consent: 'To provide potential trial subjects with information about the trial to help them decide whether to participate.',
      study_synopsis: 'To provide a brief summary of the clinical trial design, conduct, and results.',
    }
    return purposes[type] || 'Clinical research documentation'
  }

  /**
   * Count words
   */
  private countWords(content: string): number {
    return content.trim().split(/\s+/).length
  }

  /**
   * Get assembly summary
   */
  getSummary(result: AssemblerResult): {
    title: string
    sections: number
    words: number
    pages: number
    version: string
    date: string
  } {
    return {
      title: result.metadata.title,
      sections: result.metadata.sections_included.length,
      words: result.metadata.word_count,
      pages: result.metadata.page_count_estimate,
      version: result.metadata.version,
      date: result.metadata.date,
    }
  }
}

// Export singleton instance
export const assemblerAgent = new AssemblerAgent()
