'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, File, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FileUploadProps {
  projectId: string
}

interface UploadFile {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  id: string
}

export function FileUpload({ projectId }: FileUploadProps) {
  const router = useRouter()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const supabase = createClient()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      addFiles(selectedFiles)
    }
  }, [])

  const addFiles = (newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0,
      id: Math.random().toString(36).substring(7)
    }))

    setFiles(prev => [...prev, ...uploadFiles])
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFile = async (uploadFile: UploadFile) => {
    const { file, id } = uploadFile

    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: 'uploading' as const } : f
      ))

      // 1. Upload to Supabase Storage
      const filePath = `${projectId}/${Date.now()}-${file.name}`
      
      const { data: storageData, error: storageError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (storageError) {
        throw new Error(storageError.message)
      }

      // 2. Save metadata to database
      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          storage_path: filePath,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type
        })

      if (dbError) {
        // Rollback storage upload
        await supabase.storage.from('project-files').remove([filePath])
        throw new Error(dbError.message)
      }

      // 3. Trigger file parsing (async)
      await fetch('/api/files/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          filePath,
          fileName: file.name,
          mimeType: file.type
        })
      })

      // Update status to success
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: 'success' as const, progress: 100 } : f
      ))

    } catch (error: any) {
      console.error('Upload error:', error)
      setFiles(prev => prev.map(f => 
        f.id === id ? { 
          ...f, 
          status: 'error' as const, 
          error: error.message 
        } : f
      ))
    }
  }

  const uploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    
    for (const file of pendingFiles) {
      await uploadFile(file)
    }

    // Refresh page after all uploads
    router.refresh()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <File className="w-4 h-4 text-gray-400" />
    }
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const uploadingCount = files.filter(f => f.status === 'uploading').length
  const successCount = files.filter(f => f.status === 'success').length

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">
              Drag and drop files here, or click to select
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Supported: PDF, DOCX, DOC, TXT, CSV (Max 50MB)
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt,.csv"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Button variant="outline" size="sm" type="button">
                Select Files
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {files.map(uploadFile => (
                <div
                  key={uploadFile.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(uploadFile.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(uploadFile.file.size)}
                        {uploadFile.error && (
                          <span className="text-red-500 ml-2">
                            - {uploadFile.error}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {uploadFile.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Upload Button */}
            {pendingCount > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {pendingCount} file{pendingCount > 1 ? 's' : ''} ready to upload
                </p>
                <Button
                  onClick={uploadAll}
                  disabled={uploadingCount > 0}
                >
                  {uploadingCount > 0 ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload {pendingCount} File{pendingCount > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Success Message */}
            {successCount > 0 && pendingCount === 0 && uploadingCount === 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ {successCount} file{successCount > 1 ? 's' : ''} uploaded successfully!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
