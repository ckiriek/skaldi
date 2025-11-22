/**
 * Visit Inference
 * Adds missing mandatory visits (Screening, Baseline, EOT, Follow-up)
 */

import type { Visit, VisitId } from '../types'
import { randomUUID } from 'crypto'

/**
 * Infer and add missing visits
 */
export function inferMissingVisits(visits: Visit[]): Visit[] {
  const result = [...visits]
  
  // Check for mandatory visits
  const hasScreening = visits.some(v => v.type === 'screening')
  const hasBaseline = visits.some(v => v.type === 'baseline')
  const hasEOT = visits.some(v => v.type === 'end_of_treatment')
  const hasFollowUp = visits.some(v => v.type === 'follow_up')

  // Add Screening if missing
  if (!hasScreening) {
    result.push(createScreeningVisit())
  }

  // Add Baseline if missing
  if (!hasBaseline) {
    result.push(createBaselineVisit())
  }

  // Add End of Treatment if missing
  if (!hasEOT) {
    const lastTreatmentDay = findLastTreatmentDay(visits)
    result.push(createEOTVisit(lastTreatmentDay))
  }

  // Add Follow-up if missing
  if (!hasFollowUp) {
    const eotDay = findEOTDay(result)
    result.push(createFollowUpVisit(eotDay))
  }

  // Sort by day
  return result.sort((a, b) => a.day - b.day)
}

/**
 * Create Screening visit
 */
function createScreeningVisit(): Visit {
  return {
    id: `visit_screening_${randomUUID().slice(0, 8)}`,
    name: 'Screening',
    day: -14,
    type: 'screening',
    window: { minus: 7, plus: 7, unit: 'days' },
    procedures: [],
    required: true,
    metadata: {
      source: 'inferred',
      notes: 'Automatically added screening visit',
    },
  }
}

/**
 * Create Baseline visit
 */
function createBaselineVisit(): Visit {
  return {
    id: `visit_baseline_${randomUUID().slice(0, 8)}`,
    name: 'Baseline',
    day: 0,
    type: 'baseline',
    window: { minus: 0, plus: 0, unit: 'days' },
    procedures: [],
    required: true,
    metadata: {
      source: 'inferred',
      notes: 'Automatically added baseline visit (Day 0)',
    },
  }
}

/**
 * Create End of Treatment visit
 */
function createEOTVisit(lastDay: number): Visit {
  return {
    id: `visit_eot_${randomUUID().slice(0, 8)}`,
    name: 'End of Treatment',
    day: lastDay,
    type: 'end_of_treatment',
    window: { minus: 3, plus: 3, unit: 'days' },
    procedures: [],
    required: true,
    metadata: {
      source: 'inferred',
      notes: `Automatically added EOT visit at Day ${lastDay}`,
    },
  }
}

/**
 * Create Follow-up visit
 */
function createFollowUpVisit(eotDay: number): Visit {
  const followUpDay = eotDay + 30 // 30 days after EOT
  return {
    id: `visit_followup_${randomUUID().slice(0, 8)}`,
    name: 'Follow-up',
    day: followUpDay,
    type: 'follow_up',
    window: { minus: 7, plus: 7, unit: 'days' },
    procedures: [],
    required: false,
    metadata: {
      source: 'inferred',
      notes: `Automatically added follow-up visit 30 days after EOT`,
    },
  }
}

/**
 * Find last treatment day
 */
function findLastTreatmentDay(visits: Visit[]): number {
  const treatmentVisits = visits.filter(v => v.type === 'treatment')
  if (treatmentVisits.length === 0) {
    // Default to 84 days (12 weeks) if no treatment visits
    return 84
  }
  return Math.max(...treatmentVisits.map(v => v.day))
}

/**
 * Find EOT day
 */
function findEOTDay(visits: Visit[]): number {
  const eot = visits.find(v => v.type === 'end_of_treatment')
  if (eot) return eot.day
  return findLastTreatmentDay(visits)
}

/**
 * Add unscheduled visit placeholder
 */
export function addUnscheduledVisit(): Visit {
  return {
    id: `visit_unscheduled_${randomUUID().slice(0, 8)}`,
    name: 'Unscheduled',
    day: -1,
    type: 'unscheduled',
    procedures: [],
    required: false,
    metadata: {
      source: 'inferred',
      notes: 'Placeholder for unscheduled visits',
    },
  }
}

/**
 * Validate visit sequence
 */
export function validateVisitSequence(visits: Visit[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check for baseline
  const hasBaseline = visits.some(v => v.type === 'baseline')
  if (!hasBaseline) {
    errors.push('Missing baseline visit (Day 0)')
  }

  // Check for negative days (except screening)
  const invalidDays = visits.filter(
    v => v.day < 0 && v.type !== 'screening' && v.type !== 'unscheduled'
  )
  if (invalidDays.length > 0) {
    errors.push(`Invalid negative days for non-screening visits: ${invalidDays.map(v => v.name).join(', ')}`)
  }

  // Check for duplicate days (except unscheduled)
  const dayMap = new Map<number, Visit[]>()
  visits
    .filter(v => v.type !== 'unscheduled')
    .forEach(v => {
      if (!dayMap.has(v.day)) {
        dayMap.set(v.day, [])
      }
      dayMap.get(v.day)!.push(v)
    })

  dayMap.forEach((visitsOnDay, day) => {
    if (visitsOnDay.length > 1) {
      errors.push(
        `Multiple visits on Day ${day}: ${visitsOnDay.map(v => v.name).join(', ')}`
      )
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}
