/**
 * Study Flow Auto-fix
 * Automatic fixes for common flow issues
 */

import type {
  StudyFlow,
  FlowIssue,
  FlowChange,
  Visit,
  Procedure,
  AutoFixResult,
  AutoFixRequest,
} from '../types'
import { randomUUID } from 'crypto'

/**
 * Apply auto-fixes to study flow
 */
export async function applyAutoFixes(
  flow: StudyFlow,
  request: AutoFixRequest
): Promise<AutoFixResult> {
  const appliedChanges: FlowChange[] = []
  let updatedFlow = { ...flow }

  // Get issues to fix
  const issuesToFix = request.issueIds

  // Apply fixes based on strategy
  for (const issueId of issuesToFix) {
    const changes = await applyFixForIssue(
      updatedFlow,
      issueId,
      request.strategy
    )
    
    if (changes.length > 0) {
      appliedChanges.push(...changes)
      updatedFlow = applyChangesToFlow(updatedFlow, changes)
    }
  }

  // Re-validate to get remaining issues
  // (In real implementation, would call validation engine)
  const remainingIssues: FlowIssue[] = []

  return {
    appliedChanges,
    updatedFlow,
    remainingIssues,
    summary: {
      changesApplied: appliedChanges.length,
      issuesFixed: issuesToFix.length,
      issuesRemaining: remainingIssues.length,
    },
  }
}

/**
 * Apply fix for specific issue
 */
async function applyFixForIssue(
  flow: StudyFlow,
  issueId: string,
  strategy: 'conservative' | 'aggressive' | 'balanced'
): Promise<FlowChange[]> {
  // Determine issue type from ID
  if (issueId.includes('MISSING_BASELINE')) {
    return fixMissingBaseline(flow)
  }
  
  if (issueId.includes('MISSING_EOT')) {
    return fixMissingEOT(flow)
  }
  
  if (issueId.includes('MISSING_ASSESSMENT')) {
    return fixMissingAssessment(flow, issueId)
  }
  
  if (issueId.includes('ENDPOINT_TIMING_DRIFT')) {
    return fixEndpointTimingDrift(flow, issueId)
  }
  
  if (issueId.includes('UNSUPPORTED_VISIT_TIMING')) {
    return fixUnsupportedVisitTiming(flow, issueId)
  }

  return []
}

/**
 * Fix 1: Add missing baseline visit
 */
function fixMissingBaseline(flow: StudyFlow): FlowChange[] {
  const changes: FlowChange[] = []

  // Check if baseline already exists
  const hasBaseline = flow.visits.some(v => v.type === 'baseline')
  if (hasBaseline) return changes

  // Create baseline visit
  const baselineVisit: Visit = {
    id: `visit_baseline_${randomUUID().slice(0, 8)}`,
    name: 'Baseline',
    day: 0,
    type: 'baseline',
    window: { minus: 0, plus: 0, unit: 'days' },
    procedures: [],
    required: true,
    metadata: {
      source: 'autofix',
      notes: 'Automatically added baseline visit',
    },
  }

  changes.push({
    type: 'add_visit',
    targetId: 'protocol',
    newValue: baselineVisit,
    reason: 'Baseline visit is mandatory for all clinical trials',
  })

  return changes
}

/**
 * Fix 2: Add missing end-of-treatment visit
 */
function fixMissingEOT(flow: StudyFlow): FlowChange[] {
  const changes: FlowChange[] = []

  // Check if EOT already exists
  const hasEOT = flow.visits.some(v => v.type === 'end_of_treatment')
  if (hasEOT) return changes

  // Find last treatment day
  const treatmentVisits = flow.visits.filter(v => v.type === 'treatment')
  const lastDay = treatmentVisits.length > 0
    ? Math.max(...treatmentVisits.map(v => v.day))
    : 84 // Default to 12 weeks

  // Create EOT visit
  const eotVisit: Visit = {
    id: `visit_eot_${randomUUID().slice(0, 8)}`,
    name: 'End of Treatment',
    day: lastDay,
    type: 'end_of_treatment',
    window: { minus: 3, plus: 3, unit: 'days' },
    procedures: [],
    required: true,
    metadata: {
      source: 'autofix',
      notes: 'Automatically added EOT visit',
    },
  }

  changes.push({
    type: 'add_visit',
    targetId: 'protocol',
    newValue: eotVisit,
    reason: 'End-of-treatment visit is required to assess final outcomes',
  })

  return changes
}

/**
 * Fix 3: Add missing assessment procedures for endpoint
 */
function fixMissingAssessment(flow: StudyFlow, issueId: string): FlowChange[] {
  const changes: FlowChange[] = []

  // Extract endpoint ID from issue ID
  const endpointIdMatch = issueId.match(/MISSING_ASSESSMENT_(.+)/)
  if (!endpointIdMatch) return changes

  const endpointId = endpointIdMatch[1]

  // Find procedures that should be added
  // (In real implementation, would use endpoint-procedure mapping)
  const proceduresToAdd: string[] = []

  proceduresToAdd.forEach(procId => {
    changes.push({
      type: 'add_procedure',
      targetId: 'protocol',
      newValue: procId,
      reason: `Required for endpoint ${endpointId}`,
    })
  })

  return changes
}

/**
 * Fix 4: Fix endpoint timing drift
 */
