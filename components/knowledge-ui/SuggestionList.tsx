/**
 * Phase H.UI v2: Suggestion List Component
 * 
 * Displays ranked suggestions with badges and sources
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CheckCircle2, TrendingUp } from 'lucide-react'
import { KGSourceBadge } from './KGSourceBadge'
import { getQualityLabel, getRecommendationBadge, type RankedCandidate } from '@/lib/engine/knowledge-ui/ranking/ml_ranker'

interface Props {
  suggestions: RankedCandidate[]
  onSelect: (suggestion: RankedCandidate) => void
  onClose: () => void
}

export function SuggestionList({ suggestions, onSelect, onClose }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Suggestions */}
      <Card className="absolute z-50 w-full mt-1 max-h-96 overflow-y-auto shadow-lg">
        <div className="p-2 space-y-1">
          {suggestions.map((suggestion) => {
            const recommendationBadge = getRecommendationBadge(suggestion)
            const qualityLabel = getQualityLabel(suggestion.score)
            
            return (
              <button
                key={suggestion.id}
                onClick={() => onSelect(suggestion)}
                className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-2">
                  {/* Main text */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {suggestion.text}
                      </div>
                    </div>
                    
                    {/* Score */}
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {Math.round(suggestion.score * 100)}%
                    </Badge>
                  </div>
                  
                  {/* Badges row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Recommendation badge */}
                    {recommendationBadge && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {recommendationBadge}
                      </Badge>
                    )}
                    
                    {/* Quality badge */}
                    {suggestion.score >= 0.7 && (
                      <Badge variant="outline" className="text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {qualityLabel}
                      </Badge>
                    )}
                    
                    {/* Source badges */}
                    {suggestion.sources && suggestion.sources.slice(0, 3).map((source, i) => (
                      <KGSourceBadge key={i} source={source} />
                    ))}
                    
                    {/* More sources indicator */}
                    {suggestion.sources && suggestion.sources.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{suggestion.sources.length - 3} more
                      </Badge>
                    )}
                  </div>
                  
                  {/* Metadata */}
                  {suggestion.metadata && (
                    <div className="text-xs text-muted-foreground">
                      {suggestion.metadata.icd10Code && (
                        <span>ICD-10: {suggestion.metadata.icd10Code}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </Card>
    </>
  )
}
