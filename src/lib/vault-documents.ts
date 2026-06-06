import type { DocumentTypeKey } from '@/lib/catalog'
import type { CompanyDocumentRow } from '@/lib/database.types'
import type { createClient } from '@/lib/supabase/client'

export const VAULT_DOCS_QUERY_KEY = 'vault-docs'

export type VaultDocumentsClient = ReturnType<typeof createClient>

/** React Query key for a company's active Document Vault rows. */
export function vaultDocsQueryKey(companyId: string | undefined) {
  return [VAULT_DOCS_QUERY_KEY, companyId] as const
}

/** Load active vault documents (latest version per type, not superseded). */
export async function fetchActiveVaultDocuments(
  supabase: VaultDocumentsClient,
  companyId: string
): Promise<CompanyDocumentRow[]> {
  const { data, error } = await supabase
    .from('company_documents')
    .select('*')
    .eq('company_id', companyId)
    .is('superseded_by', null)
    .order('document_type', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Return the active vault document for a catalog type, if present. */
export function getVaultDocument(
  docs: CompanyDocumentRow[],
  documentType: DocumentTypeKey
): CompanyDocumentRow | null {
  return docs.find((doc) => doc.document_type === documentType) ?? null
}

/** True when the company already has an active vault document for this type. */
export function hasVaultDocument(
  docs: CompanyDocumentRow[],
  documentType: DocumentTypeKey
): boolean {
  return getVaultDocument(docs, documentType) !== null
}

/** Mandatory document types that are still missing from the vault. */
export function missingVaultDocumentTypes(
  docs: CompanyDocumentRow[],
  mandatoryTypes: DocumentTypeKey[]
): DocumentTypeKey[] {
  return mandatoryTypes.filter((documentType) => !hasVaultDocument(docs, documentType))
}
