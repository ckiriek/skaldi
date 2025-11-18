import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { marked } from 'marked'

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
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (format === 'pdf') {
      return await exportToPDF(document)
    } else if (format === 'docx') {
      return NextResponse.json({ error: 'DOCX export not yet implemented' }, { status: 501 })
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

async function exportToPDF(document: any) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  let yPosition = 20
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const maxWidth = pageWidth - 2 * margin
  const tocItems: TocItem[] = []

  // Add title page
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  const typeLines = pdf.splitTextToSize(document.type.toUpperCase(), maxWidth)
  pdf.text(typeLines, pageWidth / 2, 80, { align: 'center' })
  
  pdf.setFontSize(20)
  const titleLines = pdf.splitTextToSize(document.title, maxWidth - 40)
  pdf.text(titleLines, pageWidth / 2, 100, { align: 'center' })
  
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  pdf.text(`Generated: ${date}`, pageWidth / 2, 120, { align: 'center' })

  // Parse markdown and render
  const tokens = marked.lexer(document.content)
  
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
  yPosition = 20

  tokens.forEach((token: any) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      pdf.addPage()
      yPosition = 20
    }

    switch (token.type) {
      case 'heading':
        if (yPosition > 20) yPosition += 8
        
        const fontSize = token.depth === 1 ? 16 : token.depth === 2 ? 14 : 12
        pdf.setFontSize(fontSize)
        pdf.setFont('helvetica', 'bold')
        
        const headingLines = pdf.splitTextToSize(token.text, maxWidth)
        pdf.text(headingLines, margin, yPosition)
        yPosition += headingLines.length * (fontSize * 0.5) + 6
        
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        break

      case 'paragraph':
        const paraLines = pdf.splitTextToSize(token.text, maxWidth)
        pdf.text(paraLines, margin, yPosition)
        yPosition += paraLines.length * 5 + 4
        break

      case 'list':
        token.items.forEach((item: any) => {
          if (yPosition > pageHeight - 40) {
            pdf.addPage()
            yPosition = 20
          }
          
          const bullet = token.ordered ? `${item.index}. ` : '• '
          const itemText = bullet + item.text
          const itemLines = pdf.splitTextToSize(itemText, maxWidth - 5)
          pdf.text(itemLines, margin + 5, yPosition)
          yPosition += itemLines.length * 5 + 2
        })
        yPosition += 4
        break

      case 'table':
        if (yPosition > pageHeight - 60) {
          pdf.addPage()
          yPosition = 20
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

      case 'code':
        if (yPosition > pageHeight - 40) {
          pdf.addPage()
          yPosition = 20
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
      'Content-Disposition': `attachment; filename="${sanitizeFilename(document.title)}.pdf"`,
    },
  })
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
}
