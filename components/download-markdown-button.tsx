'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface DownloadMarkdownButtonProps {
  content: string
  filename?: string
  documentType?: string
}

export function DownloadMarkdownButton({ content, filename, documentType }: DownloadMarkdownButtonProps) {
  const handleDownload = () => {
    if (!content || content.trim().length === 0) return

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `${documentType || 'document'}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleDownload}
      aria-label={`Download ${documentType || 'document'} as Markdown`}
      disabled={!content || content.trim().length === 0}
   >
      <Download className="h-4 w-4" />
      Download .md
    </Button>
  )
}
