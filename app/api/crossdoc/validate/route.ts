/**
 * POST /api/crossdoc/validate
 * Validate consistency across multiple clinical documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CrossDocEngine } from '@/lib/engine/crossdoc'
import {
  loadIbForCrossDoc,
  loadProtocolForCrossDoc,
  loadIcfForCrossDoc,
  loadSapForCrossDoc,
  loadCsrForCrossDoc,
} from '@/lib/engine/crossdoc/loaders'
import type { CrossDocBundle } from '@/lib/engine/crossdoc/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ibId, protocolId, icfId, sapId, csrId, projectId } = body

    // At least 2 documents required for cross-document validation
    const documentCount = [ibId, protocolId, icfId, sapId, csrId].filter(Boolean).length
    
    if (documentCount < 2) {
      return NextResponse.json(
        { error: 'At least 2 document IDs are required for cross-document validation' },
        { status: 400 }
      )
    }

    // Load documents
    const bundle: CrossDocBundle = {}
    const loadErrors: string[] = []

    if (ibId) {
      const ib = await loadIbForCrossDoc(ibId)
      if (ib) {
        bundle.ib = ib
      } else {
        loadErrors.push(`Failed to load IB: ${ibId}`)
      }
    }

    if (protocolId) {
      const protocol = await loadProtocolForCrossDoc(protocolId)
      if (protocol) {
        bundle.protocol = protocol
      } else {
        loadErrors.push(`Failed to load Protocol: ${protocolId}`)
      }
    }

    if (icfId) {
      const icf = await loadIcfForCrossDoc(icfId)
      if (icf) {
        bundle.icf = icf
      } else {
        loadErrors.push(`Failed to load ICF: ${icfId}`)
      }
    }

    if (sapId) {
      const sap = await loadSapForCrossDoc(sapId)
      if (sap) {
        bundle.sap = sap
      } else {
        loadErrors.push(`Failed to load SAP: ${sapId}`)
      }
    }

    if (csrId) {
      const csr = await loadCsrForCrossDoc(csrId)
      if (csr) {
        bundle.csr = csr
      } else {
        loadErrors.push(`Failed to load CSR: ${csrId}`)
      }
    }

    if (loadErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Failed to load some documents',
          details: loadErrors,
        },
        { status: 404 }
      )
    }

    // Run cross-document validation
    const engine = CrossDocEngine.createDefault()
    const result = await engine.run(bundle)

    // Save validation results to database
    const supabase = await createClient()
    
    if (projectId) {
      console.log('[CrossDoc] Saving validation for project:', projectId)
      const { error: insertError } = await supabase.from('crossdoc_validations').insert({
        project_id: projectId,
        summary: result.summary,
        issues: result.issues,
      })
      if (insertError) {
        console.error('[CrossDoc] Failed to save validation:', insertError)
      } else {
        console.log('[CrossDoc] Validation saved successfully')
      }
    } else {
      console.warn('[CrossDoc] No projectId provided, validation not saved')
    }

    // Add metadata
    const response = {
      ...result,
      metadata: {
        documentsValidated: Object.keys(bundle).length,
        timestamp: new Date().toISOString(),
        engine: 'CrossDocEngine',
        version: '1.0.0',
        projectId,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Cross-document validation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to validate documents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
