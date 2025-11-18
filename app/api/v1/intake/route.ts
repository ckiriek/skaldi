/**
 * Intake Agent API Route
 * 
 * Responsibilities:
 * 1. Validate project creation request
 * 2. Determine enabled agents based on product_type
 * 3. Create project record in database
 * 4. Trigger Regulatory Data Agent (if needed)
 * 5. Return project with enrichment status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  validateProjectForEnrichment, 
  shouldTriggerEnrichment,
  getEnabledAgents,
  type ProductType 
} from '@/lib/types/project'

export const runtime = 'nodejs'

interface IntakeRequest {
  // Basic info
  title: string
  product_type: ProductType
  compound_name: string
  sponsor?: string
  
  // Study info
  phase?: string
  indication?: string
  drug_class?: string
  countries?: string[]
  design_json?: any
  
  // RLD info (for generic)
  rld_brand_name?: string
  rld_application_number?: string
  te_code?: string
}

interface IntakeResponse {
  success: boolean
  project_id?: string
  enabled_agents?: {
    intake: boolean
    regulatoryData: boolean
    composer: boolean
    writer: boolean
    validator: boolean
    assembler: boolean
    reviewer: boolean
  }
  enrichment_triggered?: boolean
  errors?: string[]
  message?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<IntakeResponse>> {
  try {
    console.log('🔵 Intake API called')
    const supabase = await createClient()
    
    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json(
        { success: false, errors: ['Authentication required'] },
        { status: 401 }
      )
    }
    console.log('✅ User authenticated:', user.id)
    
    // 2. Get user's org_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData) {
      console.error('❌ User lookup error:', userError)
      return NextResponse.json(
        { success: false, errors: ['User not found'] },
        { status: 404 }
      )
    }
    console.log('✅ User org_id:', userData.org_id)
    
    // 3. Parse request body
    const body: IntakeRequest = await request.json()
    console.log('📦 Request body:', JSON.stringify(body, null, 2))
    
    // 4. Validate required fields
    console.log('🔍 Validating project...')
    const validation = validateProjectForEnrichment(body)
    if (!validation.valid) {
      console.error('❌ Validation failed:', validation.errors)
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      )
    }
    console.log('✅ Validation passed')
    
    // 5. Determine enabled agents
    const enabledAgents = getEnabledAgents(body.product_type)
    console.log('🤖 Enabled agents:', enabledAgents)
    
    // 6. Prepare project data
    // Select random medical icon from Lucide set
    const medicalIcons = ['Pill', 'Syringe', 'Microscope', 'Dna', 'HeartPulse', 'Stethoscope', 'TestTube', 'Activity', 'Brain', 'Droplet']
    const randomIcon = medicalIcons[Math.floor(Math.random() * medicalIcons.length)]
    
    const projectData = {
      title: body.title,
      product_type: body.product_type,
      compound_name: body.compound_name,
      sponsor: body.sponsor || null,
      phase: body.phase || null,
      indication: body.indication || null,
      drug_class: body.drug_class || null,
      countries: body.countries || [],
      design_json: body.design_json || null,
      icon_name: randomIcon,
      
      // RLD fields (only for generic)
      rld_brand_name: body.product_type === 'generic' ? body.rld_brand_name : null,
      rld_application_number: body.product_type === 'generic' ? body.rld_application_number : null,
      te_code: body.product_type === 'generic' ? body.te_code : null,
      
      // Enrichment status
      enrichment_status: enabledAgents.regulatoryData ? 'pending' : 'skipped',
      
      // Audit
      org_id: userData.org_id,
      created_by: user.id,
    }
    
    // 7. Create project
    console.log('💾 Creating project in database...')
    console.log('📦 Project data:', JSON.stringify(projectData, null, 2))
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single()
    
    if (createError) {
      console.error('❌ Error creating project:', createError)
      console.error('❌ Error details:', JSON.stringify(createError, null, 2))
      return NextResponse.json(
        { success: false, errors: ['Failed to create project'], message: createError.message },
        { status: 500 }
      )
    }
    console.log('✅ Project created:', project.id)
    
    // 8. Trigger Regulatory Data Agent (if needed)
    let enrichmentTriggered = false
    if (shouldTriggerEnrichment(project)) {
      try {
        console.log('🚀 Triggering enrichment for project:', project.id)
        
        // Call Edge Function directly (more reliable than API route)
        const edgeFunctionUrl = `${process.env.SUPABASE_URL}/functions/v1/enrich-data`
        const edgeFunctionKey = process.env.SUPABASE_ANON_KEY
        
        if (!edgeFunctionUrl || !edgeFunctionKey) {
          console.error('❌ Missing Supabase configuration for enrichment')
          throw new Error('Supabase configuration missing')
        }
        
        // Update enrichment status to in_progress BEFORE calling
        await supabase
          .from('projects')
          .update({ 
            enrichment_status: 'in_progress',
            enrichment_metadata: {
              started_at: new Date().toISOString(),
            }
          })
          .eq('id', project.id)
        
        // Call Edge Function (non-blocking)
        fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${edgeFunctionKey}`,
          },
          body: JSON.stringify({ project_id: project.id }),
        }).catch(err => {
          console.error('❌ Failed to trigger enrichment:', err)
        })
        
        enrichmentTriggered = true
        console.log('✅ Enrichment triggered successfully')
        
      } catch (enrichError) {
        console.error('❌ Error triggering enrichment:', enrichError)
        // Don't fail the request, just log the error
        // Update status to failed
        await supabase
          .from('projects')
          .update({ enrichment_status: 'failed' })
          .eq('id', project.id)
      }
    }
    
    // 9. Log intake operation
    await supabase
      .from('audit_log')
      .insert({
        project_id: project.id,
        action: 'project_created',
        diff_json: {
          product_type: project.product_type,
          compound_name: project.compound_name,
          enrichment_triggered: enrichmentTriggered,
        },
        actor_user_id: user.id,
      })
    
    // 10. Return success response
    return NextResponse.json({
      success: true,
      project_id: project.id,
      enabled_agents: enabledAgents,
      enrichment_triggered: enrichmentTriggered,
      message: enrichmentTriggered 
        ? 'Project created. Regulatory data enrichment started.'
        : 'Project created successfully.',
    })
    
  } catch (error) {
    console.error('Intake Agent error:', error)
    return NextResponse.json(
      { 
        success: false, 
        errors: ['Internal server error'],
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
