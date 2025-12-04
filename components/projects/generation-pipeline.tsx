'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, Lock, Play, FileText, Book, FileSignature, Activity, Database, Loader2, Eye, RefreshCw, ArrowRight, Clock, Download, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Progress } from '@/components/ui/progress'
import { ValidationResultsCard, ValidationResults } from '@/components/documents/validation-results-card'

type DocType = 'IB' | 'Synopsis' | 'Protocol' | 'ICF' | 'SAP' | 'CRF'

// Estimated generation times in seconds (based on logs)
const ESTIMATED_TIMES: Record<DocType, number> = {
  IB: 900,        // ~15 minutes
  Synopsis: 180,  // ~3 minutes
  Protocol: 720,  // ~12 minutes
  ICF: 300,       // ~5 minutes
  SAP: 420,       // ~7 minutes
  CRF: 600,       // ~10 minutes
}

// Section names for progress display
const DOCUMENT_SECTIONS: Record<DocType, string[]> = {
  IB: ['Title Page', 'Summary', 'Introduction', 'Physical Properties', 'Nonclinical', 'PK/PD', 'Toxicology', 'Clinical Studies', 'Safety'],
  Synopsis: ['Title', 'Objectives', 'Design', 'Population', 'Treatments', 'Endpoints', 'Statistics', 'Timeline'],
  Protocol: ['Synopsis', 'Background', 'Objectives', 'Design', 'Population', 'Treatments', 'Assessments', 'Statistics', 'Safety', 'Ethics'],
  ICF: ['Introduction', 'Purpose', 'Procedures', 'Risks', 'Benefits', 'Confidentiality', 'Compensation', 'Contact', 'Signatures'],
  SAP: ['Introduction', 'Objectives', 'Populations', 'Endpoints', 'Methods', 'Missing Data', 'Subgroups', 'Tables'],
  CRF: ['Demographics', 'Medical History', 'Eligibility', 'Treatments', 'Efficacy', 'Safety', 'Labs', 'Conclusions']
}

