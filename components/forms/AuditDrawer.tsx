'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Info,
  FileText
} from 'lucide-react'
import type { AuditWarning, AuditRationale } from '@/lib/study-design'

// ============================================================================
// TYPES
// ============================================================================

interface DecisionTraceEntry {
  step: string
  action?: string
  result: string
}

interface AuditDrawerProps {
  // Decision Summary
  pathway: string
  objective: string
  pattern: string | null
  patternTitle: string | null
  phaseLabel: string | null
  confidence: number
  
  // Rationale
  rationale: AuditRationale
  
  // Warnings
  warnings: AuditWarning[]
  isHumanDecisionRequired: boolean
  
  // Decision Trace
  decisionTrace: DecisionTraceEntry[]
  
  // Config info
  configHash: string
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SectionCard({ 
  title, 
  children, 
  className 
}: { 
  title: string
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        {title}
      </h4>
      {children}
    </div>
  )
}

function StatusBadge({ 
  severity 
}: { 
  severity: 'HARD' | 'SOFT' 
}) {
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-[10px] font-medium",
        severity === 'HARD' 
          ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30" 
          : "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30"
      )}
    >
      {severity}
    </Badge>
  )
}

function TraceStepIcon({ result }: { result: string }) {
  if (result.includes('HARD_STOP') || result.includes('blocked') || result.includes('HUMAN_DECISION_REQUIRED')) {
    return <AlertCircle className="h-3.5 w-3.5 text-red-500" />
  }
  if (result.includes('SOFT_WARNING') || result.includes('warning')) {
    return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
  }
  if (result.includes('Fallback') || result.includes('fallback')) {
    return <Info className="h-3.5 w-3.5 text-blue-500" />
  }
  return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AuditDrawer({
  pathway,
  objective,
  pattern,
  patternTitle,
  phaseLabel,
  confidence,
  rationale,
  warnings,
  isHumanDecisionRequired,
  decisionTrace,
  configHash
}: AuditDrawerProps) {
  const [isTraceExpanded, setIsTraceExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Format pathway/objective for display
  const pathwayLabels: Record<string, string> = {
    'innovator': 'Innovator (NCE/NBE)',
    'generic': 'Generic (ANDA)',
    'biosimilar': 'Biosimilar (351(k))',
    'hybrid': 'Hybrid (505(b)(2))',
    'post_marketing': 'Post-Marketing'
  }
  
  const objectiveLabels: Record<string, string> = {
    'pk_safety': 'PK + Safety',
    'dose_selection': 'Dose Selection',
    'confirmatory_efficacy': 'Confirmatory Efficacy',
    'pk_equivalence': 'PK Equivalence',
    'pk_similarity': 'PK Similarity',
    'clinical_equivalence': 'Clinical Equivalence',
    'long_term_safety': 'Long-term Safety',
    'effectiveness': 'Real-World Effectiveness'
  }
  
  // Copy audit summary
  const handleCopy = async () => {
    const summary = `
STUDY DESIGN AUDIT SUMMARY
==========================

DECISION SUMMARY
Pathway: ${pathwayLabels[pathway] || pathway}
Objective: ${objectiveLabels[objective] || objective}
Pattern: ${pattern || 'Not assigned'}${patternTitle ? ` (${patternTitle})` : ''}
Phase: ${phaseLabel || 'Not assigned'}
Confidence: ${confidence}%

REGULATORY RATIONALE
WHAT: ${rationale.what}
WHY: ${rationale.why}
REGULATORY: ${rationale.regulatory}
${rationale.assumptions.length > 0 ? `\nAssumptions:\n${rationale.assumptions.map(a => `- ${a}`).join('\n')}` : ''}
${rationale.notes.length > 0 ? `\nNotes:\n${rationale.notes.map(n => `- ${n}`).join('\n')}` : ''}
${rationale.fallbackNote ? `\nFallback: ${rationale.fallbackNote}` : ''}

WARNINGS
${warnings.length > 0 ? warnings.map(w => `[${w.severity}] ${w.message}`).join('\n') : 'None'}

CONFIG
Hash: ${configHash}
    `.trim()
    
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  // Sort warnings: HARD first
  const sortedWarnings = [...warnings].sort((a, b) => {
    if (a.severity === 'HARD' && b.severity !== 'HARD') return -1
    if (a.severity !== 'HARD' && b.severity === 'HARD') return 1
    return 0
  })
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Why this design?
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Design Audit Trail
          </SheetTitle>
        </SheetHeader>
        
        <div className="py-4 space-y-4">
          {/* Human Decision Required Banner */}
          {isHumanDecisionRequired && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-400">
                    Human Decision Required
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    This scenario is outside the current canonical pattern library. Please review manually before proceeding.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Section A: Decision Summary */}
          <SectionCard title="Decision Summary">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pathway</span>
                <span className="font-medium">{pathwayLabels[pathway] || pathway}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Objective</span>
                <span className="font-medium">{objectiveLabels[objective] || objective}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pattern</span>
                <span className={cn("font-medium", !pattern && "text-muted-foreground italic")}>
                  {pattern || 'Not assigned'}
                </span>
              </div>
              {patternTitle && pattern && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Design</span>
                  <span className="font-medium text-right max-w-[200px]">{patternTitle}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phase</span>
                <span className={cn("font-medium", !phaseLabel && "text-muted-foreground italic")}>
                  {phaseLabel || 'Not assigned'}
                </span>
              </div>
              {confidence > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confidence</span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      confidence >= 85 ? "border-green-500 text-green-600" : 
                      confidence >= 70 ? "border-yellow-500 text-yellow-600" :
                      "border-red-500 text-red-600"
                    )}
                  >
                    {confidence}%
                  </Badge>
                </div>
              )}
            </div>
          </SectionCard>
          
          {/* Section B: Regulatory Rationale */}
          <SectionCard title="Regulatory Rationale">
            <div className="space-y-3 text-sm">
              {rationale.what && (
                <div>
                  <p className="font-semibold text-foreground mb-1">WHAT</p>
                  <p className="text-muted-foreground">{rationale.what}</p>
                </div>
              )}
              {rationale.why && (
                <div>
                  <p className="font-semibold text-foreground mb-1">WHY</p>
                  <p className="text-muted-foreground">{rationale.why}</p>
                </div>
              )}
              {rationale.regulatory && (
                <div>
                  <p className="font-semibold text-foreground mb-1">REGULATORY ALIGNMENT</p>
                  <p className="text-muted-foreground">{rationale.regulatory}</p>
                </div>
              )}
              
              {rationale.assumptions.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="font-medium text-xs text-muted-foreground mb-1.5">Assumptions</p>
                  <ul className="space-y-1">
                    {rationale.assumptions.map((assumption, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-muted-foreground/50">•</span>
                        {assumption}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {rationale.notes.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="font-medium text-xs text-muted-foreground mb-1.5">Notes</p>
                  <ul className="space-y-1">
                    {rationale.notes.map((note, i) => (
                      <li key={i} className="text-xs text-blue-600 dark:text-blue-400 flex gap-1.5">
                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {rationale.fallbackNote && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground italic">
                    {rationale.fallbackNote}
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
          
          {/* Section C: Warnings & Constraints */}
          <SectionCard title="Warnings & Constraints">
            {sortedWarnings.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                No warnings or constraints
              </p>
            ) : (
              <div className="space-y-2">
                {sortedWarnings.map((warning, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "p-2.5 rounded-md text-sm",
                      warning.severity === 'HARD' 
                        ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800" 
                        : "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <StatusBadge severity={warning.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground">{warning.message}</p>
                        {warning.implication && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Implication: {warning.implication}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
          
          {/* Section D: Decision Trace */}
          <SectionCard title="Decision Trace">
            <button
              type="button"
              onClick={() => setIsTraceExpanded(!isTraceExpanded)}
              className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>
                {isTraceExpanded ? 'Hide' : 'Show'} decision trace ({decisionTrace.length} steps)
              </span>
              {isTraceExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {isTraceExpanded && (
              <div className="mt-3 space-y-1.5">
                {decisionTrace.map((entry, i) => (
                  <div 
                    key={i} 
                    className="flex items-start gap-2 text-xs py-1.5 border-b border-border/50 last:border-0"
                  >
                    <TraceStepIcon result={entry.result} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground">{entry.step}</span>
                      <span className="text-muted-foreground"> — {entry.result}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
          
          {/* Footer: Config Hash + Copy */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Config hash: <code className="font-mono">{configHash}</code>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy summary
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
