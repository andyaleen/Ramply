import type { ShareRequestRow } from '@/lib/database.types'
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

type RequesterCompanySummary = {
  legal_name: string | null
  dba_name: string | null
  contact_name: string | null
}

export type PendingReceivedShareRequest = {
  id: string
  token: string
  request_type: string
  created_at: string
  requesterName: string
}

export const RECIPIENT_REQUEST_COLUMNS =
  'id, token, request_type, mandatory_fields, optional_fields, mandatory_documents, optional_documents, status, created_at, completed_at'

type PendingReceivedShareRequestRow = {
  id: string
  token: string
  request_type: string
  created_at: string
  requester_company_legal_name: string | null
  requester_company_dba_name: string | null
  requester_company_contact_name: string | null
}

/** Prefer legal name, then DBA, then contact name for requester display. */
export function formatRequesterDisplayName(
  company: RequesterCompanySummary | null | undefined
): string {
  return (
    company?.legal_name?.trim()
    || company?.dba_name?.trim()
    || company?.contact_name?.trim()
    || 'A company'
  )
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

/** Load pending share requests sent to the signed-in user for dashboard review. */
export async function fetchPendingReceivedShareRequests(
  supabase: ReceivedRequestsClient,
  userEmail: string | null | undefined
): Promise<PendingReceivedShareRequest[]> {
  if (!safeLowerCase(userEmail)) return []

  const { data, error } = await supabase.rpc('get_pending_received_share_requests')
  if (error) throw error

  return (data ?? []).map((row) => {
    const request = row as PendingReceivedShareRequestRow

    return {
      id: request.id,
      token: request.token,
      request_type: request.request_type?.trim() || 'General Request',
      created_at: request.created_at,
      requesterName: formatRequesterDisplayName({
        legal_name: request.requester_company_legal_name,
        dba_name: request.requester_company_dba_name,
        contact_name: request.requester_company_contact_name,
      }),
    }
  })
}
