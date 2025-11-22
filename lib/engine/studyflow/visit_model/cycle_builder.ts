/**
 * Cycle Builder
 * Builds treatment cycles for cyclic studies
 */

import type { Visit, TreatmentCycle, CycleId } from '../types'
import { randomUUID } from 'crypto'

/**
 * Build treatment cycles from visits
 */
export function buildCycles(
  visits: Visit[],
  cycleLengthDays: number
): TreatmentCycle[] {
  // Filter treatment visits only
  const treatmentVisits = visits
    .filter(v => v.type === 'treatment')
    .sort((a, b) => a.day - b.day)

  if (treatmentVisits.length === 0) {
    return []
  }

  const cycles: TreatmentCycle[] = []
  let currentCycleNumber = 1
  let cycleStartDay = 0

  // Group visits into cycles
  for (const visit of treatmentVisits) {
    // Check if visit belongs to current cycle
    if (visit.day >= cycleStartDay && visit.day < cycleStartDay + cycleLengthDays) {
      // Add to current cycle
      const existingCycle = cycles.find(c => c.cycleNumber === currentCycleNumber)
      if (existingCycle) {
        existingCycle.visitsInCycle.push(visit.id)
      } else {
        cycles.push({
          id: `cycle_${currentCycleNumber}_${randomUUID().slice(0, 8)}`,
          cycleNumber: currentCycleNumber,
          lengthDays: cycleLengthDays,
          visitsInCycle: [visit.id],
          startDay: cycleStartDay,
          endDay: cycleStartDay + cycleLengthDays - 1,
        })
      }
    } else {
      // Start new cycle
      currentCycleNumber++
      cycleStartDay = Math.floor(visit.day / cycleLengthDays) * cycleLengthDays
      
      cycles.push({
        id: `cycle_${currentCycleNumber}_${randomUUID().slice(0, 8)}`,
        cycleNumber: currentCycleNumber,
        lengthDays: cycleLengthDays,
        visitsInCycle: [visit.id],
        startDay: cycleStartDay,
        endDay: cycleStartDay + cycleLengthDays - 1,
      })
    }
  }

  return cycles
}

/**
 * Infer cycle length from visit pattern
 */
export function inferCycleLength(visits: Visit[]): number | null {
  const treatmentVisits = visits
    .filter(v => v.type === 'treatment')
    .sort((a, b) => a.day - b.day)

  if (treatmentVisits.length < 3) {
    return null // Not enough data
  }

  // Calculate intervals between visits
  const intervals: number[] = []
  for (let i = 1; i < treatmentVisits.length; i++) {
    intervals.push(treatmentVisits[i].day - treatmentVisits[i - 1].day)
  }

  // Check for repeating pattern
  const commonInterval = findMostCommonInterval(intervals)
  
  if (commonInterval) {
    // Check if this interval repeats consistently
    const repeatCount = intervals.filter(i => i === commonInterval).length
    if (repeatCount >= intervals.length * 0.6) {
      // 60% of intervals match
      return commonInterval
    }
  }

  return null
}

/**
 * Find most common interval
 */
function findMostCommonInterval(intervals: number[]): number | null {
  if (intervals.length === 0) return null

  const counts = new Map<number, number>()
  
  intervals.forEach(interval => {
    counts.set(interval, (counts.get(interval) || 0) + 1)
  })

  let maxCount = 0
  let mostCommon: number | null = null

  counts.forEach((count, interval) => {
    if (count > maxCount) {
      maxCount = count
      mostCommon = interval
    }
  })

  return mostCommon
}

/**
 * Assign visits to cycles
 */
export function assignVisitsToCycles(
  visits: Visit[],
  cycles: TreatmentCycle[]
): Visit[] {
  return visits.map(visit => {
    // Find cycle for this visit
    const cycle = cycles.find(
      c => visit.day >= c.startDay && visit.day <= c.endDay
    )

    if (cycle) {
      return {
        ...visit,
        cycle: cycle.cycleNumber,
      }
    }

    return visit
  })
}

/**
 * Validate cycle structure
 */
export function validateCycles(cycles: TreatmentCycle[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check for gaps
  for (let i = 1; i < cycles.length; i++) {
    const prevCycle = cycles[i - 1]
    const currentCycle = cycles[i]

    if (currentCycle.startDay !== prevCycle.endDay + 1) {
      errors.push(
        `Gap between Cycle ${prevCycle.cycleNumber} and Cycle ${currentCycle.cycleNumber}`
      )
    }
  }

  // Check for overlaps
  for (let i = 0; i < cycles.length; i++) {
    for (let j = i + 1; j < cycles.length; j++) {
      const cycle1 = cycles[i]
      const cycle2 = cycles[j]

      if (
        (cycle1.startDay <= cycle2.endDay && cycle1.endDay >= cycle2.startDay) ||
        (cycle2.startDay <= cycle1.endDay && cycle2.endDay >= cycle1.startDay)
      ) {
        errors.push(
          `Overlap between Cycle ${cycle1.cycleNumber} and Cycle ${cycle2.cycleNumber}`
        )
      }
    }
  }

  // Check for empty cycles
  cycles.forEach(cycle => {
    if (cycle.visitsInCycle.length === 0) {
      errors.push(`Cycle ${cycle.cycleNumber} has no visits`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get cycle summary
 */
export function getCycleSummary(cycles: TreatmentCycle[]): {
  totalCycles: number
  averageCycleLength: number
  totalDuration: number
  visitsPerCycle: number[]
} {
  if (cycles.length === 0) {
    return {
      totalCycles: 0,
      averageCycleLength: 0,
      totalDuration: 0,
      visitsPerCycle: [],
    }
  }

  const totalDuration = cycles[cycles.length - 1].endDay - cycles[0].startDay + 1
  const averageCycleLength = cycles.reduce((sum, c) => sum + c.lengthDays, 0) / cycles.length
  const visitsPerCycle = cycles.map(c => c.visitsInCycle.length)

  return {
    totalCycles: cycles.length,
    averageCycleLength,
    totalDuration,
    visitsPerCycle,
  }
}
