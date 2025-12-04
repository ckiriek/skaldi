/**
 * IB Validator Service
 * 
 * Validates generated IB content and auto-fixes common issues
 * 
 * Checks for:
 * - Empty sections
 * - [DATA_NEEDED] placeholders
 * - Forbidden CSR content
 * - Duplicate content
 * - Irrelevant trials
 * - Structure errors
 * 
 * Version: 1.0.0
 * Date: 2025-12-02
 */

import { IB_FORBIDDEN_PATTERNS, IB_VALIDATION_RULES } from '@/lib/prompts/ib-prompts-v4'

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  code: string
  message: string
  location?: {
    section?: string
    line?: number
    text?: string
  }
  autoFixable: boolean
  suggestedFix?: string
}

export interface ValidationResult {
  isValid: boolean
  score: number // 0-100
  issues: ValidationIssue[]
  summary: {
    errors: number
    warnings: number
    info: number
    placeholders: number
    forbiddenContent: number
    emptySections: number
  }
}

export interface AutoFixResult {
  originalContent: string
  fixedContent: string
  fixesApplied: string[]
  remainingIssues: ValidationIssue[]
}

// ============================================================================
// IB VALIDATOR CLASS
// ============================================================================

export class IBValidator {
  
  /**
   * Validate IB content
   */
  validate(content: string, sectionId?: string): ValidationResult {
    const issues: ValidationIssue[] = []
    
    // 1. Check for placeholders
    const placeholderIssues = this.checkPlaceholders(content)
    issues.push(...placeholderIssues)
    
    // 2. Check for forbidden content
    const forbiddenIssues = this.checkForbiddenContent(content)
    issues.push(...forbiddenIssues)
    
    // 3. Check for empty sections
    const emptyIssues = this.checkEmptySections(content)
    issues.push(...emptyIssues)
    
    // 4. Check for duplicate content
    const duplicateIssues = this.checkDuplicates(content)
    issues.push(...duplicateIssues)
    
    // 5. Check for irrelevant trials (NCTNCT errors)
    const trialIssues = this.checkTrialReferences(content)
    issues.push(...trialIssues)
    
    // 6. Check section length (if sectionId provided)
    if (sectionId) {
      const lengthIssues = this.checkSectionLength(content, sectionId)
      issues.push(...lengthIssues)
    }
    
    // 7. Check required elements
    if (sectionId) {
      const elementIssues = this.checkRequiredElements(content, sectionId)
      issues.push(...elementIssues)
    }
    
    // Calculate score
    const score = this.calculateScore(issues, content)
    
    // Summarize
    const summary = {
      errors: issues.filter(i => i.type === 'error').length,
      warnings: issues.filter(i => i.type === 'warning').length,
      info: issues.filter(i => i.type === 'info').length,
      placeholders: placeholderIssues.length,
      forbiddenContent: forbiddenIssues.length,
      emptySections: emptyIssues.length
    }
    
    return {
      isValid: summary.errors === 0,
      score,
      issues,
      summary
    }
  }
  
  /**
   * Auto-fix common issues
   */
  autoFix(content: string, context?: {
    compoundName?: string
    indication?: string
    phase?: string
    drugClass?: string
  }): AutoFixResult {
    let fixedContent = content
    const fixesApplied: string[] = []
    
    // 1. Fix unsubstituted template variables
    if (context?.compoundName) {
      const compoundPatterns = [
        /\{\{compoundName\}\}/g,
        /\{\{compound\}\}/g,
        /\[INVESTIGATIONAL PRODUCT\]/gi,
        /\[compound name\]/gi,
        /\[drug name\]/gi
      ]
      for (const pattern of compoundPatterns) {
        if (pattern.test(fixedContent)) {
          fixedContent = fixedContent.replace(pattern, context.compoundName)
          fixesApplied.push(`Replaced compound placeholder with "${context.compoundName}"`)
        }
      }
    }
    
    if (context?.indication) {
      const indicationPatterns = [
        /\{\{indication\}\}/g,
        /\[indication\]/gi,
        /\[disease\]/gi
      ]
      for (const pattern of indicationPatterns) {
        if (pattern.test(fixedContent)) {
          fixedContent = fixedContent.replace(pattern, context.indication)
          fixesApplied.push(`Replaced indication placeholder with "${context.indication}"`)
        }
      }
    }
    
    if (context?.phase) {
      const phasePatterns = [
        /\{\{phase\}\}/g,
        /\[phase\]/gi
      ]
      for (const pattern of phasePatterns) {
        if (pattern.test(fixedContent)) {
          fixedContent = fixedContent.replace(pattern, context.phase)
          fixesApplied.push(`Replaced phase placeholder with "${context.phase}"`)
        }
      }
    }
    
    // 2. Fix NCTNCT errors
    const nctFixes = fixedContent.match(/NCTNCT\d+/g)
    if (nctFixes) {
      fixedContent = fixedContent.replace(/NCTNCT(\d+)/g, 'NCT$1')
      fixesApplied.push(`Fixed ${nctFixes.length} NCTNCT errors`)
    }
    
    // 3. Fix double NCT prefix
    fixedContent = fixedContent.replace(/NCT\s+NCT/gi, 'NCT')
    
    // 4. Remove simple [DATA_NEEDED] placeholders with class-based text
    const dataNeededMatches = fixedContent.match(/\[DATA_NEEDED[^\]]*\]/gi)
    if (dataNeededMatches && context?.drugClass) {
      for (const match of dataNeededMatches) {
        const replacement = this.getClassBasedReplacement(match, context.drugClass)
        if (replacement) {
          fixedContent = fixedContent.replace(match, replacement)
          fixesApplied.push(`Replaced "${match}" with class-based text`)
        }
      }
    }
    
