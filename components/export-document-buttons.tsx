'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface ExportDocumentButtonsProps {
  documentId: string
  documentTitle: string
}

export function ExportDocumentButtons({ documentId, documentTitle }: ExportDocumentButtonsProps) {
  const [loadingFormat, setLoadingFormat] = useState<string | null>(null)
  const { toast } = useToast()

  const handleExport = async (format: 'pdf' | 'docx') => {
    setLoadingFormat(format)

    try {
      const response = await fetch(`/api/export/${format}/${documentId}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Export failed:', errorData)
        toast({
          variant: 'error',
          title: 'Export failed',
          description: errorData.error || 'Unknown error',
        })
        return
      }

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${documentTitle}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Export successful',
        description: `Document exported as ${format.toUpperCase()}`,
      })
    } catch (error) {
      console.error('Error exporting document:', error)
      toast({
        variant: 'error',
        title: 'Error exporting document',
        description: 'Failed to export document. Please try again.',
      })
    } finally {
      setLoadingFormat(null)
    }
  }

  const isLoading = (format: string) => loadingFormat === format

  return (
    <div className="flex gap-2">
      {/* PDF Export Button */}
      <Button
        onClick={() => handleExport('pdf')}
        disabled={loadingFormat !== null}
        variant="outline"
        size="sm"
        className="h-7 text-xs"
      >
        {isLoading('pdf') ? (
          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
        ) : (
          <FileDown className="w-3 h-3 mr-2" />
        )}
        {isLoading('pdf') ? 'Exporting...' : 'Export PDF'}
      </Button>

      {/* DOCX Export Button */}
      <Button
        onClick={() => handleExport('docx')}
        disabled={loadingFormat !== null}
        variant="outline"
        size="sm"
        className="h-7 text-xs"
      >
        {isLoading('docx') ? (
          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
        ) : (
          <FileDown className="w-3 h-3 mr-2" />
        )}
        {isLoading('docx') ? 'Exporting...' : 'Export DOCX'}
      </Button>
    </div>
  )
}
