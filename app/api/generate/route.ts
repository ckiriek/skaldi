import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentOrchestrator } from '@/lib/services/document-orchestrator'
import { runPostGenerationChecks } from '@/lib/integration/run_post_generation_checks'

const documentOrchestrator = new DocumentOrchestrator()

// Supported document types - all use the new orchestrator
const SUPPORTED_DOCUMENT_TYPES = ['Protocol', 'IB', 'ICF', 'Synopsis', 'CSR', 'SPC', 'SAP', 'CRF']

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

    // Validate document type
    if (!SUPPORTED_DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json(
        { error: `Unsupported document type: ${documentType}. Supported types: ${SUPPORTED_DOCUMENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    console.log(`📝 Generating ${documentType} for project ${projectId}`)
    
    // Log to file for debugging
    const fs = require('fs')
    const logPath = '/tmp/skaldi-generation.log'
    fs.appendFileSync(logPath, `\n\n=== ${new Date().toISOString()} ===\n`)
    fs.appendFileSync(logPath, `Generating ${documentType} for project ${projectId}\n`)

    let data: any
    let error: any

    // All document types now use the DocumentOrchestrator
    console.log(`🚀 Using DocumentOrchestrator for ${documentType}`)
    console.log(`   Project ID: ${projectId}`)
    console.log(`   User ID: ${user.id}`)
    
    try {
      const result = await documentOrchestrator.generateDocument({
        projectId,
        documentType,
        userId: user.id,
        supabase, // Pass Supabase client with request context
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
        }
      } else {
        console.error(`   Orchestrator failed:`, result.errors)
        error = {
          message: 'Document generation failed',
          details: result.errors,
        }
      }
    } catch (err) {
      console.error(`❌ Orchestrator exception:`, err)
      console.error(`   Error type:`, typeof err)
      console.error(`   Error name:`, err instanceof Error ? err.name : 'N/A')
      console.error(`   Error message:`, err instanceof Error ? err.message : String(err))
      console.error(`   Error stack:`, err instanceof Error ? err.stack : 'N/A')
      
      // Log to file
      fs.appendFileSync('/tmp/skaldi-generation.log', `ERROR: ${err instanceof Error ? err.message : String(err)}\n`)
      fs.appendFileSync('/tmp/skaldi-generation.log', `Stack: ${err instanceof Error ? err.stack : 'N/A'}\n`)
      
      error = {
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      }
    }

    if (error) {
      console.error('Generation error:', error)
      return NextResponse.json({ 
        error: error.message,
        details: error,
        context: 'Document orchestrator failed'
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

    // Note: Validation is now handled by DocumentOrchestrator internally

    // Phase G.10: Run post-generation validation checks (StudyFlow + CrossDoc)
    if (data.success && data.document && data.document.id) {
      console.log(`🔬 Running Phase G.10 post-generation checks...`)
      
      try {
        const validationResults = await runPostGenerationChecks({
          projectId,
          documentId: data.document.id,
          documentType,
        })

        console.log(`✅ Post-generation checks complete:`)
        console.log(`   StudyFlow: ${validationResults.studyflow.summary.total} issues`)
        console.log(`   CrossDoc: ${validationResults.crossdoc.summary.total} issues`)
        console.log(`   Overall Status: ${validationResults.overallStatus}`)

        // Add to response
        data.phaseG10Validation = {
          studyflow: validationResults.studyflow.summary,
          crossdoc: validationResults.crossdoc.summary,
          overallStatus: validationResults.overallStatus,
        }
      } catch (validationError) {
        console.error('Phase G.10 validation failed:', validationError)
        // Don't fail the whole request
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
