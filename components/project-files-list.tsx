'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { File, Download, Trash2, FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ExtractEntitiesButton } from './extract-entities-button'
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

interface ProjectFile {
  id: string
  original_filename: string
  file_size: number
  mime_type: string
  uploaded_at: string
  storage_path: string
  parsed_content?: string
  metadata?: any
}

interface ProjectFilesListProps {
  projectId: string
  files: ProjectFile[]
}

export function ProjectFilesList({ projectId, files }: ProjectFilesListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-destructive" />
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FileText className="w-5 h-5 text-primary" />
    } else if (mimeType.includes('text')) {
      return <FileText className="w-5 h-5 text-muted-foreground" />
    }
    return <File className="w-5 h-5 text-muted-foreground" />
  }

  const handleDownload = async (file: ProjectFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.storage_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.original_filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      toast({
        variant: 'error',
        title: 'Download failed',
        description: 'Failed to download file. Please try again.',
      })
    }
  }

  const handleDelete = async (file: ProjectFile) => {
    setDeletingId(file.id)

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([file.storage_path])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('project_files')
        .delete()
        .eq('id', file.id)

      if (dbError) throw dbError

      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        variant: 'error',
        title: 'Delete failed',
        description: 'Failed to delete file. Please try again.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <File className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <h3 className="text-sm font-medium mb-1">No files uploaded</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Attach protocols, IBs, labels, or other source documents to enrich this project.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uploaded Files</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {files.map(file => (
            <div
              key={file.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(file.mime_type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {file.original_filename}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>•</span>
                    <span>{formatDate(file.uploaded_at)}</span>
                    {file.parsed_content && (
                      <>
                        <span>•</span>
                        <span className="text-success">✓ Parsed</span>
                      </>
                    )}
                    {file.metadata?.entities_extracted && (
                      <>
                        <span>•</span>
                        <span className="text-info">
                          ✓ {file.metadata.entities_count || 0} entities
                        </span>
                      </>
                    )}
                  </div>
                  {file.metadata?.note && (
                    <p className="text-xs text-warning mt-1">
                      {file.metadata.note}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {file.parsed_content && (
                  <ExtractEntitiesButton
                    fileId={file.id}
                    projectId={projectId}
                    fileName={file.original_filename}
                    disabled={file.metadata?.entities_extracted}
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(file)}
                  title="Download"
                  aria-label={`Download ${file.original_filename}`}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === file.id}
                      title="Delete"
                      aria-label={`Delete ${file.original_filename}`}
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent size="sm">
                    <DialogHeader>
                      <DialogTitle>Delete file?</DialogTitle>
                      <DialogDescription>
                        This will permanently delete "{file.original_filename}" from this project. This action cannot
                        be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline" size="sm" disabled={deletingId === file.id}>
                          Cancel
                        </Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(file)}
                          disabled={deletingId === file.id}
                        >
                          {deletingId === file.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete'
                          )}
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
