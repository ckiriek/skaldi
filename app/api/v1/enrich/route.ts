/**
 * Enrichment API Route
 * 
 * Orchestrates Regulatory Data Agent enrichment process
 * Calls Edge Function for heavy processing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface EnrichRequest {
  project_id: string
}

interface EnrichResponse {
  success: boolean
  project_id: string
  status: string
  message?: string
  errors?: string[]
}

export async function POST(request: NextRequest): Promise<NextResponse<EnrichResponse>> {
  try {
    const supabase = await createClient()
    
    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, project_id: '', status: 'failed', errors: ['Authentication required'] },
        { status: 401 }
      )
    }
    
    // 2. Parse request
    const body: EnrichRequest = await request.json()
    const { project_id } = body
    
    if (!project_id) {
      return NextResponse.json(
        { success: false, project_id: '', status: 'failed', errors: ['project_id is required'] },
        { status: 400 }
      )
    }
    
    // 3. Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()
    
    if (projectError || !project) {
      return NextResponse.json(
        { success: false, project_id, status: 'failed', errors: ['Project not found'] },
        { status: 404 }
      )
    }
    
    // 4. Validate project has required fields
    if (!project.compound_name) {
      return NextResponse.json(
        { success: false, project_id, status: 'failed', errors: ['Compound name is required'] },
        { status: 400 }
      )
    }
    
    // 5. Update status to in_progress
    await supabase
      .from('projects')
      .update({
        enrichment_status: 'in_progress',
        enrichment_metadata: {
          started_at: new Date().toISOString(),
        }
      })
      .eq('id', project_id)
    
    // 6. Call Edge Function for enrichment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/enrich-data`
    const edgeFunctionKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !edgeFunctionKey) {
      console.error('Missing Supabase configuration')
      await supabase
        .from('projects')
        .update({ enrichment_status: 'failed' })
        .eq('id', project_id)
      
      return NextResponse.json(
        { success: false, project_id, status: 'failed', errors: ['Configuration error'] },
        { status: 500 }
      )
    }
    
    // Call Edge Function (non-blocking)
    fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${edgeFunctionKey}`,
      },
      body: JSON.stringify({ project_id }),
    }).catch(err => {
      console.error('Edge Function call failed:', err)
    })
    
    // 7. Return immediate response
    return NextResponse.json({
      success: true,
      project_id,
      status: 'in_progress',
      message: 'Enrichment started. This may take 1-2 minutes.',
    })
    
  } catch (error) {
    console.error('Enrichment API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        project_id: '', 
        status: 'failed',
        errors: ['Internal server error'],
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check enrichment status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const project_id = searchParams.get('project_id')
    
    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }
    
    const { data: project, error } = await supabase
      .from('projects')
      .select('enrichment_status, enrichment_completed_at, enrichment_metadata, inchikey')
      .eq('id', project_id)
      .single()
    
    if (error || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      project_id,
      status: project.enrichment_status,
      completed_at: project.enrichment_completed_at,
      metadata: project.enrichment_metadata,
      inchikey: project.inchikey,
    })
    
  } catch (error) {
    console.error('Enrichment status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
