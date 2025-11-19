'use client'

import { useState, useEffect } from 'react'
import { Check, Lock, Play, FileText, Book, FileSignature, Activity, Database, Loader2, Eye, RefreshCw, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Progress } from '@/components/ui/progress'

type DocType = 'IB' | 'Synopsis' | 'Protocol' | 'ICF' | 'SAP' | 'CRF'

const STEPS: { type: DocType; label: string; icon: any; description: string }[] = [
  { type: 'IB', label: "Investigator's Brochure", icon: Book, description: "Comprehensive summary of clinical and nonclinical data" },
  { type: 'Synopsis', label: "Protocol Synopsis", icon: FileText, description: "High-level overview of study design and objectives" },
  { type: 'Protocol', label: "Clinical Protocol", icon: Activity, description: "Detailed study plan, methodology, and regulations" },
  { type: 'ICF', label: "Informed Consent", icon: FileSignature, description: "Participant information and consent forms" },
  { type: 'SAP', label: "Statistical Analysis Plan", icon: Database, description: "Detailed description of statistical methods" },
  { type: 'CRF', label: "Case Report Form", icon: FileText, description: "Data collection tool for clinical data" },
]

const GENERATION_PHRASES: Record<DocType, string[]> = {
  IB: [
    "analyzing nonclinical pharmacology", "mapping mechanism of action", "summarizing toxicology findings", "reviewing preclinical safety signals",
    "cross-checking PK/PD data", "integrating clinical experience", "harmonizing dosing information", "updating investigational product profile",
    "validating pharmacokinetic consistency", "linking nonclinical data to human use", "assembling benefit–risk narrative",
    "aligning content with ICH E6(R3)", "structuring section-by-section details", "aggregating safety and tolerability data", "building comprehensive investigator guidance"
  ],
  Synopsis: [
    "defining primary and secondary endpoints", "mapping study objectives", "synthesizing trial overview", "validating inclusion criteria",
    "designing high-level study flow", "reviewing visit schedule essentials", "summarizing study rationale", "aligning with protocol framework",
    "checking feasibility assumptions", "outlining target population", "refining endpoint hierarchy", "confirming control arm logic",
    "assembling summary of assessments", "harmonizing scientific rationale", "finalizing core study snapshot"
  ],
  Protocol: [
    "building full study schema", "mapping visit-by-visit schedule", "defining randomization strategy", "aligning procedures with endpoints",
    "cross-checking safety assessments", "validating inclusion/exclusion criteria", "structuring investigational flow", "integrating IMP handling guidelines",
    "mapping adverse event reporting rules", "checking protocol deviations logic", "constructing study conduct section", "finalizing methodology framework",
    "harmonizing timelines and procedures", "reviewing investigational pathways", "locking complete protocol structure"
  ],
  ICF: [
    "translating protocol into lay language", "summarizing participant responsibilities", "simplifying study procedures", "clarifying potential risks",
    "explaining foreseeable benefits", "building participant-friendly narrative", "reviewing safety disclosures", "aligning with ethical guidelines",
    "integrating data privacy statements", "ensuring readability and clarity", "mapping compensation and reimbursement", "defining withdrawal rights",
    "harmonizing with IRB/EC expectations", "verifying required consent elements", "finalizing participant explanation sheet"
  ],
  SAP: [
    "defining analysis populations", "mapping statistical methods", "structuring endpoint analyses", "validating sample size assumptions",
    "developing randomization framework", "confirming model selection criteria", "mapping missing data strategies", "specifying interim analysis rules",
    "checking multiplicity adjustments", "harmonizing statistical terminology", "setting data handling conventions", "reviewing precision requirements",
    "building analysis tables and shells", "evaluating sensitivity analyses", "finalizing complete SAP framework"
  ],
  CRF: [
    "mapping data collection fields", "aligning with protocol schedule", "structuring visit modules", "validating data types",
    "configuring skip logic", "defining mandatory fields", "harmonizing coding dictionaries", "optimizing data entry flow",
    "verifying audit trail requirements", "linking query management rules", "finalizing eCRF layout", "checking validation constraints",
    "reviewing annotation specifications", "integrating safety reporting forms", "locking final case report form"
  ]
}

interface GenerationPipelineProps {
  projectId: string
  documents: any[]
}

