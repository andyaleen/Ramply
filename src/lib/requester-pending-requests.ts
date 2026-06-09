import type { ShareRequestRow } from '@/lib/database.types'
import type { createClient } from '@/lib/supabase/client'

export type PendingSentRequest = Pick<
  ShareRequestRow,
  | 'id'
  | 'request_type'
  | 'recipient_email'
  | 'mandatory_fields'
  | 'optional_fields'
  | 'mandatory_documents'
  | 'optional_documents'
  | 'expires_at'
  | 'opened_at'
  | 'created_at'
>

export type RequesterRequestsClient = ReturnType<typeof createClient>

/** Outgoing share requests still awaiting recipient completion. */
export async function fetchPendingSentShareRequests(
  supabase: RequesterRequestsClient,
  companyId: string | null | undefined
): Promise<PendingSentRequest[]> {
  if (!companyId) return []

  const { data, error } = await supabase
    .from('share_requests')
    .select(
      'id, request_type, recipient_email, mandatory_fields, optional_fields, mandatory_documents, optional_documents, expires_at, opened_at, created_at'
    )
    .eq('requester_company_id', companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as PendingSentRequest[]
}
