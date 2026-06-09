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
> & {
  recipient_company_legal_name?: string | null
  recipient_company_dba_name?: string | null
}

export type RequesterRequestsClient = ReturnType<typeof createClient>

type PendingSentShareRequestRow = PendingSentRequest

function isMissingPendingSentRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST202') return true
  return /get_pending_sent_share_requests/i.test(error.message ?? '')
}

/** Outgoing share requests still awaiting recipient completion. */
export async function fetchPendingSentShareRequests(
  supabase: RequesterRequestsClient,
  companyId: string | null | undefined
): Promise<PendingSentRequest[]> {
  if (!companyId) return []

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_pending_sent_share_requests')

  if (!rpcError) {
    return (rpcData ?? []) as PendingSentRequest[]
  }

  if (!isMissingPendingSentRpc(rpcError)) {
    throw rpcError
  }

  const { data, error } = await supabase
    .from('share_requests')
    .select(
      'id, request_type, recipient_email, mandatory_fields, optional_fields, mandatory_documents, optional_documents, expires_at, opened_at, created_at'
    )
    .eq('requester_company_id', companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as PendingSentShareRequestRow[]
}
