/**
 * Comment Detail API Route
 * 
 * Endpoints for managing individual comments.
 * 
 * PATCH /api/v1/comments/[comment_id] - Update comment
 * DELETE /api/v1/comments/[comment_id] - Delete comment
 * 
 * @module app/api/v1/comments/[comment_id]/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/middleware/error-handler'
import { createApiError, ErrorCodes } from '@/lib/types/errors'
import type { UpdateReviewCommentInput } from '@/lib/types/versioning'

/**
 * PATCH /api/v1/comments/[comment_id]
 * 
 * Update comment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { comment_id: string } }
) {
  try {
    const supabase = await createClient()
    const { comment_id } = params
    const body = await request.json() as UpdateReviewCommentInput

    // If resolving, add resolved_by and resolved_at
    if (body.status === 'resolved') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        Object.assign(body, {
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
      }
    }

    const { data, error } = await supabase
      .from('review_comments')
      .update(body)
      .eq('id', comment_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json(
        createApiError(
          ErrorCodes.NOT_FOUND,
          `Comment not found: ${comment_id}`,
          {
            category: 'not_found',
            severity: 'error',
            details: { comment_id },
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
    return handleApiError(error, 'CommentManager', 'update_comment')
  }
}

/**
 * DELETE /api/v1/comments/[comment_id]
 * 
 * Delete comment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { comment_id: string } }
) {
  try {
    const supabase = await createClient()
    const { comment_id } = params

    const { error } = await supabase
      .from('review_comments')
      .delete()
      .eq('id', comment_id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: `Comment ${comment_id} deleted successfully`,
    })
  } catch (error) {
    return handleApiError(error, 'CommentManager', 'delete_comment')
  }
}
