/**
 * Table of Procedures Export
 * Export ToP to various formats (DOCX, PDF, Excel)
 */

import type { TopMatrix } from '../types'
import { topToExcelData, topToHTML, topToMarkdown, topToCSV } from './top_matrix'

/**
 * Export ToP to DOCX (placeholder - requires docx library)
 */
export async function exportTopToDOCX(top: TopMatrix): Promise<Blob> {
  // TODO: Implement with docx library
  // For now, return HTML as fallback
  const html = topToHTML(top)
  return new Blob([html], { type: 'text/html' })
}

/**
 * Export ToP to Excel (placeholder - requires xlsx library)
 */
export async function exportTopToExcel(top: TopMatrix): Promise<Blob> {
  // TODO: Implement with xlsx library
  // For now, return CSV
  const csv = topToCSV(top)
  return new Blob([csv], { type: 'text/csv' })
}

/**
 * Export ToP to PDF (placeholder - requires pdf library)
 */
export async function exportTopToPDF(top: TopMatrix): Promise<Blob> {
  // TODO: Implement with pdf library
  // For now, return HTML
  const html = topToHTML(top)
  return new Blob([html], { type: 'text/html' })
}

/**
 * Generate ToP report (HTML with styling)
 */
export function generateTopReport(top: TopMatrix): string {
  const stats = getTopReportStats(top)
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Table of Procedures - ${top.metadata.studyId || 'Study'}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }
    .metadata {
      background: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #3498db;
    }
    .stat-label {
      font-size: 14px;
      color: #7f8c8d;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 12px;
    }
    th {
      background: #34495e;
      color: white;
      padding: 10px;
      text-align: left;
      position: sticky;
      top: 0;
    }
    td {
      border: 1px solid #ddd;
      padding: 8px;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .has-proc {
      background: #2ecc71;
      color: white;
      text-align: center;
      font-weight: bold;
    }
    .no-proc {
      background: #ecf0f1;
    }
    .category-efficacy { background: #3498db; color: white; }
    .category-safety { background: #e74c3c; color: white; }
    .category-labs { background: #9b59b6; color: white; }
    .category-pk { background: #f39c12; color: white; }
    .category-pd { background: #e67e22; color: white; }
    .category-questionnaire { background: #1abc9c; color: white; }
    .category-vital_signs { background: #16a085; color: white; }
    .category-physical_exam { background: #27ae60; color: white; }
    .category-ecg { background: #2980b9; color: white; }
    .category-imaging { background: #8e44ad; color: white; }
    .category-adverse_events { background: #c0392b; color: white; }
    .category-concomitant_meds { background: #d35400; color: white; }
    .category-device { background: #7f8c8d; color: white; }
    .category-other { background: #95a5a6; color: white; }
  </style>
</head>
<body>
  <h1>Table of Procedures</h1>
  
  <div class="metadata">
    <strong>Study ID:</strong> ${top.metadata.studyId || 'N/A'}<br>
    <strong>Protocol ID:</strong> ${top.metadata.protocolId || 'N/A'}<br>
    <strong>Generated:</strong> ${new Date(top.metadata.generatedAt).toLocaleString()}<br>
    <strong>Version:</strong> ${top.metadata.version}
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${stats.totalVisits}</div>
      <div class="stat-label">Total Visits</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.totalProcedures}</div>
      <div class="stat-label">Total Procedures</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.fillPercentage.toFixed(1)}%</div>
      <div class="stat-label">Matrix Fill</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.avgProceduresPerVisit.toFixed(1)}</div>
      <div class="stat-label">Avg Procedures/Visit</div>
    </div>
  </div>

  <h2>Table of Procedures Matrix</h2>
  <table class="top-matrix">
    <thead>
      <tr>
        <th>Visit</th>
        <th>Day</th>
        <th>Type</th>
        ${top.procedures.map(p => `<th class="category-${p.category}">${escapeHTML(p.name)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${top.visits.map((visit, visitIndex) => `
        <tr>
          <td><strong>${escapeHTML(visit.name)}</strong></td>
          <td>${visit.day}</td>
          <td>${visit.type}</td>
          ${top.matrix[visitIndex].map(cell => 
            `<td class="${cell ? 'has-proc' : 'no-proc'}">${cell ? '✓' : ''}</td>`
          ).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Procedure Summary by Category</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Procedures</th>
        <th>Total Occurrences</th>
        <th>Avg per Visit</th>
      </tr>
    </thead>
    <tbody>
      ${stats.byCategory.map(cat => `
        <tr>
          <td class="category-${cat.category}">${cat.category}</td>
          <td>${cat.procedureCount}</td>
          <td>${cat.totalOccurrences}</td>
          <td>${cat.averagePerVisit.toFixed(1)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

</body>
</html>
`

  return html
}

/**
 * Get ToP report statistics
 */
function getTopReportStats(top: TopMatrix) {
  const totalVisits = top.visits.length
  const totalProcedures = top.procedures.length
  const totalCells = totalVisits * totalProcedures

  let filledCells = 0
  top.matrix.forEach(row => {
    row.forEach(cell => {
      if (cell) filledCells++
    })
  })

  const fillPercentage = totalCells > 0 ? (filledCells / totalCells) * 100 : 0

  const proceduresPerVisit = top.matrix.map(row => row.filter(cell => cell).length)
  const avgProceduresPerVisit = proceduresPerVisit.reduce((sum, count) => sum + count, 0) / totalVisits

  // By category
  const categories = [...new Set(top.procedures.map(p => p.category))]
  const byCategory = categories.map(category => {
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
      averagePerVisit: totalVisits > 0 ? totalOccurrences / totalVisits : 0,
    }
  })

  return {
    totalVisits,
    totalProcedures,
    totalCells,
    filledCells,
    fillPercentage,
    avgProceduresPerVisit,
    byCategory,
  }
}

/**
 * Escape HTML
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
 * Export formats enum
 */
export enum ExportFormat {
  DOCX = 'docx',
  EXCEL = 'excel',
  PDF = 'pdf',
  HTML = 'html',
  CSV = 'csv',
  MARKDOWN = 'markdown',
  JSON = 'json',
}

/**
 * Export ToP to specified format
 */
export async function exportTop(
  top: TopMatrix,
  format: ExportFormat
): Promise<Blob | string> {
  switch (format) {
    case ExportFormat.DOCX:
      return exportTopToDOCX(top)
    case ExportFormat.EXCEL:
      return exportTopToExcel(top)
    case ExportFormat.PDF:
      return exportTopToPDF(top)
    case ExportFormat.HTML:
      return generateTopReport(top)
    case ExportFormat.CSV:
      return topToCSV(top)
    case ExportFormat.MARKDOWN:
      return topToMarkdown(top)
    case ExportFormat.JSON:
      return JSON.stringify(top, null, 2)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}
