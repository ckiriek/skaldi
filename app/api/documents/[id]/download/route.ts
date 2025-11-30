/**
 * Document Download API
 * 
 * GET /api/documents/[id]/download?format=pdf|docx
 * Returns signed URL for downloading document export from Storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { getExportDownloadUrl } from '@/lib/services/document-export-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') as 'pdf' | 'docx'
    
    if (!format || !['pdf', 'docx'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Use pdf or docx' },
        { status: 400 }
      )
    }

    const url = await getExportDownloadUrl(params.id, format)
    
    if (!url) {
      return NextResponse.json(
        { error: 'Export not available' },
        { status: 404 }
      )
    }

    // Redirect to signed URL
    return NextResponse.redirect(url)

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Failed to get download URL' },
      { status: 500 }
    )
  }
}
