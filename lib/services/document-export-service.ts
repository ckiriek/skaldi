/**
 * Document Export Service
 * 
 * Generates PDF and DOCX files from documents and stores them in Supabase Storage.
 * Files are generated after document creation/update and cached for fast downloads.
 */

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { marked } from 'marked'
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx'

const BUCKET_NAME = 'document-exports'

interface ExportResult {
  pdfPath: string | null
  docxPath: string | null
  error?: string
}

/**
 * Generate and store PDF/DOCX exports for a document
 */
export async function generateDocumentExports(documentId: string): Promise<ExportResult> {
  const supabase = await createClient()
  
  // Use service client for Storage operations (bypasses RLS)
  let storageClient: ReturnType<typeof createServiceClient> | null = null
  try {
    storageClient = createServiceClient()
  } catch (e) {
    console.warn('[ExportService] Service client not available, using regular client')
  }
  
  // Fetch document with project info
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*, projects(title)')
    .eq('id', documentId)
    .single()
  
  if (docError || !doc) {
    console.error('[ExportService] Document not found:', documentId)
    return { pdfPath: null, docxPath: null, error: 'Document not found' }
  }

  // Get content - try document_versions first, then document.content
  const { data: version } = await supabase
    .from('document_versions')
    .select('content')
    .eq('document_id', documentId)
    .eq('is_current', true)
    .single()

  let content = version?.content || doc.content || ''
  
  // Handle JSON content
  if (typeof content === 'object') {
    content = convertJsonToMarkdown(content)
  } else if (typeof content === 'string' && (content.trim().startsWith('{') || content.trim().startsWith('['))) {
    try {
      const parsed = JSON.parse(content)
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        content = convertJsonToMarkdown(parsed)
      }
    } catch {
      // Keep as is
    }
  }

  if (!content) {
    console.error('[ExportService] No content for document:', documentId)
    return { pdfPath: null, docxPath: null, error: 'No content' }
  }

  const projectTitle = (doc.projects as any)?.title || 'Document'
  const docType = doc.type || 'Document'
  const version_num = doc.version || 1

  console.log(`[ExportService] Generating exports for ${docType} v${version_num}`)

  // Use service client for uploads if available, otherwise fall back to regular client
  const uploadClient = storageClient || supabase

  let pdfPath: string | null = null
  let docxPath: string | null = null

  try {
    // Generate PDF
    const pdfBuffer = generatePDF(content, docType, projectTitle)
    const pdfFileName = `${documentId}/${docType}_v${version_num}.pdf`
    
    const { error: pdfUploadError } = await uploadClient.storage
      .from(BUCKET_NAME)
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })
    
    if (pdfUploadError) {
      console.error('[ExportService] PDF upload error:', pdfUploadError)
    } else {
      pdfPath = pdfFileName
      console.log(`[ExportService] ✅ PDF uploaded: ${pdfFileName}`)
    }
  } catch (e) {
    console.error('[ExportService] PDF generation error:', e)
  }

  try {
    // Generate DOCX
    const docxBuffer = await generateDOCX(content, docType, projectTitle)
    const docxFileName = `${documentId}/${docType}_v${version_num}.docx`
    
    const { error: docxUploadError } = await uploadClient.storage
      .from(BUCKET_NAME)
      .upload(docxFileName, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      })
    
    if (docxUploadError) {
      console.error('[ExportService] DOCX upload error:', docxUploadError)
    } else {
      docxPath = docxFileName
      console.log(`[ExportService] ✅ DOCX uploaded: ${docxFileName}`)
    }
  } catch (e) {
    console.error('[ExportService] DOCX generation error:', e)
  }

  // Update document with export paths
  if (pdfPath || docxPath) {
    await supabase
      .from('documents')
      .update({
        pdf_path: pdfPath,
        docx_path: docxPath,
        exports_generated_at: new Date().toISOString()
      })
      .eq('id', documentId)
  }

  return { pdfPath, docxPath }
}

/**
 * Get signed download URL for an export file
 */
