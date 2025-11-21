import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ValidatorAgent } from '@/lib/agents/validator'
import { DocumentOrchestrator } from '@/lib/services/document-orchestrator'

const validatorAgent = new ValidatorAgent()
const documentOrchestrator = new DocumentOrchestrator()

// Feature flags
const USE_NEW_ORCHESTRATOR = process.env.USE_NEW_ORCHESTRATOR === 'true'
const USE_ORCHESTRATOR_FOR_ALL = process.env.USE_ORCHESTRATOR_FOR_ALL === 'true'

// Document types supported by new orchestrator
const NEW_ORCHESTRATOR_TYPES = USE_ORCHESTRATOR_FOR_ALL 
  ? ['Protocol', 'IB', 'ICF', 'Synopsis', 'CSR', 'SPC'] 
  : ['Protocol'] // Start with Protocol only if not using all

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, documentType } = body

    if (!projectId || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, documentType' },
        { status: 400 }
      )
    }

    console.log(`📝 Generating ${documentType} for project ${projectId}`)

    // Determine which generation path to use
    const useNewOrchestrator = USE_NEW_ORCHESTRATOR && NEW_ORCHESTRATOR_TYPES.includes(documentType)
    
    let data: any
    let error: any

    if (useNewOrchestrator) {
      console.log(`🚀 Using NEW DocumentOrchestrator for ${documentType}`)
      console.log(`   Project ID: ${projectId}`)
      console.log(`   User ID: ${user.id}`)
      
      try {
        const result = await documentOrchestrator.generateDocument({
          projectId,
          documentType,
          userId: user.id,
        })

        console.log(`   Orchestrator result:`, { success: result.success, sections: Object.keys(result.sections).length, errors: result.errors?.length })

        if (result.success) {
          data = {
            success: true,
            document: {
              id: result.documentId,
              type: documentType,
              sections: result.sections,
            },
            validation: result.validation,
            duration_ms: result.duration_ms,
            orchestrator: 'new', // Flag to indicate new path
          }
        } else {
          console.error(`   Orchestrator failed:`, result.errors)
          error = {
            message: 'Document generation failed',
            details: result.errors,
          }
        }
      } catch (err) {
        console.error(`   Orchestrator exception:`, err)
        error = {
          message: err instanceof Error ? err.message : 'Unknown error',
          details: err,
        }
      }
    } else {
      console.log(`🔄 Using LEGACY Edge Function for ${documentType}`)
      
      // Call legacy Supabase Edge Function
      const response = await supabase.functions.invoke('generate-document', {
        body: {
          projectId,
          documentType,
          userId: user.id,
        },
      })

      data = response.data
      error = response.error
    }

    if (error) {
      console.error('Generation error:', error)
      return NextResponse.json({ 
        error: error.message,
        details: error,
        context: useNewOrchestrator ? 'New orchestrator failed' : 'Edge function invocation failed'
      }, { status: 500 })
    }

    // If data contains an error, it means generation returned 400
    if (data && data.error) {
      console.error('Generation returned error:', data)
      return NextResponse.json({
        error: data.error,
        details: data.details,
        context: 'Generation execution failed'
      }, { status: 500 })
    }

    // Auto-validate the generated document (skip if new orchestrator already validated)
    if (data.success && data.document && data.document.id && !useNewOrchestrator) {
      console.log(`🔍 Auto-validating generated document ${data.document.id}`)
      
      try {
        // Fetch the generated content
        const { data: versionData } = await supabase
          .from('document_versions')
          .select('content')
          .eq('document_id', data.document.id)
          .eq('is_current', true)
          .single()

        const content = versionData?.content || (data.document as any).content

        if (content && content.length > 100) {
          // Run validation
          const validationResult = await validatorAgent.validate({
            content,
            section_id: 'full-document',
            document_type: documentType,
            validation_level: 'standard',
          })

          // Save validation results
          const totalChecks = 13
          const passedChecks = totalChecks - validationResult.summary.errors
          
          await supabase
            .from('validation_results')
            .insert({
              document_id: data.document.id,
              completeness_score: Math.round(validationResult.score),
              status: validationResult.passed ? 'approved' : 'review',
              total_rules: totalChecks,
              passed: passedChecks,
              failed: validationResult.summary.errors,
              results: {
                issues: validationResult.issues,
                summary: validationResult.summary,
                validation_level: 'standard',
                duration_ms: validationResult.duration_ms,
              },
              validation_date: new Date().toISOString(),
            })

          console.log(`✅ Auto-validation complete: ${validationResult.score}% (${validationResult.passed ? 'PASSED' : 'FAILED'})`)
          
          // Add validation info to response
          data.validation = {
            score: Math.round(validationResult.score),
            passed: validationResult.passed,
            errors: validationResult.summary.errors,
            warnings: validationResult.summary.warnings,
          }
        }
      } catch (validationError) {
        console.error('Auto-validation failed:', validationError)
        // Don't fail the whole request if validation fails
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
