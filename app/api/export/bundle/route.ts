/**
 * Bundle Export API
 * 
 * GET /api/export/bundle?projectId=xxx
 * Exports all project documents as a ZIP archive
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { marked } from 'marked'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import archiver from 'archiver'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('title')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch all documents for project (latest version of each type)
    const { data: allDocs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('type')
      .order('version', { ascending: false })

    if (docsError) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    // Get latest version of each document type
    const latestDocs: Record<string, any> = {}
    allDocs?.forEach(doc => {
      if (!latestDocs[doc.type]) {
        latestDocs[doc.type] = doc
      }
    })
    const documents = Object.values(latestDocs)

    if (documents.length === 0) {
      return NextResponse.json({ error: 'No documents to export' }, { status: 400 })
    }

    console.log(`📦 Bundle export: ${documents.length} documents for project ${project.title}`)

    // Build files array first
    const files: { name: string; buffer: Buffer }[] = []

    for (const doc of documents) {
      const filename = `${doc.type}_v${doc.version}`
      let content = doc.content || ''

      // Handle JSON content
      if (typeof content === 'object') {
        content = Object.entries(content)
          .map(([key, value]) => {
            const title = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            return `# ${title}\n\n${value}`
          })
          .join('\n\n---\n\n')
      } else if (typeof content === 'string' && (content.trim().startsWith('{') || content.trim().startsWith('['))) {
        try {
          const parsed = JSON.parse(content)
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            content = Object.entries(parsed)
              .map(([key, value]) => {
                const title = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                return `# ${title}\n\n${value}`
              })
              .join('\n\n---\n\n')
          }
        } catch {
          // Keep as is
        }
      }

      try {
        // Export DOCX
        const docxBuffer = await createDOCX(content, `${doc.type} - ${project.title}`)
        files.push({ name: `${filename}.docx`, buffer: docxBuffer })
        console.log(`   ✅ ${filename}.docx`)

        // Export PDF
        const pdfBuffer = createPDF(content, doc.type)
        files.push({ name: `${filename}.pdf`, buffer: pdfBuffer })
        console.log(`   ✅ ${filename}.pdf`)
      } catch (error) {
        console.error(`   ❌ Failed to export ${filename}:`, error)
      }
    }

    // Create ZIP using archiver with proper promise handling
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 5 } })
      const chunks: Buffer[] = []
      
      archive.on('data', (chunk) => chunks.push(chunk))
      archive.on('end', () => resolve(Buffer.concat(chunks)))
      archive.on('error', reject)
      
      // Add all files
      for (const file of files) {
        archive.append(file.buffer, { name: file.name })
      }
      
      archive.finalize()
    })

    const safeTitle = project.title.replace(/[^a-zA-Z0-9]/g, '_')
    console.log(`✅ Bundle export complete: ${zipBuffer.length} bytes`)

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeTitle}_documents.zip"`,
        'Content-Length': zipBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Bundle export error:', error)
    return NextResponse.json(
      { error: 'Failed to export documents', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function createPDF(content: string, docType: string): Buffer {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  
  let yPosition = 25
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 25
  const maxWidth = pageWidth - 2 * margin
  const lineHeight = 5

  // Title page
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(docType.toUpperCase(), pageWidth / 2, 80, { align: 'center' })
  
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  pdf.text(`Generated: ${date}`, pageWidth / 2, 95, { align: 'center' })

  // Content
  pdf.addPage()
  yPosition = 25

  const tokens = marked.lexer(content)
  
  tokens.forEach((token: any) => {
    if (yPosition > pageHeight - 35) {
      pdf.addPage()
      yPosition = 25
    }

    switch (token.type) {
      case 'heading':
        if (yPosition > 30) yPosition += 8
        const fontSize = token.depth === 1 ? 14 : token.depth === 2 ? 12 : 11
        pdf.setFontSize(fontSize)
        pdf.setFont('helvetica', 'bold')
        const headingLines = pdf.splitTextToSize(token.text, maxWidth)
        pdf.text(headingLines, margin, yPosition)
        yPosition += headingLines.length * (fontSize * 0.4) + 6
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        break

      case 'paragraph':
        const cleanText = token.text
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        pdf.setFontSize(10)
        const paraLines = pdf.splitTextToSize(cleanText, maxWidth)
        const paraHeight = paraLines.length * lineHeight + 3
        if (yPosition + paraHeight > pageHeight - 25) {
          pdf.addPage()
          yPosition = 25
        }
        pdf.text(paraLines, margin, yPosition)
        yPosition += paraHeight
        break

      case 'list':
        pdf.setFontSize(10)
        token.items?.forEach((item: any, idx: number) => {
          if (yPosition > pageHeight - 35) {
            pdf.addPage()
            yPosition = 25
          }
          const bullet = token.ordered ? `${idx + 1}. ` : '• '
          const itemText = bullet + (item.text || '')
          const itemLines = pdf.splitTextToSize(itemText, maxWidth - 8)
          pdf.text(itemLines, margin + 5, yPosition)
          yPosition += itemLines.length * lineHeight + 1
        })
        yPosition += 3
        break

      case 'table':
        if (token.header && token.rows) {
          const headers = token.header.map((cell: any) => cell.text || '')
          const tableData = token.rows.map((row: any) => row.map((cell: any) => cell.text || ''))
          autoTable(pdf, {
            head: [headers],
            body: tableData,
            startY: yPosition,
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
            theme: 'grid',
          })
          yPosition = (pdf as any).lastAutoTable.finalY + 8
        }
        break
    }
  })

  // Page numbers
  const totalPages = pdf.getNumberOfPages()
  for (let i = 2; i <= totalPages; i++) {
    pdf.setPage(i)
    pdf.setFontSize(9)
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
  }

  return Buffer.from(pdf.output('arraybuffer'))
}

async function createDOCX(content: string, title: string): Promise<Buffer> {
  const tokens = marked.lexer(content)
  const children: any[] = []

  // Title
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )

  tokens.forEach((token: any) => {
    switch (token.type) {
      case 'heading':
        const level = token.depth === 1 ? HeadingLevel.HEADING_1 
          : token.depth === 2 ? HeadingLevel.HEADING_2 
          : HeadingLevel.HEADING_3
        children.push(new Paragraph({ text: token.text, heading: level, spacing: { before: 200, after: 100 } }))
        break

      case 'paragraph':
        const cleanText = token.text
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        children.push(new Paragraph({ text: cleanText, spacing: { after: 120 } }))
        break

      case 'list':
        token.items?.forEach((item: any, idx: number) => {
          const bullet = token.ordered ? `${idx + 1}. ` : '• '
          children.push(new Paragraph({ 
            text: bullet + (item.text || ''),
            indent: { left: 720 },
            spacing: { after: 60 }
          }))
        })
        break
    }
  })

  const doc = new Document({
    sections: [{ properties: {}, children }]
  })

  return await Packer.toBuffer(doc)
}