export async function getExportDownloadUrl(
  documentId: string, 
  format: 'pdf' | 'docx'
): Promise<string | null> {
  const supabase = await createClient()
  
  // Use service client for Storage operations
  let storageClient: ReturnType<typeof createServiceClient> | null = null
  try {
    storageClient = createServiceClient()
  } catch (e) {
    console.warn('[ExportService] Service client not available')
  }
  
  // Get document to find export path
  const { data: doc } = await supabase
    .from('documents')
    .select('pdf_path, docx_path, exports_generated_at')
    .eq('id', documentId)
    .single()
  
  let path = format === 'pdf' ? doc?.pdf_path : doc?.docx_path
  
  if (!path) {
    // Export doesn't exist, generate it
    console.log(`[ExportService] Export not found, generating for ${documentId}`)
    const result = await generateDocumentExports(documentId)
    path = format === 'pdf' ? result.pdfPath : result.docxPath
    
    if (!path) {
      console.error(`[ExportService] Failed to generate ${format} for ${documentId}`)
      return null
    }
  }
  
  // Get signed URL using service client
  const client = storageClient || supabase
  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 3600) // 1 hour expiry
  
  if (error) {
    console.error(`[ExportService] Signed URL error:`, error)
    return null
  }
  
  console.log(`[ExportService] Signed URL created for ${path}`)
  return data?.signedUrl || null
}

/**
 * Get all export URLs for a project (for Download All)
 */
export async function getProjectExportUrls(projectId: string): Promise<{
  files: { name: string; url: string; type: string }[]
  error?: string
}> {
  const supabase = await createClient()
  
  // Use service client for Storage operations
  let storageClient: ReturnType<typeof createServiceClient> | null = null
  try {
    storageClient = createServiceClient()
  } catch (e) {
    console.warn('[ExportService] Service client not available')
  }
  
  // Get all documents for project
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, type, version, pdf_path, docx_path')
    .eq('project_id', projectId)
    .order('type')
  
  if (error || !docs) {
    console.error('[ExportService] Failed to fetch documents:', error)
    return { files: [], error: 'Failed to fetch documents' }
  }

  console.log(`[ExportService] Found ${docs.length} documents for project`)

  // Get latest version of each type
  const latestDocs: Record<string, any> = {}
  docs.forEach(doc => {
    if (!latestDocs[doc.type] || doc.version > latestDocs[doc.type].version) {
      latestDocs[doc.type] = doc
    }
  })

  console.log(`[ExportService] Latest versions: ${Object.keys(latestDocs).join(', ')}`)

  const files: { name: string; url: string; type: string }[] = []
  const client = storageClient || supabase

  for (const doc of Object.values(latestDocs)) {
    // Ensure exports exist
    if (!doc.pdf_path || !doc.docx_path) {
      console.log(`[ExportService] Generating missing exports for ${doc.type}`)
      await generateDocumentExports(doc.id)
      // Refetch
      const { data: updated } = await supabase
        .from('documents')
        .select('pdf_path, docx_path')
        .eq('id', doc.id)
        .single()
      if (updated) {
        doc.pdf_path = updated.pdf_path
        doc.docx_path = updated.docx_path
      }
    }

    // Get signed URLs using service client
    if (doc.pdf_path) {
      const { data: pdfUrl, error: pdfErr } = await client.storage
        .from(BUCKET_NAME)
        .createSignedUrl(doc.pdf_path, 3600)
      if (pdfErr) {
        console.error(`[ExportService] PDF signed URL error for ${doc.type}:`, pdfErr)
      }
      if (pdfUrl?.signedUrl) {
        files.push({
          name: `${doc.type}_v${doc.version}.pdf`,
          url: pdfUrl.signedUrl,
          type: 'pdf'
        })
      }
    }

    if (doc.docx_path) {
      const { data: docxUrl, error: docxErr } = await client.storage
        .from(BUCKET_NAME)
        .createSignedUrl(doc.docx_path, 3600)
      if (docxErr) {
        console.error(`[ExportService] DOCX signed URL error for ${doc.type}:`, docxErr)
      }
      if (docxUrl?.signedUrl) {
        files.push({
          name: `${doc.type}_v${doc.version}.docx`,
          url: docxUrl.signedUrl,
          type: 'docx'
        })
      }
    }
  }

  console.log(`[ExportService] Returning ${files.length} files`)
  return { files }
}

/**
 * Generate ZIP bundle for entire project and store in Supabase
 * Called when all documents are generated or when any document is regenerated
 */
