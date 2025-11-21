'use client'

/**
 * Suggestions Panel Component
 * 
 * Shows AI-generated fix suggestions for validation issues
 */

import { useState } from 'react'
import { Lightbulb, Check, X, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import type { ValidationSuggestion } from '@/engine/validation/types'

interface SuggestionsPanelProps {
  issueId: string
  suggestions: ValidationSuggestion[]
  onApply?: (suggestionId: string) => Promise<void>
  onReject?: (suggestionId: string) => void
}

export function SuggestionsPanel({ 
  issueId, 
  suggestions, 
  onApply,
  onReject 
}: SuggestionsPanelProps) {
  const [applying, setApplying] = useState<string | null>(null)
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)

  if (suggestions.length === 0) {
    return null
  }

  const handleApply = async (suggestionId: string) => {
    setApplying(suggestionId)
    try {
      await onApply?.(suggestionId)
    } catch (error) {
      console.error('Failed to apply suggestion:', error)
    } finally {
      setApplying(null)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <span>AI Suggestions ({suggestions.length})</span>
      </div>

      {suggestions.map((suggestion) => {
        const isExpanded = expandedSuggestion === suggestion.suggestion_id
        const isApplying = applying === suggestion.suggestion_id

        return (
          <div
            key={suggestion.suggestion_id}
            className="border border-gray-200 rounded-lg bg-white"
          >
            {/* Header */}
            <button
              onClick={() => setExpandedSuggestion(
                isExpanded ? null : suggestion.suggestion_id
              )}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-900">
                  {suggestion.description}
                </span>
                <span className="text-xs text-gray-500">
                  {Math.round(suggestion.confidence * 100)}% confidence
                </span>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {/* Details */}
            {isExpanded && (
              <div className="px-3 pb-3 space-y-3 border-t border-gray-200">
                {/* Diff View */}
                <div className="space-y-2">
                  {/* Original */}
                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-1">
                      Original:
                    </div>
                    <div className="text-sm bg-red-50 border border-red-200 rounded p-2 text-gray-900">
                      <pre className="whitespace-pre-wrap font-sans">
                        {suggestion.original_text}
                      </pre>
                    </div>
                  </div>

                  {/* Suggested */}
                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-1">
                      Suggested:
                    </div>
                    <div className="text-sm bg-green-50 border border-green-200 rounded p-2 text-gray-900">
                      <pre className="whitespace-pre-wrap font-sans">
                        {suggestion.suggested_text}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApply(suggestion.suggestion_id)}
                    disabled={isApplying}
                    className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Apply Fix
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onReject?.(suggestion.suggestion_id)}
                    disabled={isApplying}
                    className="inline-flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </button>

                  {!suggestion.auto_applicable && (
                    <span className="text-xs text-yellow-600 self-center ml-2">
                      ⚠️ Manual review recommended
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
