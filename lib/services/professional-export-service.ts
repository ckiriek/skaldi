/**
 * Professional Document Export Service
 * 
 * Uses Puppeteer for high-quality PDF generation and html-to-docx for DOCX.
 * Properly handles HTML entities, markdown formatting, tables, and styling.
 */

import { marked } from 'marked'
import puppeteer from 'puppeteer'
// @ts-ignore - html-to-docx types are incomplete
import HTMLtoDOCX from 'html-to-docx'

// Clinical document styling
const DOCUMENT_STYLES = `
  @page {
    size: A4;
    margin: 25mm 20mm 25mm 20mm;
    @bottom-center {
      content: counter(page) " of " counter(pages);
      font-size: 9pt;
      color: #666;
    }
  }
  
  * {
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #000;
    max-width: 100%;
    margin: 0;
    padding: 0;
  }
  
  h1 {
    font-size: 16pt;
    font-weight: bold;
    margin-top: 24pt;
    margin-bottom: 12pt;
    page-break-after: avoid;
    color: #000;
  }
  
  h2 {
    font-size: 14pt;
    font-weight: bold;
    margin-top: 18pt;
    margin-bottom: 10pt;
    page-break-after: avoid;
    color: #000;
  }
  
  h3 {
    font-size: 12pt;
    font-weight: bold;
    margin-top: 14pt;
    margin-bottom: 8pt;
    page-break-after: avoid;
    color: #000;
  }
  
  h4, h5, h6 {
    font-size: 11pt;
    font-weight: bold;
    margin-top: 12pt;
    margin-bottom: 6pt;
    page-break-after: avoid;
  }
  
  p {
    margin-top: 0;
    margin-bottom: 10pt;
    text-align: justify;
    orphans: 3;
    widows: 3;
  }
  
  ul, ol {
    margin-top: 6pt;
    margin-bottom: 10pt;
    padding-left: 24pt;
  }
  
  li {
    margin-bottom: 4pt;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12pt;
    margin-bottom: 12pt;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  
  th, td {
    border: 1px solid #000;
    padding: 6pt 8pt;
    text-align: left;
    vertical-align: top;
  }
  
  th {
    background-color: #f0f0f0;
    font-weight: bold;
  }
  
  tr:nth-child(even) {
    background-color: #fafafa;
  }
  
  strong, b {
    font-weight: bold;
  }
  
  em, i {
    font-style: italic;
  }
  
  code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 10pt;
    background-color: #f5f5f5;
    padding: 1pt 3pt;
  }
  
  pre {
    font-family: 'Courier New', Courier, monospace;
    font-size: 9pt;
    background-color: #f5f5f5;
    padding: 10pt;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  blockquote {
    margin: 12pt 0;
    padding-left: 12pt;
    border-left: 3pt solid #ccc;
    color: #333;
  }
  
  hr {
    border: none;
    border-top: 1pt solid #ccc;
    margin: 18pt 0;
  }
  
  .title-page {
    text-align: center;
    padding-top: 200pt;
    page-break-after: always;
  }
  
  .title-page h1 {
    font-size: 24pt;
    margin-bottom: 24pt;
  }
  
  .title-page .project-title {
    font-size: 18pt;
    margin-bottom: 48pt;
  }
  
  .title-page .metadata {
    font-size: 11pt;
    color: #333;
  }
  
  .confidential {
    font-size: 10pt;
    color: #666;
    margin-top: 100pt;
    font-style: italic;
  }
  
  .placeholder {
    background-color: #fff3cd;
    padding: 2pt 4pt;
    border-radius: 2pt;
  }
`

/**
 * Clean and prepare content for export
 */
