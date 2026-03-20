'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Loader2, Image as ImageIcon, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

interface UploadFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  url?: string
}

interface BulkMediaUploadProps {
  entityType: 'product' | 'collection'
  entityId?: string
  folderName?: string
  onUploadComplete?: (urls: string[]) => void
  maxFiles?: number
}

export function BulkMediaUpload({
  entityType,
  entityId,
  folderName,
  onUploadComplete,
  maxFiles = 20,
}: BulkMediaUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createPreview = (file: File): string => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file)
    }
    return '' // For videos, we'll show a video icon instead
  }

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    
    // Validate file count
    if (files.length + fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate file types and sizes
    const validFiles: UploadFile[] = []
    const errors: string[] = []

    fileArray.forEach((file) => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      
      if (!isImage && !isVideo) {
        errors.push(`${file.name}: Invalid file type`)
        return
      }

      if (file.size > 50 * 1024 * 1024) {
        errors.push(`${file.name}: File too large (max 50MB)`)
        return
      }

      validFiles.push({
        file,
        preview: createPreview(file),
        status: 'pending',
        progress: 0,
      })
    })

    if (errors.length > 0) {
      toast.error(errors.join('\n'))
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles])
    }
  }, [files.length, maxFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('No files to upload')
      return
    }

    setIsUploading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Authentication required')
        return
      }

      // Create FormData
      const formData = new FormData()
      files.forEach((uploadFile) => {
        formData.append('files', uploadFile.file)
      })
      formData.append('entityType', entityType)
      if (entityId) formData.append('entityId', entityId)
      if (folderName) formData.append('folderName', folderName)

      // Update all files to uploading status
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: 'uploading' as const, progress: 0 }))
      )

      // Upload
      const response = await fetch('/api/upload/bulk-media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      // Update file statuses based on results
      setFiles((prev) => {
        const newFiles = [...prev]
        
        result.uploaded?.forEach((uploaded: any) => {
          const index = newFiles.findIndex((f) => f.file.name === uploaded.fileName)
          if (index !== -1) {
            newFiles[index] = {
              ...newFiles[index],
              status: 'success',
              progress: 100,
              url: uploaded.url,
            }
          }
        })

        result.failed?.forEach((failed: any) => {
          const index = newFiles.findIndex((f) => f.file.name === failed.fileName)
          if (index !== -1) {
            newFiles[index] = {
              ...newFiles[index],
              status: 'error',
              error: failed.error,
            }
          }
        })

        return newFiles
      })

      // Show success message
      toast.success(result.message)

      // Call completion callback
      if (onUploadComplete && result.uploaded) {
        const urls = result.uploaded.map((u: any) => u.url)
        onUploadComplete(urls)
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Upload failed')
      
      // Mark all as error
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: 'error' as const,
          error: error.message,
        }))
      )
    } finally {
      setIsUploading(false)
    }
  }

  const clearCompleted = () => {
    setFiles((prev) => {
      const remaining = prev.filter((f) => f.status !== 'success')
      prev.forEach((f) => {
        if (f.status === 'success' && f.preview) {
          URL.revokeObjectURL(f.preview)
        }
      })
      return remaining
    })
  }

  const stats = {
    total: files.length,
    pending: files.filter((f) => f.status === 'pending').length,
    uploading: files.filter((f) => f.status === 'uploading').length,
    success: files.filter((f) => f.status === 'success').length,
    error: files.filter((f) => f.status === 'error').length,
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-luxury-gold bg-luxury-gold/5'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-900">
          Drop files here or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Images and videos up to 50MB each (max {maxFiles} files)
        </p>
        
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4"
          variant="outline"
        >
          Select Files
        </Button>
      </div>

      {/* Stats */}
      {files.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div className="flex gap-6 text-sm">
            <span className="text-gray-600">
              Total: <strong>{stats.total}</strong>
            </span>
            {stats.success > 0 && (
              <span className="text-green-600">
                Success: <strong>{stats.success}</strong>
              </span>
            )}
            {stats.error > 0 && (
              <span className="text-red-600">
                Failed: <strong>{stats.error}</strong>
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            {stats.success > 0 && (
              <Button
                type="button"
                onClick={clearCompleted}
                variant="outline"
                size="sm"
              >
                Clear Completed
              </Button>
            )}
            <Button
              type="button"
              onClick={uploadFiles}
              disabled={isUploading || stats.pending === 0}
              size="sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload ${stats.pending} ${stats.pending === 1 ? 'File' : 'Files'}`
              )}
            </Button>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((uploadFile, index) => (
            <div
              key={index}
              className="relative rounded-lg border border-gray-200 bg-white p-3"
            >
              {/* Preview */}
              <div className="relative mb-2 aspect-video overflow-hidden rounded bg-gray-100">
                {uploadFile.file.type.startsWith('image/') ? (
                  <img
                    src={uploadFile.preview}
                    alt={uploadFile.file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Video className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                
                {/* Status Overlay */}
                {uploadFile.status === 'uploading' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
                
                {uploadFile.status === 'success' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                )}
                
                {uploadFile.status === 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="space-y-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {uploadFile.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                
                {uploadFile.error && (
                  <p className="text-xs text-red-600">{uploadFile.error}</p>
                )}
              </div>

              {/* Remove Button */}
              {uploadFile.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute right-2 top-2 rounded-full bg-white p-1 shadow-sm hover:bg-gray-100"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
