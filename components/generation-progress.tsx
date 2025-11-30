'use client'

import { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle, FileText, Brain, Database, Sparkles } from 'lucide-react'

interface GenerationProgressProps {
  isGenerating: boolean
  documentType: string
  onComplete?: () => void
}

// Clinical terms to cycle through during generation
const CLINICAL_TERMS = [
  'Study Design',
  'Objectives',
  'Endpoints',
  'Population',
  'Inclusion Criteria',
  'Exclusion Criteria',
  'Treatment Arms',
  'Visit Schedule',
  'Procedures',
  'Safety Assessments',
  'Efficacy Analysis',
  'Statistical Methods',
  'Adverse Events',
  'Concomitant Medications',
  'Data Collection',
]

export function GenerationProgress({ isGenerating, documentType, onComplete }: GenerationProgressProps) {
  const [progress, setProgress] = useState(0)
  const [currentTerm, setCurrentTerm] = useState(CLINICAL_TERMS[0])
  const [termIndex, setTermIndex] = useState(0)
  const [phase, setPhase] = useState<'preparing' | 'generating' | 'validating' | 'complete'>('preparing')

  useEffect(() => {
    if (!isGenerating) {
      setProgress(0)
      setTermIndex(0)
      setPhase('preparing')
      return
    }

    // Cycle through terms every 2 seconds
    const termInterval = setInterval(() => {
      setTermIndex(prev => {
        const next = (prev + 1) % CLINICAL_TERMS.length
        setCurrentTerm(CLINICAL_TERMS[next])
        return next
      })
    }, 2000)

    // Progress simulation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setPhase('complete')
          onComplete?.()
          return 100
        }
        
        // Update phase based on progress
        if (prev < 10) {
          setPhase('preparing')
        } else if (prev < 85) {
          setPhase('generating')
        } else {
          setPhase('validating')
        }
        
        // Slower progress as we get closer to 100
        const increment = prev < 50 ? 2 : prev < 80 ? 1 : 0.5
        return Math.min(prev + increment, 99)
      })
    }, 500)

    return () => {
      clearInterval(termInterval)
      clearInterval(progressInterval)
    }
  }, [isGenerating, onComplete])

  if (!isGenerating && progress === 0) return null

  const getPhaseIcon = () => {
    switch (phase) {
      case 'preparing':
        return <Database className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'generating':
        return <Brain className="h-5 w-5 text-emerald-500 animate-pulse" />
      case 'validating':
        return <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />
    }
  }

  const getPhaseText = () => {
    switch (phase) {
      case 'preparing':
        return 'Preparing data sources...'
      case 'generating':
        return `Generating: ${currentTerm}`
      case 'validating':
        return 'Validating content...'
      case 'complete':
        return 'Generation complete!'
    }
  }

  return (
    <Card className="border-emerald-200 bg-emerald-50/50">
      <CardContent className="py-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {phase !== 'complete' ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <span className="text-sm font-medium text-emerald-800">
                Generating {documentType}
              </span>
            </div>
            <span className="text-sm text-emerald-600 font-mono">
              {Math.round(progress)}%
            </span>
          </div>

          {/* Progress Bar */}
          <Progress 
            value={progress} 
            className="h-2 bg-emerald-100"
          />

          {/* Phase indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {getPhaseIcon()}
            <span className="animate-fade-in">{getPhaseText()}</span>
          </div>

          {/* Section indicators */}
          {phase === 'generating' && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {CLINICAL_TERMS.slice(0, termIndex + 1).map((term, i) => (
                <span
                  key={term}
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                    i === termIndex
                      ? 'bg-emerald-200 text-emerald-800'
                      : 'bg-emerald-100 text-emerald-600'
                  }`}
                >
                  {i < termIndex ? '✓' : ''} {term}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
