import type { ShareRequestRow, SharedDataRow, CompanyDocumentRow } from '@/lib/database.types'
import type { createClient } from '@/lib/supabase/client'
import { safeLowerCase } from '@/lib/utils'

export type RecipientRequest = Pick<
  ShareRequestRow,
  | 'id'
  | 'token'
  | 'request_type'
  | 'mandatory_fields'
  | 'optional_fields'
  | 'mandatory_documents'
  | 'optional_documents'
  | 'status'
  | 'created_at'
  | 'completed_at'
>

export type ReceivedRequestsClient = ReturnType<typeof createClient>

export type PendingReceivedShareRequest = {
  id: string
  token: string
  created_at: string
  companyName: string
  requesterEmail: string
  showEmailInSubtitle: boolean
}

export type CompletedReceivedShareRequest = Pick<
  ShareRequestRow,
  | 'id'
  | 'token'
  | 'request_type'
  | 'mandatory_fields'
  | 'optional_fields'
  | 'mandatory_documents'
  | 'optional_documents'
  | 'created_at'
  | 'completed_at'
> & {
  companyName: string | null
  requesterEmail: string
}

export type ReceivedSubmissionDetails = {
  sharedData: SharedDataRow | null
  sharedDocs: CompanyDocumentRow[]
}

export const RECIPIENT_REQUEST_COLUMNS =
  'id, token, request_type, mandatory_fields, optional_fields, mandatory_documents, optional_documents, status, created_at, completed_at'

type PendingReceivedShareRequestRow = {
  id: string
  token: string
  created_at: string
  requester_company_legal_name: string | null
  requester_company_dba_name: string | null
  requester_email: string | null
}

type CompletedReceivedShareRequestRow = PendingReceivedShareRequestRow & {
  request_type: string
  mandatory_fields: ShareRequestRow['mandatory_fields']
  optional_fields: ShareRequestRow['optional_fields']
  mandatory_documents: ShareRequestRow['mandatory_documents']
  optional_documents: ShareRequestRow['optional_documents']
  completed_at: string | null
}

/** Resolve requester company name from profile fields only. */
export function resolveRequesterCompanyName(row: {
  requester_company_legal_name: string | null
  requester_company_dba_name: string | null
}): string | null {
  return row.requester_company_legal_name?.trim()
    || row.requester_company_dba_name?.trim()
    || null
}

/** Build dashboard labels for a pending request from the requester company and account email. */
export function buildPendingReceivedRequestDisplay(row: {
  requester_company_legal_name: string | null
  requester_company_dba_name: string | null
  requester_email: string | null
}): Pick<PendingReceivedShareRequest, 'companyName' | 'requesterEmail' | 'showEmailInSubtitle'> {
  const email = row.requester_email?.trim() ?? ''
  const companyName =
    row.requester_company_legal_name?.trim()
    || row.requester_company_dba_name?.trim()
    || ''

  if (companyName) {
    return {
      companyName,
      requesterEmail: email,
      showEmailInSubtitle: Boolean(email),
    }
  }

  return {
    companyName: email || 'Unknown sender',
    requesterEmail: email,
    showEmailInSubtitle: false,
  }
}

/** Count pending share requests addressed to the signed-in user's email. */
export async function countPendingReceivedShareRequests(
  supabase: ReceivedRequestsClient,
  userEmail: string | null | undefined
): Promise<number> {
  const recipientEmail = safeLowerCase(userEmail)
  if (!recipientEmail) return 0

  const { count, data, error } = await supabase
    .from('share_requests')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_email', recipientEmail)
    .eq('status', 'pending')

  if (error) throw error
  return count ?? data?.length ?? 0
}

/** Load share requests addressed to the signed-in user's email. */
export async function fetchReceivedShareRequests(
  supabase: ReceivedRequestsClient,
  userEmail: string | null | undefined
): Promise<RecipientRequest[]> {
  const recipientEmail = safeLowerCase(userEmail)
  if (!recipientEmail) return []

  const { data, error } = await supabase
    .from('share_requests')
    .select(RECIPIENT_REQUEST_COLUMNS)
    .eq('recipient_email', recipientEmail)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as RecipientRequest[]
}

/** Load completed share requests sent to the signed-in user for the Received page. */
export async function fetchCompletedReceivedShareRequests(
  supabase: ReceivedRequestsClient,
  userEmail: string | null | undefined
): Promise<CompletedReceivedShareRequest[]> {
  if (!safeLowerCase(userEmail)) return []

  const { data, error } = await supabase.rpc('get_completed_received_share_requests')
  if (error) throw error

  return (data ?? []).map((row: CompletedReceivedShareRequestRow) => ({
    id: row.id,
    token: row.token,
    request_type: row.request_type,
    mandatory_fields: row.mandatory_fields ?? [],
    optional_fields: row.optional_fields ?? [],
    mandatory_documents: row.mandatory_documents ?? [],
    optional_documents: row.optional_documents ?? [],
    created_at: row.created_at,
    completed_at: row.completed_at,
    companyName: resolveRequesterCompanyName(row),
    requesterEmail: row.requester_email?.trim() ?? '',
  }))
}

/** Load submitted field data and documents for a completed received request. */
export async function fetchReceivedSubmissionDetails(
  supabase: ReceivedRequestsClient,
  shareRequestId: string
): Promise<ReceivedSubmissionDetails> {
  const { data: sharedData, error: sharedDataError } = await supabase
    .from('shared_data')
    .select('*')
    .eq('share_request_id', shareRequestId)
    .maybeSingle()

  if (sharedDataError) throw sharedDataError

  const { data: links, error: linksError } = await supabase
    .from('shared_documents')
    .select('company_document_id')
    .eq('share_request_id', shareRequestId)

  if (linksError) throw linksError

  const docIds = [...new Set((links ?? []).map((row) => row.company_document_id).filter(Boolean))]
  if (!docIds.length) {
    return { sharedData: sharedData ?? null, sharedDocs: [] }
  }

  const { data: docs, error: docsError } = await supabase
    .from('company_documents')
    .select('*')
    .in('id', docIds)

  if (docsError) throw docsError

  return {
    sharedData: sharedData ?? null,
    sharedDocs: (docs ?? []) as CompanyDocumentRow[],
  }
}

/** Load pending share requests sent to the signed-in user for dashboard review. */
export async function fetchPendingReceivedShareRequests(
  supabase: ReceivedRequestsClient,
  userEmail: string | null | undefined
): Promise<PendingReceivedShareRequest[]> {
  if (!safeLowerCase(userEmail)) return []

  const { data, error } = await supabase.rpc('get_pending_received_share_requests')
  if (error) throw error

  return (data ?? []).map((row: PendingReceivedShareRequestRow) => {
    const request = row
    const display = buildPendingReceivedRequestDisplay(request)

    return {
      id: request.id,
      token: request.token,
      created_at: request.created_at,
      ...display,
    }
  })
}
