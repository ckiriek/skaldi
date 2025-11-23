/**
 * Sprint 1, Task 3.2: SuggestionItem Component
 * 
 * Reusable suggestion item with metadata display
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, TrendingUp } from 'lucide-react'
import { KGSourceBadge } from '@/components/knowledge-ui/KGSourceBadge'

export interface SuggestionItemProps {
  text: string
  score: number
  sources?: string[]
  metadata?: Record<string, any>
  recommended?: boolean
  quality?: 'excellent' | 'good' | 'fair'
  onClick?: () => void
  className?: string
}

export function SuggestionItem({
  text,
  score,
  sources = [],
  metadata,
  recommended,
  quality,
  onClick,
  className = ''
}: SuggestionItemProps) {
  const qualityLabels = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair'
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors ${className}`}
    >
      <div className="space-y-2">
        {/* Main text */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">
              {text}
            </div>
          </div>
          
          {/* Score */}
          <Badge variant="secondary" className="text-xs shrink-0">
            {Math.round(score * 100)}%
          </Badge>
        </div>
        
        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Recommendation badge */}
          {recommended && (
            <Badge variant="default" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Recommended
            </Badge>
          )}
          
          {/* Quality badge */}
          {quality && (
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              {qualityLabels[quality]}
            </Badge>
          )}
          
          {/* Source badges */}
          {sources.slice(0, 3).map((source, i) => (
            <KGSourceBadge key={i} source={source} />
          ))}
          
          {/* More sources indicator */}
          {sources.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{sources.length - 3} more
            </Badge>
          )}
        </div>
        
        {/* Metadata */}
        {metadata && Object.keys(metadata).length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            {metadata.icd10Code && (
              <div>ICD-10: {metadata.icd10Code}</div>
            )}
            {metadata.endpoint_type && (
              <div className="capitalize">Type: {metadata.endpoint_type.replace(/-/g, ' ')}</div>
            )}
            {metadata.timepoint && (
              <div>Timepoint: {metadata.timepoint}</div>
            )}
            {metadata.unit && (
              <div>Unit: {metadata.unit}</div>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
