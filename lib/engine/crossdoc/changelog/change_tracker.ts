/**
 * Change Tracker
 * Track and describe changes made during auto-fix
 */

import type { CrossDocPatch, ChangeLogEntry, CrossDocDocumentType } from '../types'

/**
 * Track a change made to a document
 */
export function trackChange(
  documentType: CrossDocDocumentType,
  documentId: string,
  field: string,
  oldValue: string,
  newValue: string,
  reason: string
): ChangeLogEntry {
  return {
    timestamp: new Date().toISOString(),
    documentType,
    documentId,
    field,
    oldValue,
    newValue,
    reason,
  }
}

/**
 * Generate human-readable description of a change
 */
export function describeChange(entry: ChangeLogEntry): string {
  const { documentType, field, oldValue, newValue, reason } = entry

  const shortOld = truncate(oldValue, 50)
  const shortNew = truncate(newValue, 50)

  return `Changed ${documentType} ${field}: "${shortOld}" → "${shortNew}". Reason: ${reason}`
}

/**
 * Generate human-readable description of multiple changes
 */
export function describeChanges(entries: ChangeLogEntry[]): string {
  if (entries.length === 0) return 'No changes made.'

  const byDocument = groupByDocument(entries)
  const descriptions: string[] = []

  Object.entries(byDocument).forEach(([docType, changes]) => {
    descriptions.push(`\n${docType}:`)
    changes.forEach(change => {
      descriptions.push(`  - ${describeChange(change)}`)
    })
  })

  return descriptions.join('\n')
}

/**
 * Group changes by document type
 */
function groupByDocument(entries: ChangeLogEntry[]): Record<string, ChangeLogEntry[]> {
  const grouped: Record<string, ChangeLogEntry[]> = {}

  entries.forEach(entry => {
    const key = entry.documentType
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(entry)
  })

  return grouped
}

/**
 * Truncate text for display
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Generate diff between old and new values
 */
export function generateDiff(oldValue: string, newValue: string): {
  added: string[]
  removed: string[]
  unchanged: string[]
} {
  const oldLines = oldValue.split('\n')
  const newLines = newValue.split('\n')

  const added: string[] = []
  const removed: string[] = []
  const unchanged: string[] = []

  // Simple line-by-line diff
  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)

  oldLines.forEach(line => {
    if (!newSet.has(line)) {
      removed.push(line)
    } else {
      unchanged.push(line)
    }
  })

  newLines.forEach(line => {
    if (!oldSet.has(line) && !unchanged.includes(line)) {
      added.push(line)
    }
  })

  return { added, removed, unchanged }
}

/**
 * Format diff for display
 */
export function formatDiff(diff: ReturnType<typeof generateDiff>): string {
  const lines: string[] = []

  diff.removed.forEach(line => {
    lines.push(`- ${line}`)
  })

  diff.added.forEach(line => {
    lines.push(`+ ${line}`)
  })

  return lines.join('\n')
}

/**
 * Validate that a patch is safe to apply
 */
export function validatePatch(patch: CrossDocPatch): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!patch.documentType) {
    errors.push('Patch missing documentType')
  }

  if (!patch.documentId) {
    errors.push('Patch missing documentId')
  }

  if (!patch.newValue) {
    errors.push('Patch missing newValue')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Merge multiple patches for the same document/field
 */
export function mergePatches(patches: CrossDocPatch[]): CrossDocPatch[] {
  const merged = new Map<string, CrossDocPatch>()

  patches.forEach(patch => {
    const key = `${patch.documentType}:${patch.documentId}:${patch.field || 'root'}`
    
    if (merged.has(key)) {
      // If multiple patches for same field, use the last one
      merged.set(key, patch)
    } else {
      merged.set(key, patch)
    }
  })

  return Array.from(merged.values())
}

/**
 * Estimate impact of applying patches
 */
export function estimateImpact(patches: CrossDocPatch[]): {
  documentsAffected: number
  fieldsChanged: number
  totalChanges: number
} {
  const documents = new Set<string>()
  const fields = new Set<string>()

  patches.forEach(patch => {
    documents.add(`${patch.documentType}:${patch.documentId}`)
    if (patch.field) {
      fields.add(`${patch.documentType}:${patch.field}`)
    }
  })

  return {
    documentsAffected: documents.size,
    fieldsChanged: fields.size,
    totalChanges: patches.length,
  }
}
