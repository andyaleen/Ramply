'use client'

import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Upload, File, X, Check } from 'lucide-react'

interface DocumentUploadProps {
  documentType: string
  requestId: string
  onUploadSuccess: (documentType: string) => void
  onUploadStart?: (documentType: string) => void
  onUploadError?: (documentType: string, error: string) => void
  isUploaded?: boolean
  disabled?: boolean
}

export function DocumentUpload({ 
  documentType, 
  requestId, 
  onUploadSuccess,
  onUploadStart,
  onUploadError,
  isUploaded = false,
  disabled = false 
}: DocumentUploadProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
    const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('User not authenticated')
      
      // Call upload start callback
      onUploadStart?.(documentType)
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB')
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('File type not supported. Please upload PDF, DOC, DOCX, or image files.')
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${requestId}/${documentType}-${Date.now()}.${fileExt}`      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      console.log("uploadError",uploadError)
      if (uploadError) throw uploadError

      console.log('=== DOCUMENT UPLOAD TO DATABASE ===')
      console.log('File uploaded to storage successfully:', uploadData.path)
      console.log('Saving document record to database...')
      console.log('Document data:', {
        request_id: requestId,
        user_id: user.id,
        document_type: documentType,
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type,
      })

      // Save document record to database
      const { data: insertData, error: dbError } = await supabase
        .from('documents')
        .insert({
          request_id: requestId,
          user_id: user.id,
          document_type: documentType,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
        })
        .select() // Add select to return the inserted data
        console.log("res ",insertData)
      if (dbError) {
        console.error('Database insert error:', dbError)
        throw dbError
      }

      console.log('Document saved to database successfully:', insertData)
      return uploadData    },
    onSuccess: () => {
      console.log('Document upload successful, calling onUploadSuccess for:', documentType)
      setSelectedFile(null)
      onUploadSuccess(documentType)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    onError: (error: Error) => {
      console.error('Document upload failed:', error)
      onUploadError?.(documentType, error.message)
    },
  })

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files[0]) {
      setSelectedFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      setSelectedFile(files[0])
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  if (disabled || isUploaded) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
        <Check className="h-4 w-4" />
        <span className="text-sm font-medium">{documentType} - Uploaded</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* File Input */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${selectedFile ? 'border-green-400 bg-green-50' : ''}
          hover:border-gray-400
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          disabled={uploadMutation.isPending}
        />
        
        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <File className="h-8 w-8 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-green-800">{selectedFile.name}</p>
              <p className="text-sm text-green-600">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="text-gray-600">
              <span className="font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-gray-500">
              PDF, DOC, DOCX, JPG, PNG (max 10MB)
            </p>
          </div>
        )}
      </div>

      {/* Selected File Actions */}
      {selectedFile && (
        <div className="flex items-center gap-2">
          <Button
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            size="sm"
          >
            {uploadMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Uploading...
              </div>
            ) : (
              'Upload File'
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFile}
            disabled={uploadMutation.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Error Message */}
      {uploadMutation.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            {uploadMutation.error.message || 'Upload failed. Please try again.'}
          </p>
        </div>
      )}
    </div>
  )
}
