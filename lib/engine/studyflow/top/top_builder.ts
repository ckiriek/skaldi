/**
 * Table of Procedures Builder
 * Builds ToP matrix from visits and procedures
 */

import type { Visit, Procedure, TopMatrix, VisitId, ProcedureId } from '../types'

/**
 * Build Table of Procedures matrix
 */
export function buildTopMatrix(
  visits: Visit[],
  procedures: Procedure[]
): TopMatrix {
  // Sort visits by day
  const sortedVisits = [...visits].sort((a, b) => a.day - b.day)
  
  // Initialize matrix with false
  const matrix: boolean[][] = []
  
  for (let i = 0; i < sortedVisits.length; i++) {
    matrix[i] = []
    for (let j = 0; j < procedures.length; j++) {
      matrix[i][j] = false
    }
  }

  // Fill matrix based on visit.procedures
  sortedVisits.forEach((visit, visitIndex) => {
    visit.procedures.forEach(procId => {
      const procIndex = procedures.findIndex(p => p.id === procId)
      if (procIndex !== -1) {
        matrix[visitIndex][procIndex] = true
      }
    })
  })

  return {
    visits: sortedVisits,
    procedures,
    matrix,
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0',
    },
  }
}

/**
 * Add procedure to visit in ToP
 */
export function addProcedureToVisit(
  top: TopMatrix,
  visitId: VisitId,
  procedureId: ProcedureId
): TopMatrix {
  const visitIndex = top.visits.findIndex(v => v.id === visitId)
  const procIndex = top.procedures.findIndex(p => p.id === procedureId)

  if (visitIndex === -1 || procIndex === -1) {
    throw new Error(`Visit or procedure not found`)
  }

  // Clone matrix
  const newMatrix = top.matrix.map(row => [...row])
  newMatrix[visitIndex][procIndex] = true

  // Update visit.procedures
  const newVisits = top.visits.map(v => {
    if (v.id === visitId) {
      return {
        ...v,
        procedures: [...v.procedures, procedureId],
      }
    }
    return v
  })

  return {
    ...top,
    visits: newVisits,
    matrix: newMatrix,
  }
}

/**
 * Remove procedure from visit in ToP
 */
export function removeProcedureFromVisit(
  top: TopMatrix,
  visitId: VisitId,
  procedureId: ProcedureId
): TopMatrix {
  const visitIndex = top.visits.findIndex(v => v.id === visitId)
  const procIndex = top.procedures.findIndex(p => p.id === procedureId)

  if (visitIndex === -1 || procIndex === -1) {
    throw new Error(`Visit or procedure not found`)
  }

  // Clone matrix
  const newMatrix = top.matrix.map(row => [...row])
  newMatrix[visitIndex][procIndex] = false

  // Update visit.procedures
  const newVisits = top.visits.map(v => {
    if (v.id === visitId) {
      return {
        ...v,
        procedures: v.procedures.filter(p => p !== procedureId),
      }
    }
    return v
  })

  return {
    ...top,
    visits: newVisits,
    matrix: newMatrix,
  }
}

/**
 * Add procedure to all visits
 */
export function addProcedureToAllVisits(
  top: TopMatrix,
  procedureId: ProcedureId
): TopMatrix {
  const procIndex = top.procedures.findIndex(p => p.id === procedureId)

  if (procIndex === -1) {
    throw new Error(`Procedure not found`)
  }

  // Clone matrix and set all to true for this procedure
  const newMatrix = top.matrix.map(row => {
    const newRow = [...row]
    newRow[procIndex] = true
    return newRow
  })

  // Update all visits
  const newVisits = top.visits.map(v => ({
    ...v,
    procedures: [...new Set([...v.procedures, procedureId])],
  }))

  return {
    ...top,
    visits: newVisits,
    matrix: newMatrix,
  }
}

/**
 * Get procedures for visit
 */
export function getProceduresForVisit(
  top: TopMatrix,
  visitId: VisitId
): Procedure[] {
  const visitIndex = top.visits.findIndex(v => v.id === visitId)
  
  if (visitIndex === -1) {
    return []
  }

  const procedures: Procedure[] = []
  
  top.matrix[visitIndex].forEach((hasProc, procIndex) => {
    if (hasProc) {
      procedures.push(top.procedures[procIndex])
    }
  })

  return procedures
}

/**
 * Get visits for procedure
 */
export function getVisitsForProcedure(
  top: TopMatrix,
  procedureId: ProcedureId
): Visit[] {
  const procIndex = top.procedures.findIndex(p => p.id === procedureId)
  
  if (procIndex === -1) {
    return []
  }

  const visits: Visit[] = []
  
  top.matrix.forEach((row, visitIndex) => {
    if (row[procIndex]) {
      visits.push(top.visits[visitIndex])
    }
  })

  return visits
}

