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
    const { documentId, documentType } = body

    if (!documentId || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, documentType' },
        { status: 400 }
      )
    }

    console.log(`🔍 Validating document ${documentId} (${documentType})`)

    // Fetch document content from document_versions
    const { data: versionData } = await supabase
      .from('document_versions')
      .select('content')
      .eq('document_id', documentId)
      .eq('is_current', true)
      .single()

    // Fallback to document.content if document_versions doesn't exist
    let content = versionData?.content

    if (!content) {
      const { data: docData } = await supabase
        .from('documents')
        .select('content')
        .eq('id', documentId)
        .single()
      
      content = (docData as any)?.content
    }

    if (!content || content.length < 100) {
      return NextResponse.json(
        { error: 'Document has no content to validate' },
        { status: 400 }
      )
    }

    // Run validation using ValidatorAgent
    const validationResult = await validatorAgent.validate({
      content,
      section_id: 'full-document',
      document_type: documentType,
      validation_level: 'standard',
    })

    // Calculate completeness score
    const completenessScore = validationResult.score

    // Determine status
    const status = validationResult.passed ? 'approved' : 'review'

    // Save validation results to database
    const { error: insertError } = await supabase
      .from('validation_results')
      .insert({
        document_id: documentId,
        completeness_score: Math.round(completenessScore),
        status,
        total_rules: validationResult.issues.length,
        passed: validationResult.issues.filter(i => i.type !== 'error').length,
        failed: validationResult.summary.errors,
        issues: validationResult.issues,
        summary: validationResult.summary,
        validation_date: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Failed to save validation results:', insertError)
    }

    // Update document status if validation passed
    if (validationResult.passed) {
      await supabase
        .from('documents')
        .update({ status: 'approved' })
        .eq('id', documentId)
    }

    console.log(`✅ Validation complete: ${completenessScore}% (${validationResult.passed ? 'PASSED' : 'FAILED'})`)

    return NextResponse.json({
      success: true,
      completeness_score: Math.round(completenessScore),
      status,
      total_rules: validationResult.issues.length,
      passed: validationResult.issues.filter(i => i.type !== 'error').length,
      failed: validationResult.summary.errors,
      issues: validationResult.issues,
      summary: validationResult.summary,
      validation_level: validationResult.validation_level,
      duration_ms: validationResult.duration_ms,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