function fixEndpointTimingDrift(flow: StudyFlow, issueId: string): FlowChange[] {
  const changes: FlowChange[] = []

  // Extract endpoint ID
  const endpointIdMatch = issueId.match(/ENDPOINT_TIMING_DRIFT_(.+)/)
  if (!endpointIdMatch) return changes

  const endpointId = endpointIdMatch[1]

  changes.push({
    type: 'modify_visit',
    targetId: 'sap',
    field: 'assessment_schedule',
    newValue: {
      endpointId,
      visits: flow.visits.filter(v => v.type === 'baseline' || v.type === 'treatment').map(v => v.id),
    },
    reason: 'Align SAP assessment schedule with Protocol visits',
  })

  return changes
}

/**
 * Fix 5: Fix unsupported visit timing
 */
function fixUnsupportedVisitTiming(flow: StudyFlow, issueId: string): FlowChange[] {
  const changes: FlowChange[] = []

  // Extract visit ID
  const visitIdMatch = issueId.match(/UNSUPPORTED_VISIT_TIMING_(.+)/)
  if (!visitIdMatch) return changes

  const visitId = visitIdMatch[1]
  const visit = flow.visits.find(v => v.id === visitId)
  
  if (!visit || !visit.window) return changes

  // Calculate reasonable window (±10%)
  const newWindow = {
    minus: Math.ceil(visit.day * 0.1),
    plus: Math.ceil(visit.day * 0.1),
    unit: 'days' as const,
  }

  changes.push({
    type: 'modify_visit',
    targetId: visitId,
    field: 'window',
    oldValue: visit.window,
    newValue: newWindow,
    reason: 'Adjust visit window to standard ±10%',
  })

  return changes
}

/**
 * Apply changes to flow
 */
function applyChangesToFlow(
  flow: StudyFlow,
  changes: FlowChange[]
): StudyFlow {
  let updatedFlow = { ...flow }

  changes.forEach(change => {
    switch (change.type) {
      case 'add_visit':
        updatedFlow = {
          ...updatedFlow,
          visits: [...updatedFlow.visits, change.newValue as Visit],
        }
        break

      case 'add_procedure':
        // Add procedure to appropriate visits
        // (Simplified - in real implementation would be more sophisticated)
        break

      case 'modify_visit':
        updatedFlow = {
          ...updatedFlow,
          visits: updatedFlow.visits.map(v => {
            if (v.id === change.targetId) {
              return {
                ...v,
                [change.field!]: change.newValue,
              }
            }
            return v
          }),
        }
        break

      default:
        break
    }
  })

  return updatedFlow
}

/**
 * Generate auto-fix suggestions for issues
 */
export function generateAutoFixSuggestions(
  issues: FlowIssue[]
): Array<{
  issueId: string
  issueCode: string
  fixable: boolean
  suggestion: string
  changes: FlowChange[]
}> {
  return issues
    .filter(issue => issue.suggestions && issue.suggestions.length > 0)
    .map(issue => {
      const autoFixSuggestion = issue.suggestions!.find(s => s.autoFixable)
      
      if (!autoFixSuggestion) {
        return {
          issueId: issue.id,
          issueCode: issue.code,
          fixable: false,
          suggestion: 'Manual fix required',
          changes: [],
        }
      }

      return {
        issueId: issue.id,
        issueCode: issue.code,
        fixable: true,
        suggestion: autoFixSuggestion.label,
        changes: autoFixSuggestion.changes,
      }
    })
}

/**
 * Estimate impact of auto-fixes
 */
export function estimateAutoFixImpact(
  changes: FlowChange[]
): {
  visitsAdded: number
  visitsModified: number
  proceduresAdded: number
  proceduresModified: number
  riskLevel: 'low' | 'medium' | 'high'
} {
  const visitsAdded = changes.filter(c => c.type === 'add_visit').length
  const visitsModified = changes.filter(
    c => c.type === 'modify_visit' && c.field !== 'window'
  ).length
  const proceduresAdded = changes.filter(c => c.type === 'add_procedure').length
  const proceduresModified = changes.filter(c => c.type === 'modify_procedure').length

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low'
  
  if (visitsAdded > 2 || visitsModified > 3) {
    riskLevel = 'high'
  } else if (visitsAdded > 0 || visitsModified > 1 || proceduresAdded > 5) {
    riskLevel = 'medium'
  }

  return {
    visitsAdded,
    visitsModified,
    proceduresAdded,
    proceduresModified,
    riskLevel,
  }
}

/**
 * Validate auto-fix changes before applying
 */
export function validateAutoFixChanges(
  flow: StudyFlow,
  changes: FlowChange[]
): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  changes.forEach(change => {
    // Check for duplicate visits
    if (change.type === 'add_visit') {
      const newVisit = change.newValue as Visit
      const existingVisit = flow.visits.find(
        v => v.day === newVisit.day && v.type === newVisit.type
      )
      if (existingVisit) {
        errors.push(
          `Cannot add visit "${newVisit.name}" - similar visit already exists at Day ${newVisit.day}`
        )
      }
    }

    // Check for invalid modifications
    if (change.type === 'modify_visit') {
      const visit = flow.visits.find(v => v.id === change.targetId)
      if (!visit) {
        errors.push(`Cannot modify visit ${change.targetId} - not found`)
      }
    }

    // Warn about high-impact changes
    if (change.type === 'add_visit' || change.type === 'remove_visit') {
      warnings.push(`High-impact change: ${change.type} for ${change.targetId}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
