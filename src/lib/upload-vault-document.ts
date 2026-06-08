import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

import type { DocumentTypeKey } from '@/lib/catalog'
import { persistVaultUpload } from '@/lib/complete-vault-upload'
import type { CompanyDocumentRow, CompanyRow } from '@/lib/database.types'
import {
  buildDocumentStoragePath,
  hashFileBytes,
} from '@/lib/document-upload'

export interface VaultUploadResult {
  doc: CompanyDocumentRow
  duplicate: boolean
}

/** Upload a file to storage and persist a Document Vault row for the given type. */
export async function uploadVaultDocument(options: {
  supabase: SupabaseClient
  user: User
  company: Pick<CompanyRow, 'id'>
  existingDocs: CompanyDocumentRow[]
  file: File
  docType: DocumentTypeKey
}): Promise<VaultUploadResult> {
  const { supabase, user, company, existingDocs, file, docType } = options

  const fileBuffer = await file.arrayBuffer()
  const hash = await hashFileBytes(fileBuffer)
  const existing = existingDocs.find((doc) => doc.document_type === docType) ?? null

  if (existing?.file_hash === hash) {
    return { doc: existing, duplicate: true }
  }

  const filePath = buildDocumentStoragePath(user.id, docType, file.name)
  const contentType = file.type || 'application/octet-stream'

  const { error: storageError } = await supabase.storage
    .from('documents')
    .upload(filePath, file, { upsert: false, contentType })

  if (storageError) {
    throw new Error(`storage: ${storageError.message}`)
  }

  const payload = await persistVaultUpload(supabase, {
    document_type: docType,
    file_path: filePath,
    file_name: file.name,
    file_size: file.size,
    mime_type: contentType,
    file_hash: hash,
  })

  return { doc: payload.doc, duplicate: payload.duplicate }
}
