'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

export function ValidateDocumentButton({
  documentId,
  documentType,
  className,
}: {
  documentId: string
  documentType: string
  className?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleValidate = async () => {
    setLoading(true)

    try {
      // Get content from current page (passed via data attribute or context)
      // For now, we'll fetch it from the API
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          documentType,
          // Content will be fetched by the API route
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to validate document')
      }

      const data = await response.json()
      
      if (data.success) {
        toast({
          variant: 'success',
          title: 'Validation complete',
          description: `Completeness score: ${data.completeness_score}% • Passed ${data.passed}/${data.total_rules} checks.`,
        })
        router.refresh()
      } else {
        toast({
          variant: 'error',
          title: 'Validation failed',
          description: 'Validation could not be completed. Please try again.',
        })
      }
    } catch (error) {
      console.error('Error validating document:', error)
      toast({
        variant: 'error',
        title: 'Error validating document',
        description: 'Failed to validate document. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleValidate} 
      disabled={loading} 
      variant="outline"
      className={className || "bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border-emerald-200 transition-all duration-200"}
    >
      <CheckCircle className="w-4 h-4 mr-2" />
      {loading ? 'Validating...' : 'Validate'}
    </Button>
  )
}
