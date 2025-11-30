/**
 * Field Autocomplete Component
 * 
 * Specialized autocomplete for form fields with external API integration
 * Triggers search after 3 characters are entered
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'

interface FieldAutocompleteProps {
  value: string
  onChange: (value: string) => void
  endpoint: string // e.g., '/api/v1/autocomplete/compounds'
  placeholder?: string
  required?: boolean
  minChars?: number
  renderSuggestion?: (item: any) => React.ReactNode
  onSelect?: (item: any) => void
  className?: string
}

export function FieldAutocomplete({
  value,
  onChange,
  endpoint,
  placeholder,
  required = false,
  minChars = 3,
  renderSuggestion,
  onSelect,
  className = ''
}: FieldAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const justSelectedRef = useRef(false) // Flag to skip search after selection

  // Debounced search
  const debouncedSearch = useDebouncedCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < minChars) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    setLoading(true)
    // Check if endpoint already has query params
    const separator = endpoint.includes('?') ? '&' : '?'
    const url = `${endpoint}${separator}q=${encodeURIComponent(searchQuery)}&limit=10`
    console.log('🔍 Autocomplete search:', { endpoint, query: searchQuery, url })
    
    try {
      const response = await fetch(url)
      console.log('📡 Response status:', response.status, response.statusText)
      
      const data = await response.json()
      console.log('📦 Response data:', data)

      if (data.success && data.data) {
        console.log('✅ Found suggestions:', data.data.length, data.data)
        setSuggestions(data.data)
        setIsOpen(data.data.length > 0)
      } else {
        console.warn('⚠️ No data or not successful:', data)
        setSuggestions([])
        setIsOpen(false)
      }
    } catch (error) {
      console.error('❌ Autocomplete search failed:', error)
      setSuggestions([])
      setIsOpen(false)
    } finally {
      setLoading(false)
    }
  }, 300)

  useEffect(() => {
    // Skip search if we just selected an item
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }
    debouncedSearch(value)
  }, [value, debouncedSearch])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleSelect = (item: any) => {
    // Extract the primary value from the item
    let selectedValue = ''
    if (item.name) selectedValue = item.name
    else if (item.brand_name) selectedValue = item.brand_name
    else if (item.indication) selectedValue = item.indication
    else if (item.country) selectedValue = item.country
    else if (item.application_number) selectedValue = item.application_number

    // Set flag to skip next search triggered by onChange
    justSelectedRef.current = true
    
    // Close dropdown and clear suggestions
    setIsOpen(false)
    setSelectedIndex(-1)
    setSuggestions([])
    
    // Update value (this will trigger useEffect but justSelectedRef will skip search)
    onChange(selectedValue)
    onSelect?.(item)
  }

  const defaultRenderSuggestion = (item: any) => {
    // Compounds
    if (item.name && item.source) {
      return (
        <div>
          <div className="font-semibold text-sm text-gray-900">{item.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {item.molecular_formula && `${item.molecular_formula} • `}
            <span className="capitalize">{item.source}</span>
          </div>
        </div>
      )
    }

    // RLD
    if (item.brand_name && item.application_number) {
      return (
        <div>
          <div className="font-semibold text-sm text-gray-900">{item.brand_name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {item.application_number} • {item.generic_name || 'RLD'}
            {item.te_code && ` • TE: ${item.te_code}`}
          </div>
        </div>
      )
    }

    // Indications
    if (item.indication) {
      return (
        <div>
          <div className="text-sm text-gray-900">{item.indication}</div>
          {item.count && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {item.count} project{item.count > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )
    }

    // Countries
    if (item.country) {
      return <div className="text-sm text-gray-900">{item.country}</div>
    }

    // Drug Class / Active Ingredient
    if (item.type && (item.type === 'active_ingredient' || item.type === 'drug_class')) {
      return (
        <div>
          <div className="font-semibold text-sm text-gray-900">{item.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5 capitalize">
            {item.type.replace('_', ' ')}
          </div>
        </div>
      )
    }

    // Fallback - show name if exists
    if (item.name) {
      return (
        <div>
          <div className="font-semibold text-sm text-gray-900">{item.name}</div>
          {item.source && (
            <div className="text-xs text-muted-foreground mt-0.5 capitalize">
              {item.source}
            </div>
          )}
        </div>
      )
    }

    // Last resort fallback
    return <div className="text-sm text-gray-500">No preview available</div>
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {suggestions.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`
                w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors border-b last:border-b-0 cursor-pointer
                ${selectedIndex === index ? 'bg-primary/10' : ''}
              `}
            >
              {renderSuggestion ? renderSuggestion(item) : defaultRenderSuggestion(item)}
            </button>
          ))}
        </div>
      )}

      {/* Hint */}
      {value.length > 0 && value.length < minChars && (
        <div className="text-xs text-gray-500 mt-1">
          Type at least {minChars} characters to search
        </div>
      )}
    </div>
  )
}
