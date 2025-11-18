import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'

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

async function exportToPDF(document: any) {
  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Add title page
  pdf.setFontSize(24)
  pdf.text(document.type, 105, 100, { align: 'center' })
  pdf.setFontSize(18)
  pdf.text(document.title, 105, 120, { align: 'center' })
  
  pdf.addPage()

  // Add content (basic markdown to text conversion)
  pdf.setFontSize(12)
  const lines = pdf.splitTextToSize(document.content, 170)
  pdf.text(lines, 20, 20)

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
