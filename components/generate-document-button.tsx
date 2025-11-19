'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Book, FileCheck, FileSignature, Loader2, Microscope, ClipboardList, FileSpreadsheet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

type DocumentType = 'IB' | 'Protocol' | 'ICF' | 'Synopsis' | 'SAP' | 'CRF'

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
  const { toast } = useToast()

  useEffect(() => {
    if (!loadingType) {
      setLoadingTermIndex(0)
      return
    }
    
    const phrases = GENERATION_PHRASES[loadingType as DocumentType]
    if (!phrases) return
    
    const interval = setInterval(() => {
      setLoadingTermIndex(prev => (prev + 1) % phrases.length)
    }, 2000)
    
    return () => clearInterval(interval)
  }, [loadingType])

  const handleGenerate = async (type: DocumentType) => {
    if (disabled) return
    setLoadingType(type)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          documentType: type,
        }),
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
      
      if (data.success && data.document) {
        // Show success toast with validation info if available
        if (data.validation) {
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
        
        router.push(`/dashboard/documents/${data.document.id}`)
        router.refresh()
      } else {
        toast({
          variant: 'error',
          title: 'Document generation failed',
          description: data.error || 'The document could not be generated. Please try again.',
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
    const phrases = GENERATION_PHRASES[documentType]
    
    return (
      <Button 
        onClick={() => handleGenerate(documentType)}
        disabled={loadingType !== null || disabled}
        variant={variant}
        size={size}
        className={`${disabled ? "opacity-50 " : ""}w-full justify-start ${loading ? "h-auto py-2" : ""}`}
      >
        {loading ? (
          <div className="flex flex-col w-full text-left">
             <div className="flex items-center">
                <Loader2 className="w-3 h-3 mr-2 animate-spin text-emerald-600" />
                <span className="text-emerald-700 text-xs animate-pulse font-medium">{phrases[loadingTermIndex]}</span>
             </div>
             <div className="h-1 w-full bg-emerald-100/50 mt-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-500 ease-in-out" 
                  style={{ width: `${Math.min(((loadingTermIndex + 1) / phrases.length) * 100, 100)}%` }} 
                />
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
