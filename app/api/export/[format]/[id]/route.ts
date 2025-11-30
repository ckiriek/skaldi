import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { marked } from 'marked'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle } from 'docx'

export async function GET(
  request: Request,
  { params }: { params: { format: string; id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { format, id } = params

    // Fetch document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (docError || !document) {
      console.error('Document fetch error:', docError)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Try to fetch current version content from document_versions
    const { data: version } = await supabase
      .from('document_versions')
      .select('content')
      .eq('document_id', id)
      .eq('is_current', true)
      .single()

    // Use content from document_versions if available, otherwise fall back to document.content
    let rawContent = version?.content || (document as any).content

    if (!rawContent) {
      console.error('No content found in document_versions or document.content')
      return NextResponse.json({ error: 'Document has no content' }, { status: 404 })
    }
    
    // Handle JSON content - convert to markdown
    let content: string
    if (typeof rawContent === 'string') {
      const trimmed = rawContent.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(rawContent)
          // If it's an object with section keys, join them
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            content = Object.entries(parsed)
              .map(([key, value]) => {
                const sectionTitle = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                return `# ${sectionTitle}\n\n${value}`
              })
              .join('\n\n---\n\n')
          } else {
            content = rawContent
          }
        } catch {
          content = rawContent
        }
      } else {
        content = rawContent
      }
    } else if (typeof rawContent === 'object') {
      // Already parsed JSON object
      content = Object.entries(rawContent)
        .map(([key, value]) => {
          const sectionTitle = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          return `# ${sectionTitle}\n\n${value}`
        })
        .join('\n\n---\n\n')
    } else {
      content = String(rawContent)
    }

    if (format === 'pdf') {
      return await exportToPDF(document, content)
    } else if (format === 'docx') {
      return await exportToDOCX(document, content)
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface TocItem {
  title: string
  level: number
  page: number
}

async function exportToPDF(document: any, content: string) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Set default font with proper character spacing
  pdf.setFont('helvetica', 'normal')
  
  let yPosition = 25
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const maxWidth = pageWidth - 2 * margin
  const tocItems: TocItem[] = []
  const lineHeight = 4.5 // Tighter line height

  // Helper to render text without justify issues
  const renderText = (text: string, x: number, y: number, options: any = {}) => {
    // Split long text into lines
    const lines = pdf.splitTextToSize(text, options.maxWidth || maxWidth)
    lines.forEach((line: string, i: number) => {
      pdf.text(line, x, y + i * lineHeight)
    })
    return lines.length
  }

  // Add title page
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(document.type.toUpperCase(), pageWidth / 2, 80, { align: 'center' })
  
  pdf.setFontSize(16)
  pdf.text(document.type, pageWidth / 2, 92, { align: 'center' })
  
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  pdf.text(`Generated: ${date}`, pageWidth / 2, 105, { align: 'center' })

  // Parse markdown and render
  const tokens = marked.lexer(content)
  
  // First pass: collect TOC items
  let currentPage = 2 // Start after title page
  tokens.forEach((token: any) => {
    if (token.type === 'heading' && token.depth <= 2) {
      tocItems.push({
        title: token.text,
        level: token.depth,
        page: currentPage,
      })
    }
    // Estimate page breaks (rough approximation)
    if (token.type === 'paragraph' || token.type === 'list') {
      const estimatedLines = Math.ceil(token.raw.length / 100)
      if (estimatedLines > 5) currentPage++
    }
    if (token.type === 'table') currentPage++
  })

  // Add TOC page if there are headings
  if (tocItems.length > 0) {
    pdf.addPage()
    yPosition = 20
    
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Table of Contents', margin, yPosition)
    yPosition += 15
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    
    tocItems.forEach((item) => {
      if (yPosition > pageHeight - 30) {
        pdf.addPage()
        yPosition = 20
      }
      
      const indent = (item.level - 1) * 5
      const text = item.title
      const pageNum = `${item.page}`
      
      pdf.text(text, margin + indent, yPosition)
      pdf.text(pageNum, pageWidth - margin - 10, yPosition, { align: 'right' })
      
      yPosition += item.level === 1 ? 8 : 6
    })
  }

  // Add content
  pdf.addPage()
  yPosition = 25

  tokens.forEach((token: any) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 35) {
      pdf.addPage()
      yPosition = 25
    }

    switch (token.type) {
      case 'heading':
        // Add space before heading
        if (yPosition > 30) yPosition += 8
        
        // Check page break before heading
        if (yPosition > pageHeight - 40) {
          pdf.addPage()
          yPosition = 20
        }
        
        const fontSize = token.depth === 1 ? 13 : token.depth === 2 ? 11 : 10
        
        pdf.setFontSize(fontSize)
        pdf.setFont('helvetica', 'bold')
        
        // Render heading line by line
        const headingLines = pdf.splitTextToSize(token.text || '', maxWidth)
        headingLines.forEach((line: string, i: number) => {
          pdf.text(line, margin, yPosition + i * (fontSize * 0.45))
        })
        yPosition += headingLines.length * (fontSize * 0.45) + 5
        
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        break

      case 'paragraph':
        // Clean text from markdown artifacts
        const cleanText = (token.text || '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        
        const paraLines = pdf.splitTextToSize(cleanText, maxWidth)
        
        // Check if we need a new page
        const paraHeight = paraLines.length * lineHeight + 2
        if (yPosition + paraHeight > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
        }
        
        // Render each line separately to avoid spacing issues
        paraLines.forEach((line: string, i: number) => {
          pdf.text(line, margin, yPosition + i * lineHeight)
        })
        yPosition += paraHeight
        break

      case 'list':
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        
        const items = token.items || []
        items.forEach((item: any, idx: number) => {
          if (yPosition > pageHeight - 30) {
            pdf.addPage()
            yPosition = 20
          }
          
          const bullet = token.ordered ? `${idx + 1}. ` : '- '
          const itemText = bullet + (item.text || '')
          const itemLines = pdf.splitTextToSize(itemText, maxWidth - 10)
          
          itemLines.forEach((line: string, i: number) => {
            pdf.text(line, margin + 5, yPosition + i * lineHeight)
          })
          yPosition += itemLines.length * lineHeight + 1
        })
        yPosition += 2
        break

      case 'table':
        if (yPosition > pageHeight - 60) {
          pdf.addPage()
          yPosition = 25
        }

        const tableData = token.rows.map((row: any) => 
          row.map((cell: any) => cell.text)
        )
        const headers = token.header.map((cell: any) => cell.text)

        autoTable(pdf, {
          head: [headers],
          body: tableData,
          startY: yPosition,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          theme: 'grid',
        })

        yPosition = (pdf as any).lastAutoTable.finalY + 8
        break

      case 'space':
        yPosition += 4
        break

      case 'hr':
        if (yPosition > pageHeight - 30) {
          pdf.addPage()
          yPosition = 25
        }
        yPosition += 5
        pdf.setDrawColor(200, 200, 200)
        pdf.line(margin, yPosition, pageWidth - margin, yPosition)
        yPosition += 10
        break

      case 'blockquote':
        if (yPosition > pageHeight - 40) {
          pdf.addPage()
          yPosition = 25
        }
        
        const quoteText = token.text || (token.tokens?.[0]?.text) || ''
        const quoteLines = pdf.splitTextToSize(quoteText, maxWidth - 15)
        
        // Draw left border
        pdf.setDrawColor(180, 180, 180)
        pdf.setLineWidth(2)
        pdf.line(margin, yPosition - 2, margin, yPosition + quoteLines.length * 5 + 4)
        pdf.setLineWidth(0.5)
        
        // Draw text
        pdf.setFont('helvetica', 'italic')
        pdf.text(quoteLines, margin + 10, yPosition)
        pdf.setFont('helvetica', 'normal')
        
        yPosition += quoteLines.length * 5 + 8
        break

      case 'code':
        if (yPosition > pageHeight - 40) {
          pdf.addPage()
          yPosition = 25
        }
        
        pdf.setFont('courier', 'normal')
        pdf.setFontSize(9)
        const codeLines = pdf.splitTextToSize(token.text, maxWidth - 10)
        pdf.setFillColor(245, 245, 245)
        pdf.rect(margin, yPosition - 3, maxWidth, codeLines.length * 4 + 6, 'F')
        pdf.text(codeLines, margin + 5, yPosition)
        yPosition += codeLines.length * 4 + 10
        
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        break

      default:
        // Skip unknown token types
        break
    }
  })

  // Add page numbers
  const totalPages = pdf.getNumberOfPages()
  for (let i = 2; i <= totalPages; i++) {
    pdf.setPage(i)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  // Generate PDF buffer
  const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))

  // Return PDF
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(document.type)}.pdf"`,
    },
  })
}

