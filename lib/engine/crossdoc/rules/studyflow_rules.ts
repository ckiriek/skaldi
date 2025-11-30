/**
 * Study Flow Consistency Rules
 * 
 * Validates consistency between Study Flow and documents (Protocol, ICF, CSR)
 * These are standalone validation functions, not CrossDocRules
 */

import type { CrossDocIssue, CrossDocRuleContext } from '../types'

export interface StudyFlowValidationContext {
  studyFlow?: {
    visits: Array<{ id: string; name: string; day: number; type: string; procedures: string[] }>
    procedures: Array<{ id: string; name: string; category: string }>
    totalDuration: number
  }
  protocolContent?: string
  icfContent?: string
  csrContent?: string
}

/**
 * Validate Study Flow consistency with documents
 */
export async function validateStudyFlowConsistency(
  ctx: StudyFlowValidationContext
): Promise<CrossDocIssue[]> {
  const issues: CrossDocIssue[] = []
  
  if (!ctx.studyFlow) return issues
  
  const { studyFlow, protocolContent, icfContent, csrContent } = ctx
  
  // 1. Check visit schedule in Protocol
  if (protocolContent) {
    const protocolLower = protocolContent.toLowerCase()
    
    studyFlow.visits.forEach(visit => {
      const visitName = visit.name.toLowerCase()
      if (!protocolLower.includes(visitName) && !protocolLower.includes(visit.type)) {
        issues.push({
          code: 'SF_001_VISIT_MISSING',
          severity: 'warning',
          message: `Visit "${visit.name}" (Day ${visit.day}) from Study Flow not found in Protocol`,
          locations: [{ documentType: 'PROTOCOL' }]
        })
      }
    })
  }
  
  // 2. Check procedures in ICF
  if (icfContent) {
    const icfLower = icfContent.toLowerCase()
    const keyProcedures = ['blood', 'physical exam', 'ecg', 'vital', 'laboratory']
    
    studyFlow.procedures.forEach(proc => {
      const procName = proc.name.toLowerCase().replace(/_/g, ' ')
      const isKeyProcedure = keyProcedures.some(kp => procName.includes(kp))
      
      if (isKeyProcedure && !icfLower.includes(procName)) {
        issues.push({
          code: 'SF_002_PROCEDURE_MISSING_ICF',
          severity: 'warning',
          message: `Procedure "${proc.name}" from Study Flow not described in ICF`,
          locations: [{ documentType: 'ICF' }]
        })
      }
    })
  }
  
  // 3. Check duration consistency
  if (protocolContent) {
    const sfDurationWeeks = Math.round(studyFlow.totalDuration / 7)
    const weekMatches = protocolContent.match(/(\d+)\s*weeks?/gi) || []
    
    weekMatches.forEach(match => {
      const value = parseInt(match)
      if (!isNaN(value) && Math.abs(value - sfDurationWeeks) > 4 && value > 4) {
        issues.push({
          code: 'SF_003_DURATION_MISMATCH',
          severity: 'warning',
          message: `Protocol mentions ${value} weeks but Study Flow duration is ${sfDurationWeeks} weeks`,
          locations: [{ documentType: 'PROTOCOL' }]
        })
      }
    })
  }
  
  // 4. Check CSR references key visits
  if (csrContent) {
    const csrLower = csrContent.toLowerCase()
    const keyVisits = studyFlow.visits.filter(v => 
      v.type === 'baseline' || v.type === 'end_of_treatment'
    )
    
    keyVisits.forEach(visit => {
      if (!csrLower.includes(visit.name.toLowerCase()) && 
          !csrLower.includes(`day ${visit.day}`)) {
        issues.push({
          code: 'SF_004_CSR_VISIT_MISSING',
          severity: 'info',
          message: `Key visit "${visit.name}" (Day ${visit.day}) not explicitly mentioned in CSR`,
          locations: [{ documentType: 'CSR' }]
        })
      }
    })
  }
  
  return issues
}

/**
 * Create CrossDocRule wrapper for Study Flow validation
 */
export function createStudyFlowRule(studyFlow: StudyFlowValidationContext['studyFlow']): (ctx: CrossDocRuleContext) => Promise<CrossDocIssue[]> {
  return async (ctx: CrossDocRuleContext): Promise<CrossDocIssue[]> => {
    // Extract content from bundle
    const protocolContent = ctx.bundle.protocol ? JSON.stringify(ctx.bundle.protocol) : undefined
    const icfContent = ctx.bundle.icf ? JSON.stringify(ctx.bundle.icf) : undefined
    const csrContent = ctx.bundle.csr ? JSON.stringify(ctx.bundle.csr) : undefined
    
    return validateStudyFlowConsistency({
      studyFlow,
      protocolContent,
      icfContent,
      csrContent
    })
  }
}
