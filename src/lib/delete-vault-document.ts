import type { CompanyDocumentRow } from '@/lib/database.types'
import { DOCUMENTS_STORAGE_BUCKET, type VaultDocumentsClient } from '@/lib/vault-documents'

/** Deletes an active vault document and restores the prior version when one exists. */
export async function deleteVaultDocument(
  supabase: VaultDocumentsClient,
  doc: Pick<CompanyDocumentRow, 'id' | 'file_path'>
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('company_documents')
    .delete()
    .eq('id', doc.id)

  if (deleteError) {
    throw deleteError
  }

  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_STORAGE_BUCKET)
    .remove([doc.file_path])

  if (storageError) {
    console.warn('Vault storage cleanup failed:', storageError.message)
  }
}