async function exportToDOCX(document: any, content: string) {
  // Parse markdown
  const tokens = marked.lexer(content)
  
  const docChildren: any[] = []

  // Add title page
  docChildren.push(
    new Paragraph({
      text: document.type.toUpperCase(),
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 400 },
    }),
    new Paragraph({
      text: document.type,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: `Generated: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    })
  )

  // Process tokens
  tokens.forEach((token: any) => {
    switch (token.type) {
      case 'heading':
        const headingLevel = token.depth === 1 ? HeadingLevel.HEADING_1 
          : token.depth === 2 ? HeadingLevel.HEADING_2 
          : HeadingLevel.HEADING_3

        docChildren.push(
          new Paragraph({
            text: token.text,
            heading: headingLevel,
            spacing: { before: 400, after: 200 },
          })
        )
        break

      case 'paragraph':
        // Parse inline formatting (bold, italic)
        const runs = parseInlineFormatting(token.text)
        docChildren.push(
          new Paragraph({
            children: runs,
            spacing: { after: 200 },
          })
        )
        break

      case 'list':
        token.items.forEach((item: any, index: number) => {
          const runs = parseInlineFormatting(item.text)
          docChildren.push(
            new Paragraph({
              children: runs,
              bullet: token.ordered ? undefined : { level: 0 },
              numbering: token.ordered ? { reference: 'default-numbering', level: 0 } : undefined,
              spacing: { after: 100 },
            })
          )
        })
        break

      case 'table':
        const tableRows: TableRow[] = []
        
        // Add header row
        const headerCells = token.header.map((cell: any) => 
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: cell.text, bold: true })],
            })],
            shading: { fill: 'F0F0F0' },
          })
        )
        tableRows.push(new TableRow({ children: headerCells }))

        // Add data rows
        token.rows.forEach((row: any) => {
          const cells = row.map((cell: any) => 
            new TableCell({
              children: [new Paragraph(cell.text)],
            })
          )
          tableRows.push(new TableRow({ children: cells }))
        })

        docChildren.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
              insideVertical: { style: BorderStyle.SINGLE, size: 1 },
            },
          })
        )
        docChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }))
        break

      case 'code':
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: token.text, font: 'Courier New' })],
            shading: { fill: 'F5F5F5' },
            spacing: { before: 200, after: 200 },
          })
        )
        break

      case 'hr':
        docChildren.push(
          new Paragraph({
            text: '',
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' }
            },
            spacing: { before: 200, after: 200 },
          })
        )
        break

      case 'blockquote':
        const quoteText = token.text || (token.tokens?.[0]?.text) || ''
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: quoteText, italics: true })],
            indent: { left: 720 }, // 0.5 inch
            border: {
              left: { style: BorderStyle.SINGLE, size: 24, color: 'CCCCCC' }
            },
            spacing: { before: 200, after: 200 },
          })
        )
        break

      case 'space':
        docChildren.push(new Paragraph({ text: '' }))
        break

      default:
        // Skip unknown token types
        break
    }
  })

  // Create document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 inch = 1440 twips
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: docChildren,
    }],
    numbering: {
      config: [{
        reference: 'default-numbering',
        levels: [{
          level: 0,
          format: 'decimal',
          text: '%1.',
          alignment: AlignmentType.LEFT,
        }],
      }],
    },
  })

  // Generate DOCX buffer
  const docxBuffer = await Packer.toBuffer(doc)

  // Return DOCX
  return new NextResponse(new Uint8Array(docxBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(document.type)}.docx"`,
    },
  })
}

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = []
  
  // Simple regex-based parsing for bold and italic
  // This is a basic implementation - for production, use a proper markdown parser
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g)
  
  parts.forEach(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }))
    } else if (part.startsWith('*') && part.endsWith('*')) {
      // Italic
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true }))
    } else if (part) {
      // Normal text
      runs.push(new TextRun(part))
    }
  })
  
  return runs.length > 0 ? runs : [new TextRun(text)]
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
}
