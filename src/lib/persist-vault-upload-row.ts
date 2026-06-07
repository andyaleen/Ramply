import type { SupabaseClient } from '@supabase/supabase-js'

import {
  type CompleteVaultUploadInput,
  type CompleteVaultUploadResult,
  parseVaultUploadRpcResult,
} from '@/lib/complete-vault-upload'
import type { CompanyDocumentRow } from '@/lib/database.types'
import { isUserOwnedDocumentPath } from '@/lib/document-upload'

/** Save or version a vault row for the authenticated user. */
export async function persistVaultUploadRow(
  authedClient: SupabaseClient,
  dbClient: SupabaseClient,
  userId: string,
  upload: CompleteVaultUploadInput
): Promise<CompleteVaultUploadResult> {
  const rpc = await authedClient.rpc('complete_vault_document_upload', {
    p_document_type: upload.document_type,
    p_file_path: upload.file_path,
    p_file_name: upload.file_name,
    p_file_size: upload.file_size,
    p_mime_type: upload.mime_type || 'application/octet-stream',
    p_file_hash: upload.file_hash,
  })

  if (!rpc.error) {
    const parsed = parseVaultUploadRpcResult(rpc.data, upload)
    if (parsed) return parsed
    console.error('complete_vault_document_upload returned unexpected payload:', rpc.data)
  } else {
    console.error('complete_vault_document_upload RPC failed:', rpc.error)
  }

  if (!isUserOwnedDocumentPath(upload.file_path, userId)) {
    throw new Error('Invalid file path')
  }

  const { data: company, error: companyError } = await dbClient
    .from('companies')
    .select('id')
    .eq('owner_user_id', userId)
    .single()

  if (companyError || !company) {
    throw new Error('company_not_found')
  }

  const { data: existing, error: existingError } = await dbClient
    .from('company_documents')
    .select('*')
    .eq('company_id', company.id)
    .eq('document_type', upload.document_type)
    .is('superseded_by', null)
    .maybeSingle()

  if (existingError) throw existingError

  const existingDoc = existing as CompanyDocumentRow | null
  if (existingDoc?.file_hash === upload.file_hash) {
    return { doc: existingDoc, duplicate: true }
  }

  const nextVersion = (existingDoc?.version ?? 0) + 1
  const { error: insertError } = await dbClient.from('company_documents').insert({
    company_id: company.id,
    document_type: upload.document_type,
    file_path: upload.file_path,
    file_name: upload.file_name,
    file_size: upload.file_size,
    mime_type: upload.mime_type || 'application/octet-stream',
    file_hash: upload.file_hash,
    version: nextVersion,
  })

  if (insertError) throw insertError

  const { data: savedRow, error: savedError } = await dbClient
    .from('company_documents')
    .select('*')
    .eq('company_id', company.id)
    .eq('file_path', upload.file_path)
    .is('superseded_by', null)
    .maybeSingle()

  if (savedError) throw savedError
  if (!savedRow) throw new Error('Upload failed')

  if (existingDoc) {
    const { error: supersedeError } = await dbClient
      .from('company_documents')
      .update({ superseded_by: savedRow.id })
      .eq('id', existingDoc.id)

    if (supersedeError) throw supersedeError
  }

  return { doc: savedRow as CompanyDocumentRow, duplicate: false }
}