/**
 * Get ToP statistics
 */
export function getTopStats(top: TopMatrix): {
  totalVisits: number
  totalProcedures: number
  totalCells: number
  filledCells: number
  fillPercentage: number
  proceduresPerVisit: number[]
  visitsPerProcedure: number[]
  mostCommonProcedures: Array<{ procedure: Procedure; count: number }>
  busiestVisits: Array<{ visit: Visit; count: number }>
} {
  const totalVisits = top.visits.length
  const totalProcedures = top.procedures.length
  const totalCells = totalVisits * totalProcedures

  // Count filled cells
  let filledCells = 0
  top.matrix.forEach(row => {
    row.forEach(cell => {
      if (cell) filledCells++
    })
  })

  const fillPercentage = totalCells > 0 ? (filledCells / totalCells) * 100 : 0

  // Procedures per visit
  const proceduresPerVisit = top.matrix.map(row =>
    row.filter(cell => cell).length
  )

  // Visits per procedure
  const visitsPerProcedure: number[] = []
  for (let procIndex = 0; procIndex < totalProcedures; procIndex++) {
    let count = 0
    for (let visitIndex = 0; visitIndex < totalVisits; visitIndex++) {
      if (top.matrix[visitIndex][procIndex]) count++
    }
    visitsPerProcedure.push(count)
  }

  // Most common procedures (top 10)
  const procedureCounts = top.procedures.map((proc, index) => ({
    procedure: proc,
    count: visitsPerProcedure[index],
  }))
  const mostCommonProcedures = procedureCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Busiest visits (top 10)
  const visitCounts = top.visits.map((visit, index) => ({
    visit,
    count: proceduresPerVisit[index],
  }))
  const busiestVisits = visitCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalVisits,
    totalProcedures,
    totalCells,
    filledCells,
    fillPercentage,
    proceduresPerVisit,
    visitsPerProcedure,
    mostCommonProcedures,
    busiestVisits,
  }
}

/**
 * Validate ToP completeness
 */
export function validateTopCompleteness(top: TopMatrix): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for empty visits
  top.visits.forEach((visit, index) => {
    const procCount = top.matrix[index].filter(cell => cell).length
    if (procCount === 0) {
      warnings.push(`Visit "${visit.name}" has no procedures`)
    }
  })

  // Check for unused procedures
  top.procedures.forEach((proc, procIndex) => {
    let usedCount = 0
    for (let visitIndex = 0; visitIndex < top.visits.length; visitIndex++) {
      if (top.matrix[visitIndex][procIndex]) usedCount++
    }
    if (usedCount === 0) {
      warnings.push(`Procedure "${proc.name}" is not used in any visit`)
    }
  })

  // Check for required procedures
  const requiredProcs = top.procedures.filter(p => p.required)
  requiredProcs.forEach(proc => {
    const procIndex = top.procedures.findIndex(p => p.id === proc.id)
    let found = false
    for (let visitIndex = 0; visitIndex < top.visits.length; visitIndex++) {
      if (top.matrix[visitIndex][procIndex]) {
        found = true
        break
      }
    }
    if (!found) {
      errors.push(`Required procedure "${proc.name}" is missing from all visits`)
    }
  })

  // Check baseline visit has required procedures
  const baselineVisit = top.visits.find(v => v.type === 'baseline')
  if (baselineVisit) {
    const baselineIndex = top.visits.findIndex(v => v.id === baselineVisit.id)
    const baselineProcs = top.matrix[baselineIndex]
      .map((hasProc, index) => (hasProc ? top.procedures[index] : null))
      .filter((p): p is Procedure => p !== null)

    // Should have vital signs, physical exam, labs
    const hasVitals = baselineProcs.some(p => p.category === 'vital_signs')
    const hasPhysicalExam = baselineProcs.some(p => p.category === 'physical_exam')
    const hasLabs = baselineProcs.some(p => p.category === 'labs')

    if (!hasVitals) warnings.push('Baseline visit missing vital signs')
    if (!hasPhysicalExam) warnings.push('Baseline visit missing physical exam')
    if (!hasLabs) warnings.push('Baseline visit missing laboratory tests')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Clone ToP matrix
 */
export function cloneTopMatrix(top: TopMatrix): TopMatrix {
  return {
    visits: top.visits.map(v => ({ ...v, procedures: [...v.procedures] })),
    procedures: top.procedures.map(p => ({ ...p })),
    matrix: top.matrix.map(row => [...row]),
    metadata: { ...top.metadata },
  }
}
