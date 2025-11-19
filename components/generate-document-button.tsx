'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Book, FileCheck, FileSignature, Loader2, Microscope, ClipboardList, FileSpreadsheet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

type DocumentType = 'IB' | 'Protocol' | 'ICF' | 'Synopsis' | 'SAP' | 'CRF'

const LOADING_TERMS = [
  "Analyzing protocol...", 
  "Fetching clinical data...", 
  "Synthesizing safety profile...", 
  "Formatting ICH structure...", 
  "Validating references...", 
  "Checking compliance...", 
  "Drafting sections...", 
  "Reviewing terminology...", 
  "Optimizing readability...", 
  "Finalizing layout...", 
  "Generating tables...", 
  "Processing citations...", 
  "Reviewing contraindications...", 
  "Checking interactions...", 
  "Finalizing document..."
]

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
    
    const interval = setInterval(() => {
      setLoadingTermIndex(prev => (prev + 1) % LOADING_TERMS.length)
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
                <span className="text-emerald-700 text-xs animate-pulse font-medium">{LOADING_TERMS[loadingTermIndex]}</span>
             </div>
             <div className="h-1 w-full bg-emerald-100/50 mt-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-500 ease-in-out" 
                  style={{ width: `${Math.min(((loadingTermIndex + 1) / LOADING_TERMS.length) * 100, 100)}%` }} 
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
