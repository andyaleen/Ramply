import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { CompanyRow, CompanyDocumentRow } from '@/lib/database.types'
import type { DocumentTypeKey } from '@/lib/catalog'

/** SHA-256 hash of a File, returned as a hex string. Used for deduplication. */
async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

interface UploadResult {
  doc: CompanyDocumentRow
  /** True when the file hash matched an existing doc — no new row was created. */
  duplicate: boolean
}

interface UseDocumentUploadOptions {
  user: User | null
  company: Pick<CompanyRow, 'id'> | null
  /** Existing docs used for deduplication and versioning. */
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

/**
 * Manages document upload to Supabase storage + company_documents insert/supersede.
 * Triggers OCR via /api/documents/ingest after a successful upload.
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
    pendingType.current = docType
    inputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const docType = pendingType.current
    if (!file || !docType || !user || !company) return

    // Reset so the same file can be re-selected later
    e.target.value = ''

    setUploading(docType)
    try {
      const hash = await hashFile(file)
      const existing = existingDocs.find(d => d.document_type === docType) ?? null

      if (existing?.file_hash === hash) {
        onSuccess({ doc: existing, duplicate: true }, docType)
        return
      }

      const timestamp = Date.now()
      const filePath = `${user.id}/${docType}/${timestamp}_${file.name}`

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: false })

      if (storageError) throw storageError

      const nextVersion = (existing?.version ?? 0) + 1

      const { data: newRow, error: insertError } = await supabase
        .from('company_documents')
        .insert({
          company_id: company.id,
          document_type: docType,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          file_hash: hash,
          version: nextVersion,
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (existing) {
        await supabase
          .from('company_documents')
          .update({ superseded_by: newRow.id })
          .eq('id', existing.id)
      }

      // Trigger OCR + classification asynchronously — don't block the upload UX.
      // onClassified fires once the ingest API responds with a detected_document_type.
      if (onClassified) {
        fetch('/api/documents/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_document_id: newRow.id }),
        })
          .then(r => r.ok ? r.json() : null)
          .then((data: { detected_document_type?: string | null } | null) => {
            const detected = (data?.detected_document_type ?? null) as DocumentTypeKey | null
            onClassified(docType, detected)
          })
          .catch(err => console.error('OCR trigger failed:', err))
      } else {
        fetch('/api/documents/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_document_id: newRow.id }),
        }).catch(err => console.error('OCR trigger failed:', err))
      }

      onSuccess({ doc: newRow, duplicate: false }, docType)
    } catch (err) {
      onError?.(err, docType)
    } finally {
      setUploading(null)
    }
  }

  return { inputRef, uploading, pick, handleFileChange }
}
