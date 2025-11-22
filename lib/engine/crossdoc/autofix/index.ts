/**
 * Auto-fix Engine
 * Automatically fix cross-document consistency issues
 */

import type {
  CrossDocIssue,
  CrossDocPatch,
  CrossDocBundle,
  AutoFixRequest,
  AutoFixResult,
  ChangeLogEntry,
} from '../types'
import { trackChange, validatePatch, mergePatches } from '../changelog/change_tracker'

/**
 * Apply auto-fixes for given issues
 */
export async function applyAutoFixes(
  issues: CrossDocIssue[],
  bundle: CrossDocBundle,
  request: AutoFixRequest
): Promise<AutoFixResult> {
  const appliedPatches: CrossDocPatch[] = []
  const changelog: ChangeLogEntry[] = []
  const remainingIssues: CrossDocIssue[] = []

  for (const issue of issues) {
    // Check if this issue should be fixed
    if (!request.issueIds.includes(issue.code)) {
      remainingIssues.push(issue)
      continue
    }

    // Get auto-fix suggestions
    const autoFixableSuggestions = issue.suggestions?.filter(s => s.autoFixable) || []

    if (autoFixableSuggestions.length === 0) {
      remainingIssues.push(issue)
      continue
    }

    // Apply first auto-fixable suggestion
    const suggestion = autoFixableSuggestions[0]
    
    for (const patch of suggestion.patches) {
      const validation = validatePatch(patch)
      
      if (!validation.valid) {
        console.error('Invalid patch:', validation.errors)
        continue
      }

      appliedPatches.push(patch)

      // Track change
      const changeEntry = trackChange(
        patch.documentType,
        patch.documentId,
        patch.field || 'content',
        patch.oldValue || '',
        patch.newValue,
        `Auto-fix for ${issue.code}: ${issue.message}`
      )
      changelog.push(changeEntry)
    }
  }

  // Merge patches
  const mergedPatches = mergePatches(appliedPatches)

  // Apply patches to bundle (in-memory)
  const updatedDocuments = await applyPatchesToBundle(bundle, mergedPatches)

  return {
    appliedPatches: mergedPatches,
    updatedDocuments,
    remainingIssues,
    changelog,
  }
}

/**
 * Apply patches to document bundle
 */
async function applyPatchesToBundle(
  bundle: CrossDocBundle,
  patches: CrossDocPatch[]
): Promise<any[]> {
  const updatedDocs: any[] = []

  patches.forEach(patch => {
    const docRef = {
      id: patch.documentId,
      type: patch.documentType,
    }

    // Track which documents were updated
    if (!updatedDocs.find(d => d.id === docRef.id && d.type === docRef.type)) {
      updatedDocs.push(docRef)
    }
  })

  return updatedDocs
}

/**
 * Fix PRIMARY_ENDPOINT_DRIFT
 * Align SAP primary endpoint with Protocol
 */
export function fixPrimaryEndpointDrift(
  issue: CrossDocIssue,
  bundle: CrossDocBundle
): CrossDocPatch[] {
  const patches: CrossDocPatch[] = []

  if (!bundle.protocol || !bundle.sap) return patches

  const protocolPrimary = bundle.protocol.endpoints?.find(ep => ep.type === 'primary')
  const sapPrimary = bundle.sap.primaryEndpoints?.[0]

  if (!protocolPrimary || !sapPrimary) return patches

  // Create patch to update SAP primary endpoint
  patches.push({
    documentType: 'SAP',
    documentId: bundle.sap.id,
    blockId: sapPrimary.id,
    field: 'name',
    oldValue: sapPrimary.name,
    newValue: protocolPrimary.name,
  })

  patches.push({
    documentType: 'SAP',
    documentId: bundle.sap.id,
    blockId: sapPrimary.id,
    field: 'description',
    oldValue: sapPrimary.description || '',
    newValue: protocolPrimary.description,
  })

  return patches
}

/**
 * Fix DOSE_INCONSISTENT
 * Align Protocol doses with IB
 */
export function fixDoseInconsistent(
  issue: CrossDocIssue,
  bundle: CrossDocBundle
): CrossDocPatch[] {
  const patches: CrossDocPatch[] = []

  if (!bundle.ib || !bundle.protocol) return patches

  const ibDoses = bundle.ib.dosingInformation || []
  const protocolArms = bundle.protocol.arms || []

  // For each IB dose without a matching Protocol arm, suggest adding it
  ibDoses.forEach(ibDose => {
    const hasMatch = protocolArms.some(arm => 
      arm.dose?.toLowerCase().includes(ibDose.dose.toLowerCase())
    )

    if (!hasMatch) {
      // Create patch to add new treatment arm
      patches.push({
        documentType: 'PROTOCOL',
        documentId: bundle.protocol!.id,
        field: 'arms',
        newValue: JSON.stringify({
          name: `Treatment with ${ibDose.dose}`,
          dose: ibDose.dose,
          route: ibDose.route,
          frequency: ibDose.frequency,
        }),
      })
    }
  })

  return patches
}

/**
 * Fix SAP_METHOD_MISMATCH
 * Update SAP statistical methods to match endpoint types
 */
export function fixSapMethodMismatch(
  issue: CrossDocIssue,
  bundle: CrossDocBundle
): CrossDocPatch[] {
  const patches: CrossDocPatch[] = []

  if (!bundle.protocol || !bundle.sap) return patches

  const protocolEndpoints = bundle.protocol.endpoints || []
  const sapTests = bundle.sap.statisticalTests || []

  // Map of appropriate tests by endpoint type
  const appropriateTests: Record<string, string> = {
    continuous: 'ANCOVA',
    binary: 'Chi-square test',
    time_to_event: 'Log-rank test',
    ordinal: 'Mann-Whitney U test',
    count: 'Poisson regression',
  }

  sapTests.forEach(test => {
    const endpoint = protocolEndpoints.find(ep => ep.id === test.endpointId)
    
    if (!endpoint || !endpoint.dataType) return

    const recommendedTest = appropriateTests[endpoint.dataType]
    
    if (recommendedTest && test.test !== recommendedTest) {
      patches.push({
        documentType: 'SAP',
        documentId: bundle.sap!.id,
        blockId: test.endpointId,
        field: 'test',
        oldValue: test.test,
        newValue: recommendedTest,
      })
    }
  })

  return patches
}

/**
 * Generate auto-fix suggestions for an issue
 */
export function generateAutoFixSuggestions(
  issue: CrossDocIssue,
  bundle: CrossDocBundle
): CrossDocPatch[] {
  switch (issue.code) {
    case 'PRIMARY_ENDPOINT_DRIFT':
      return fixPrimaryEndpointDrift(issue, bundle)
    
    case 'IB_PROTOCOL_DOSE_INCONSISTENT':
    case 'DOSE_INCONSISTENT':
      return fixDoseInconsistent(issue, bundle)
    
    case 'TEST_MISMATCH':
    case 'SAP_METHOD_MISMATCH':
      return fixSapMethodMismatch(issue, bundle)
    
    default:
      return []
  }
}
