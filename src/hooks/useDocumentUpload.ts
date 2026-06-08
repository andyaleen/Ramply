import { useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'
import type { CompanyRow, CompanyDocumentRow } from '@/lib/database.types'
import type { DocumentTypeKey } from '@/lib/catalog'
import { getUploadErrorMessage } from '@/lib/document-upload'
import { uploadVaultDocument } from '@/lib/upload-vault-document'

interface UploadResult {
  doc: CompanyDocumentRow
  /** True when the file hash matched an existing doc — no new row was created. */
  duplicate: boolean
}

interface UseDocumentUploadOptions {
  user: User | null
  company: Pick<CompanyRow, 'id'> | null
  /** Existing docs used for quick duplicate detection before upload. */
  existingDocs: CompanyDocumentRow[]
  onSuccess: (result: UploadResult, docType: DocumentTypeKey) => void
  onError?: (err: unknown, docType: DocumentTypeKey) => void
  /**
   * Called after OCR + classification completes (async, after onSuccess).
   * detectedDocType is null if classification was skipped or failed.
   */
  onClassified?: (docType: DocumentTypeKey, detectedDocType: DocumentTypeKey | null) => void
}

interface UseDocumentUploadReturn {
  /** The hidden file input element — attach to the DOM. */
  inputRef: React.RefObject<HTMLInputElement | null>
  /** The doc type currently being uploaded, or null. */
  uploading: DocumentTypeKey | null
  /** Call this to open the file picker for a specific doc type. */
  pick: (docType: DocumentTypeKey) => void
  /** Attach to the hidden input's onChange. */
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  /** Upload a chosen file for a specific document type (e.g. from Add a File dialog). */
  uploadFile: (file: File, docType: DocumentTypeKey) => Promise<void>
}

/** Trigger OCR asynchronously after a successful vault upload. */
function triggerDocumentIngest(
  companyDocumentId: string,
  onClassified?: (docType: DocumentTypeKey, detectedDocType: DocumentTypeKey | null) => void,
  docType?: DocumentTypeKey
) {
  fetch('/api/documents/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_document_id: companyDocumentId }),
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { detected_document_type?: string | null } | null) => {
      if (!onClassified || !docType) return
      const detected = (data?.detected_document_type ?? null) as DocumentTypeKey | null
      onClassified(docType, detected)
    })
    .catch((err) => console.error('OCR trigger failed:', err))
}

/**
 * Uploads files directly to Supabase storage, then persists vault metadata server-side.
 */
export function useDocumentUpload({
  user,
  company,
  existingDocs,
  onSuccess,
  onError,
  onClassified,
}: UseDocumentUploadOptions): UseDocumentUploadReturn {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingType = useRef<DocumentTypeKey | null>(null)
  const [uploading, setUploading] = useState<DocumentTypeKey | null>(null)

  const uploadFile = async (file: File, docType: DocumentTypeKey) => {
    if (!user || !company) {
      onError?.(new Error('Your company profile is still loading. Please try again.'), docType)
      return
    }

    setUploading(docType)

    try {
      const result = await uploadVaultDocument({
        supabase,
        user,
        company,
        existingDocs,
        file,
        docType,
      })

      if (!result.duplicate) {
        triggerDocumentIngest(result.doc.id, onClassified, docType)
      }

      onSuccess(result, docType)
    } catch (err) {
      onError?.(err, docType)
      console.error('Document upload failed:', getUploadErrorMessage(err), err)
      throw err
    } finally {
      setUploading(null)
    }
  }

  const pick = (docType: DocumentTypeKey) => {
    if (!user || !company) {
      onError?.(new Error('Your company profile is still loading. Please try again.'), docType)
      return
    }

    pendingType.current = docType
    inputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const docType = pendingType.current
    if (!file || !docType) return

    e.target.value = ''
    await uploadFile(file, docType)
  }

  return { inputRef, uploading, pick, handleFileChange, uploadFile }
}
