/**
 * Visit Normalizer
 * Parses and normalizes visit names from protocols
 */

import type { Visit, VisitNormalizationResult } from '../types'

/**
 * Normalize visit name to canonical form
 */
export function normalizeVisitName(visitName: string): VisitNormalizationResult {
  const cleaned = visitName.trim()

  // Try different patterns
  const dayMatch = matchDay(cleaned)
  if (dayMatch) return dayMatch

  const weekMatch = matchWeek(cleaned)
  if (weekMatch) return weekMatch

  const monthMatch = matchMonth(cleaned)
  if (monthMatch) return monthMatch

  const specialMatch = matchSpecialVisit(cleaned)
  if (specialMatch) return specialMatch

  // Fallback: treat as visit number
  const visitNumberMatch = matchVisitNumber(cleaned)
  if (visitNumberMatch) return visitNumberMatch

  // Unknown format
  return {
    originalName: visitName,
    normalizedName: cleaned,
    day: 0,
    type: 'treatment',
    confidence: 0.3,
  }
}

/**
 * Match "Day X" pattern (EN/RU)
 */
function matchDay(text: string): VisitNormalizationResult | null {
  // English: Day 1, Day 14, D1, D14
  const enPattern = /(?:day|d)\s*(\d+)/i
  const enMatch = text.match(enPattern)
  
  if (enMatch) {
    const day = parseInt(enMatch[1])
    return {
      originalName: text,
      normalizedName: `Day ${day}`,
      day,
      type: determineVisitType(day),
      confidence: 0.95,
    }
  }

  // Russian: День 1, Д1
  const ruPattern = /(?:день|д)\s*(\d+)/i
  const ruMatch = text.match(ruPattern)
  
  if (ruMatch) {
    const day = parseInt(ruMatch[1])
    return {
      originalName: text,
      normalizedName: `Day ${day}`,
      day,
      type: determineVisitType(day),
      confidence: 0.95,
    }
  }

  return null
}

/**
 * Match "Week X" pattern (EN/RU)
 */
function matchWeek(text: string): VisitNormalizationResult | null {
  // English: Week 1, Week 4, W1, W4
  const enPattern = /(?:week|w)\s*(\d+)/i
  const enMatch = text.match(enPattern)
  
  if (enMatch) {
    const week = parseInt(enMatch[1])
    const day = week * 7
    return {
      originalName: text,
      normalizedName: `Week ${week}`,
      day,
      type: determineVisitType(day),
      confidence: 0.95,
    }
  }

  // Russian: Неделя 1, Нед 1
  const ruPattern = /(?:неделя|нед)\s*(\d+)/i
  const ruMatch = text.match(ruPattern)
  
  if (ruMatch) {
    const week = parseInt(ruMatch[1])
    const day = week * 7
    return {
      originalName: text,
      normalizedName: `Week ${week}`,
      day,
      type: determineVisitType(day),
      confidence: 0.95,
    }
  }

  return null
}

/**
 * Match "Month X" pattern (EN/RU)
 */
function matchMonth(text: string): VisitNormalizationResult | null {
  // English: Month 1, Month 6, M1, M6
  const enPattern = /(?:month|m)\s*(\d+)/i
  const enMatch = text.match(enPattern)
  
  if (enMatch) {
    const month = parseInt(enMatch[1])
    const day = month * 30
    return {
      originalName: text,
      normalizedName: `Month ${month}`,
      day,
      type: determineVisitType(day),
      confidence: 0.9,
    }
  }

  // Russian: Месяц 1, Мес 1
  const ruPattern = /(?:месяц|мес)\s*(\d+)/i
  const ruMatch = text.match(ruPattern)
  
  if (ruMatch) {
    const month = parseInt(ruMatch[1])
    const day = month * 30
    return {
      originalName: text,
      normalizedName: `Month ${month}`,
      day,
      type: determineVisitType(day),
      confidence: 0.9,
    }
  }

  return null
}

/**
 * Match special visits (Screening, Baseline, etc.)
 */
