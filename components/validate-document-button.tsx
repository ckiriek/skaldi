'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ValidateDocumentButton({
  documentId,
  documentType,
}: {
  documentId: string
  documentType: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleValidate = async () => {
    setLoading(true)

    try {
      // Fetch actual document content
      const docResponse = await fetch(`/api/documents/${documentId}`)
      if (!docResponse.ok) {
        throw new Error('Failed to fetch document')
      }
      
      const doc = await docResponse.json()
      const content = doc.content || ''
      
      if (!content || content.length < 10) {
        alert('Document is empty or too short to validate. Please generate content first.')
        return
      }

      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          documentType,
          content,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to validate document')
      }

      const data = await response.json()
      
      if (data.success) {
        alert(`Validation complete!\nCompleteness Score: ${data.completeness_score}%\nPassed: ${data.passed}/${data.total_rules}`)
        router.refresh()
      } else {
        alert('Validation failed')
      }
    } catch (error) {
      console.error('Error validating document:', error)
      alert('Failed to validate document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleValidate} disabled={loading} variant="outline">
      <CheckCircle className="w-4 h-4 mr-2" />
      {loading ? 'Validating...' : 'Validate'}
    </Button>
  )
}
