/**
 * Phase H.UI v2: Smart Field Component
 * 
 * Intelligent field with ML-ranked suggestions
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { SuggestionList } from './SuggestionList'
import type { RankedCandidate } from '@/lib/engine/knowledge-ui/ranking/ml_ranker'

export interface SmartFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  type: 'indication' | 'endpoint' | 'formulation' | 'procedure' | 'safety'
  placeholder?: string
  required?: boolean
  autoFetch?: boolean
  userContext?: any
  onSuggestionSelect?: (suggestion: RankedCandidate) => void
}

export function SmartField({
  label,
  value,
  onChange,
  type,
  placeholder,
  required,
  autoFetch = true,
  userContext,
  onSuggestionSelect
}: SmartFieldProps) {
  const [suggestions, setSuggestions] = useState<RankedCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout>()

  // Fetch suggestions
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([])
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/knowledge/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          type,
          userContext
        })
      })

      const result = await response.json()

      if (result.success && result.data) {
        setSuggestions(result.data.ranked || [])
        setShowSuggestions(true)
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  // Debounced fetch
  useEffect(() => {
    if (!autoFetch) return

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 500)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [value, autoFetch])

  // Handle suggestion select
  const handleSelect = (suggestion: RankedCandidate) => {
    onChange(suggestion.text)
    setShowSuggestions(false)
    onSuggestionSelect?.(suggestion)

    // Record feedback
    fetch('/api/knowledge/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field: type,
        candidateId: suggestion.id,
        candidateText: suggestion.text,
        signal: 'accept',
        rank: suggestion.rank,
        score: suggestion.score
      })
    }).catch(console.error)
  }

  return (
    <div className="space-y-2 relative">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        />
        
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <SuggestionList
          suggestions={suggestions}
          onSelect={handleSelect}
          onClose={() => setShowSuggestions(false)}
        />
      )}
    </div>
  )
}