export async function generateProjectBundle(projectId: string): Promise<string | null> {
  const supabase = await createClient()
  
  let storageClient: ReturnType<typeof createServiceClient>
  try {
    storageClient = createServiceClient()
  } catch (e) {
    console.error('[ExportService] Service client not available for bundle')
    return null
  }

  // Get project
  const { data: project } = await supabase
    .from('projects')
    .select('title')
    .eq('id', projectId)
    .single()

  if (!project) {
    console.error('[ExportService] Project not found:', projectId)
    return null
  }

  // Get all documents
  const { data: docs } = await supabase
    .from('documents')
    .select('id, type, version, pdf_path, docx_path')
    .eq('project_id', projectId)
    .order('type')

  if (!docs || docs.length === 0) {
    console.log('[ExportService] No documents for bundle')
    return null
  }

  // Get latest version of each type
  const latestDocs: Record<string, any> = {}
  docs.forEach(doc => {
    if (!latestDocs[doc.type] || doc.version > latestDocs[doc.type].version) {
      latestDocs[doc.type] = doc
    }
  })

  // Check if all docs have exports
  const allHaveExports = Object.values(latestDocs).every(
    doc => doc.pdf_path && doc.docx_path
  )

  if (!allHaveExports) {
    console.log('[ExportService] Not all documents have exports yet')
    return null
  }

  console.log(`[ExportService] Creating bundle for ${Object.keys(latestDocs).length} documents`)

  // Import archiver dynamically
  const archiver = (await import('archiver')).default

  // Create ZIP
  const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 5 } })
    const chunks: Buffer[] = []
    
    archive.on('data', (chunk) => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', reject)

    const addFiles = async () => {
      for (const doc of Object.values(latestDocs)) {
        const filename = `${doc.type}_v${doc.version}`
        
        if (doc.pdf_path) {
          const { data: pdfData } = await storageClient.storage
            .from(BUCKET_NAME)
            .download(doc.pdf_path)
          if (pdfData) {
            const buffer = Buffer.from(await pdfData.arrayBuffer())
            archive.append(buffer, { name: `${filename}.pdf` })
          }
        }
        
        if (doc.docx_path) {
          const { data: docxData } = await storageClient.storage
            .from(BUCKET_NAME)
            .download(doc.docx_path)
          if (docxData) {
            const buffer = Buffer.from(await docxData.arrayBuffer())
            archive.append(buffer, { name: `${filename}.docx` })
          }
        }
      }
      
      archive.finalize()
    }

    addFiles().catch(reject)
  })

  // Upload bundle to Storage
  const bundlePath = `bundles/${projectId}/documents.zip`
  
  const { error: uploadError } = await storageClient.storage
    .from(BUCKET_NAME)
    .upload(bundlePath, zipBuffer, {
      contentType: 'application/zip',
      upsert: true
    })

  if (uploadError) {
    console.error('[ExportService] Bundle upload error:', uploadError)
    return null
  }

  // Update project with bundle path
  await supabase
    .from('projects')
    .update({
      bundle_path: bundlePath,
      bundle_generated_at: new Date().toISOString()
    })
    .eq('id', projectId)

  console.log(`[ExportService] ✅ Bundle created: ${bundlePath} (${zipBuffer.length} bytes)`)
  return bundlePath
}

/**
 * Get bundle download URL
 */
export async function getBundleDownloadUrl(projectId: string): Promise<string | null> {
  const supabase = await createClient()
  
  let storageClient: ReturnType<typeof createServiceClient>
  try {
    storageClient = createServiceClient()
  } catch (e) {
    return null
  }

  // Get project bundle path
  const { data: project } = await supabase
    .from('projects')
    .select('bundle_path')
    .eq('id', projectId)
    .single()

  if (!project?.bundle_path) {
    // Bundle doesn't exist, try to generate
    console.log('[ExportService] Bundle not found, generating...')
    const bundlePath = await generateProjectBundle(projectId)
    if (!bundlePath) return null
    
    const { data } = await storageClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(bundlePath, 3600)
    return data?.signedUrl || null
  }

  // Get signed URL
  const { data } = await storageClient.storage
    .from(BUCKET_NAME)
    .createSignedUrl(project.bundle_path, 3600)

  return data?.signedUrl || null
}

// Helper functions

function convertJsonToMarkdown(obj: Record<string, any>): string {
  return Object.entries(obj)
    .map(([key, value]) => {
      const title = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      return `# ${title}\n\n${value}`
    })
    .join('\n\n---\n\n')
}

