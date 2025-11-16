'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ExtractEntitiesButtonProps {
  fileId: string
  projectId: string
  fileName: string
  disabled?: boolean
}

export function ExtractEntitiesButton({ 
  fileId, 
  projectId, 
  fileName,
  disabled 
}: ExtractEntitiesButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleExtract = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/entities/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          projectId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to extract entities')
      }

      const data = await response.json()

      toast({
        variant: 'success',
        title: 'Entities extracted',
        description: `Extracted ${data.entitiesCount} entities from "${fileName}".`,
      })
      router.refresh()
    } catch (error: any) {
      console.error('Extract error:', error)
      toast({
        variant: 'error',
        title: 'Entity extraction failed',
        description: error?.message || 'Failed to extract entities. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          disabled={loading || disabled}
          variant="outline"
          size="sm"
          title="Extract entities using AI"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Extract Entities
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Extract entities from this file?</DialogTitle>
          <DialogDescription>
            This will use AI to identify compounds, indications, endpoints, and other clinical trial entities
            in "{fileName}".
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              onClick={handleExtract}
              disabled={loading || disabled}
              variant="default"
              size="sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Confirm
                </>
              )}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
