'use client'

/**
 * Editable Block Component
 * 
 * Block-level editor with inline validation highlights
 */

import { useState, useRef, useEffect } from 'react'
import { HighlightedText } from './highlighted-text'
import type { DocumentBlock } from '@/engine/document_store/types'
import type { ValidationIssue } from '@/engine/validation/types'
import { Edit2, Check, X } from 'lucide-react'

interface EditableBlockProps {
  block: DocumentBlock
  documentId: string
  issues: ValidationIssue[]
  onUpdate?: (blockId: string, newText: string) => Promise<void>
  onIssueClick?: (issue: ValidationIssue) => void
}

export function EditableBlock({ 
  block, 
  documentId,
  issues, 
  onUpdate,
  onIssueClick 
}: EditableBlockProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(block.text)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (text === block.text) {
      setIsEditing(false)
      return
    }

    setSaving(true)
    try {
      await onUpdate?.(block.block_id, text)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save block:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setText(block.text)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    }
    if (e.key === 'Enter' && e.metaKey) {
      handleSave()
    }
  }

  // Check if this block has issues
  const blockIssues = issues.filter(issue =>
    issue.locations.some(loc => loc.block_id === block.block_id)
  )
  const hasIssues = blockIssues.length > 0
  const highestSeverity = hasIssues
    ? blockIssues.some(i => i.severity === 'error')
      ? 'error'
      : blockIssues.some(i => i.severity === 'warning')
      ? 'warning'
      : 'info'
    : null

  const borderClass = {
    error: 'border-l-4 border-red-500 bg-red-50',
    warning: 'border-l-4 border-yellow-500 bg-yellow-50',
    info: 'border-l-4 border-blue-500 bg-blue-50'
  }[highestSeverity || ''] || 'border-l-4 border-transparent'

  return (
    <div
      id={`block-${block.block_id}`}
      className={`group relative p-4 rounded-r-lg transition-all ${borderClass} hover:bg-gray-50`}
    >
      {/* Edit button */}
      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
          title="Edit block"
        >
          <Edit2 className="h-4 w-4 text-gray-600" />
        </button>
      )}

      {/* Content */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[100px] p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-sm"
            disabled={saving}
          />
          
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </button>
            <span className="text-xs text-gray-500 self-center ml-2">
              ⌘+Enter to save, Esc to cancel
            </span>
          </div>
        </div>
      ) : (
        <div className="text-sm leading-relaxed">
          <HighlightedText
            text={block.text}
            blockId={block.block_id}
            issues={issues}
            onIssueClick={onIssueClick}
          />
        </div>
      )}

      {/* Issue count badge */}
      {hasIssues && !isEditing && (
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            highestSeverity === 'error' 
              ? 'bg-red-100 text-red-800'
              : highestSeverity === 'warning'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {blockIssues.length} {blockIssues.length === 1 ? 'issue' : 'issues'}
          </span>
        </div>
      )}
    </div>
  )
}
