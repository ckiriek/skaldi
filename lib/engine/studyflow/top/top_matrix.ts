/**
 * Table of Procedures Matrix
 * Interactive ToP JSON generation and manipulation
 */

import type { TopMatrix, Visit, Procedure } from '../types'

/**
 * Convert ToP to interactive JSON format
 */
export function topToJSON(top: TopMatrix): any {
  return {
    metadata: {
      generatedAt: top.metadata.generatedAt,
      version: top.metadata.version,
      studyId: top.metadata.studyId,
      protocolId: top.metadata.protocolId,
      totalVisits: top.visits.length,
      totalProcedures: top.procedures.length,
    },
    visits: top.visits.map((visit, index) => ({
      id: visit.id,
      name: visit.name,
      day: visit.day,
      type: visit.type,
      window: visit.window,
      procedures: top.matrix[index]
        .map((hasProc, procIndex) => (hasProc ? top.procedures[procIndex].id : null))
        .filter((id): id is string => id !== null),
      procedureCount: top.matrix[index].filter(cell => cell).length,
    })),
    procedures: top.procedures.map((proc, procIndex) => {
      const visitCount = top.matrix.filter(row => row[procIndex]).length
      return {
        id: proc.id,
        name: proc.name,
        category: proc.category,
        required: proc.required,
        visitCount,
        visits: top.visits
          .filter((_, visitIndex) => top.matrix[visitIndex][procIndex])
          .map(v => v.id),
      }
    }),
    matrix: top.matrix,
  }
}

/**
 * Convert ToP to CSV format
 */
export function topToCSV(top: TopMatrix): string {
  const lines: string[] = []

  // Header row
  const header = ['Visit', 'Day', 'Type', ...top.procedures.map(p => p.name)]
  lines.push(header.join(','))

  // Data rows
  top.visits.forEach((visit, visitIndex) => {
    const row = [
      `"${visit.name}"`,
      visit.day.toString(),
      visit.type,
      ...top.matrix[visitIndex].map(cell => (cell ? 'X' : '')),
    ]
    lines.push(row.join(','))
  })

  return lines.join('\n')
}

/**
 * Convert ToP to Markdown table
 */
export function topToMarkdown(top: TopMatrix): string {
  const lines: string[] = []

  // Header
  const header = ['Visit', 'Day', ...top.procedures.map(p => p.name)]
  lines.push('| ' + header.join(' | ') + ' |')
  
  // Separator
  const separator = header.map(() => '---')
  lines.push('| ' + separator.join(' | ') + ' |')

  // Data rows
  top.visits.forEach((visit, visitIndex) => {
    const row = [
      visit.name,
      visit.day.toString(),
      ...top.matrix[visitIndex].map(cell => (cell ? '✓' : '')),
    ]
    lines.push('| ' + row.join(' | ') + ' |')
  })

  return lines.join('\n')
}

/**
 * Convert ToP to HTML table
 */
