'use client'

import { useQuery } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'
import { fetchActiveVaultDocuments, vaultDocsQueryKey } from '@/lib/vault-documents'

/** Load the signed-in company's active Document Vault for reuse across share requests. */
export function useVaultDocuments(companyId: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: vaultDocsQueryKey(companyId),
    queryFn: async () => {
      if (!companyId) return []
      return fetchActiveVaultDocuments(supabase, companyId)
    },
    enabled: !!companyId,
  })
}
