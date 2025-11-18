'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Book, FileCheck, FileSignature, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

export function GenerateDocumentButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [loadingType, setLoadingType] = useState<string | null>(null)
  const { toast } = useToast()

  const handleGenerate = async (documentType: 'IB' | 'Protocol' | 'ICF' | 'Synopsis' | 'SAP' | 'CRF') => {
    setLoadingType(documentType)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          documentType,
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

  return (
    <div className="flex flex-wrap gap-2">
      {/* Synopsis Button */}
      <Button 
        onClick={() => handleGenerate('Synopsis')}
        disabled={loadingType !== null}
        variant="outline"
        size="sm"
      >
        {isLoading('Synopsis') ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 mr-2" />
        )}
        {isLoading('Synopsis') ? 'Generating...' : 'Generate Synopsis'}
      </Button>

      {/* IB Button */}
      <Button 
        onClick={() => handleGenerate('IB')}
        disabled={loadingType !== null}
        variant="outline"
        size="sm"
      >
        {isLoading('IB') ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Book className="w-4 h-4 mr-2" />
        )}
        {isLoading('IB') ? 'Generating...' : 'Generate IB'}
      </Button>

      {/* Protocol Button */}
      <Button 
        onClick={() => handleGenerate('Protocol')}
        disabled={loadingType !== null}
        variant="outline"
        size="sm"
      >
        {isLoading('Protocol') ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FileCheck className="w-4 h-4 mr-2" />
        )}
        {isLoading('Protocol') ? 'Generating...' : 'Generate Protocol'}
      </Button>

      {/* ICF Button */}
      <Button 
        onClick={() => handleGenerate('ICF')}
        disabled={loadingType !== null}
        variant="outline"
        size="sm"
      >
        {isLoading('ICF') ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FileSignature className="w-4 h-4 mr-2" />
        )}
        {isLoading('ICF') ? 'Generating...' : 'Generate ICF'}
      </Button>

      {/* SAP Button */}
      <Button 
        onClick={() => handleGenerate('SAP')}
        disabled={loadingType !== null}
        variant="outline"
        size="sm"
      >
        {isLoading('SAP') ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FileSignature className="w-4 h-4 mr-2" />
        )}
        {isLoading('SAP') ? 'Generating...' : 'Generate SAP'}
      </Button>

      {/* CRF Button */}
      <Button 
        onClick={() => handleGenerate('CRF')}
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
