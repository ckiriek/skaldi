/**
 * Post-Generation Validation Checks
 * Automatically validates documents after generation using StudyFlow + CrossDoc engines
 */

import { createClient } from '@/lib/supabase/server'

interface PostGenerationCheckParams {
  projectId: string
  documentId: string
  documentType: string
}

interface ValidationResult {
  studyflow: {
    success: boolean
    issues: any[]
    summary: {
      total: number
      critical: number
      error: number
      warning: number
      info: number
    }
  }
  crossdoc: {
    success: boolean
    issues: any[]
    summary: {
      total: number
      critical: number
      error: number
      warning: number
      info: number
    }
  }
  overallStatus: 'clean' | 'warning' | 'error' | 'critical' | 'pending'
}

/**
 * Run all post-generation validation checks
 */
export async function runPostGenerationChecks({
  projectId,
  documentId,
  documentType,
}: PostGenerationCheckParams): Promise<ValidationResult> {
  const supabase = await createClient()

  console.log(`[PostGeneration] Running checks for document ${documentId}`)

  // Initialize result
  const result: ValidationResult = {
    studyflow: {
      success: false,
      issues: [],
      summary: { total: 0, critical: 0, error: 0, warning: 0, info: 0 },
    },
    crossdoc: {
      success: false,
      issues: [],
      summary: { total: 0, critical: 0, error: 0, warning: 0, info: 0 },
    },
    overallStatus: 'pending',
  }

  try {
    // 1. Run StudyFlow validation (if Protocol or SAP)
    if (documentType === 'protocol' || documentType === 'sap') {
      console.log('[PostGeneration] Running StudyFlow validation...')
      
      try {
        const sfResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/studyflow/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studyFlowId: `flow_${projectId}`,
            protocolId: documentId,
          }),
        })

        if (sfResponse.ok) {
          const sfData = await sfResponse.json()
          result.studyflow = {
            success: sfData.success,
            issues: sfData.result?.issues || [],
            summary: sfData.result?.summary || result.studyflow.summary,
          }

          // Save to database
          await supabase.from('studyflow_validations').insert({
            project_id: projectId,
            document_id: documentId,
            issues: result.studyflow.issues,
            summary: result.studyflow.summary,
          })

          console.log(`[PostGeneration] StudyFlow validation complete: ${result.studyflow.summary.total} issues`)
        }
      } catch (error) {
        console.error('[PostGeneration] StudyFlow validation failed:', error)
      }
    }

    // 2. Run CrossDoc validation
    console.log('[PostGeneration] Running CrossDoc validation...')
    
    try {
      const cdResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/crossdoc/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          documentIds: [documentId],
        }),
      })

      if (cdResponse.ok) {
        const cdData = await cdResponse.json()
        result.crossdoc = {
          success: cdData.success,
          issues: cdData.result?.issues || [],
          summary: cdData.result?.summary || result.crossdoc.summary,
        }

        // Save to database
        await supabase.from('crossdoc_validations').insert({
          project_id: projectId,
          issues: result.crossdoc.issues,
          summary: result.crossdoc.summary,
        })

        console.log(`[PostGeneration] CrossDoc validation complete: ${result.crossdoc.summary.total} issues`)
      }
    } catch (error) {
      console.error('[PostGeneration] CrossDoc validation failed:', error)
    }

    // 3. Determine overall status
    const totalCritical = result.studyflow.summary.critical + result.crossdoc.summary.critical
    const totalError = result.studyflow.summary.error + result.crossdoc.summary.error
    const totalWarning = result.studyflow.summary.warning + result.crossdoc.summary.warning

    if (totalCritical > 0) {
      result.overallStatus = 'critical'
    } else if (totalError > 0) {
      result.overallStatus = 'error'
    } else if (totalWarning > 0) {
      result.overallStatus = 'warning'
    } else {
      result.overallStatus = 'clean'
    }

    // 4. Update document validation status
    await supabase
      .from('documents')
      .update({
        validation_status: result.overallStatus,
        validation_summary: {
          studyflow: result.studyflow.summary,
          crossdoc: result.crossdoc.summary,
          total: {
            critical: totalCritical,
            error: totalError,
            warning: totalWarning,
            info: result.studyflow.summary.info + result.crossdoc.summary.info,
          },
        },
        last_validated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    console.log(`[PostGeneration] Overall status: ${result.overallStatus}`)

    return result
  } catch (error) {
    console.error('[PostGeneration] Validation checks failed:', error)
    throw error
  }
}

/**
 * Get validation history for a document
 */
export async function getValidationHistory(documentId: string) {
  const supabase = await createClient()

  const [studyflowHistory, crossdocHistory] = await Promise.all([
    supabase
      .from('studyflow_validations')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('crossdoc_validations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return {
    studyflow: studyflowHistory.data || [],
    crossdoc: crossdocHistory.data || [],
  }
}

/**
 * Get latest validation status for a document
 */
export async function getLatestValidationStatus(documentId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('documents')
    .select('validation_status, validation_summary, last_validated_at')
    .eq('id', documentId)
    .single()

  return data
}
