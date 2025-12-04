'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Book, FileCheck, FileSignature, Loader2, Microscope, ClipboardList, FileSpreadsheet, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

type DocumentType = 'IB' | 'Protocol' | 'ICF' | 'Synopsis' | 'SAP' | 'CRF'

// Estimated generation times in seconds (based on logs ~900k ms for IB)
const ESTIMATED_TIMES: Record<DocumentType, number> = {
  IB: 900,        // ~15 minutes
  Protocol: 720,  // ~12 minutes
  ICF: 300,       // ~5 minutes
  Synopsis: 180,  // ~3 minutes
  SAP: 420,       // ~7 minutes
  CRF: 600,       // ~10 minutes
}

// Section names for each document type
const DOCUMENT_SECTIONS: Record<DocumentType, string[]> = {
  IB: [
    'Title Page',
    'Table of Contents', 
    'Summary',
    'Introduction',
    'Physical & Chemical Properties',
    'Nonclinical Studies',
    'Pharmacokinetics',
    'Pharmacodynamics',
    'Toxicology',
    'Clinical Studies',
    'Safety Summary'
  ],
  Protocol: [
    'Title Page',
    'Synopsis',
    'Background',
    'Objectives',
    'Study Design',
    'Population',
    'Treatments',
    'Assessments',
    'Statistics',
    'Safety',
    'Ethics',
    'Administration'
  ],
  ICF: [
    'Introduction',
    'Purpose',
    'Procedures',
    'Risks',
    'Benefits',
    'Alternatives',
    'Confidentiality',
    'Compensation',
    'Contact Information',
    'Voluntary Participation',
    'Signatures'
  ],
  Synopsis: [
    'Title',
    'Objectives',
    'Design',
    'Population',
    'Treatments',
    'Endpoints',
    'Statistics',
    'Timeline'
  ],
  SAP: [
    'Introduction',
    'Objectives',
    'Populations',
    'Endpoints',
    'Statistical Methods',
    'Missing Data',
    'Subgroups',
    'Tables & Figures'
  ],
  CRF: [
    'Demographics',
    'Medical History',
    'Eligibility',
    'Treatments',
    'Efficacy',
    'Safety',
    'Labs',
    'Conclusions'
  ]
}

// Helper to format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const GENERATION_PHRASES: Record<DocumentType, string[]> = {
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

interface GenerateDocumentButtonProps {
  projectId: string
  documentType?: DocumentType
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  disabled?: boolean
}