    // 5. Remove CSR-specific content
    const csrPatterns = [
      /## Sample Case Report Forms[\s\S]*?(?=##|$)/gi,
      /## List of Investigators[\s\S]*?(?=##|$)/gi,
      /## Audit Certificates[\s\S]*?(?=##|$)/gi,
      /## Listings of Individual Patient Data[\s\S]*?(?=##|$)/gi
    ]
    for (const pattern of csrPatterns) {
      if (pattern.test(fixedContent)) {
        fixedContent = fixedContent.replace(pattern, '')
        fixesApplied.push('Removed CSR-specific section')
      }
    }
    
    // 6. Fix empty table cells
    fixedContent = fixedContent.replace(/\|\s*\|\s*\|/g, '| - | - |')
    
    // 7. Remove "No data available" statements
    fixedContent = fixedContent.replace(/No data available\.?\s*/gi, '')
    fixedContent = fixedContent.replace(/Data not available\.?\s*/gi, '')
    
    // Validate remaining issues
    const remainingIssues = this.validate(fixedContent).issues.filter(
      i => i.type === 'error' || i.type === 'warning'
    )
    
    return {
      originalContent: content,
      fixedContent,
      fixesApplied,
      remainingIssues
    }
  }
  
  // ============================================================================
  // CHECK METHODS
  // ============================================================================
  
  private checkPlaceholders(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    
    const placeholderPatterns = [
      { pattern: /\[DATA_NEEDED[^\]]*\]/gi, code: 'PLACEHOLDER_DATA_NEEDED' },
      { pattern: /\[INVESTIGATIONAL PRODUCT\]/gi, code: 'PLACEHOLDER_PRODUCT' },
      { pattern: /\[TO BE PROVIDED[^\]]*\]/gi, code: 'PLACEHOLDER_TBP' },
      { pattern: /\[INSERT[^\]]*\]/gi, code: 'PLACEHOLDER_INSERT' },
      { pattern: /\[TBD\]/gi, code: 'PLACEHOLDER_TBD' },
      { pattern: /\{\{[^}]+\}\}/g, code: 'UNSUBSTITUTED_VARIABLE' }
    ]
    
    for (const { pattern, code } of placeholderPatterns) {
      const matches = content.match(pattern)
      if (matches) {
        for (const match of matches) {
          issues.push({
            type: 'error',
            code,
            message: `Placeholder found: "${match}"`,
            location: { text: match },
            autoFixable: code === 'UNSUBSTITUTED_VARIABLE' || code === 'PLACEHOLDER_PRODUCT',
            suggestedFix: 'Replace with actual data or class-based summary'
          })
        }
      }
    }
    
    return issues
  }
  
  private checkForbiddenContent(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    
    const forbiddenPatterns = [
      { pattern: /sample case report forms/gi, code: 'CSR_CONTENT', message: 'CSR section found: Sample CRFs' },
      { pattern: /list of investigators and study centers/gi, code: 'CSR_CONTENT', message: 'CSR section found: Investigator list' },
      { pattern: /audit certificates/gi, code: 'CSR_CONTENT', message: 'CSR section found: Audit certificates' },
      { pattern: /listings of individual patient data/gi, code: 'CSR_CONTENT', message: 'CSR section found: Patient data listings' },
      { pattern: /protocol deviations listing/gi, code: 'CSR_CONTENT', message: 'CSR section found: Protocol deviations' }
    ]
    
    for (const { pattern, code, message } of forbiddenPatterns) {
      if (pattern.test(content)) {
        issues.push({
          type: 'error',
          code,
          message,
          autoFixable: true,
          suggestedFix: 'Remove CSR-specific content from IB'
        })
      }
    }
    
    return issues
  }
  
  private checkEmptySections(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    
    // Find sections with headers but no content
    const sectionPattern = /^(#{1,4})\s+(.+)$/gm
    const sections: { level: number; title: string; start: number; end: number }[] = []
    
    let match
    while ((match = sectionPattern.exec(content)) !== null) {
      sections.push({
        level: match[1].length,
        title: match[2],
        start: match.index + match[0].length,
        end: content.length
      })
    }
    
    // Set end positions
    for (let i = 0; i < sections.length - 1; i++) {
      sections[i].end = sections[i + 1].start - sections[i + 1].level - sections[i + 1].title.length - 2
    }
    
    // Check for empty sections
    for (const section of sections) {
      const sectionContent = content.substring(section.start, section.end).trim()
      if (sectionContent.length < 50) {
        issues.push({
          type: 'warning',
          code: 'EMPTY_SECTION',
          message: `Section "${section.title}" appears to be empty or too short`,
          location: { section: section.title },
          autoFixable: false,
          suggestedFix: 'Add content or remove section if not applicable'
        })
      }
    }
    
    return issues
  }
  
  private checkDuplicates(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    
    // Check for duplicate paragraphs (>100 chars)
    const paragraphs = content.split(/\n\n+/)
    const seen = new Map<string, number>()
    
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i].trim()
      if (para.length > 100) {
        const normalized = para.toLowerCase().replace(/\s+/g, ' ')
        if (seen.has(normalized)) {
          issues.push({
            type: 'warning',
            code: 'DUPLICATE_CONTENT',
            message: `Duplicate paragraph found (first occurrence at paragraph ${seen.get(normalized)})`,
            location: { text: para.substring(0, 100) + '...' },
            autoFixable: false,
            suggestedFix: 'Remove duplicate content'
          })
        } else {
          seen.set(normalized, i + 1)
        }
      }
    }
    
    return issues
  }
  
  private checkTrialReferences(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    
    // Check for NCTNCT errors
    const nctErrors = content.match(/NCTNCT\d+/g)
    if (nctErrors) {
      for (const error of nctErrors) {
        issues.push({
          type: 'error',
          code: 'NCT_ERROR',
          message: `Invalid NCT ID format: "${error}"`,
          location: { text: error },
          autoFixable: true,
          suggestedFix: error.replace('NCTNCT', 'NCT')
        })
      }
    }
    
    // Check for double NCT prefix
    const doubleNct = content.match(/NCT\s+NCT/gi)
    if (doubleNct) {
      issues.push({
        type: 'error',
        code: 'NCT_DOUBLE',
        message: 'Double NCT prefix found',
        autoFixable: true,
        suggestedFix: 'NCT'
      })
    }
    
    return issues
  }
  
  private checkSectionLength(content: string, sectionId: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    
    const minLength = IB_VALIDATION_RULES.minSectionLength[sectionId as keyof typeof IB_VALIDATION_RULES.minSectionLength]
    if (minLength && content.length < minLength) {
      issues.push({
        type: 'warning',
        code: 'SECTION_TOO_SHORT',
        message: `Section is shorter than expected (${content.length} chars, expected ${minLength}+)`,
        location: { section: sectionId },
        autoFixable: false,
        suggestedFix: 'Expand section with more detail'
      })
    }
    
    return issues
  }
  
  private checkRequiredElements(content: string, sectionId: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    
    const requiredElements = IB_VALIDATION_RULES.requiredElements[sectionId as keyof typeof IB_VALIDATION_RULES.requiredElements]
    if (requiredElements) {
      for (const element of requiredElements) {
        if (!content.toLowerCase().includes(element.toLowerCase())) {
          issues.push({
            type: 'warning',
            code: 'MISSING_ELEMENT',
            message: `Required element "${element}" not found in section`,
            location: { section: sectionId },
            autoFixable: false,
            suggestedFix: `Add content about ${element}`
          })
        }
      }
    }
    
    return issues
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  private calculateScore(issues: ValidationIssue[], content: string): number {
    let score = 100
    
    // Deduct for errors
    const errors = issues.filter(i => i.type === 'error').length
    score -= errors * 10
    
    // Deduct for warnings
    const warnings = issues.filter(i => i.type === 'warning').length
    score -= warnings * 3
    
    // Bonus for length (up to 10 points)
    if (content.length > 5000) score += 5
    if (content.length > 10000) score += 5
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score))
  }
  
  private getClassBasedReplacement(placeholder: string, drugClass: string): string | null {
    const lowerPlaceholder = placeholder.toLowerCase()
    
    // Map common placeholders to class-based text
    const replacements: Record<string, Record<string, string>> = {
      'SSRI': {
        'half-life': '1-6 days (varies by specific SSRI)',
        'metabolism': 'Hepatic metabolism via CYP2D6 and CYP2C19',
        'protein binding': '94-99% protein bound',
        'target organs': 'Central Nervous System, Liver, Cardiovascular System',
        'genotoxicity': 'Negative in standard genotoxicity battery (Ames test, chromosomal aberration, micronucleus)',
        'carcinogenicity': 'No evidence of carcinogenic potential in long-term rodent studies'
      },
      'SNRI': {
        'half-life': '5-12 hours',
        'metabolism': 'Hepatic metabolism via CYP2D6 and CYP3A4',
        'target organs': 'Central Nervous System, Liver, Cardiovascular System, Kidney'
      },
      'DEFAULT': {
        'half-life': 'To be characterized in clinical studies',
        'metabolism': 'Hepatic metabolism (specific pathways to be determined)',
        'target organs': 'To be determined based on nonclinical studies'
      }
    }
    
    const classReplacements = replacements[drugClass] || replacements['DEFAULT']
    
    for (const [key, value] of Object.entries(classReplacements)) {
      if (lowerPlaceholder.includes(key)) {
        return value
      }
    }
    
    return null
  }
}

export default IBValidator
