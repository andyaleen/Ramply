import type { SupabaseClient } from '@supabase/supabase-js'

import type { DocumentTypeKey } from '@/lib/catalog'
import type { CompanyDocumentRow } from '@/lib/database.types'

export interface CompleteVaultUploadInput {
  document_type: DocumentTypeKey
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
  file_hash: string
}

export interface CompleteVaultUploadResult {
  doc: CompanyDocumentRow
  duplicate: boolean
}

type VaultUploadRpcPayload = {
  doc: CompanyDocumentRow
  duplicate: boolean
}

/** True when the RPC has not been deployed to the connected Supabase project yet. */
export function isMissingVaultUploadRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST202') return true
  return /complete_vault_document_upload/i.test(error.message ?? '')
}

/** Persist vault metadata via Supabase RPC (same auth path as vault reads). */
export async function completeVaultDocumentUpload(
  supabase: SupabaseClient,
  upload: CompleteVaultUploadInput
): Promise<CompleteVaultUploadResult> {
  const { data, error } = await supabase.rpc('complete_vault_document_upload', {
    p_document_type: upload.document_type,
    p_file_path: upload.file_path,
    p_file_name: upload.file_name,
    p_file_size: upload.file_size,
    p_mime_type: upload.mime_type || 'application/octet-stream',
    p_file_hash: upload.file_hash,
  })

  if (error) throw error

  const payload = data as VaultUploadRpcPayload | null
  if (!payload?.doc) {
    throw new Error('Upload failed')
  }

  return payload
}

/** Fallback for environments without the RPC — uses the API route with a bearer token. */
export async function completeVaultDocumentUploadViaApi(
  supabase: SupabaseClient,
  upload: CompleteVaultUploadInput
): Promise<CompleteVaultUploadResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const accessToken = session?.access_token
  if (!accessToken) {
    throw new Error('Unauthorized')
  }

  const response = await fetch('/api/documents/upload/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
    body: JSON.stringify(upload),
  })

  const payload = (await response.json().catch(() => null)) as
    | (CompleteVaultUploadResult & { error?: string; message?: string })
    | null

  if (!response.ok) {
    throw new Error(payload?.error ?? payload?.message ?? 'Upload failed')
  }

  if (!payload?.doc) {
    throw new Error('Upload failed')
  }

  return { doc: payload.doc, duplicate: payload.duplicate }
}

/** Complete a storage upload using RPC, falling back to the API route when needed. */
export async function persistVaultUpload(
  supabase: SupabaseClient,
  upload: CompleteVaultUploadInput
): Promise<CompleteVaultUploadResult> {
  try {
    return await completeVaultDocumentUpload(supabase, upload)
  } catch (err) {
    const rpcError = err as { code?: string; message?: string }
    if (!isMissingVaultUploadRpc(rpcError)) throw err
    return completeVaultDocumentUploadViaApi(supabase, upload)
  }
}
