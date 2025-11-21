'use client'

/**
 * Highlighted Text Component
 * 
 * Renders text with inline validation highlights
 */

import { useState } from 'react'
import type { ValidationIssue } from '@/engine/validation/types'
import type { BlockLocation } from '@/engine/document_store/types'

interface HighlightedTextProps {
  text: string
  blockId: string
  issues: ValidationIssue[]
  onIssueClick?: (issue: ValidationIssue) => void
}

interface Highlight {
  start: number
  end: number
  severity: 'error' | 'warning' | 'info'
  issue: ValidationIssue
}

export function HighlightedText({ text, blockId, issues, onIssueClick }: HighlightedTextProps) {
  const [hoveredIssue, setHoveredIssue] = useState<string | null>(null)

  // Find highlights for this block
  const highlights: Highlight[] = []
  
  for (const issue of issues) {
    for (const location of issue.locations) {
      if (location.block_id === blockId) {
        highlights.push({
          start: location.start_offset || 0,
          end: location.end_offset || text.length,
          severity: issue.severity,
          issue
        })
      }
    }
  }

  // Sort highlights by start position
  highlights.sort((a, b) => a.start - b.start)

  // If no highlights, return plain text
  if (highlights.length === 0) {
    return <span className="text-gray-900">{text}</span>
  }

  // Build segments with highlights
  const segments: JSX.Element[] = []
  let currentPos = 0

  for (let i = 0; i < highlights.length; i++) {
    const highlight = highlights[i]

    // Add text before highlight
    if (currentPos < highlight.start) {
      segments.push(
        <span key={`text-${i}`} className="text-gray-900">
          {text.substring(currentPos, highlight.start)}
        </span>
      )
    }

    // Add highlighted text
    const highlightedText = text.substring(highlight.start, highlight.end)
    const severityClass = {
      error: 'bg-red-100 border-b-2 border-red-500 text-red-900',
      warning: 'bg-yellow-100 border-b-2 border-yellow-500 text-yellow-900',
      info: 'bg-blue-100 border-b-2 border-blue-500 text-blue-900'
    }[highlight.severity]

    segments.push(
      <span
        key={`highlight-${i}`}
        className={`${severityClass} cursor-pointer hover:opacity-80 transition-opacity relative`}
        onClick={() => onIssueClick?.(highlight.issue)}
        onMouseEnter={() => setHoveredIssue(highlight.issue.issue_id)}
        onMouseLeave={() => setHoveredIssue(null)}
      >
        {highlightedText}
        
        {/* Tooltip on hover */}
        {hoveredIssue === highlight.issue.issue_id && (
          <span className="absolute z-10 bottom-full left-0 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
            <div className="font-semibold mb-1">{highlight.issue.rule_id}</div>
            <div>{highlight.issue.message}</div>
          </span>
        )}
      </span>
    )

    currentPos = highlight.end
  }

  // Add remaining text
  if (currentPos < text.length) {
    segments.push(
      <span key="text-end" className="text-gray-900">
        {text.substring(currentPos)}
      </span>
    )
  }

  return <>{segments}</>
}
