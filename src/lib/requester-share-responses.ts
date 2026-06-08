import type { CompanyDocumentRow, CompanyRow, SharedDataRow } from '@/lib/database.types'
import type { createClient } from '@/lib/supabase/client'

export const REQUESTER_DOCUMENT_COLUMNS =
  'id, company_id, document_type, file_path, file_name, file_size, mime_type, file_hash, version, superseded_by, uploaded_at'

export const REQUESTER_COMPANY_COLUMNS = 'id, legal_name, dba_name, owner_user_id'

export type RequesterShareResponsesClient = ReturnType<typeof createClient>

export type SharedDocumentLink = {
  share_request_id: string
  document: CompanyDocumentRow
}

type RpcSharedDocumentRow = SharedDocumentLink & CompanyDocumentRow & {
  share_request_id: string
}

/** Prefer shared field data when RLS hides the recipient company row. */
export function resolveRecipientCompanyLabel(
  company: Pick<CompanyRow, 'legal_name' | 'dba_name'> | null,
  sharedData: Pick<SharedDataRow, 'field_data'> | null,
  recipientEmail?: string | null
): string {
  if (company?.legal_name?.trim()) return company.legal_name.trim()
  if (company?.dba_name?.trim()) return company.dba_name.trim()

  const fields = (sharedData?.field_data ?? {}) as Record<string, unknown>
  if (typeof fields.legal_name === 'string' && fields.legal_name.trim()) {
    return fields.legal_name.trim()
  }
  if (typeof fields.dba_name === 'string' && fields.dba_name.trim()) {
    return fields.dba_name.trim()
  }

  return recipientEmail?.trim() || 'Unknown company'
}

/** Load documents shared with the signed-in requester for the given share requests. */
export async function fetchSharedDocumentsForRequester(
  supabase: RequesterShareResponsesClient,
  shareRequestIds: string[]
): Promise<SharedDocumentLink[]> {
  if (!shareRequestIds.length) return []

  const { data: links, error: linksError } = await supabase
    .from('shared_documents')
    .select('share_request_id, company_document_id')
    .in('share_request_id', shareRequestIds)

  if (linksError) {
    return fetchSharedDocumentsViaRpc(supabase, shareRequestIds)
  }

  const docIds = [...new Set((links ?? []).map((row) => row.company_document_id).filter(Boolean))]
  if (!docIds.length) return []

  const { data: docs, error: docsError } = await supabase
    .from('company_documents')
    .select(REQUESTER_DOCUMENT_COLUMNS)
    .in('id', docIds)

  const loadedCount = docs?.length ?? 0
  if (docsError || loadedCount === 0 || loadedCount < docIds.length) {
    return fetchSharedDocumentsViaRpc(supabase, shareRequestIds)
  }

  const docsById = new Map((docs as CompanyDocumentRow[]).map((doc) => [doc.id, doc]))

  return (links ?? [])
    .map((link) => {
      const document = docsById.get(link.company_document_id)
      if (!document) return null
      return {
        share_request_id: link.share_request_id,
        document,
      }
    })
    .filter((row): row is SharedDocumentLink => row !== null)
}

async function fetchSharedDocumentsViaRpc(
  supabase: RequesterShareResponsesClient,
  shareRequestIds: string[]
): Promise<SharedDocumentLink[]> {
  const { data, error } = await supabase.rpc('get_requester_shared_documents', {
    p_share_request_ids: shareRequestIds,
  })

  if (error) throw error

  return (data ?? []).map((row: RpcSharedDocumentRow) => ({
    share_request_id: row.share_request_id,
    document: {
      id: row.id,
      company_id: row.company_id,
      document_type: row.document_type,
      file_path: row.file_path,
      file_name: row.file_name,
      file_size: row.file_size,
      mime_type: row.mime_type,
      file_hash: row.file_hash,
      version: row.version,
      superseded_by: row.superseded_by,
      uploaded_at: row.uploaded_at,
      extracted_fields: {},
      approved_fields: null,
      approved_at: null,
    } as CompanyDocumentRow,
  }))
}

/** Load recipient company names visible to the signed-in requester. */
export async function fetchSharedRecipientCompanies(
  supabase: RequesterShareResponsesClient,
  companyIds: string[]
): Promise<CompanyRow[]> {
  if (!companyIds.length) return []

  const { data, error } = await supabase
    .from('companies')
    .select(REQUESTER_COMPANY_COLUMNS)
    .in('id', companyIds)

  if (!error && data?.length) {
    return data as CompanyRow[]
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_requester_shared_companies', {
    p_company_ids: companyIds,
  })

  if (rpcError) {
    if (error) throw error
    throw rpcError
  }

  return (rpcData ?? []) as CompanyRow[]
}
