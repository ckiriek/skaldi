/**
 * Run Validation API
 * 
 * POST /api/validation/run
 * Runs validation engine on a document
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentStore } from '@/engine/document_store'
import { ValidationEngine } from '@/engine/validation'
import { allRules } from '@/engine/validation/rules'
import { AuditLogger } from '@/engine/audit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { document_id } = body

    if (!document_id) {
      return NextResponse.json(
        { error: 'Missing document_id' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createClient()

    // Load document
    const store = new DocumentStore(supabase)
    const document = await store.loadDocument(document_id)

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Create validation engine
    const engine = new ValidationEngine()

    // Register all rules
    for (const rule of allRules) {
      engine.registerRule(rule)
    }

    // Run validation
    const result = await engine.runValidation(document)

    // Store results in database
    const validationRecords = result.issues.map(issue => ({
      document_id,
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
      .eq('document_id', document_id)

    // Insert new validations
    if (validationRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('consistency_validations')
        .insert(validationRecords as any)

      if (insertError) {
        console.error('Failed to store validation results:', insertError)
      }
    }

    // Log to audit
    const audit = new AuditLogger(supabase)
    await audit.logValidation(
      document_id,
      result.errors,
      result.warnings
    )

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run validation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
