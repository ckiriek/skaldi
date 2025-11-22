/**
 * POST /api/crossdoc/auto-fix
 * Apply automatic fixes to cross-document issues
 */

import { NextRequest, NextResponse } from 'next/server'
import { applyAutoFixes, generateAutoFixSuggestions } from '@/lib/engine/crossdoc/autofix'
import { CrossDocEngine } from '@/lib/engine/crossdoc'
import {
  loadIbForCrossDoc,
  loadProtocolForCrossDoc,
  loadIcfForCrossDoc,
  loadSapForCrossDoc,
  loadCsrForCrossDoc,
} from '@/lib/engine/crossdoc/loaders'
import type { AutoFixRequest, CrossDocBundle } from '@/lib/engine/crossdoc/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { issueIds, strategy, documentIds } = body as AutoFixRequest & {
      documentIds?: {
        ibId?: string
        protocolId?: string
        icfId?: string
        sapId?: string
        csrId?: string
      }
    }

    if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
      return NextResponse.json(
        { error: 'issueIds array is required' },
        { status: 400 }
      )
    }

    if (!documentIds) {
      return NextResponse.json(
        { error: 'documentIds object is required' },
        { status: 400 }
      )
    }

    // Load documents
    const bundle: CrossDocBundle = {}

    if (documentIds.ibId) {
      bundle.ib = await loadIbForCrossDoc(documentIds.ibId) || undefined
    }

    if (documentIds.protocolId) {
      bundle.protocol = await loadProtocolForCrossDoc(documentIds.protocolId) || undefined
    }

    if (documentIds.icfId) {
      bundle.icf = await loadIcfForCrossDoc(documentIds.icfId) || undefined
    }

    if (documentIds.sapId) {
      bundle.sap = await loadSapForCrossDoc(documentIds.sapId) || undefined
    }

    if (documentIds.csrId) {
      bundle.csr = await loadCsrForCrossDoc(documentIds.csrId) || undefined
    }

    // Run validation to get current issues
    const engine = CrossDocEngine.createDefault()
    const validationResult = await engine.run(bundle)

    // Filter issues to fix
    const issuesToFix = validationResult.issues.filter(issue =>
      issueIds.includes(issue.code)
    )

    if (issuesToFix.length === 0) {
      return NextResponse.json({
        message: 'No matching issues found',
        appliedPatches: [],
        updatedDocuments: [],
        remainingIssues: validationResult.issues,
        changelog: [],
      })
    }

    // Generate auto-fix suggestions for issues that don't have them
    issuesToFix.forEach(issue => {
      if (!issue.suggestions || issue.suggestions.length === 0) {
        const patches = generateAutoFixSuggestions(issue, bundle)
        
        if (patches.length > 0) {
          issue.suggestions = [
            {
              id: `AUTO_FIX_${issue.code}`,
              label: `Auto-fix ${issue.code}`,
              autoFixable: true,
              patches,
            },
          ]
        }
      }
    })

    // Apply auto-fixes
    const autoFixRequest: AutoFixRequest = {
      issueIds,
      strategy: strategy || 'align_to_protocol',
    }

    const result = await applyAutoFixes(issuesToFix, bundle, autoFixRequest)

    return NextResponse.json({
      success: true,
      ...result,
      summary: {
        issuesFixed: issuesToFix.length - result.remainingIssues.length,
        patchesApplied: result.appliedPatches.length,
        documentsUpdated: result.updatedDocuments.length,
      },
    })
  } catch (error) {
    console.error('Auto-fix error:', error)
    return NextResponse.json(
      {
        error: 'Failed to apply auto-fixes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
