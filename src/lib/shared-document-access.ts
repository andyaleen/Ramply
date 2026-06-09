import type { SupabaseClient } from '@supabase/supabase-js'

export type DownloadableDocument = {
  file_path: string
  file_name: string
}

/**
 * Resolve a company document the user may download as owner or completed-share requester.
 * Uses the service role with explicit access checks so downloads work when requester RLS
 * policies or RPC fallbacks are the only read path in the UI.
 */
export async function loadDownloadableDocumentForUser(
  admin: SupabaseClient,
  userId: string,
  documentId: string
): Promise<DownloadableDocument | null> {
  const { data: document, error: documentError } = await admin
    .from('company_documents')
    .select('file_path, file_name, company_id')
    .eq('id', documentId)
    .maybeSingle()

  if (documentError || !document?.file_path) {
    if (documentError) throw documentError
    return null
  }

  const { data: ownerCompany, error: ownerError } = await admin
    .from('companies')
    .select('id')
    .eq('id', document.company_id)
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (ownerError) throw ownerError

  if (ownerCompany) {
    return {
      file_path: document.file_path,
      file_name: document.file_name,
    }
  }

  const { data: shareLinks, error: shareLinksError } = await admin
    .from('shared_documents')
    .select('share_request_id')
    .eq('company_document_id', documentId)

  if (shareLinksError) throw shareLinksError
  if (!shareLinks?.length) return null

  const shareRequestIds = [...new Set(shareLinks.map((row) => row.share_request_id))]
  const { data: shareRequests, error: shareRequestsError } = await admin
    .from('share_requests')
    .select('requester_company_id')
    .in('id', shareRequestIds)
    .eq('status', 'completed')

  if (shareRequestsError) throw shareRequestsError
  if (!shareRequests?.length) return null

  const requesterCompanyIds = [
    ...new Set(shareRequests.map((row) => row.requester_company_id).filter(Boolean)),
  ]
  if (!requesterCompanyIds.length) return null

  const { data: requesterCompany, error: requesterError } = await admin
    .from('companies')
    .select('id')
    .in('id', requesterCompanyIds)
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (requesterError) throw requesterError
  if (!requesterCompany) return null

  return {
    file_path: document.file_path,
    file_name: document.file_name,
  }
}
