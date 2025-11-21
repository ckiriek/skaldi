/**
 * Batch Export API
 * 
 * POST /api/documents/batch-export
 * Exports multiple documents and creates a ZIP archive
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markdownToDOCX } from '@/lib/export/markdown-to-docx'
import { markdownToPDF } from '@/lib/export/markdown-to-pdf'
import archiver from 'archiver'
import { Readable } from 'stream'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { document_ids, format = 'both' } = body

    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid document_ids array' },
        { status: 400 }
      )
    }

    console.log(`📦 Batch export: ${document_ids.length} documents as ${format}`)

    // Create Supabase client
    const supabase = await createClient()

    // Fetch all documents
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .in('id', document_ids)

    if (error || !documents) {
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })

    const chunks: Buffer[] = []
    archive.on('data', (chunk) => chunks.push(chunk))

    // Export each document
    for (const doc of documents) {
      const filename = `${doc.type}_v${doc.version}`

      try {
        // Export DOCX
        if (format === 'docx' || format === 'both') {
          const docxBuffer = await markdownToDOCX(doc.content || '', {
            title: `${doc.type} - Version ${doc.version}`
          })
          archive.append(docxBuffer, { name: `${filename}.docx` })
          console.log(`   ✅ ${filename}.docx`)
        }

        // Export PDF
        if (format === 'pdf' || format === 'both') {
          const pdfBuffer = await markdownToPDF(doc.content || '', {
            title: `${doc.type} - Version ${doc.version}`
          })
          archive.append(pdfBuffer, { name: `${filename}.pdf` })
          console.log(`   ✅ ${filename}.pdf`)
        }

      } catch (error) {
        console.error(`   ❌ Failed to export ${filename}:`, error)
      }
    }

    // Finalize archive
    await archive.finalize()

    // Wait for all chunks
    await new Promise((resolve) => {
      archive.on('end', resolve)
    })

    const zipBuffer = Buffer.concat(chunks)

    console.log(`✅ Batch export complete: ${zipBuffer.length} bytes`)

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="documents_${Date.now()}.zip"`,
        'Content-Length': zipBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Batch export error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to export documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
