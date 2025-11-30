/**
 * Project Download All API
 * 
 * GET /api/projects/[id]/download-all
 * Returns pre-generated ZIP bundle from Storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBundleDownloadUrl } from '@/lib/services/document-export-service'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project to verify ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title, created_by')
      .eq('id', params.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.created_by !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get bundle download URL (will generate if needed)
    const url = await getBundleDownloadUrl(params.id)

    if (!url) {
      return NextResponse.json(
        { error: 'Bundle not available. Generate all documents first.' },
        { status: 404 }
      )
    }

    // Redirect to signed URL
    return NextResponse.redirect(url)

  } catch (error) {
    console.error('Download all error:', error)
    return NextResponse.json(
      { error: 'Failed to get bundle' },
      { status: 500 }
    )
  }
}
