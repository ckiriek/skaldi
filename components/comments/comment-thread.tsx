/**
 * Comment Thread Component
 * 
 * Displays threaded comments with replies and status management.
 */

'use client'

import { useEffect, useState } from 'react'
import type { ReviewComment } from '@/lib/types/versioning'
import {
  getCommentTypeDisplay,
  getCommentPriorityColor,
  getCommentStatusDisplay,
} from '@/lib/types/versioning'

interface CommentThreadProps {
  versionId: string
  sectionId?: string
  onCommentAdd?: () => void
}

export function CommentThread({ versionId, sectionId, onCommentAdd }: CommentThreadProps) {
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)

  useEffect(() => {
    fetchComments()
  }, [versionId, sectionId])

  const fetchComments = async () => {
    try {
      let url = `/api/v1/comments?version_id=${versionId}`
      if (sectionId) {
        url += `&section_id=${sectionId}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setComments(data.data.comments)
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const response = await fetch('/api/v1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_id: versionId,
          document_id: comments[0]?.document_id, // Get from existing comment
          section_id: sectionId,
          comment_text: newComment,
          parent_comment_id: replyTo,
        }),
      })

      if (response.ok) {
        setNewComment('')
        setReplyTo(null)
        fetchComments()
        onCommentAdd?.()
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const handleResolve = async (commentId: string) => {
    try {
      const response = await fetch(`/api/v1/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved',
        }),
      })

      if (response.ok) {
        fetchComments()
      }
    } catch (error) {
      console.error('Failed to resolve comment:', error)
    }
  }

  // Group comments by thread
  const rootComments = comments.filter((c) => !c.parent_comment_id)
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parent_comment_id === parentId)

  const renderComment = (comment: ReviewComment, depth = 0) => {
    const typeDisplay = getCommentTypeDisplay(comment.comment_type)
    const statusDisplay = getCommentStatusDisplay(comment.status)
    const priorityColor = getCommentPriorityColor(comment.priority)
    const replies = getReplies(comment.id)

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-2' : 'mt-4'}`}>
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          {/* Comment Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">
                {new Date(comment.created_at).toLocaleString()}
              </span>
              <span
                className={`
                  px-2 py-0.5 text-xs font-medium rounded
                  ${typeDisplay.color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
                  ${typeDisplay.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                  ${typeDisplay.color === 'purple' ? 'bg-purple-100 text-purple-700' : ''}
                  ${typeDisplay.color === 'red' ? 'bg-red-100 text-red-700' : ''}
                  ${typeDisplay.color === 'green' ? 'bg-green-100 text-green-700' : ''}
                `}
              >
                {typeDisplay.icon} {typeDisplay.text}
              </span>
              <span
                className={`
                  px-2 py-0.5 text-xs font-medium rounded
                  ${priorityColor === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
                  ${priorityColor === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                  ${priorityColor === 'orange' ? 'bg-orange-100 text-orange-700' : ''}
                  ${priorityColor === 'red' ? 'bg-red-100 text-red-700' : ''}
                `}
              >
                {comment.priority}
              </span>
            </div>
            <span
              className={`
                px-2 py-0.5 text-xs font-medium rounded
                ${statusDisplay.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                ${statusDisplay.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
                ${statusDisplay.color === 'green' ? 'bg-green-100 text-green-700' : ''}
                ${statusDisplay.color === 'red' ? 'bg-red-100 text-red-700' : ''}
                ${statusDisplay.color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
              `}
            >
              {statusDisplay.icon} {statusDisplay.text}
            </span>
          </div>

          {/* Comment Text */}
          <p className="text-sm text-gray-900 mb-3">{comment.comment_text}</p>

          {/* Resolution Notes */}
          {comment.resolution_notes && (
            <div className="bg-green-50 border border-green-200 rounded p-2 mb-3">
              <p className="text-xs text-green-800">
                <strong>Resolution:</strong> {comment.resolution_notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {comment.status !== 'resolved' && (
              <>
                <button
                  onClick={() => setReplyTo(comment.id)}
                  className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                >
                  Reply
                </button>
                <button
                  onClick={() => handleResolve(comment.id)}
                  className="px-3 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded"
                >
                  Resolve
                </button>
              </>
            )}
          </div>

          {/* Reply Form */}
          {replyTo === comment.id && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a reply..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAddComment}
                  className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Reply
                </button>
                <button
                  onClick={() => {
                    setReplyTo(null)
                    setNewComment('')
                  }}
                  className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded border border-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Render Replies */}
        {replies.map((reply) => renderComment(reply, depth + 1))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Comments</h3>
        <span className="text-sm text-gray-500">{comments.length} comments</span>
      </div>

      {/* New Comment Form */}
      {!replyTo && (
        <div className="border border-gray-200 rounded-lg p-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Comment
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-2">
        {rootComments.map((comment) => renderComment(comment))}
      </div>

      {/* Empty State */}
      {comments.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          No comments yet. Be the first to comment!
        </div>
      )}
    </div>
  )
}