// Helper to format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

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
    "Compiling preclinical efficacy data...",
    "Extracting pharmacokinetic parameters...",
    "Reviewing toxicology study findings...",
    "Summarizing non-clinical safety results...",
    "Linking mechanism of action to therapeutic rationale...",
    "Validating prior clinical study outcomes...",
    "Assembling investigator-sponsored research...",
    "Cross-checking safety signals across studies...",
    "Summarizing target engagement evidence...",
    "Highlighting key findings from literature...",
    "Generating regulatory-compliant narrative...",
    "Referencing ICH E6 and E3 structures...",
    "Structuring data by therapeutic area...",
    "Formatting for regulatory readability...",
    "Finalizing document structure..."
  ],
  Synopsis: [
    "Mapping objectives to endpoints...",
    "Designing visit schedule and assessments...",
    "Structuring inclusion/exclusion criteria...",
    "Validating study arms and randomization...",
    "Aligning procedures with safety monitoring...",
    "Referencing previous study designs...",
    "Linking outcomes with statistical plans...",
    "Applying ICH E6 and SPIRIT guidance...",
    "Defining primary and secondary endpoints...",
    "Generating procedural flow diagram...",
    "Configuring adverse event capture plan...",
    "Embedding regulatory-required sections...",
    "Ensuring coherence across sections...",
    "Cross-validating design against indication...",
    "Finalizing protocol structure..."
  ],
  Protocol: [
    "Mapping objectives to endpoints...",
    "Designing visit schedule and assessments...",
    "Structuring inclusion/exclusion criteria...",
    "Validating study arms and randomization...",
    "Aligning procedures with safety monitoring...",
    "Referencing previous study designs...",
    "Linking outcomes with statistical plans...",
    "Applying ICH E6 and SPIRIT guidance...",
    "Defining primary and secondary endpoints...",
    "Generating procedural flow diagram...",
    "Configuring adverse event capture plan...",
    "Embedding regulatory-required sections...",
    "Ensuring coherence across sections...",
    "Cross-validating design against indication...",
    "Finalizing protocol structure..."
  ],
  ICF: [
    "Simplifying study language for patients...",
    "Outlining procedures and visit schedule...",
    "Describing potential risks and benefits...",
    "Referencing eligibility and withdrawal rights...",
    "Clarifying confidentiality and data use...",
    "Localizing medical terminology...",
    "Aligning with IRB/ethics templates...",
    "Ensuring readability (Flesch-Kincaid)...",
    "Formatting for multilingual support...",
    "Highlighting patient contact points...",
    "Structuring per regulatory templates...",
    "Incorporating compensation details...",
    "Validating comprehension layers...",
    "Embedding GCP-required sections...",
    "Finalizing patient-friendly content..."
  ],
  SAP: [
    "Selecting appropriate statistical models...",
    "Validating population definitions (ITT/PP)...",
    "Defining variable derivation logic...",
    "Mapping CRF fields to analysis datasets...",
    "Specifying analysis time windows...",
    "Referencing protocol objectives...",
    "Planning interim analysis strategy...",
    "Flagging missing data imputation rules...",
    "Defining subgroup analyses...",
    "Linking endpoints to TLF shells...",
    "Checking consistency with protocol...",
    "Ensuring regulatory traceability...",
    "Applying CDISC and FDA standards...",
    "Calculating planned sample size...",
    "Finalizing analysis specifications..."
  ],
  CRF: [
    "Extracting study conduct summary...",
    "Aggregating subject disposition data...",
    "Summarizing primary endpoint outcomes...",
    "Formatting safety results by SOC/MedDRA...",
    "Referencing SAP-defined analysis...",
    "Cross-validating reported vs planned stats...",
    "Generating efficacy data narratives...",
    "Structuring per ICH E3 guidance...",
    "Linking protocol deviations to outcomes...",
    "Describing population analysis sets...",
    "Adding summary of AEs and SAEs...",
    "Compiling listings and TLF references...",
    "Referencing interim analyses where applicable...",
    "Embedding conclusions and next steps...",
    "Finalizing CSR for submission..."
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
  const [validationResults, setValidationResults] = useState<{ type: DocType; validation: ValidationResults } | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const startTimeRef = useRef<number | null>(null)

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

  // Count unique document types (not total documents, to avoid counting regenerations)
  const uniqueDocTypes = new Set(documents.map(d => d.type)).size
  const progress = Math.round((uniqueDocTypes / STEPS.length) * 100)

  // Timer effect - counts elapsed time and updates current section
  useEffect(() => {
    if (!loadingType) {
      setElapsedSeconds(0)
      setCurrentSectionIndex(0)
      startTimeRef.current = null
      return
    }
    
    startTimeRef.current = Date.now()
    
    const timerInterval = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setElapsedSeconds(elapsed)
        
        // Update current section based on elapsed time
        const sections = DOCUMENT_SECTIONS[loadingType]
        const estimatedTime = ESTIMATED_TIMES[loadingType]
        const timePerSection = estimatedTime / sections.length
        const newSectionIndex = Math.min(
          Math.floor(elapsed / timePerSection),
          sections.length - 1
        )
        setCurrentSectionIndex(newSectionIndex)
      }
    }, 1000)
    
    return () => clearInterval(timerInterval)
  }, [loadingType])

  // Animation loop for phrases (slower)
  useEffect(() => {
    if (!loadingType) {
      setLoadingPhraseIndex(0)
      return
    }
    
    const interval = setInterval(() => {
      setLoadingPhraseIndex(prev => (prev + 1) % GENERATION_PHRASES[loadingType].length)
    }, 3000) // Slower - 3 seconds
    
    return () => clearInterval(interval)
  }, [loadingType])

  const handleGenerate = async (type: DocType) => {
    setLoadingType(type)
    setLoadingPhraseIndex(0)

    try {
      // Use v2 API for IB generation (Universal Project Model)
      const apiUrl = type === 'IB' ? '/api/v2/ib/generate' : '/api/generate'
      const body = type === 'IB' 
        ? { projectId }
        : { projectId, documentType: type }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      
      console.log('[DEBUG] API Response:', { ok: response.ok, status: response.status, data, apiUrl })

      if (!response.ok || !data.success) {
        const errorDetails = data.details ? JSON.stringify(data.details) : ''
        const errorContext = data.context ? ` (${data.context})` : ''
        const errorFromArray = data.errors?.[0]?.error || ''
        const fullError = `${data.error || errorFromArray || 'Generation failed'}${errorContext}${errorDetails ? ': ' + errorDetails : ''}`
        throw new Error(fullError)
      }

      // Store validation results if available (handle both v1 and v2 responses)
      if (data.validation) {
        setValidationResults({ type, validation: data.validation })
      }
      
      // For v2 API, show completeness info
      if (data.completeness) {
        const completenessPercent = Math.round((data.completeness.overall || 0) * 100)
        console.log(`[INFO] IB generated with ${completenessPercent}% data completeness`)
      }

      // Success animation
      setAnimatingSuccess(type)
      setTimeout(() => setAnimatingSuccess(null), 2000)
      
      // Show success toast with completeness for IB v2
      const description = data.completeness 
        ? `${type} created with ${Math.round((data.completeness.overall || 0) * 100)}% data completeness`
        : `${type} has been successfully created.`
      
      toast({
        title: "Document Generated",
        description,
        variant: "success",
      })
      
      router.refresh()
    } catch (error) {
      console.error('[ERROR] Generation error:', error)
      
      let errorMessage = "Unknown error"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error)
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
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
          <div className="flex items-center gap-3">
            <span className="font-bold text-emerald-600">{progress}%</span>
            {progress === 100 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  // Direct download of ZIP file
                  window.open(`/api/projects/${projectId}/download-all`, '_blank')
                }}
              >
                <Download className="h-3.5 w-3.5" />
                Download All
              </Button>
            )}
          </div>
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
                    <div className="space-y-2 mt-2">
                      {/* Timer and remaining time */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <Clock className="h-3 w-3" />
                          <span className="font-mono">
                            {Math.max(0, ESTIMATED_TIMES[step.type] - elapsedSeconds) > 0 
                              ? `~${formatTime(Math.max(0, ESTIMATED_TIMES[step.type] - elapsedSeconds))} remaining`
                              : 'Finishing up...'}
                          </span>
                        </div>
                        <span className="text-muted-foreground font-mono">
                          {formatTime(elapsedSeconds)} elapsed
                        </span>
                      </div>
                      
                      {/* Current section */}
                      <div className="flex items-center gap-2 text-xs">
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                        <span className="text-emerald-600">
                          Section {currentSectionIndex + 1}/{DOCUMENT_SECTIONS[step.type].length}:
                        </span>
                        <span className="text-emerald-700 font-medium animate-pulse">
                          {DOCUMENT_SECTIONS[step.type][currentSectionIndex]}
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000 ease-linear" 
                          style={{ width: `${Math.min((elapsedSeconds / ESTIMATED_TIMES[step.type]) * 100, 99)}%` }} 
                        />
                      </div>
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
                      {/* Export buttons - download from Storage */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => window.open(`/api/documents/${step.docId}/download?format=pdf`, '_blank')}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                        >
                          <FileDown className="h-3 w-3" />
                          PDF
                        </button>
                        <button
                          onClick={() => window.open(`/api/documents/${step.docId}/download?format=docx`, '_blank')}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                        >
                          <FileDown className="h-3 w-3" />
                          DOCX
                        </button>
                      </div>
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

      {/* Validation Results */}
      {validationResults && (
        <div className="mt-8">
          <ValidationResultsCard
            validation={validationResults.validation}
            documentType={validationResults.type}
          />
        </div>
      )}
    </div>
  )
}
