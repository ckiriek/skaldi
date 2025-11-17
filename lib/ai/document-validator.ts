/**
 * Document Validator
 * Validates generated documents for quality and compliance
 */

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info'
  message: string
  location?: string
  requirement?: string
}

export interface ValidationResult {
  passed: boolean
  score: number // 0-100
  issues: ValidationIssue[]
  summary: {
    errors: number
    warnings: number
    info: number
  }
}

export interface DocumentContext {
  type: 'IB' | 'Protocol' | 'ICF' | 'Synopsis'
  content: string
  project: {
    compound_name: string
    sponsor: string
    indication: string
    phase: string
  }
}

/**
 * Validate a generated document
 */
export function validateDocument(context: DocumentContext): ValidationResult {
  const issues: ValidationIssue[] = []

  // 1. Check for placeholder text
  const placeholderPatterns = [
    /\[Insert[^\]]*\]/gi,
    /\[TBD\]/gi,
    /\[To be determined\]/gi,
    /\[Placeholder\]/gi,
    /\[TODO\]/gi,
    /Investigational Compound(?! \w)/g, // "Investigational Compound" not followed by a name
    /Sponsor Name/g,
    /\[Sponsor\]/gi,
  ]

  for (const pattern of placeholderPatterns) {
    const matches = context.content.match(pattern)
    if (matches) {
      issues.push({
        severity: 'error',
        message: `Found placeholder text: "${matches[0]}"`,
        location: 'Document content',
        requirement: 'All placeholders must be replaced with real data'
      })
    }
  }

  // 2. Check for project-specific data usage
  const compoundMentioned = context.content.includes(context.project.compound_name)
  if (!compoundMentioned) {
    issues.push({
      severity: 'error',
      message: `Document does not mention the compound name "${context.project.compound_name}"`,
      requirement: 'Document must use project-specific compound name'
    })
  }

  const sponsorMentioned = context.content.includes(context.project.sponsor)
  if (!sponsorMentioned) {
    issues.push({
      severity: 'error',
      message: `Document does not mention the sponsor "${context.project.sponsor}"`,
      requirement: 'Document must use project-specific sponsor name'
    })
  }

  const indicationMentioned = context.content.includes(context.project.indication)
  if (!indicationMentioned) {
    issues.push({
      severity: 'warning',
      message: `Document does not mention the indication "${context.project.indication}"`,
      requirement: 'Document should reference the target indication'
    })
  }

  // 3. Check for minimum content length
  const minLengths = {
    IB: 5000,
    Protocol: 8000,
    ICF: 3000,
    Synopsis: 1500,
  }

  const minLength = minLengths[context.type]
  if (context.content.length < minLength) {
    issues.push({
      severity: 'warning',
      message: `Document is too short (${context.content.length} chars, expected at least ${minLength})`,
      requirement: `${context.type} should be comprehensive`
    })
  }

  // 4. Check for required sections (basic check)
  const requiredSections: Record<string, string[]> = {
    IB: ['TITLE PAGE', 'TABLE OF CONTENTS', 'SUMMARY', 'INTRODUCTION', 'NONCLINICAL', 'EFFECTS IN HUMANS'],
    Protocol: ['TITLE PAGE', 'TABLE OF CONTENTS', 'OBJECTIVES', 'STUDY DESIGN', 'STUDY POPULATION'],
    ICF: ['INTRODUCTION', 'WHY IS THIS STUDY', 'WHAT WILL HAPPEN', 'RISKS', 'BENEFITS'],
    Synopsis: ['SYNOPSIS HEADER', 'OBJECTIVES', 'STUDY DESIGN', 'ENDPOINTS'],
  }

  const required = requiredSections[context.type] || []
  for (const section of required) {
    if (!context.content.toUpperCase().includes(section)) {
      issues.push({
        severity: 'error',
        message: `Missing required section: "${section}"`,
        requirement: `${context.type} must include all required sections`
      })
    }
  }

  // 5. Check for citations (for IB and Protocol)
  if (context.type === 'IB' || context.type === 'Protocol') {
    const citationPattern = /\[\d+\]|\(\d{4}\)|et al\./g
    const citations = context.content.match(citationPattern)
    const citationCount = citations ? citations.length : 0

    if (citationCount < 3) {
      issues.push({
        severity: 'warning',
        message: `Document has insufficient citations (${citationCount} found, expected at least 3)`,
        requirement: 'Scientific documents should reference literature'
      })
    }
  }

  // 6. Calculate score
  const errors = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const info = issues.filter(i => i.severity === 'info').length

  // Score: 100 - (errors * 20) - (warnings * 5)
  const score = Math.max(0, 100 - (errors * 20) - (warnings * 5))

  return {
    passed: errors === 0,
    score,
    issues,
    summary: {
      errors,
      warnings,
      info,
    }
  }
}

/**
 * Get validation status badge color
 */
export function getValidationBadgeVariant(result: ValidationResult): 'success' | 'warning' | 'error' {
  if (result.passed && result.score >= 80) return 'success'
  if (result.score >= 60) return 'warning'
  return 'error'
}

/**
 * Get validation status text
 */
export function getValidationStatusText(result: ValidationResult): string {
  if (result.passed && result.score >= 90) return 'Excellent'
  if (result.passed && result.score >= 80) return 'Good'
  if (result.score >= 60) return 'Needs Improvement'
  return 'Failed'
}
