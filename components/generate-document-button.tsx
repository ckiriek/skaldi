'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Book, FileCheck, FileSignature, Loader2, Microscope, ClipboardList, FileSpreadsheet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

type DocumentType = 'IB' | 'Protocol' | 'ICF' | 'Synopsis' | 'SAP' | 'CRF'

interface GenerateDocumentButtonProps {
  projectId: string
  documentType?: DocumentType
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function GenerateDocumentButton({ 
  projectId, 
  documentType,
  variant = 'outline',
  size = 'sm'
}: GenerateDocumentButtonProps) {
  const router = useRouter()
  const [loadingType, setLoadingType] = useState<string | null>(null)
  const { toast } = useToast()

  const handleGenerate = async (type: DocumentType) => {
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
        disabled={loadingType !== null}
        variant={variant}
        size={size}
        className="w-full justify-start"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Icon className="w-4 h-4 mr-2" />
        )}
        {loading ? 'Generating...' : `Generate ${getLabel(documentType)}`}
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
