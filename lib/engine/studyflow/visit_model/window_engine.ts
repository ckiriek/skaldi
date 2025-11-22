/**
 * Window Engine
 * Calculates visit windows based on visit type, procedures, and regulatory requirements
 */

import type { Visit, Procedure, VisitWindow } from '../types'

/**
 * Calculate optimal visit window
 */
export function calculateOptimalWindow(
  visit: Visit,
  procedures: Procedure[]
): VisitWindow {
  // If window already defined, return it
  if (visit.window) {
    return visit.window
  }

  // Get procedures for this visit
  const visitProcedures = procedures.filter(p => 
    visit.procedures.includes(p.id)
  )

  // Determine window based on procedure categories
  const hasPK = visitProcedures.some(p => p.category === 'pk')
  const hasPD = visitProcedures.some(p => p.category === 'pd')
  const hasEfficacy = visitProcedures.some(p => p.category === 'efficacy')
  const hasSafety = visitProcedures.some(p => p.category === 'safety')

  // PK/PD visits: strict window
  if (hasPK || hasPD) {
    return calculateStrictWindow(visit)
  }

  // Efficacy visits: moderate window
  if (hasEfficacy) {
    return calculateModerateWindow(visit)
  }

  // Safety visits: narrow window
  if (hasSafety) {
    return calculateNarrowWindow(visit)
  }

  // Default: standard window
  return calculateStandardWindow(visit)
}

/**
 * Strict window (for PK/PD)
 */
function calculateStrictWindow(visit: Visit): VisitWindow {
  const day = visit.day

  if (day === 0) {
    // Baseline: no window
    return { minus: 0, plus: 0, unit: 'days' }
  }

  if (day <= 7) {
    // Early visits: ±1 day
    return { minus: 1, plus: 1, unit: 'days' }
  }

  if (day <= 28) {
    // First month: ±2 days
    return { minus: 2, plus: 2, unit: 'days' }
  }

  // Later visits: ±3 days
  return { minus: 3, plus: 3, unit: 'days' }
}

/**
 * Moderate window (for efficacy)
 */
function calculateModerateWindow(visit: Visit): VisitWindow {
  const day = visit.day

  if (day === 0) {
    return { minus: 0, plus: 0, unit: 'days' }
  }

  if (day <= 7) {
    return { minus: 2, plus: 2, unit: 'days' }
  }

  if (day <= 28) {
    return { minus: 3, plus: 3, unit: 'days' }
  }

  if (day <= 84) {
    // Up to 12 weeks: ±5 days
    return { minus: 5, plus: 5, unit: 'days' }
  }

  // Later visits: ±7 days (1 week)
  return { minus: 7, plus: 7, unit: 'days' }
}

/**
 * Narrow window (for safety)
 */
function calculateNarrowWindow(visit: Visit): VisitWindow {
  const day = visit.day

  if (day === 0) {
    return { minus: 0, plus: 0, unit: 'days' }
  }

  if (day <= 14) {
    return { minus: 1, plus: 1, unit: 'days' }
  }

  if (day <= 28) {
    return { minus: 2, plus: 2, unit: 'days' }
  }

  // Later visits: ±3 days
  return { minus: 3, plus: 3, unit: 'days' }
}

/**
 * Standard window (default ±10%)
 */
function calculateStandardWindow(visit: Visit): VisitWindow {
  const day = visit.day

  if (day === 0) {
    return { minus: 0, plus: 0, unit: 'days' }
  }

  // Calculate 10% window, minimum 3 days
  const tenPercent = Math.ceil(day * 0.1)
  const window = Math.max(tenPercent, 3)

  return { minus: window, plus: window, unit: 'days' }
}

/**
 * Apply windows to all visits
 */
export function applyWindowsToVisits(
  visits: Visit[],
  procedures: Procedure[]
): Visit[] {
  return visits.map(visit => ({
    ...visit,
    window: calculateOptimalWindow(visit, procedures),
  }))
}

/**
 * Validate visit windows
 */
export function validateWindows(visits: Visit[]): {
  valid: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  visits.forEach(visit => {
    if (!visit.window) {
      warnings.push(`Visit ${visit.name} has no window defined`)
      return
    }

    // Check for unreasonably large windows
    const totalWindow = visit.window.minus + visit.window.plus
    if (totalWindow > visit.day * 0.3 && visit.day > 0) {
      warnings.push(
        `Visit ${visit.name} has large window (±${visit.window.minus}/${visit.window.plus} days for Day ${visit.day})`
      )
    }

    // Check for overlapping windows
    visits.forEach(otherVisit => {
      if (visit.id === otherVisit.id) return
      if (!otherVisit.window) return

      const visit1Start = visit.day - visit.window.minus
      const visit1End = visit.day + visit.window.plus
      const visit2Start = otherVisit.day - otherVisit.window.minus
      const visit2End = otherVisit.day + otherVisit.window.plus

      if (visit1Start <= visit2End && visit1End >= visit2Start) {
        warnings.push(
          `Window overlap between ${visit.name} and ${otherVisit.name}`
        )
      }
    })
  })

  return {
    valid: warnings.length === 0,
    warnings,
  }
}

/**
 * Get window summary
 */
export function getWindowSummary(visits: Visit[]): {
  averageWindow: number
  minWindow: number
  maxWindow: number
  strictVisits: number
  moderateVisits: number
  flexibleVisits: number
} {
  const windows = visits
    .filter(v => v.window !== undefined)
    .map(v => {
      const window = v.window!
      return window.minus + window.plus
    })

  if (windows.length === 0) {
    return {
      averageWindow: 0,
      minWindow: 0,
      maxWindow: 0,
      strictVisits: 0,
      moderateVisits: 0,
      flexibleVisits: 0,
    }
  }

  const averageWindow = windows.reduce((sum, w) => sum + w, 0) / windows.length
  const minWindow = Math.min(...windows)
  const maxWindow = Math.max(...windows)

  // Categorize visits by window size
  const strictVisits = windows.filter(w => w <= 4).length
  const moderateVisits = windows.filter(w => w > 4 && w <= 10).length
  const flexibleVisits = windows.filter(w => w > 10).length

  return {
    averageWindow,
    minWindow,
    maxWindow,
    strictVisits,
    moderateVisits,
    flexibleVisits,
  }
}
