/**
 * Sprint 1, Task 3.2: SuggestionsList Component
 * 
 * List container for multiple suggestion items
 */

'use client'

import { Card } from '@/components/ui/card'
import { SuggestionItem } from './SuggestionItem'
import type { RankedCandidate } from '@/lib/engine/knowledge-ui/ranking/ml_ranker'

interface SuggestionsListProps {
  suggestions: RankedCandidate[]
  onSelect: (suggestion: RankedCandidate) => void
  onClose?: () => void
  maxItems?: number
  showBackdrop?: boolean
}

export function SuggestionsList({ 
  suggestions, 
  onSelect, 
  onClose,
  maxItems = 10,
  showBackdrop = true
}: SuggestionsListProps) {
  const displayedSuggestions = suggestions.slice(0, maxItems)

  const getQuality = (score: number): 'excellent' | 'good' | 'fair' | undefined => {
    if (score >= 0.85) return 'excellent'
    if (score >= 0.70) return 'good'
    if (score >= 0.50) return 'fair'
    return undefined
  }

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && onClose && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={onClose}
        />
      )}
      
      {/* Suggestions */}
      <Card className={`${showBackdrop ? 'absolute z-50' : ''} w-full mt-1 max-h-96 overflow-y-auto shadow-lg`}>
        <div className="p-2 space-y-1">
          {displayedSuggestions.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No suggestions found
            </div>
          ) : (
            displayedSuggestions.map((suggestion) => (
              <SuggestionItem
                key={suggestion.id}
                text={suggestion.text}
                score={suggestion.score}
                sources={suggestion.sources}
                metadata={suggestion.metadata}
                recommended={suggestion.rank === 1}
                quality={getQuality(suggestion.score)}
                onClick={() => onSelect(suggestion)}
              />
            ))
          )}
        </div>
      </Card>
    </>
  )
}
