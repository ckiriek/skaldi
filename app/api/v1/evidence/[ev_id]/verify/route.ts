/**
 * Evidence Verification API Route
 * 
 * Endpoint for verifying evidence sources.
 * 
 * POST /api/v1/evidence/[ev_id]/verify - Verify evidence
 * 
 * @module app/api/v1/evidence/[ev_id]/verify/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/middleware/error-handler'
import { createApiError, ErrorCodes } from '@/lib/types/errors'

/**
 * POST /api/v1/evidence/[ev_id]/verify
 * 
 * Verify an evidence source
 * 
 * Request body:
 * {
 *   verification_notes?: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: EvidenceSource
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { ev_id: string } }
) {
  try {
    const supabase = await createClient()
    const { ev_id } = params
    const body = await request.json()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    // Get evidence ID from EV-ID
    const { data: evidence, error: getError } = await supabase
      .from('evidence_sources_v2')
      .select('id')
      .eq('ev_id', ev_id)
      .single()

    if (getError || !evidence) {
      return NextResponse.json(
        createApiError(
          ErrorCodes.NOT_FOUND,
          `Evidence not found: ${ev_id}`,
          {
            category: 'not_found',
            severity: 'error',
            details: { ev_id },
          }
        ),
        { status: 404 }
      )
    }

    // Call verify function
    const { data, error } = await supabase
      .rpc('verify_evidence', {
        p_evidence_id: evidence.id,
        p_verified_by: user.id,
        p_verification_notes: body.verification_notes || null,
      })
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    return handleApiError(error, 'EvidenceLocker', 'verify_evidence')
  }
}
