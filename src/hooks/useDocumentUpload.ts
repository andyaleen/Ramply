import { useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'
import type { CompanyRow, CompanyDocumentRow } from '@/lib/database.types'
import type { DocumentTypeKey } from '@/lib/catalog'
import { persistVaultUpload } from '@/lib/complete-vault-upload'
import {
  buildDocumentStoragePath,
  getUploadErrorMessage,
  hashFileBytes,
} from '@/lib/document-upload'

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
    if (!file || !docType || !user || !company) return

    e.target.value = ''

    setUploading(docType)
    let uploadedPath: string | null = null

    try {
      const fileBuffer = await file.arrayBuffer()
      const hash = await hashFileBytes(fileBuffer)
      const existing = existingDocs.find((doc) => doc.document_type === docType) ?? null

      if (existing?.file_hash === hash) {
        onSuccess({ doc: existing, duplicate: true }, docType)
        return
      }

      const filePath = buildDocumentStoragePath(user.id, docType, file.name)
      uploadedPath = filePath
      const contentType = file.type || 'application/octet-stream'

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: false, contentType })

      if (storageError) throw storageError

      const payload = await persistVaultUpload(supabase, {
        document_type: docType,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: contentType,
        file_hash: hash,
      })

      triggerDocumentIngest(payload.doc.id, onClassified, docType)
      onSuccess({ doc: payload.doc, duplicate: payload.duplicate }, docType)
    } catch (err) {
      if (uploadedPath) {
        await supabase.storage.from('documents').remove([uploadedPath]).catch(() => undefined)
      }
      onError?.(err, docType)
      console.error('Document upload failed:', getUploadErrorMessage(err), err)
    } finally {
      setUploading(null)
    }
  }

  return { inputRef, uploading, pick, handleFileChange }
}