function generatePDF(content: string, docType: string, projectTitle: string): Buffer {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  
  pdf.setFont('helvetica', 'normal')
  
  let yPosition = 20
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const maxWidth = pageWidth - 2 * margin
  const lineHeight = 4.5

  // Title page
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(docType.toUpperCase(), pageWidth / 2, 70, { align: 'center' })
  
  pdf.setFontSize(12)
  pdf.text(projectTitle, pageWidth / 2, 82, { align: 'center' })
  
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  })
  pdf.text(`Generated: ${date}`, pageWidth / 2, 95, { align: 'center' })

  // Content pages
  pdf.addPage()
  yPosition = 20

  const tokens = marked.lexer(content)
  
  tokens.forEach((token: any) => {
    if (yPosition > pageHeight - 30) {
      pdf.addPage()
      yPosition = 20
    }

    switch (token.type) {
      case 'heading':
        if (yPosition > 25) yPosition += 6
        if (yPosition > pageHeight - 35) {
          pdf.addPage()
          yPosition = 20
        }
        
        const fontSize = token.depth === 1 ? 12 : token.depth === 2 ? 11 : 10
        pdf.setFontSize(fontSize)
        pdf.setFont('helvetica', 'bold')
        
        const headingLines = pdf.splitTextToSize(token.text || '', maxWidth)
        headingLines.forEach((line: string, i: number) => {
          pdf.text(line, margin, yPosition + i * (fontSize * 0.42))
        })
        yPosition += headingLines.length * (fontSize * 0.42) + 4
        
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        break

      case 'paragraph':
        const cleanText = (token.text || '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        
        pdf.setFontSize(10)
        const paraLines = pdf.splitTextToSize(cleanText, maxWidth)
        const paraHeight = paraLines.length * lineHeight + 2
        
        if (yPosition + paraHeight > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
        }
        
        paraLines.forEach((line: string, i: number) => {
          pdf.text(line, margin, yPosition + i * lineHeight)
        })
        yPosition += paraHeight
        break

      case 'list':
        pdf.setFontSize(10)
        const items = token.items || []
        items.forEach((item: any, idx: number) => {
          if (yPosition > pageHeight - 25) {
            pdf.addPage()
            yPosition = 20
          }
          
          const bullet = token.ordered ? `${idx + 1}. ` : '- '
          const itemText = bullet + (item.text || '')
          const itemLines = pdf.splitTextToSize(itemText, maxWidth - 8)
          
          itemLines.forEach((line: string, i: number) => {
            pdf.text(line, margin + 4, yPosition + i * lineHeight)
          })
          yPosition += itemLines.length * lineHeight + 1
        })
        yPosition += 2
        break

      case 'table':
        if (token.header && token.rows) {
          if (yPosition > pageHeight - 50) {
            pdf.addPage()
            yPosition = 20
          }
          const headers = token.header.map((cell: any) => cell.text || '')
          const tableData = token.rows.map((row: any) => 
            row.map((cell: any) => cell.text || '')
          )
          autoTable(pdf, {
            head: [headers],
            body: tableData,
            startY: yPosition,
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
            theme: 'grid',
          })
          yPosition = (pdf as any).lastAutoTable.finalY + 6
        }
        break
    }
  })

  // Page numbers
  const totalPages = pdf.getNumberOfPages()
  for (let i = 2; i <= totalPages; i++) {
    pdf.setPage(i)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
  }

  return Buffer.from(pdf.output('arraybuffer'))
}

async function generateDOCX(content: string, docType: string, projectTitle: string): Promise<Buffer> {
  const tokens = marked.lexer(content)
  const children: any[] = []

  // Title
  children.push(
    new Paragraph({
      text: docType.toUpperCase(),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: projectTitle,
      heading: HeadingLevel.HEADING_1,
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
        children.push(new Paragraph({ 
          text: token.text || '', 
          heading: level, 
          spacing: { before: 240, after: 120 } 
        }))
        break

      case 'paragraph':
        const cleanText = (token.text || '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        children.push(new Paragraph({ 
          text: cleanText, 
          spacing: { after: 120 } 
        }))
        break

      case 'list':
        const items = token.items || []
        items.forEach((item: any, idx: number) => {
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
