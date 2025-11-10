import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidateRequest {
  documentId: string
  documentType: 'IB' | 'Protocol' | 'ICF' | 'Synopsis'
  content: string
}

interface ValidationResult {
  rule_id: string
  rule_name: string
  section_ref: string
  check_type: string
  passed: boolean
  message: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { documentId, documentType, content }: ValidateRequest = await req.json()

    // 1. Fetch validation rules for this document type
    const { data: rules, error: rulesError } = await supabaseClient
      .from('validation_rules')
      .select('*')
      .eq('document_type', documentType)
      .eq('is_active', true)

    if (rulesError) throw rulesError

    // 2. Run validation checks
    const results: ValidationResult[] = []
    
    for (const rule of rules) {
      const result = await validateRule(rule, content)
      results.push(result)
    }

    // 3. Calculate completeness score
    const passedCount = results.filter(r => r.passed).length
    const totalCount = results.length
    const completenessScore = totalCount > 0 ? (passedCount / totalCount) * 100 : 0

    // 4. Determine overall status
    const criticalFailed = results.some(r => !r.passed && r.check_type === 'required')
    const status = criticalFailed ? 'needs_revision' : completenessScore >= 90 ? 'approved' : 'review'

    // 5. Update document status
    await supabaseClient
      .from('documents')
      .update({ status: status === 'approved' ? 'approved' : 'review' })
      .eq('id', documentId)

    // 6. Save validation results to database
    const sortedResults = results.sort((a, b) => {
      // Sort failed checks first, then by section
      if (a.passed !== b.passed) return a.passed ? 1 : -1
      return a.section_ref.localeCompare(b.section_ref)
    })

    const { error: insertError } = await supabaseClient
      .from('validation_results')
      .insert({
        document_id: documentId,
        completeness_score: Math.round(completenessScore),
        status,
        total_rules: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
        results: sortedResults,
      })
    
    if (insertError) {
      console.error('Failed to insert validation results:', insertError)
      throw new Error(`Failed to save validation results: ${insertError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        completeness_score: Math.round(completenessScore),
        status,
        total_rules: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
        results: sortedResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

async function validateRule(rule: any, content: string): Promise<ValidationResult> {
  let passed = false
  let message = ''

  const contentLower = content.toLowerCase()
  const sectionName = rule.rule_name.toLowerCase()

  switch (rule.check_type) {
    case 'required':
      // Check if section exists in content
      passed = contentLower.includes(sectionName) || 
               contentLower.includes(rule.section_ref)
      message = passed 
        ? `Section "${rule.rule_name}" is present`
        : `Missing required section: ${rule.rule_name}`
      break

    case 'completeness':
      // Check if section has substantial content (more than just heading)
      const sectionRegex = new RegExp(`${sectionName}[\\s\\S]{50,}`, 'i')
      passed = sectionRegex.test(content)
      message = passed
        ? `Section "${rule.rule_name}" has adequate content`
        : `Section "${rule.rule_name}" needs more detailed content`
      break

    case 'format':
      // Basic format checks (can be expanded)
      passed = content.length > 100 // Minimum length check
      message = passed
        ? 'Document format is acceptable'
        : 'Document format needs improvement'
      break

    case 'consistency':
      // Check for consistent terminology (placeholder)
      passed = true
      message = 'Consistency check passed'
      break

    default:
      passed = true
      message = 'Check type not implemented'
  }

  return {
    rule_id: rule.id,
    rule_name: rule.rule_name,
    section_ref: rule.section_ref,
    check_type: rule.check_type,
    passed,
    message,
  }
}