export function GenerateDocumentButton({ 
  projectId, 
  documentType,
  variant = 'outline',
  size = 'sm',
  disabled = false
}: GenerateDocumentButtonProps) {
  const router = useRouter()
  const [loadingType, setLoadingType] = useState<string | null>(null)
  const [loadingTermIndex, setLoadingTermIndex] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const { toast } = useToast()

  // Timer effect - counts elapsed time
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
        const docType = loadingType as DocumentType
        const sections = DOCUMENT_SECTIONS[docType]
        const estimatedTime = ESTIMATED_TIMES[docType]
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

  // Phrase rotation effect
  useEffect(() => {
    if (!loadingType) {
      setLoadingTermIndex(0)
      return
    }
    
    const phrases = GENERATION_PHRASES[loadingType as DocumentType]
    if (!phrases) return
    
    const interval = setInterval(() => {
      setLoadingTermIndex(prev => (prev + 1) % phrases.length)
    }, 3000) // Slower rotation - 3 seconds
    
    return () => clearInterval(interval)
  }, [loadingType])

  const handleGenerate = async (type: DocumentType) => {
    if (disabled) return
    setLoadingType(type)

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

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Generation failed:', errorData)
        toast({
          variant: 'error',
          title: 'Document generation failed',
          description: errorData.error || errorData.details || 'Unknown error',
        })
        return
      }

      const data = await response.json()
      
      // Handle both v1 and v2 API responses
      const documentId = data.document?.id || data.documentId
      const isSuccess = data.success && documentId
      
      if (isSuccess) {
        // Show success toast with validation/completeness info
        if (data.completeness) {
          // v2 API response with completeness scores
          const completenessPercent = Math.round((data.completeness.overall || 0) * 100)
          const validationPassed = data.validation?.passed !== false
          
          toast({
            variant: validationPassed ? 'success' : 'warning',
            title: 'Document generated successfully',
            description: `Data completeness: ${completenessPercent}%${data.enrichment_warnings?.length ? ` (${data.enrichment_warnings.length} warnings)` : ''}`,
          })
        } else if (data.validation) {
          // v1 API response with validation
          const validationMsg = data.validation.passed 
            ? `✓ Validation passed (${data.validation.score}%)`
            : `⚠ ${data.validation.errors} errors, ${data.validation.warnings} warnings (${data.validation.score}%)`
          
          toast({
            variant: data.validation.passed ? 'success' : 'warning',
            title: 'Document generated successfully',
            description: validationMsg,
          })
        } else {
          toast({
            variant: 'success',
            title: 'Document generated successfully',
            description: 'Document is ready for review',
          })
        }
        
        router.push(`/dashboard/documents/${documentId}`)
        router.refresh()
      } else {
        toast({
          variant: 'error',
          title: 'Document generation failed',
          description: data.error || data.errors?.[0]?.error || 'The document could not be generated. Please try again.',
        })
      }
    } catch (error) {
      console.error('Error generating document:', error)
      toast({
        variant: 'error',
        title: 'Error generating document',
        description: 'Failed to generate document. Please try again.',
      })
    } finally {
      setLoadingType(null)
    }
  }

  const isLoading = (type: string) => loadingType === type

  const getIconForType = (type: DocumentType) => {
    const icons = {
      IB: Book,
      Synopsis: FileText,
      Protocol: FileCheck,
      ICF: FileSignature,
      SAP: FileSpreadsheet,
      CRF: ClipboardList,
    }
    return icons[type]
  }

  const getLabel = (type: DocumentType) => {
    const labels = {
      IB: 'Investigator\'s Brochure',
      Synopsis: 'Synopsis',
      Protocol: 'Protocol',
      ICF: 'Informed Consent',
      SAP: 'Statistical Analysis Plan',
      CRF: 'Case Report Form',
    }
    return labels[type]
  }

  // If documentType is specified, render single button
  if (documentType) {
    const Icon = getIconForType(documentType)
    const loading = isLoading(documentType)
    const sections = DOCUMENT_SECTIONS[documentType]
    const estimatedTime = ESTIMATED_TIMES[documentType]
    const remainingSeconds = Math.max(0, estimatedTime - elapsedSeconds)
    const progressPercent = Math.min((elapsedSeconds / estimatedTime) * 100, 99) // Cap at 99% until done
    const currentSection = sections[currentSectionIndex]
    
    return (
      <Button 
        onClick={() => handleGenerate(documentType)}
        disabled={loadingType !== null || disabled}
        variant={variant}
        size={size}
        className={`${disabled ? "opacity-50 " : ""}w-full justify-start ${loading ? "h-auto py-3 px-4" : ""}`}
      >
        {loading ? (
          <div className="flex flex-col w-full text-left space-y-2">
            {/* Timer and estimated time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span className="text-emerald-800 text-sm font-semibold">
                  Generating {getLabel(documentType)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-emerald-600">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-mono">
                  {remainingSeconds > 0 ? `~${formatTime(remainingSeconds)} remaining` : 'Finishing...'}
                </span>
              </div>
            </div>
            
            {/* Current section being generated */}
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 text-xs">
                Creating section {currentSectionIndex + 1}/{sections.length}:
              </span>
              <span className="text-emerald-700 text-xs font-medium animate-pulse">
                {currentSection}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000 ease-linear" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
            
            {/* Elapsed time */}
            <div className="text-[10px] text-emerald-500 text-right">
              Elapsed: {formatTime(elapsedSeconds)}
            </div>
          </div>
        ) : (
          <>
            <Icon className="w-4 h-4 mr-2" />
            {`Generate ${getLabel(documentType)}`}
          </>
        )}
      </Button>
    )
  }

  // Otherwise, render all buttons (legacy mode)
  return (
    <div className="flex flex-wrap gap-2">
      {/* IB Button */}
      <Button 
        onClick={() => handleGenerate('IB')}
        disabled={loadingType !== null}
        variant="outline"
        size="sm"
      >
        {isLoading('CRF') ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 mr-2" />
        )}
        {isLoading('CRF') ? 'Generating...' : 'Generate CRF'}
      </Button>
    </div>
  )
}
