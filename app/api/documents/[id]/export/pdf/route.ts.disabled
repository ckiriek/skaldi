import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markdownToHtml } from '@/lib/export/markdown-to-pdf'
// @ts-ignore
import htmlPdf from 'html-pdf-node'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, projects!inner(created_by, title)')
      .eq('id', params.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check ownership
    if ((document as any).projects.created_by !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const content = (document as any).content || ''
    
    if (!content) {
      return NextResponse.json(
        { error: 'Document has no content' },
        { status: 400 }
      )
    }

    // Create HTML from markdown
    const title = `${(document as any).type} - ${(document as any).projects.title} - v${(document as any).version}`
    const html = markdownToHtml(content, title)

    // PDF options
    const options = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '2.5cm',
        right: '2.5cm',
        bottom: '2.5cm',
        left: '2.5cm'
      }
    }

    // Generate PDF
    const file = { content: html }
    const pdfBuffer = await htmlPdf.generatePdf(file, options)

    // Log audit trail
    await supabase.from('audit_log').insert({
      project_id: (document as any).project_id,
      actor_user_id: user.id,
      action: 'document_exported',
      diff_json: {
        documentId: params.id,
        format: 'pdf',
        type: (document as any).type
      }
    })

    // Return file
    const filename = `${(document as any).type}_v${(document as any).version}.pdf`
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error: any) {
    console.error('Error exporting PDF:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to export PDF' },
      { status: 500 }
    )
  }
}