function matchSpecialVisit(text: string): VisitNormalizationResult | null {
  const lower = text.toLowerCase()

  // Screening
  if (lower.includes('screening') || lower.includes('скрининг')) {
    return {
      originalName: text,
      normalizedName: 'Screening',
      day: -14, // typically 2 weeks before baseline
      type: 'screening',
      confidence: 0.98,
    }
  }

  // Baseline
  if (lower.includes('baseline') || lower.includes('базовый') || lower.includes('исходный')) {
    return {
      originalName: text,
      normalizedName: 'Baseline',
      day: 0,
      type: 'baseline',
      confidence: 0.98,
    }
  }

  // End of Treatment
  if (lower.includes('end of treatment') || lower.includes('eot') || lower.includes('окончание лечения')) {
    return {
      originalName: text,
      normalizedName: 'End of Treatment',
      day: 999, // placeholder, will be calculated
      type: 'end_of_treatment',
      confidence: 0.95,
    }
  }

  // Follow-up
  if (lower.includes('follow') || lower.includes('последующий') || lower.includes('наблюдение')) {
    return {
      originalName: text,
      normalizedName: 'Follow-up',
      day: 1000, // placeholder
      type: 'follow_up',
      confidence: 0.9,
    }
  }

  // Unscheduled
  if (lower.includes('unscheduled') || lower.includes('внеплановый')) {
    return {
      originalName: text,
      normalizedName: 'Unscheduled',
      day: -1,
      type: 'unscheduled',
      confidence: 0.95,
    }
  }

  return null
}

/**
 * Match "Visit X" pattern
 */
function matchVisitNumber(text: string): VisitNormalizationResult | null {
  // English: Visit 1, Visit 2, V1, V2
  const enPattern = /(?:visit|v)\s*(\d+)/i
  const enMatch = text.match(enPattern)
  
  if (enMatch) {
    const visitNum = parseInt(enMatch[1])
    // Estimate day based on visit number (rough heuristic)
    const day = visitNum === 1 ? 0 : (visitNum - 1) * 7
    return {
      originalName: text,
      normalizedName: `Visit ${visitNum}`,
      day,
      type: determineVisitType(day),
      confidence: 0.7,
    }
  }

  // Russian: Визит 1, В1
  const ruPattern = /(?:визит|в)\s*(\d+)/i
  const ruMatch = text.match(ruPattern)
  
  if (ruMatch) {
    const visitNum = parseInt(ruMatch[1])
    const day = visitNum === 1 ? 0 : (visitNum - 1) * 7
    return {
      originalName: text,
      normalizedName: `Visit ${visitNum}`,
      day,
      type: determineVisitType(day),
      confidence: 0.7,
    }
  }

  return null
}

/**
 * Determine visit type based on day
 */
function determineVisitType(day: number): Visit['type'] {
  if (day < 0) return 'screening'
  if (day === 0) return 'baseline'
  if (day > 0 && day < 999) return 'treatment'
  if (day === 999) return 'end_of_treatment'
  if (day >= 1000) return 'follow_up'
  return 'treatment'
}

/**
 * Normalize multiple visits
 */
export function normalizeVisits(visitNames: string[]): VisitNormalizationResult[] {
  return visitNames.map(name => normalizeVisitName(name))
}

/**
 * Sort visits by day
 */
export function sortVisitsByDay(visits: Visit[]): Visit[] {
  return [...visits].sort((a, b) => a.day - b.day)
}

/**
 * Calculate visit windows based on type and day
 */
export function calculateVisitWindow(visit: Visit): Visit['window'] {
  // Already has window
  if (visit.window) return visit.window

  const day = visit.day

  // Screening: flexible window
  if (visit.type === 'screening') {
    return { minus: 7, plus: 7, unit: 'days' }
  }

  // Baseline: strict
  if (visit.type === 'baseline') {
    return { minus: 0, plus: 0, unit: 'days' }
  }

  // Treatment visits: ±10% or ±3 days, whichever is larger
  if (visit.type === 'treatment') {
    const tenPercent = Math.ceil(day * 0.1)
    const window = Math.max(tenPercent, 3)
    return { minus: window, plus: window, unit: 'days' }
  }

  // End of treatment: moderate window
  if (visit.type === 'end_of_treatment') {
    return { minus: 3, plus: 3, unit: 'days' }
  }

  // Follow-up: flexible
  if (visit.type === 'follow_up') {
    return { minus: 7, plus: 7, unit: 'days' }
  }

  // Default
  return { minus: 3, plus: 3, unit: 'days' }
}
