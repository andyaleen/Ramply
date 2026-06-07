import type { SupabaseClient } from '@supabase/supabase-js'

import type { DocumentTypeKey } from '@/lib/catalog'
import type { CompanyDocumentRow } from '@/lib/database.types'
import { getVaultDocument } from '@/lib/vault-documents'

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

/** True when the RPC has not been deployed to the connected Supabase project yet. */
export function isMissingVaultUploadRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST202') return true
  return /complete_vault_document_upload/i.test(error.message ?? '')
}

function isCompanyDocumentRow(value: unknown): value is CompanyDocumentRow {
  return (
    typeof value === 'object'
    && value !== null
    && 'id' in value
    && 'document_type' in value
    && 'company_id' in value
  )
}

/** Normalize RPC payloads from JSONB wrappers, row returns, or legacy shapes. */
export function parseVaultUploadRpcResult(
  data: unknown,
  upload: CompleteVaultUploadInput
): CompleteVaultUploadResult | null {
  if (data == null) return null

  let parsed: unknown = data
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data)
    } catch {
      return null
    }
  }

  if (Array.isArray(parsed)) {
    const first = parsed[0]
    if (isCompanyDocumentRow(first)) {
      return {
        doc: first,
        duplicate: first.file_hash === upload.file_hash && first.file_path !== upload.file_path,
      }
    }
    if (typeof first === 'object' && first !== null) {
      return parseVaultUploadRpcResult(first, upload)
    }
    return null
  }

  if (isCompanyDocumentRow(parsed)) {
    return {
      doc: parsed,
      duplicate: parsed.file_hash === upload.file_hash && parsed.file_path !== upload.file_path,
    }
  }

  if (typeof parsed === 'object' && parsed !== null && 'doc' in parsed) {
    const record = parsed as { doc: unknown; duplicate?: unknown }
    if (isCompanyDocumentRow(record.doc)) {
      return {
        doc: record.doc,
        duplicate: record.duplicate === true,
      }
    }
  }

  return null
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

  const parsed = parseVaultUploadRpcResult(data, upload)
  if (!parsed) {
    throw new Error('rpc_invalid_response')
  }

  return parsed
}

/** Persist vault metadata with the signed-in user's RLS policies. */
export async function completeVaultDocumentUploadDirect(
  supabase: SupabaseClient,
  upload: CompleteVaultUploadInput
): Promise<CompleteVaultUploadResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  if (companyError || !company) {
    throw new Error('company_not_found')
  }

  const { data: existing, error: existingError } = await supabase
    .from('company_documents')
    .select('*')
    .eq('company_id', company.id)
    .eq('document_type', upload.document_type)
    .is('superseded_by', null)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing?.file_hash === upload.file_hash) {
    return { doc: existing, duplicate: true }
  }

  const nextVersion = (existing?.version ?? 0) + 1
  const { error: insertError } = await supabase.from('company_documents').insert({
    company_id: company.id,
    document_type: upload.document_type,
    file_path: upload.file_path,
    file_name: upload.file_name,
    file_size: upload.file_size,
    mime_type: upload.mime_type || 'application/octet-stream',
    file_hash: upload.file_hash,
    version: nextVersion,
    extracted_fields: {},
  })

  if (insertError) throw insertError

  if (existing) {
    const { data: replacement, error: replacementError } = await supabase
      .from('company_documents')
      .select('id')
      .eq('company_id', company.id)
      .eq('document_type', upload.document_type)
      .eq('file_path', upload.file_path)
      .is('superseded_by', null)
      .maybeSingle()

    if (replacementError) throw replacementError
    if (!replacement) throw new Error('Upload failed')

    const { error: supersedeError } = await supabase
      .from('company_documents')
      .update({ superseded_by: replacement.id })
      .eq('id', existing.id)

    if (supersedeError) throw supersedeError
  }

  let doc: CompanyDocumentRow | null = null
  const { data: rows, error: reloadError } = await supabase.rpc('get_my_active_vault_documents')
  if (!reloadError) {
    doc = getVaultDocument((rows ?? []) as CompanyDocumentRow[], upload.document_type)
  } else {
    const { data: tableRow, error: tableError } = await supabase
      .from('company_documents')
      .select('*')
      .eq('company_id', company.id)
      .eq('document_type', upload.document_type)
      .eq('file_path', upload.file_path)
      .is('superseded_by', null)
      .maybeSingle()

    if (tableError) throw tableError
    doc = tableRow as CompanyDocumentRow | null
  }

  if (!doc || doc.file_path !== upload.file_path) {
    throw new Error('Upload failed')
  }

  return { doc, duplicate: false }
}

/** Resolve a fresh access token for server-side vault completion. */
export async function getVaultUploadAccessToken(
  supabase: SupabaseClient
): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Unauthorized')
  }

  const refreshed = await supabase.auth.refreshSession()
  const accessToken =
    refreshed.data.session?.access_token
    ?? (await supabase.auth.getSession()).data.session?.access_token

  if (!accessToken) {
    throw new Error('Unauthorized')
  }

  return accessToken
}

/** Complete vault metadata through the server API with a bearer token. */
export async function completeVaultDocumentUploadViaApi(
  supabase: SupabaseClient,
  upload: CompleteVaultUploadInput
): Promise<CompleteVaultUploadResult> {
  const accessToken = await getVaultUploadAccessToken(supabase)

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

/** Complete a storage upload — API first (RPC + admin fallback server-side), then client fallbacks. */
export async function persistVaultUpload(
  supabase: SupabaseClient,
  upload: CompleteVaultUploadInput
): Promise<CompleteVaultUploadResult> {
  const attempts: Array<{
    name: string
    run: () => Promise<CompleteVaultUploadResult>
  }> = [
    { name: 'api', run: () => completeVaultDocumentUploadViaApi(supabase, upload) },
    { name: 'rpc', run: () => completeVaultDocumentUpload(supabase, upload) },
    { name: 'direct', run: () => completeVaultDocumentUploadDirect(supabase, upload) },
  ]

  const errors: string[] = []

  for (const attempt of attempts) {
    try {
      return await attempt.run()
    } catch (err) {
      const message = getVaultUploadAttemptError(err)
      errors.push(`${attempt.name}: ${message}`)
      console.error(`Vault upload via ${attempt.name} failed:`, err)
    }
  }

  throw new Error(errors.join(' | ') || 'Upload failed')
}

function getVaultUploadAttemptError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return 'Upload failed'
}
