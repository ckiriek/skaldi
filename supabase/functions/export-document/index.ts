import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExportRequest {
  documentId: string
  format: 'pdf' | 'docx'
  userId: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Export Document Request Started')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const requestBody = await req.json()
    const { documentId, format, userId }: ExportRequest = requestBody
    console.log(`📝 Parsed: documentId=${documentId}, format=${format}, userId=${userId}`)

    // 1. Fetch document
    console.log('🔍 Fetching document...')
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError) {
      console.error('❌ Document fetch error:', docError)
      throw new Error(`Failed to fetch document: ${docError.message}`)
    }
    console.log('✅ Document fetched successfully')

    // 2. Convert markdown to HTML
    const html = markdownToHTML(document.content, document.title, document.type)

    // 3. Export based on format
    if (format === 'pdf') {
      const pdfBuffer = await htmlToPDF(html, document.title)
      
      return new Response(pdfBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${sanitizeFilename(document.title)}.pdf"`,
        },
      })
    } else if (format === 'docx') {
      // TODO: Implement DOCX export
      throw new Error('DOCX export not yet implemented')
    } else {
      throw new Error(`Unsupported format: ${format}`)
    }

  } catch (error) {
    console.error('❌ Export error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Convert Markdown to HTML with styling
 */
function markdownToHTML(markdown: string, title: string, docType: string): string {
  // Basic markdown to HTML conversion
  // In production, use a proper markdown parser like marked.js
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')

  // Wrap lists
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')

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
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      max-width: 21cm;
      margin: 0 auto;
      padding: 2cm;
    }
    h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-top: 24pt;
      margin-bottom: 12pt;
      page-break-after: avoid;
    }
    h2 {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 18pt;
      margin-bottom: 10pt;
      page-break-after: avoid;
    }
    h3 {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 8pt;
      page-break-after: avoid;
    }
    p {
      margin-bottom: 12pt;
      text-align: justify;
    }
    ul, ol {
      margin-bottom: 12pt;
    }
    li {
      margin-bottom: 6pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
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
    .title-page {
      text-align: center;
      margin-top: 5cm;
      page-break-after: always;
    }
    .title-page h1 {
      font-size: 24pt;
      margin-bottom: 24pt;
    }
    .title-page .doc-type {
      font-size: 16pt;
      margin-bottom: 12pt;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="title-page">
    <div class="doc-type">${docType}</div>
    <h1>${title}</h1>
  </div>
  <div class="content">
    ${html}
  </div>
</body>
</html>
  `
}

/**
 * Convert HTML to PDF using Puppeteer
 * Note: This requires Puppeteer to be available in the Deno environment
 */
async function htmlToPDF(html: string, title: string): Promise<Uint8Array> {
  // For now, return a placeholder
  // In production, use Puppeteer or a PDF generation service
  const encoder = new TextEncoder()
  return encoder.encode(`PDF generation for "${title}" - Implementation pending`)
}

/**
 * Sanitize filename for safe file system usage
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
}
