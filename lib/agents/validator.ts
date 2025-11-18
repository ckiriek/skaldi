/**
 * Validator Agent
 * 
 * Responsible for:
 * 1. ICH E6 (R2) compliance checking
 * 2. FDA guideline validation
 * 3. Terminology validation
 * 4. Quality checks
 * 5. Completeness verification
 * 
 * Version: 1.0.0
 * Date: 2025-11-11
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationRequest {
  content: string
  section_id: string
  document_type: string
  product_type?: string
  validation_level?: 'basic' | 'standard' | 'strict'
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  category: string
  message: string
  location?: string // e.g., "Section 2.1, Paragraph 3"
  quote?: string // Exact text from document
  suggestion?: string
  guideline_reference?: string
  regulatory_requirement?: string // Specific requirement text
}

export interface ValidationResult {
  success: boolean
  validation_level: string
  issues: ValidationIssue[]
  score: number // 0-100
  passed: boolean // true if score >= threshold
  summary: {
    errors: number
    warnings: number
    info: number
  }
  duration_ms: number
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

const ICH_E6_REQUIREMENTS = {
  'section-1': {
    required_fields: [
      'product name',
      'chemical name',
      'molecular formula',
      'regulatory status',
    ],
    min_length: 500,
    max_length: 5000,
  },
  'section-2': {
    required_fields: [
      'therapeutic class',
      'indications',
      'development history',
    ],
    min_length: 800,
    max_length: 6000,
  },
  'section-3': {
    required_fields: [
      'chemical structure',
      'physical properties',
      'stability',
    ],
    min_length: 1000,
    max_length: 8000,
  },
  'section-4': {
    required_fields: [
      'pharmacology',
      'toxicology',
      'animal studies',
    ],
    min_length: 1200,
    max_length: 10000,
  },
  'section-5': {
    required_fields: [
      'pharmacokinetics',
      'pharmacodynamics',
      'mechanism of action',
    ],
    min_length: 1000,
    max_length: 8000,
  },
  'section-6': {
    required_fields: [
      'adverse events',
      'safety profile',
      'tolerability',
    ],
    min_length: 1200,
    max_length: 10000,
  },
  'section-7': {
    required_fields: [
      'efficacy',
      'clinical trials',
      'outcomes',
    ],
    min_length: 1200,
    max_length: 10000,
  },
}

const TERMINOLOGY_CHECKS = {
  required_terms: [
    'ICH E6',
    'FDA',
    'GCP',
  ],
  prohibited_terms: [
    'guarantee',
    'promise',
    'always effective',
    'never fails',
    'miracle',
  ],
  preferred_terms: {
    'drug': 'investigational product',
    'patient': 'subject',
    'side effect': 'adverse event',
  },
}

const QUALITY_CHECKS = {
  max_sentence_length: 40, // words
  min_paragraph_length: 3, // sentences
  max_passive_voice_percentage: 30,
  required_sections: true,
  data_provenance: true,
}

// ============================================================================
// VALIDATOR AGENT
// ============================================================================

export class ValidatorAgent {
  /**
   * Main validation method
   */
  async validate(request: ValidationRequest): Promise<ValidationResult> {
    const startTime = Date.now()
    const level = request.validation_level || 'standard'

    console.log(`✓ Validator Agent: Validating ${request.section_id} (${level})`)

    const issues: ValidationIssue[] = []

    try {
      // 1. ICH E6 (R2) Compliance
      const ichIssues = this.validateICHCompliance(request)
      issues.push(...ichIssues)

      // 2. FDA Guidelines
      const fdaIssues = this.validateFDAGuidelines(request)
      issues.push(...fdaIssues)

      // 3. Terminology
      const termIssues = this.validateTerminology(request)
      issues.push(...termIssues)

      // 4. Quality Checks
      const qualityIssues = this.validateQuality(request)
      issues.push(...qualityIssues)

      // 5. Completeness
      const completenessIssues = this.validateCompleteness(request)
      issues.push(...completenessIssues)

      // Calculate score
      const score = this.calculateScore(issues, request.content)
      const threshold = level === 'strict' ? 90 : level === 'standard' ? 80 : 70
      const passed = score >= threshold

      // Summarize
      const summary = {
        errors: issues.filter(i => i.type === 'error').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        info: issues.filter(i => i.type === 'info').length,
      }

      const duration = Date.now() - startTime

      console.log(`✅ Validator Agent: Completed in ${duration}ms`)
      console.log(`   Score: ${score}/100 (${passed ? 'PASSED' : 'FAILED'})`)
      console.log(`   Issues: ${summary.errors} errors, ${summary.warnings} warnings`)

      return {
        success: true,
        validation_level: level,
        issues,
        score,
        passed,
        summary,
        duration_ms: duration,
      }

    } catch (error) {
      console.error('Validator Agent error:', error)
      
      return {
        success: false,
        validation_level: level,
        issues: [{
          type: 'error',
          category: 'system',
          message: error instanceof Error ? error.message : 'Unknown error',
        }],
        score: 0,
        passed: false,
        summary: { errors: 1, warnings: 0, info: 0 },
        duration_ms: Date.now() - startTime,
      }
    }
  }

  /**
   * Validate ICH E6 (R2) compliance
   */
  private validateICHCompliance(request: ValidationRequest): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const requirements = ICH_E6_REQUIREMENTS[request.section_id as keyof typeof ICH_E6_REQUIREMENTS]

    if (!requirements) {
      return issues
    }

    // Check length
    const wordCount = request.content.split(/\s+/).length
    if (wordCount < requirements.min_length) {
      issues.push({
        type: 'warning',
        category: 'ICH E6 (R2)',
        message: `Section is too short (${wordCount} words). Minimum: ${requirements.min_length} words.`,
        suggestion: 'Add more detail to meet ICH E6 (R2) requirements.',
        guideline_reference: 'ICH E6 (R2) Section 7',
      })
    }

    if (wordCount > requirements.max_length) {
      issues.push({
        type: 'info',
        category: 'ICH E6 (R2)',
        message: `Section is very long (${wordCount} words). Consider condensing.`,
        suggestion: 'Review for redundancy and unnecessary detail.',
      })
    }

    // Check required fields
    const contentLower = request.content.toLowerCase()
    for (const field of requirements.required_fields) {
      if (!contentLower.includes(field.toLowerCase())) {
        issues.push({
          type: 'error',
          category: 'ICH E6 (R2)',
          message: `Missing required field: "${field}"`,
          suggestion: `Add information about ${field} to comply with ICH E6 (R2).`,
          guideline_reference: 'ICH E6 (R2) Section 7',
        })
      }
    }

    // Check for ICH reference
    if (!contentLower.includes('ich e6')) {
      issues.push({
        type: 'info',
        category: 'ICH E6 (R2)',
        message: 'No explicit ICH E6 (R2) reference found.',
        suggestion: 'Consider adding compliance statement.',
      })
    }

    return issues
  }

  /**
   * Validate FDA guidelines
   */
  private validateFDAGuidelines(request: ValidationRequest): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const contentLower = request.content.toLowerCase()

    // Check for FDA reference
    if (request.product_type === 'generic' && !contentLower.includes('fda')) {
      issues.push({
        type: 'warning',
        category: 'FDA Guidelines',
        message: 'No FDA reference found for Generic product.',
        suggestion: 'Add FDA approval information and references.',
        guideline_reference: 'FDA Guidance for Industry',
      })
    }

    // Check for RLD reference (Generic products)
    if (request.product_type === 'generic' && !contentLower.includes('rld')) {
      issues.push({
        type: 'warning',
        category: 'FDA Guidelines',
        message: 'No Reference Listed Drug (RLD) mentioned.',
        suggestion: 'Add RLD information for Generic product.',
        guideline_reference: 'FDA Orange Book',
      })
    }

    // Check for bioequivalence (Generic products, Section 5)
    if (request.product_type === 'generic' && 
        request.section_id === 'section-5' && 
        !contentLower.includes('bioequivalence')) {
      issues.push({
        type: 'error',
        category: 'FDA Guidelines',
        message: 'Missing bioequivalence information for Generic product.',
        suggestion: 'Add bioequivalence data and 90% confidence intervals.',
        guideline_reference: 'FDA Bioequivalence Guidance',
      })
    }

    return issues
  }

  /**
   * Validate terminology
   */
  private validateTerminology(request: ValidationRequest): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const contentLower = request.content.toLowerCase()

    // Check prohibited terms
    for (const term of TERMINOLOGY_CHECKS.prohibited_terms) {
      if (contentLower.includes(term.toLowerCase())) {
        issues.push({
          type: 'error',
          category: 'Terminology',
          message: `Prohibited term found: "${term}"`,
          suggestion: 'Remove or replace with appropriate regulatory language.',
          guideline_reference: 'ICH E6 (R2) Section 1.1',
        })
      }
    }

    // Check preferred terms
    for (const [old, preferred] of Object.entries(TERMINOLOGY_CHECKS.preferred_terms)) {
      const regex = new RegExp(`\\b${old}\\b`, 'gi')
      const matches = request.content.match(regex)
      if (matches && matches.length > 2) {
        issues.push({
          type: 'info',
          category: 'Terminology',
          message: `Consider using "${preferred}" instead of "${old}"`,
          suggestion: `Replace "${old}" with "${preferred}" for consistency with ICH terminology.`,
        })
      }
    }

    return issues
  }

  /**
   * Validate quality
   */
  private validateQuality(request: ValidationRequest): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check sentence length
    const sentences = request.content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    let longSentences = 0
    
    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/).length
      if (words > QUALITY_CHECKS.max_sentence_length) {
        longSentences++
      }
    }

    if (longSentences > sentences.length * 0.2) {
      issues.push({
        type: 'warning',
        category: 'Quality',
        message: `${longSentences} sentences exceed recommended length.`,
        suggestion: 'Break long sentences into shorter ones for better readability.',
      })
    }

    // Check for placeholder text with exact quotes and location
    const placeholders = [
      { pattern: /\[([^\]]{1,100})\]/g, name: 'bracket placeholder' },
      { pattern: /\bTODO:?\s*([^\n]{0,100})/gi, name: 'TODO marker' },
      { pattern: /\bTBD:?\s*([^\n]{0,100})/gi, name: 'TBD marker' },
      { pattern: /\bFIXME:?\s*([^\n]{0,100})/gi, name: 'FIXME marker' },
      { pattern: /\bXXX:?\s*([^\n]{0,100})/gi, name: 'XXX marker' },
    ]

    const lines = request.content.split('\n')
    
    for (const { pattern, name } of placeholders) {
      const matches = request.content.matchAll(pattern)
      for (const match of matches) {
        // Find line number
        const beforeMatch = request.content.substring(0, match.index)
        const lineNumber = beforeMatch.split('\n').length
        
        // Get surrounding context (up to 100 chars)
        const startIdx = Math.max(0, (match.index || 0) - 50)
        const endIdx = Math.min(request.content.length, (match.index || 0) + match[0].length + 50)
        const quote = request.content.substring(startIdx, endIdx).trim()
        
        issues.push({
          type: 'error',
          category: 'Quality',
          message: `Placeholder text found: ${name}`,
          location: `Line ${lineNumber}`,
          quote: match[0],
          suggestion: 'Replace all placeholder text with actual content before submission.',
          guideline_reference: 'ICH E6 (R2) Section 8.1',
          regulatory_requirement: 'All documents must contain complete and accurate information without placeholder text (ICH E6 R2 8.1: Essential Documents)',
        })
      }
    }

    // Check for data provenance
    if (!request.content.toLowerCase().includes('source')) {
      issues.push({
        type: 'info',
        category: 'Quality',
        message: 'No data source information found.',
        location: 'Document-wide',
        suggestion: 'Add data sources section for provenance tracking.',
        guideline_reference: 'ICH E6 (R2) Section 5.5.3',
        regulatory_requirement: 'Source data must be attributable, legible, contemporaneous, original, and accurate (ICH E6 R2 5.5.3: ALCOA principles)',
      })
    }

    return issues
  }

  /**
   * Validate completeness
   */
  private validateCompleteness(request: ValidationRequest): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check for section header
    if (!request.content.match(/^#\s+\d+\./m)) {
      issues.push({
        type: 'warning',
        category: 'Completeness',
        message: 'No section header found.',
        location: 'Document structure',
        suggestion: 'Add proper section header (e.g., "# 1. PRODUCT INFORMATION").',
        guideline_reference: 'ICH E6 (R2) Section 7',
        regulatory_requirement: 'Investigator\'s Brochure must follow standardized section numbering (ICH E6 R2 Section 7: Investigator\'s Brochure)',
      })
    }

    // Check for subsections
    const subsections = request.content.match(/^##\s+/gm)
    if (!subsections || subsections.length < 3) {
      issues.push({
        type: 'warning',
        category: 'Completeness',
        message: 'Insufficient subsections.',
        suggestion: 'Add more subsections to organize content properly.',
      })
    }

    // Check for references
    if (request.section_id !== 'section-1' && 
        request.section_id !== 'section-2' &&
        !request.content.toLowerCase().includes('reference')) {
      issues.push({
        type: 'info',
        category: 'Completeness',
        message: 'No references found.',
        suggestion: 'Consider adding references to support statements.',
      })
    }

    return issues
  }

  /**
   * Calculate validation score
   */
  private calculateScore(issues: ValidationIssue[], content: string): number {
    let score = 100

    // Deduct points for issues
    for (const issue of issues) {
      if (issue.type === 'error') {
        score -= 10
      } else if (issue.type === 'warning') {
        score -= 5
      } else if (issue.type === 'info') {
        score -= 1
      }
    }

    // Bonus for completeness
    const wordCount = content.split(/\s+/).length
    if (wordCount > 1000) {
      score += 5
    }

    // Bonus for structure
    const subsections = content.match(/^##\s+/gm)
    if (subsections && subsections.length >= 5) {
      score += 5
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score))
  }

  /**
   * Batch validation
   */
  async validateBatch(requests: ValidationRequest[]): Promise<ValidationResult[]> {
    console.log(`✓ Validator Agent: Batch validating ${requests.length} sections`)

    const results: ValidationResult[] = []

    for (const request of requests) {
      const result = await this.validate(request)
      results.push(result)
    }

    const totalScore = results.reduce((sum, r) => sum + r.score, 0) / results.length
    const allPassed = results.every(r => r.passed)

    console.log(`✅ Validator Agent: Batch complete`)
    console.log(`   Average Score: ${Math.round(totalScore)}/100`)
    console.log(`   All Passed: ${allPassed ? 'YES' : 'NO'}`)

    return results
  }

  /**
   * Get validation summary
   */
  getSummary(results: ValidationResult[]): {
    total_sections: number
    passed: number
    failed: number
    average_score: number
    total_issues: number
    issues_by_type: { errors: number; warnings: number; info: number }
  } {
    return {
      total_sections: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      average_score: Math.round(
        results.reduce((sum, r) => sum + r.score, 0) / results.length
      ),
      total_issues: results.reduce((sum, r) => r.issues.length, 0),
      issues_by_type: {
        errors: results.reduce((sum, r) => sum + r.summary.errors, 0),
        warnings: results.reduce((sum, r) => sum + r.summary.warnings, 0),
        info: results.reduce((sum, r) => sum + r.summary.info, 0),
      },
    }
  }
}

// Export singleton instance
export const validatorAgent = new ValidatorAgent()
