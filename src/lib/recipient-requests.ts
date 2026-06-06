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

export type PendingReceivedShareRequest = {
  id: string
  token: string
  created_at: string
  companyName: string
  requesterEmail: string
  showEmailInSubtitle: boolean
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
