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

const PENDING_SENT_BASE_COLUMNS =
  'id, request_type, recipient_email, mandatory_fields, optional_fields, mandatory_documents, optional_documents, expires_at, created_at'

const PENDING_SENT_FULL_COLUMNS = `${PENDING_SENT_BASE_COLUMNS}, opened_at`

function isMissingColumn(error: { code?: string; message?: string } | null, column: string): boolean {
  if (!error) return false
  if (error.code === 'PGRST204') return new RegExp(column, 'i').test(error.message ?? '')
  return new RegExp(column, 'i').test(error.message ?? '')
}

/** Load pending sent requests via table query when RPC is unavailable or broken. */
async function fetchPendingSentShareRequestsFromTable(
  supabase: RequesterRequestsClient,
  companyId: string
): Promise<PendingSentRequest[]> {
  const withOpened = await supabase
    .from('share_requests')
    .select(PENDING_SENT_FULL_COLUMNS)
    .eq('requester_company_id', companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (!withOpened.error) {
    return (withOpened.data ?? []).map((row) => ({
      ...(row as PendingSentRequest),
      opened_at: (row as PendingSentRequest).opened_at ?? null,
    }))
  }

  if (!isMissingColumn(withOpened.error, 'opened_at')) {
    throw withOpened.error
  }

  const legacy = await supabase
    .from('share_requests')
    .select(PENDING_SENT_BASE_COLUMNS)
    .eq('requester_company_id', companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (legacy.error) throw legacy.error

  return (legacy.data ?? []).map((row) => ({
    ...(row as PendingSentRequest),
    opened_at: null,
  }))
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

  return fetchPendingSentShareRequestsFromTable(supabase, companyId)
}
