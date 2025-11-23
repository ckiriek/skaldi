/**
 * Phase H.UI v3: Protocol Editor
 * 
 * Interactive protocol editor with AI suggestions
 */

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react'
import { PROTOCOL_SECTIONS, type ProtocolSectionId } from '@/lib/engine/protocol-ui/section_schema'
import type { SectionSuggestion } from '@/lib/engine/protocol-ui/suggestion_engine'
import type { RegHint } from '@/lib/engine/protocol-ui/reg_hint_engine'

interface Props {
  projectId: string
  initialSections?: Record<ProtocolSectionId, string>
  onSave?: (sections: Record<ProtocolSectionId, string>) => void
}

export function ProtocolEditor({ projectId, initialSections, onSave }: Props) {
  const [currentSection, setCurrentSection] = useState<ProtocolSectionId>('synopsis')
  const [sectionTexts, setSectionTexts] = useState<Record<ProtocolSectionId, string>>(
    initialSections || {} as any
  )
  const [suggestions, setSuggestions] = useState<SectionSuggestion[]>([])
  const [regHints, setRegHints] = useState<RegHint[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch suggestions when section changes
  useEffect(() => {
    fetchSuggestions()
  }, [currentSection])

  const fetchSuggestions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/protocol/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sectionId: currentSection,
          currentText: sectionTexts[currentSection] || ''
        })
      })

      const result = await response.json()
      if (result.success) {
        setSuggestions(result.data.suggestions || [])
        setRegHints(result.data.regHints || [])
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTextChange = (text: string) => {
    setSectionTexts(prev => ({
      ...prev,
      [currentSection]: text
    }))
  }

  const applySuggestion = (suggestion: SectionSuggestion) => {
    const currentText = sectionTexts[currentSection] || ''
    const newText = currentText + '\n\n' + suggestion.fullText
    handleTextChange(newText)
  }

  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Section List */}
      <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4">Protocol Sections</h3>
        <div className="space-y-1">
          {PROTOCOL_SECTIONS.map(section => {
            const hasContent = sectionTexts[section.id]?.length > 0
            const isActive = currentSection === section.id
            
            return (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{section.title}</span>
                  {hasContent && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Center - Editor */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4">
          <h2 className="text-xl font-semibold">
            {PROTOCOL_SECTIONS.find(s => s.id === currentSection)?.title}
          </h2>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <Textarea
            value={sectionTexts[currentSection] || ''}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Start typing... AI suggestions will appear"
            className="min-h-[500px] font-mono text-sm"
          />
        </div>
      </div>

      {/* Right Sidebar - Suggestions & Hints */}
      <div className="w-80 border-l bg-muted/30 p-4 overflow-y-auto">
        {/* Suggestions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Suggestions
            </h3>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          
          <div className="space-y-2">
            {suggestions.map(suggestion => (
              <Card key={suggestion.id} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium">{suggestion.title}</div>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(suggestion.confidence * 100)}%
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {suggestion.preview}
                  </p>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applySuggestion(suggestion)}
                    className="w-full"
                  >
                    Apply
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Regulatory Hints */}
        {regHints.length > 0 && (
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4" />
              Regulatory Hints
            </h3>
            
            <div className="space-y-2">
              {regHints.map(hint => (
                <Card 
                  key={hint.id} 
                  className={`p-3 ${
                    hint.severity === 'critical' 
                      ? 'border-red-500' 
                      : hint.severity === 'warning'
                      ? 'border-yellow-500'
                      : 'border-blue-500'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-xs font-medium">{hint.message}</div>
                    {hint.suggestion && (
                      <div className="text-xs text-muted-foreground">
                        💡 {hint.suggestion}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
