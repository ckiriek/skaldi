import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ValidatorAgent } from '@/lib/agents/validator'

const validatorAgent = new ValidatorAgent()

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

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('generate-document', {
      body: {
        projectId,
        documentType,
        userId: user.id,
      },
    })

    if (error) {
      console.error('Edge function error:', error)
      return NextResponse.json({ 
        error: error.message,
        details: error,
        context: 'Edge function invocation failed'
      }, { status: 500 })
    }

    // If data contains an error, it means the Edge Function returned 400
    if (data && data.error) {
      console.error('Edge function returned error:', data)
      return NextResponse.json({
        error: data.error,
        details: data.details,
        context: 'Edge function execution failed'
      }, { status: 500 })
    }

    // Auto-validate the generated document
    if (data.success && data.document && data.document.id) {
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
