'use client'

import { useCallback, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { CompanyRow } from '@/lib/database.types'
import {
  buildLogoStoragePath,
  validateLogoFile,
} from '@/lib/company-logo-upload'
import { getUploadErrorMessage } from '@/lib/document-upload'
import { DOCUMENTS_STORAGE_BUCKET } from '@/lib/vault-documents'

interface UseCompanyLogoUploadOptions {
  user: User | null
  company: CompanyRow | null
  updateCompany: (data: Partial<CompanyRow>) => Promise<void>
  onSuccess?: () => void
  onError?: (message: string) => void
}

/** Upload or replace the signed-in company's logo in private storage. */
export function useCompanyLogoUpload({
  user,
  company,
  updateCompany,
  onSuccess,
  onError,
}: UseCompanyLogoUploadOptions) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const pick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const uploadFile = useCallback(
    async (file: File) => {
      if (!user || !company) {
        onError?.('Sign in and finish loading your profile before uploading a logo.')
        return
      }

      const validationError = validateLogoFile(file)
      if (validationError) {
        onError?.(validationError)
        return
      }

      setUploading(true)
      try {
        const filePath = buildLogoStoragePath(user.id, file)
        const contentType = file.type || 'application/octet-stream'

        const { error: storageError } = await supabase.storage
          .from(DOCUMENTS_STORAGE_BUCKET)
          .upload(filePath, file, { upsert: true, contentType })

        if (storageError) {
          throw new Error(`storage: ${storageError.message}`)
        }

        await updateCompany({ logo_path: filePath })
        onSuccess?.()
      } catch (error) {
        onError?.(getUploadErrorMessage(error))
      } finally {
        setUploading(false)
      }
    },
    [company, onError, onSuccess, supabase, updateCompany, user]
  )

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      await uploadFile(file)
    },
    [uploadFile]
  )

  const removeLogo = useCallback(async () => {
    if (!user || !company?.logo_path) return

    setUploading(true)
    try {
      await supabase.storage.from(DOCUMENTS_STORAGE_BUCKET).remove([company.logo_path])
      await updateCompany({ logo_path: null })
      onSuccess?.()
    } catch (error) {
      onError?.(getUploadErrorMessage(error))
    } finally {
      setUploading(false)
    }
  }, [company, onError, onSuccess, supabase, updateCompany, user])

  return {
    inputRef,
    uploading,
    pick,
    handleFileChange,
    uploadFile,
    removeLogo,
  }
}
