/**
 * IB Generation API v2
 * 
 * Universal, compound-agnostic IB generation endpoint.
 * Uses the new Universal Project Model.
 * 
 * POST /api/v2/ib/generate
 * 
 * @version 2.0.0
 * @date 2025-12-02
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { universalIBGenerator } from '@/lib/services/ib-generator-v2'

export const maxDuration = 300 // 5 minutes timeout

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Parse request body
    const body = await request.json()
    const { projectId, configOverrides } = body
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }
    
    // Get user from session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, org_id, title, compound_name')
      .eq('id', projectId)
      .single()
    
    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    console.log(`[API v2] IB Generation started for project: ${project.title} (${projectId})`)
    
    // Generate IB using universal generator
    const result = await universalIBGenerator.generate({
      projectId,
      userId: user.id,
      configOverrides
    })
    
    // Log to audit
    await supabase
      .from('audit_log')
      .insert({
        project_id: projectId,
        user_id: user.id,
        action: 'ib_generated_v2',
        details: {
          success: result.success,
          document_id: result.documentId,
          sections_count: Object.keys(result.sections).length,
          completeness: result.completeness,
          duration_ms: result.duration_ms,
          generator_version: '2.0.0'
        }
      })
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        documentId: result.documentId,
        sectionsCount: Object.keys(result.sections).length,
        completeness: result.completeness,
        validation: result.validation,
        enrichment_warnings: result.enrichment_warnings,
        duration_ms: result.duration_ms
      })
    } else {
      return NextResponse.json({
        success: false,
        errors: result.errors,
        completeness: result.completeness,
        enrichment_warnings: result.enrichment_warnings,
        duration_ms: result.duration_ms
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('[API v2] IB Generation error:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime
    }, { status: 500 })
  }
}

/**
 * GET /api/v2/ib/generate?projectId=xxx
 * 
 * Get generation status or preview enrichment data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Get project with enrichment status
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        compound_name,
        compound_type,
        indication,
        phase,
        enrichment_status,
        enrichment_completed_at
      `)
      .eq('id', projectId)
      .single()
    
    if (error || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    // Get latest IB document if exists
    const { data: latestDoc } = await supabase
      .from('documents')
      .select('id, version, status, created_at, metadata')
      .eq('project_id', projectId)
      .eq('type', 'IB')
      .order('version', { ascending: false })
      .limit(1)
      .single()
    
    return NextResponse.json({
      project: {
        id: project.id,
        title: project.title,
        compound_name: project.compound_name,
        compound_type: project.compound_type || 'small_molecule',
        indication: project.indication,
        phase: project.phase,
        enrichment_status: project.enrichment_status,
        enrichment_completed_at: project.enrichment_completed_at
      },
      latestDocument: latestDoc ? {
        id: latestDoc.id,
        version: latestDoc.version,
        status: latestDoc.status,
        created_at: latestDoc.created_at,
        completeness: latestDoc.metadata?.completeness
      } : null
    })
    
  } catch (error) {
    console.error('[API v2] GET error:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
