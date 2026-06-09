import type { CompanyDocumentRow } from '@/lib/database.types'
import type { createClient } from '@/lib/supabase/client'

export const VAULT_DOCS_QUERY_KEY = 'vault-docs'
export const DOCUMENTS_STORAGE_BUCKET = 'documents'

const VAULT_DOCUMENT_CORE_COLUMNS =
  'id, company_id, document_type, file_path, file_name, file_size, mime_type, file_hash, version, superseded_by, uploaded_at'

export type VaultDocumentsClient = ReturnType<typeof createClient>

/** React Query key for a company's active Document Vault rows. */
export function vaultDocsQueryKey(companyId: string | undefined) {
  return [VAULT_DOCS_QUERY_KEY, companyId] as const
}

/** Load active vault documents (latest version per type, not superseded). */
export async function fetchActiveVaultDocuments(
  supabase: VaultDocumentsClient,
  _companyId: string
): Promise<CompanyDocumentRow[]> {
  const { data, error } = await supabase.rpc('get_my_active_vault_documents')

  if (error) {
    // Fallback for environments that have not applied the RPC migration yet.
    const { data: rows, error: tableError } = await supabase
      .from('company_documents')
      .select('*')
      .eq('company_id', _companyId)
      .is('superseded_by', null)
      .order('document_type', { ascending: true })

    if (tableError) throw tableError
    return rows ?? []
  }

  return data ?? []
}

/** Load one vault document by id (uses RPC list first for production schema compatibility). */
export async function fetchVaultDocumentById(
  supabase: VaultDocumentsClient,
  companyId: string,
  documentId: string
): Promise<CompanyDocumentRow | null> {
  const docs = await fetchActiveVaultDocuments(supabase, companyId)
  const fromVault = docs.find((doc) => doc.id === documentId)
  if (fromVault) return fromVault

  const { data, error } = await supabase
    .from('company_documents')
    .select(VAULT_DOCUMENT_CORE_COLUMNS)
    .eq('id', documentId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (error || !data) return null
  return data as CompanyDocumentRow
}

/** Optional approval/extraction columns — absent on some production schemas. */
export async function fetchVaultDocumentFieldOverrides(
  supabase: VaultDocumentsClient,
  companyId: string,
  documentId: string
): Promise<Pick<CompanyDocumentRow, 'extracted_fields' | 'approved_fields'> | null> {
  const { data, error } = await supabase
    .from('company_documents')
    .select('extracted_fields, approved_fields')
    .eq('id', documentId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (error || !data) return null
  return data as Pick<CompanyDocumentRow, 'extracted_fields' | 'approved_fields'>
}

/** Signed URL for viewing a vault file in the browser. */
export async function createVaultDocumentSignedUrl(
  supabase: VaultDocumentsClient,
  filePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_STORAGE_BUCKET)
    .createSignedUrl(filePath, expiresInSeconds)

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

/** Return the active vault document for a document type, if present. */
export function getVaultDocument(
  docs: CompanyDocumentRow[],
  documentType: string
): CompanyDocumentRow | null {
  return docs.find((doc) => doc.document_type === documentType) ?? null
}

/** True when the company already has an active vault document for this type. */
export function hasVaultDocument(
  docs: CompanyDocumentRow[],
  documentType: string
): boolean {
  return getVaultDocument(docs, documentType) !== null
}

/** Mandatory document types that are still missing from the vault. */
export function missingVaultDocumentTypes(
  docs: CompanyDocumentRow[],
  mandatoryTypes: string[]
): string[] {
  return mandatoryTypes.filter((documentType) => !hasVaultDocument(docs, documentType))
}
