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

export const RECIPIENT_REQUEST_COLUMNS =
  'id, token, request_type, mandatory_fields, optional_fields, mandatory_documents, optional_documents, status, created_at, completed_at'

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
