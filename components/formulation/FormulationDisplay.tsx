/**
 * Phase H.1: Formulation Display
 * 
 * User-friendly display of parsed formulation
 */

'use client'

import type { ParsedFormulation } from '@/lib/engine/formulation/types'
import { Badge } from '@/components/ui/badge'
import { Pill, Route, Gauge, AlertTriangle } from 'lucide-react'

interface FormulationDisplayProps {
  parsed: ParsedFormulation | null
  className?: string
  compact?: boolean
}

export function FormulationDisplay({ parsed, className, compact = false }: FormulationDisplayProps) {
  if (!parsed) return null
  
  if (compact) {
    return (
      <div className={`flex flex-wrap gap-1.5 ${className}`}>
        {parsed.apiName && (
          <Badge variant="default" className="text-xs">
            <Pill className="h-3 w-3 mr-1" />
            {parsed.apiName}
          </Badge>
        )}
        
        {parsed.strength && (
          <Badge variant="secondary" className="text-xs">
            <Gauge className="h-3 w-3 mr-1" />
            {parsed.strength.normalized}
          </Badge>
        )}
        
        {parsed.dosageForm && (
          <Badge variant="outline" className="text-xs">
            {parsed.dosageForm}
          </Badge>
        )}
        
        {parsed.route && parsed.route !== 'oral' && (
          <Badge variant="outline" className="text-xs">
            <Route className="h-3 w-3 mr-1" />
            {parsed.route}
          </Badge>
        )}
        
        {parsed.warnings.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {parsed.warnings.length} warnings
          </Badge>
        )}
      </div>
    )
  }
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {parsed.apiName && (
          <div>
            <div className="text-xs text-muted-foreground">API Name</div>
            <div className="font-medium">{parsed.apiName}</div>
          </div>
        )}
        
        {parsed.dosageForm && (
          <div>
            <div className="text-xs text-muted-foreground">Dosage Form</div>
            <div className="font-medium">{parsed.dosageForm}</div>
          </div>
        )}
        
        {parsed.route && (
          <div>
            <div className="text-xs text-muted-foreground">Route</div>
            <div className="font-medium capitalize">{parsed.route}</div>
          </div>
        )}
        
        {parsed.strength && (
          <div>
            <div className="text-xs text-muted-foreground">Strength</div>
            <div className="font-medium">{parsed.strength.normalized}</div>
          </div>
        )}
      </div>
      
      {parsed.additionalProperties.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Properties</div>
          <div className="flex flex-wrap gap-1">
            {parsed.additionalProperties.map((prop, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {prop}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {parsed.warnings.length > 0 && (
        <div className="text-xs text-destructive flex items-start gap-1">
          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{parsed.warnings.join(', ')}</span>
        </div>
      )}
    </div>
  )
}
