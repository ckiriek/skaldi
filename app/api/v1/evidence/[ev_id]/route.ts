/**
 * Evidence Detail API Route
 * 
 * Endpoints for managing individual evidence sources.
 * 
 * GET /api/v1/evidence/[ev_id] - Get evidence by EV-ID
 * PATCH /api/v1/evidence/[ev_id] - Update evidence
 * DELETE /api/v1/evidence/[ev_id] - Delete evidence
 * 
 * @module app/api/v1/evidence/[ev_id]/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/middleware/error-handler'
import { createApiError, ErrorCodes } from '@/lib/types/errors'
import type { UpdateEvidenceSourceInput } from '@/lib/types/evidence'

/**
 * GET /api/v1/evidence/[ev_id]
 * 
 * Get evidence source by EV-ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ev_id: string } }
) {
  try {
    const supabase = await createClient()
    const { ev_id } = params

    // Get evidence by EV-ID
    const { data, error } = await supabase
      .rpc('get_evidence_by_ev_id', { p_ev_id: ev_id })
      .single()

    if (error) {
      throw error
    }

    if (!data) {
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

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    return handleApiError(error, 'EvidenceLocker', 'get_evidence')
  }
}

/**
 * PATCH /api/v1/evidence/[ev_id]
 * 
 * Update evidence source
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { ev_id: string } }
) {
  try {
    const supabase = await createClient()
    const { ev_id } = params
    const body = await request.json() as UpdateEvidenceSourceInput

    // Update evidence
    const { data, error } = await supabase
      .from('evidence_sources_v2')
      .update(body)
      .eq('ev_id', ev_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
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

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    return handleApiError(error, 'EvidenceLocker', 'update_evidence')
  }
}

/**
 * DELETE /api/v1/evidence/[ev_id]
 * 
 * Delete evidence source
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { ev_id: string } }
) {
  try {
    const supabase = await createClient()
    const { ev_id } = params

    // Delete evidence
    const { error } = await supabase
      .from('evidence_sources_v2')
      .delete()
      .eq('ev_id', ev_id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: `Evidence ${ev_id} deleted successfully`,
    })
  } catch (error) {
    return handleApiError(error, 'EvidenceLocker', 'delete_evidence')
  }
}