function prepareContent(content: string): string {
  // Decode HTML entities
  let cleaned = content
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&bull;/g, '•')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&plusmn;/g, '±')
    .replace(/&times;/g, '×')
    .replace(/&divide;/g, '÷')
    .replace(/&le;/g, '≤')
    .replace(/&ge;/g, '≥')
    .replace(/&ne;/g, '≠')
    .replace(/&alpha;/g, 'α')
    .replace(/&beta;/g, 'β')
    .replace(/&gamma;/g, 'γ')
    .replace(/&delta;/g, 'δ')
    .replace(/&mu;/g, 'μ')
    .replace(/&sigma;/g, 'σ')
  
  // Remove multiple consecutive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  
  // Fix common markdown issues
  cleaned = cleaned
    .replace(/\*\*\s+/g, '**')  // Remove space after **
    .replace(/\s+\*\*/g, '**')  // Remove space before **
  
  return cleaned
}

/**
 * Convert markdown to styled HTML
 */
function markdownToHtml(
  content: string, 
  docType: string, 
  projectTitle: string,
  sponsor?: string
): string {
  const cleanedContent = prepareContent(content)
  
  // Configure marked for better output
  marked.setOptions({
    gfm: true,
    breaks: false,
  })
  
  const bodyHtml = marked.parse(cleanedContent)
  
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docType} - ${projectTitle}</title>
  <style>${DOCUMENT_STYLES}</style>
</head>
<body>
  <div class="title-page">
    <h1>${docType.toUpperCase()}</h1>
    <div class="project-title">${projectTitle}</div>
    <div class="metadata">
      ${sponsor ? `<p><strong>Sponsor:</strong> ${sponsor}</p>` : ''}
      <p><strong>Document Version:</strong> 1.0</p>
      <p><strong>Date:</strong> ${date}</p>
    </div>
    <div class="confidential">
      CONFIDENTIAL<br>
      This document contains proprietary information. 
      Do not distribute without authorization.
    </div>
  </div>
  
  <div class="content">
    ${bodyHtml}
  </div>
</body>
</html>
`
}

/**
 * Generate professional PDF using Puppeteer
 */
export async function generateProfessionalPDF(
  content: string,
  docType: string,
  projectTitle: string,
  sponsor?: string
): Promise<Buffer> {
  const html = markdownToHtml(content, docType, projectTitle, sponsor)
  
  let browser
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    })
    
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '25mm',
        right: '20mm',
        bottom: '25mm',
        left: '20mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 9pt; color: #666; padding: 10px;">
          <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `
    })
    
    return Buffer.from(pdfBuffer)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Generate professional DOCX using html-to-docx
 */
export async function generateProfessionalDOCX(
  content: string,
  docType: string,
  projectTitle: string,
  sponsor?: string
): Promise<Buffer> {
  const html = markdownToHtml(content, docType, projectTitle, sponsor)
  
  const docxOptions = {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
    font: 'Times New Roman',
    fontSize: 22, // in half-points, so 22 = 11pt
    margins: {
      top: 1440,    // in twips (1440 = 1 inch)
      right: 1152,  // 0.8 inch
      bottom: 1440,
      left: 1152
    },
    title: `${docType} - ${projectTitle}`,
    subject: docType,
    creator: sponsor || 'Skaldi',
    keywords: ['clinical', 'trial', 'documentation', docType.toLowerCase()],
    description: `${docType} document for ${projectTitle}`,
    lastModifiedBy: 'Skaldi Document Engine',
    revision: 1,
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          run: {
            font: 'Times New Roman',
            size: 22
          },
          paragraph: {
            spacing: { after: 200, line: 276 }
          }
        }
      ]
    }
  }
  
  try {
    const docxBuffer = await HTMLtoDOCX(html, null, docxOptions)
    return Buffer.from(docxBuffer)
  } catch (error) {
    console.error('[ProfessionalExport] DOCX generation error:', error)
    throw error
  }
}

/**
 * Export document to both PDF and DOCX
 */
export async function exportDocument(
  content: string,
  docType: string,
  projectTitle: string,
  sponsor?: string
): Promise<{ pdf: Buffer; docx: Buffer }> {
  const [pdf, docx] = await Promise.all([
    generateProfessionalPDF(content, docType, projectTitle, sponsor),
    generateProfessionalDOCX(content, docType, projectTitle, sponsor)
  ])
  
  return { pdf, docx }
}
