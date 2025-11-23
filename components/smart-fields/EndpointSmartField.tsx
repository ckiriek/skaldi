/**
 * Sprint 1, Task 2.1: EndpointSmartField Component
 * 
 * Smart field for clinical endpoints with type classification
 */

'use client'

import { useState } from 'react'
import { SmartField } from '@/components/knowledge-ui/SmartField'
import { Badge } from '@/components/ui/badge'
import type { RankedCandidate } from '@/lib/engine/knowledge-ui/ranking/ml_ranker'

export interface EndpointSmartFieldProps {
  projectId?: string
  indication?: string
  phase?: string
  value: string
  onChange: (value: string, metadata?: EndpointMetadata) => void
  label?: string
  placeholder?: string
  required?: boolean
}

export interface EndpointMetadata {
  type?: 'continuous' | 'binary' | 'time-to-event' | 'ordinal' | 'composite'
  timepoint?: string
  unit?: string
  confidence?: number
  sources?: string[]
}

export function EndpointSmartField({
  projectId,
  indication,
  phase,
  value,
  onChange,
  label = 'Clinical Endpoint',
  placeholder = 'e.g., Change from baseline in HbA1c at Week 24',
  required
}: EndpointSmartFieldProps) {
  const [metadata, setMetadata] = useState<EndpointMetadata | null>(null)

  const handleSuggestionSelect = (suggestion: RankedCandidate) => {
    // Extract endpoint metadata from suggestion
    const endpointMetadata: EndpointMetadata = {
      type: suggestion.metadata?.endpoint_type || 'continuous',
      timepoint: suggestion.metadata?.timepoint,
      unit: suggestion.metadata?.unit,
      confidence: suggestion.score,
      sources: suggestion.sources
    }

    setMetadata(endpointMetadata)
    onChange(suggestion.text, endpointMetadata)
  }

  return (
    <div className="space-y-2">
      <SmartField
        label={label}
        value={value}
        onChange={(val) => onChange(val)}
        type="endpoint"
        placeholder={placeholder}
        required={required}
        userContext={{
          projectId,
          indication,
          phase
        }}
        onSuggestionSelect={handleSuggestionSelect}
      />

      {/* Endpoint Metadata Display */}
      {metadata && value && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {metadata.type && (
            <Badge variant="secondary" className="capitalize">
              {metadata.type.replace(/-/g, ' ')}
            </Badge>
          )}
          
          {metadata.timepoint && (
            <Badge variant="outline">
              {metadata.timepoint}
            </Badge>
          )}
          
          {metadata.unit && (
            <Badge variant="outline">
              Unit: {metadata.unit}
            </Badge>
          )}
          
          {metadata.confidence && (
            <span className="text-muted-foreground">
              Confidence: {Math.round(metadata.confidence * 100)}%
            </span>
          )}
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        Start typing to see ML-ranked endpoint suggestions from clinical trials
      </p>
    </div>
  )
}
