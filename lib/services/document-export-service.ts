/**
 * Document Export Service
 * 
 * Generates PDF and DOCX files from documents and stores them in Supabase Storage.
 * Files are generated after document creation/update and cached for fast downloads.
 */

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateProfessionalPDF, generateProfessionalDOCX } from './professional-export-service'

const BUCKET_NAME = 'document-exports'

// Retry helper for upload operations
async function uploadWithRetry(
  client: any,
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string,
  maxRetries = 3
): Promise<{ error: any }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await client.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: true })
    
    if (!error) {
      return { error: null }
    }
    
    if (attempt < maxRetries) {
      console.log(`[ExportService] Upload attempt ${attempt} failed, retrying in ${attempt * 2}s...`)
      await new Promise(r => setTimeout(r, attempt * 2000))
    } else {
      return { error }
    }
  }
  return { error: new Error('Max retries exceeded') }
}

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

  // Get sponsor from project
  const { data: project } = await supabase
    .from('projects')
    .select('sponsor')
    .eq('id', doc.project_id)
    .single()
  const sponsor = project?.sponsor || undefined

  try {
    // Generate PDF using professional exporter
    console.log(`[ExportService] Generating professional PDF for ${docType}...`)
    const pdfBuffer = await generateProfessionalPDF(content, docType, projectTitle, sponsor)
    const pdfFileName = `${documentId}/${docType}_v${version_num}.pdf`
    
    const { error: pdfUploadError } = await uploadWithRetry(
      uploadClient,
      BUCKET_NAME,
      pdfFileName,
      pdfBuffer,
      'application/pdf'
    )
    
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
    // Generate DOCX using professional exporter
    console.log(`[ExportService] Generating professional DOCX for ${docType}...`)
    const docxBuffer = await generateProfessionalDOCX(content, docType, projectTitle, sponsor)
    const docxFileName = `${documentId}/${docType}_v${version_num}.docx`
    
    const { error: docxUploadError } = await uploadWithRetry(
      uploadClient,
      BUCKET_NAME,
      docxFileName,
      docxBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    
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

  // Generate missing exports for all documents
  for (const doc of Object.values(latestDocs)) {
    if (!doc.pdf_path || !doc.docx_path) {
      console.log(`[ExportService] Generating missing exports for ${doc.type} v${doc.version}`)
      const result = await generateDocumentExports(doc.id)
      if (result.pdfPath) doc.pdf_path = result.pdfPath
      if (result.docxPath) doc.docx_path = result.docxPath
    }
  }

  // Check if all docs now have exports
  const allHaveExports = Object.values(latestDocs).every(
    doc => doc.pdf_path && doc.docx_path
  )

  if (!allHaveExports) {
    console.log('[ExportService] Failed to generate exports for some documents')
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

// Old generatePDF and generateDOCX functions removed - now using professional-export-service.ts
