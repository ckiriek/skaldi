/**
 * Phase H.1: Formulation Debug Panel
 * 
 * DEV-only component for debugging formulation parsing
 */

'use client'

import { useState, useEffect } from 'react'
import type { ParsedFormulation } from '@/lib/engine/formulation/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'

interface FormulationDebugPanelProps {
  parsed: ParsedFormulation | null
  className?: string
}

export function FormulationDebugPanel({ parsed, className }: FormulationDebugPanelProps) {
  // Only show in DEV mode
  const isDev = process.env.NEXT_PUBLIC_DEV_TOOLS === 'true' || process.env.NODE_ENV === 'development'
  
  if (!isDev || !parsed) return null
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">🔬 Formulation Debug Panel</CardTitle>
        <CardDescription className="text-xs">
          DEV MODE ONLY - Parsed formulation data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Raw Input */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Raw Input</div>
          <div className="text-sm font-mono bg-muted p-2 rounded">
            {parsed.rawInput}
          </div>
        </div>
        
        {/* Parsed Fields */}
        <div className="grid grid-cols-2 gap-3">
          <FieldDisplay
            label="API Name"
            value={parsed.apiName}
            confidence={parsed.confidence.apiName}
          />
          
          <FieldDisplay
            label="Dosage Form"
            value={parsed.dosageForm}
            confidence={parsed.confidence.dosageForm}
          />
          
          <FieldDisplay
            label="Route"
            value={parsed.route}
            confidence={parsed.confidence.route}
          />
          
          <FieldDisplay
            label="Strength"
            value={parsed.strength?.normalized}
            confidence={parsed.confidence.strength}
          />
        </div>
        
        {/* Additional Properties */}
        {parsed.additionalProperties.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Additional Properties
            </div>
            <div className="flex flex-wrap gap-1">
              {parsed.additionalProperties.map((prop, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {prop}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Confidence Scores */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Confidence Scores
          </div>
          <div className="space-y-1">
            <ConfidenceBar label="API Name" value={parsed.confidence.apiName} />
            <ConfidenceBar label="Dosage Form" value={parsed.confidence.dosageForm} />
            <ConfidenceBar label="Route" value={parsed.confidence.route} />
            <ConfidenceBar label="Strength" value={parsed.confidence.strength} />
            <ConfidenceBar 
              label="Overall" 
              value={parsed.confidence.overall} 
              highlight 
            />
          </div>
        </div>
        
        {/* Warnings */}
        {parsed.warnings.length > 0 && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <div className="font-medium mb-1">Warnings:</div>
              <ul className="list-disc list-inside space-y-0.5">
                {parsed.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* JSON View */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            View JSON
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded overflow-auto text-[10px]">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  )
}

/**
 * Field display with confidence indicator
 */
function FieldDisplay({ 
  label, 
  value, 
  confidence 
}: { 
  label: string
  value?: string | null
  confidence: number 
}) {
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'text-green-600'
    if (conf >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  const getConfidenceIcon = (conf: number) => {
    if (conf >= 0.9) return <CheckCircle2 className="h-3 w-3" />
    if (conf >= 0.7) return <Info className="h-3 w-3" />
    return <AlertCircle className="h-3 w-3" />
  }
  
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`${getConfidenceColor(confidence)}`}>
          {getConfidenceIcon(confidence)}
        </span>
      </div>
      <div className="text-sm font-mono bg-muted p-1.5 rounded min-h-[28px]">
        {value || <span className="text-muted-foreground italic">not detected</span>}
      </div>
    </div>
  )
}

/**
 * Confidence bar visualization
 */
function ConfidenceBar({ 
  label, 
  value, 
  highlight 
}: { 
  label: string
  value: number
  highlight?: boolean 
}) {
  const getColor = (val: number) => {
    if (val >= 0.9) return 'bg-green-500'
    if (val >= 0.7) return 'bg-yellow-500'
    return 'bg-red-500'
  }
  
  const percentage = Math.round(value * 100)
  
  return (
    <div className={highlight ? 'border-l-2 border-primary pl-2' : ''}>
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className={highlight ? 'font-medium' : 'text-muted-foreground'}>
          {label}
        </span>
        <span className={`font-mono ${highlight ? 'font-medium' : ''}`}>
          {percentage}%
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(value)} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
