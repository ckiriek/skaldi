/**
 * Autocomplete Component
 * 
 * Search with autocomplete for compounds, indications, projects, etc.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useDebouncedCallback } from 'use-debounce'

interface AutocompleteProps {
  type?: 'compound' | 'indication' | 'project' | 'document' | 'evidence' | 'all'
  placeholder?: string
  onSelect?: (item: any) => void
  className?: string
}

export function Autocomplete({ 
  type = 'all', 
  placeholder = 'Search...', 
  onSelect,
  className = ''
}: AutocompleteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>({})
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Debounced search
  const debouncedSearch = useDebouncedCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({})
      setIsOpen(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=${type}&limit=10`
      )
      const data = await response.json()

      if (data.success) {
        setResults(data.data)
        setIsOpen(true)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }, 300)

  useEffect(() => {
    debouncedSearch(query)
  }, [query])

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
    const allResults = getAllResults()
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelect(allResults[selectedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const getAllResults = () => {
    const all: any[] = []
    if (results.compounds) all.push(...results.compounds.map((c: any) => ({ type: 'compound', data: c })))
    if (results.indications) all.push(...results.indications.map((i: string) => ({ type: 'indication', data: i })))
    if (results.projects) all.push(...results.projects.map((p: any) => ({ type: 'project', data: p })))
    if (results.documents) all.push(...results.documents.map((d: any) => ({ type: 'document', data: d })))
    if (results.evidence) all.push(...results.evidence.map((e: any) => ({ type: 'evidence', data: e })))
    return all
  }

  const handleSelect = (item: any) => {
    onSelect?.(item)
    setQuery('')
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  const totalResults = Object.values(results).reduce(
    (sum: number, arr: any) => sum + (arr?.length || 0), 
    0
  )

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute left-3 top-2.5">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && totalResults > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Compounds */}
          {results.compounds && results.compounds.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">Compounds</div>
              {results.compounds.map((compound: any, index: number) => (
                <button
                  key={compound.inchikey}
                  onClick={() => handleSelect({ type: 'compound', data: compound })}
                  className={`
                    w-full text-left px-3 py-2 rounded hover:bg-blue-50 transition-colors
                    ${selectedIndex === index ? 'bg-blue-50' : ''}
                  `}
                >
                  <div className="font-medium text-sm">{compound.name}</div>
                  <div className="text-xs text-gray-500">{compound.molecular_formula}</div>
                </button>
              ))}
            </div>
          )}

          {/* Indications */}
          {results.indications && results.indications.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">Indications</div>
              {results.indications.map((indication: string, index: number) => (
                <button
                  key={indication}
                  onClick={() => handleSelect({ type: 'indication', data: indication })}
                  className={`
                    w-full text-left px-3 py-2 rounded hover:bg-blue-50 transition-colors
                    ${selectedIndex === (results.compounds?.length || 0) + index ? 'bg-blue-50' : ''}
                  `}
                >
                  <div className="text-sm">{indication}</div>
                </button>
              ))}
            </div>
          )}

          {/* Projects */}
          {results.projects && results.projects.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">Projects</div>
              {results.projects.map((project: any) => (
                <button
                  key={project.id}
                  onClick={() => handleSelect({ type: 'project', data: project })}
                  className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-sm">{project.title}</div>
                  <div className="text-xs text-gray-500">
                    {project.phase} • {project.indication}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Evidence */}
          {results.evidence && results.evidence.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">Evidence</div>
              {results.evidence.map((evidence: any) => (
                <button
                  key={evidence.ev_id}
                  onClick={() => handleSelect({ type: 'evidence', data: evidence })}
                  className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-blue-600">{evidence.ev_id}</span>
                    <span className="text-xs text-gray-500">{evidence.source_type}</span>
                  </div>
                  <div className="text-sm">{evidence.title}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {isOpen && query && !loading && totalResults === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
          No results found for "{query}"
        </div>
      )}
    </div>
  )
}