export function GenerationPipeline({ projectId, documents }: GenerationPipelineProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loadingType, setLoadingType] = useState<DocType | null>(null)
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0)
  const [animatingSuccess, setAnimatingSuccess] = useState<DocType | null>(null)

  // Calculate status for each step
  const stepStatus = STEPS.map((step, index) => {
    const doc = documents.find(d => d.type === step.type)
    const isCompleted = !!doc
    
    // Determine if ready/locked
    // First step (IB) is always ready if not completed
    // Subsequent steps need previous step completed
    const prevStep = index > 0 ? STEPS[index - 1] : null
    const prevDoc = prevStep ? documents.find(d => d.type === prevStep.type) : null
    const isReady = !isCompleted && (index === 0 || !!prevDoc)
    const isLocked = !isCompleted && !isReady

    return { ...step, isCompleted, isReady, isLocked, docId: doc?.id }
  })

  const progress = Math.round((documents.length / STEPS.length) * 100)

  // Animation loop for phrases
  useEffect(() => {
    if (!loadingType) {
      setLoadingPhraseIndex(0)
      return
    }
    
    const interval = setInterval(() => {
      setLoadingPhraseIndex(prev => (prev + 1) % GENERATION_PHRASES[loadingType].length)
    }, 2000)
    
    return () => clearInterval(interval)
  }, [loadingType])

  const handleGenerate = async (type: DocType) => {
    setLoadingType(type)
    setLoadingPhraseIndex(0)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, documentType: type }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Generation failed')
      }

      // Success animation
      setAnimatingSuccess(type)
      setTimeout(() => setAnimatingSuccess(null), 2000)
      
      toast({
        title: "Document Generated",
        description: `${type} has been successfully created.`,
        variant: "success",
      })
      
      router.refresh()
    } catch (error) {
      console.error('Generation error:', error)
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      })
    } finally {
      setLoadingType(null)
    }
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Top Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-muted-foreground">Documentation Suite Progress</span>
          <span className="font-bold text-emerald-600">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2 bg-muted/50" indicatorClassName="bg-emerald-500" />
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground/70 pt-1">
          {STEPS.map(s => (
            <span key={s.type} className={cn(
              documents.find(d => d.type === s.type) ? "text-emerald-600 font-semibold" : ""
            )}>
              {s.type}
            </span>
          ))}
        </div>
      </div>

      {/* Pipeline */}
      <div className="relative space-y-0">
        {stepStatus.map((step, index) => {
          const isLast = index === stepStatus.length - 1
          const isGenerating = loadingType === step.type
          const isSuccess = animatingSuccess === step.type
          
          return (
            <div key={step.type} className="relative pl-10 pb-8 min-h-[100px]">
              {/* Vertical Line */}
              {!isLast && (
                <div className={cn(
                  "absolute left-[15px] top-8 bottom-0 w-[2px]",
                  step.isCompleted ? "bg-emerald-500/20" : "bg-border/40"
                )} />
              )}

              {/* Status Marker */}
              <div className={cn(
                "absolute left-0 top-1 h-8 w-8 rounded-full flex items-center justify-center border-2 z-10 transition-all duration-500",
                isSuccess ? "bg-emerald-500 border-emerald-500 scale-110" :
                step.isCompleted ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200" :
                step.isReady ? "bg-white border-gray-300 text-gray-400" :
                "bg-gray-50 border-gray-200 text-gray-300"
              )}>
                {isSuccess || step.isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> :
                 step.isLocked ? <Lock className="h-3.5 w-3.5" /> :
                 <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />}
              </div>

              {/* Content Block */}
              <div className={cn(
                "flex items-start justify-between p-4 rounded-xl border transition-all duration-300",
                isSuccess ? "bg-emerald-50 border-emerald-200 shadow-md" :
                step.isCompleted ? "bg-emerald-50/30 border-emerald-100/50" :
                step.isReady ? "bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm" :
                "bg-gray-50/50 border-transparent opacity-70"
              )}>
                
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={cn(
                      "font-semibold text-base",
                      step.isCompleted ? "text-emerald-900" : "text-foreground"
                    )}>
                      {step.label}
                    </h3>
                    {step.isCompleted && (
                       <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-full tracking-wide">
                         Completed
                       </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {step.description}
                  </p>

                  {isGenerating && (
                    <div className="text-xs font-medium text-blue-600 flex items-center gap-2 animate-pulse">
                       <Loader2 className="h-3 w-3 animate-spin" />
                       {GENERATION_PHRASES[step.type][loadingPhraseIndex]}...
                    </div>
                  )}
                  
                  {step.isLocked && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-gray-100/50 px-2 py-1 rounded w-fit">
                      <Lock className="h-3 w-3" />
                      <span>Complete {STEPS[index - 1]?.label} first</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="flex flex-col items-end justify-center pt-1">
                  {step.isCompleted ? (
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-9 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                        onClick={() => router.push(`/dashboard/documents/${step.docId}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <button 
                        onClick={() => handleGenerate(step.type)}
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center justify-end gap-1 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Regenerate
                      </button>
                    </div>
                  ) : step.isReady ? (
                    <Button 
                      size="sm" 
                      className={cn(
                        "h-9 min-w-[100px] transition-all duration-300 font-medium",
                        isGenerating 
                          ? "bg-blue-50 text-blue-600 border border-blue-100" 
                          : "bg-white text-foreground border border-gray-300 hover:border-blue-500 hover:text-blue-600 shadow-sm"
                      )}
                      onClick={() => handleGenerate(step.type)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>Generating...</>
                      ) : (
                        <>
                          Generate
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button size="sm" disabled variant="ghost" className="h-9 w-[100px] opacity-0">
                      Locked
                    </Button>
                  )}
                </div>

              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
