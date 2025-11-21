/**
 * Bulk Validation API
 * 
 * POST /api/validation/bulk
 * Validates multiple documents at once
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentStore } from '@/engine/document_store'
import { ValidationEngine } from '@/engine/validation'
import { allRules } from '@/engine/validation/rules'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { document_ids } = body

    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid document_ids array' },
        { status: 400 }
      )
    }

    console.log(`🔍 Bulk validation: ${document_ids.length} documents`)

    // Create Supabase client
    const supabase = await createClient()
    const store = new DocumentStore(supabase)

    // Create validation engine
    const engine = new ValidationEngine()
    for (const rule of allRules) {
      engine.registerRule(rule)
    }

    // Validate each document
    const results = []
    let totalErrors = 0
    let totalWarnings = 0

    for (const documentId of document_ids) {
      try {
        // Load document
        const document = await store.loadDocument(documentId)
        
        if (!document) {
          results.push({
            document_id: documentId,
            success: false,
            error: 'Document not found'
          })
          continue
        }

        // Run validation
        const validationResult = await engine.runValidation(document)

        // Store results
        const validationRecords = validationResult.issues.map(issue => ({
          document_id: documentId,
          validation_type: issue.rule_id.toLowerCase(),
          severity: issue.severity === 'error' ? 'critical' : issue.severity === 'warning' ? 'high' : 'low',
          status: issue.severity === 'error' ? 'fail' : 'warning',
          message: issue.message,
          sections: issue.locations.map(loc => loc.section_id),
          metadata: issue.metadata || {}
        }))

        // Clear old validations
        await supabase
          .from('consistency_validations')
          .delete()
          .eq('document_id', documentId)

        // Insert new validations
        if (validationRecords.length > 0) {
          await supabase
            .from('consistency_validations')
            .insert(validationRecords as any)
        }

        totalErrors += validationResult.errors
        totalWarnings += validationResult.warnings

        results.push({
          document_id: documentId,
          success: true,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          total_issues: validationResult.issues.length
        })

        console.log(`   ✅ ${documentId}: ${validationResult.errors} errors, ${validationResult.warnings} warnings`)

      } catch (error) {
        console.error(`   ❌ ${documentId} failed:`, error)
        results.push({
          document_id: documentId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`✅ Bulk validation complete`)
    console.log(`   Total errors: ${totalErrors}`)
    console.log(`   Total warnings: ${totalWarnings}`)

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: document_ids.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        total_errors: totalErrors,
        total_warnings: totalWarnings
      }
    })

  } catch (error) {
    console.error('Bulk validation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to validate documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