export function topToHTML(top: TopMatrix): string {
  let html = '<table class="top-matrix">\n'
  
  // Header
  html += '  <thead>\n'
  html += '    <tr>\n'
  html += '      <th>Visit</th>\n'
  html += '      <th>Day</th>\n'
  html += '      <th>Type</th>\n'
  top.procedures.forEach(proc => {
    html += `      <th>${escapeHTML(proc.name)}</th>\n`
  })
  html += '    </tr>\n'
  html += '  </thead>\n'

  // Body
  html += '  <tbody>\n'
  top.visits.forEach((visit, visitIndex) => {
    html += '    <tr>\n'
    html += `      <td>${escapeHTML(visit.name)}</td>\n`
    html += `      <td>${visit.day}</td>\n`
    html += `      <td>${visit.type}</td>\n`
    top.matrix[visitIndex].forEach(cell => {
      html += `      <td class="${cell ? 'has-proc' : 'no-proc'}">${cell ? '✓' : ''}</td>\n`
    })
    html += '    </tr>\n'
  })
  html += '  </tbody>\n'
  
  html += '</table>'
  
  return html
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Convert ToP to Excel-friendly format (array of arrays)
 */
export function topToExcelData(top: TopMatrix): any[][] {
  const data: any[][] = []

  // Header row
  const header = ['Visit', 'Day', 'Type', 'Window', ...top.procedures.map(p => p.name)]
  data.push(header)

  // Data rows
  top.visits.forEach((visit, visitIndex) => {
    const windowStr = visit.window
      ? `±${visit.window.minus}/${visit.window.plus} ${visit.window.unit}`
      : ''
    
    const row = [
      visit.name,
      visit.day,
      visit.type,
      windowStr,
      ...top.matrix[visitIndex].map(cell => (cell ? 'X' : '')),
    ]
    data.push(row)
  })

  return data
}

/**
 * Transpose ToP matrix (procedures as rows, visits as columns)
 */
export function transposeTop(top: TopMatrix): TopMatrix {
  const transposedMatrix: boolean[][] = []

  for (let procIndex = 0; procIndex < top.procedures.length; procIndex++) {
    transposedMatrix[procIndex] = []
    for (let visitIndex = 0; visitIndex < top.visits.length; visitIndex++) {
      transposedMatrix[procIndex][visitIndex] = top.matrix[visitIndex][procIndex]
    }
  }

  // Note: In transposed view, visits become "procedures" and vice versa
  // This is just for display purposes
  return {
    visits: top.visits,
    procedures: top.procedures,
    matrix: transposedMatrix,
    metadata: {
      ...top.metadata,
      version: top.metadata.version + '-transposed',
    },
  }
}

/**
 * Filter ToP by visit type
 */
export function filterTopByVisitType(
  top: TopMatrix,
  visitType: Visit['type']
): TopMatrix {
  const filteredVisits = top.visits.filter(v => v.type === visitType)
  const visitIndices = filteredVisits.map(v => top.visits.findIndex(vv => vv.id === v.id))

  const filteredMatrix = visitIndices.map(index => top.matrix[index])

  return {
    visits: filteredVisits,
    procedures: top.procedures,
    matrix: filteredMatrix,
    metadata: {
      ...top.metadata,
      version: top.metadata.version + `-filtered-${visitType}`,
    },
  }
}

/**
 * Filter ToP by procedure category
 */
export function filterTopByProcedureCategory(
  top: TopMatrix,
  category: Procedure['category']
): TopMatrix {
  const filteredProcs = top.procedures.filter(p => p.category === category)
  const procIndices = filteredProcs.map(p => top.procedures.findIndex(pp => pp.id === p.id))

  const filteredMatrix = top.matrix.map(row =>
    procIndices.map(index => row[index])
  )

  return {
    visits: top.visits,
    procedures: filteredProcs,
    matrix: filteredMatrix,
    metadata: {
      ...top.metadata,
      version: top.metadata.version + `-filtered-${category}`,
    },
  }
}

/**
 * Get ToP summary by category
 */
export function getTopSummaryByCategory(top: TopMatrix): {
  category: Procedure['category']
  procedureCount: number
  totalOccurrences: number
  averagePerVisit: number
}[] {
  const categories = [...new Set(top.procedures.map(p => p.category))]

  return categories.map(category => {
    const categoryProcs = top.procedures.filter(p => p.category === category)
    const procIndices = categoryProcs.map(p => top.procedures.findIndex(pp => pp.id === p.id))

    let totalOccurrences = 0
    top.matrix.forEach(row => {
      procIndices.forEach(index => {
        if (row[index]) totalOccurrences++
      })
    })

    return {
      category,
      procedureCount: categoryProcs.length,
      totalOccurrences,
      averagePerVisit: top.visits.length > 0 ? totalOccurrences / top.visits.length : 0,
    }
  })
}

/**
 * Compare two ToP matrices
 */
export function compareTopMatrices(
  top1: TopMatrix,
  top2: TopMatrix
): {
  addedVisits: Visit[]
  removedVisits: Visit[]
  addedProcedures: Procedure[]
  removedProcedures: Procedure[]
  changedCells: Array<{
    visitId: string
    procedureId: string
    oldValue: boolean
    newValue: boolean
  }>
} {
  const addedVisits = top2.visits.filter(v => !top1.visits.find(vv => vv.id === v.id))
  const removedVisits = top1.visits.filter(v => !top2.visits.find(vv => vv.id === v.id))
  const addedProcedures = top2.procedures.filter(p => !top1.procedures.find(pp => pp.id === p.id))
  const removedProcedures = top1.procedures.filter(p => !top2.procedures.find(pp => pp.id === p.id))

  const changedCells: Array<{
    visitId: string
    procedureId: string
    oldValue: boolean
    newValue: boolean
  }> = []

  // Compare common visits and procedures
  top1.visits.forEach((visit, visitIndex1) => {
    const visitIndex2 = top2.visits.findIndex(v => v.id === visit.id)
    if (visitIndex2 === -1) return

    top1.procedures.forEach((proc, procIndex1) => {
      const procIndex2 = top2.procedures.findIndex(p => p.id === proc.id)
      if (procIndex2 === -1) return

      const oldValue = top1.matrix[visitIndex1][procIndex1]
      const newValue = top2.matrix[visitIndex2][procIndex2]

      if (oldValue !== newValue) {
        changedCells.push({
          visitId: visit.id,
          procedureId: proc.id,
          oldValue,
          newValue,
        })
      }
    })
  })

  return {
    addedVisits,
    removedVisits,
    addedProcedures,
    removedProcedures,
    changedCells,
  }
}
