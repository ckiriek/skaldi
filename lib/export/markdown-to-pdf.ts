/**
 * Markdown to PDF Converter
 * Converts Markdown documents to PDF format via HTML
 */

import { marked } from 'marked'

export function markdownToHtml(markdown: string, title: string): string {
  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true
  })

  // Convert markdown to HTML
  const htmlContent = marked(markdown)

  // Create full HTML document with styling
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 2.5cm;
    }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      max-width: 100%;
    }
    
    h1 {
      font-size: 24pt;
      font-weight: bold;
      margin-top: 24pt;
      margin-bottom: 12pt;
      page-break-after: avoid;
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 8pt;
    }
    
    h2 {
      font-size: 18pt;
      font-weight: bold;
      margin-top: 18pt;
      margin-bottom: 10pt;
      page-break-after: avoid;
    }
    
    h3 {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 14pt;
      margin-bottom: 8pt;
      page-break-after: avoid;
    }
    
    h4, h5, h6 {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 6pt;
      page-break-after: avoid;
    }
    
    p {
      margin-top: 0;
      margin-bottom: 12pt;
      text-align: justify;
    }
    
    ul, ol {
      margin-top: 6pt;
      margin-bottom: 12pt;
      padding-left: 30pt;
    }
    
    li {
      margin-bottom: 6pt;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12pt;
      margin-bottom: 12pt;
      page-break-inside: avoid;
    }
    
    th, td {
      border: 1px solid #000;
      padding: 8pt;
      text-align: left;
    }
    
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    
    code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      background-color: #f5f5f5;
      padding: 2pt 4pt;
      border-radius: 3pt;
    }
    
    pre {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      background-color: #f5f5f5;
      padding: 12pt;
      border-radius: 4pt;
      overflow-x: auto;
      page-break-inside: avoid;
      margin-top: 12pt;
      margin-bottom: 12pt;
    }
    
    pre code {
      background-color: transparent;
      padding: 0;
    }
    
    blockquote {
      border-left: 4pt solid #ccc;
      padding-left: 12pt;
      margin-left: 0;
      margin-right: 0;
      font-style: italic;
      color: #666;
    }
    
    a {
      color: #0066cc;
      text-decoration: underline;
    }
    
    hr {
      border: none;
      border-top: 1px solid #ccc;
      margin: 24pt 0;
    }
    
    .title-page {
      text-align: center;
      margin-bottom: 48pt;
    }
    
    .title-page h1 {
      font-size: 28pt;
      margin-bottom: 24pt;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }
      
      table, pre, blockquote {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="title-page">
    <h1>${title}</h1>
  </div>
  <div class="content">
    ${htmlContent}
  </div>
</body>
</html>
  `.trim()
}

/**
 * Main export function for batch operations
 */
export async function markdownToPDF(markdown: string, title: string = 'Document'): Promise<Buffer> {
  const htmlPdfNode = await import('html-pdf-node')
  const html = markdownToHtml(markdown, title)
  
  const options = {
    format: 'A4',
    margin: {
      top: '2.5cm',
      right: '2.5cm',
      bottom: '2.5cm',
      left: '2.5cm'
    }
  }
  
  const file = { content: html }
  const pdfBuffer = await htmlPdfNode.generatePdf(file, options)
  return pdfBuffer
}
