import { formatDate } from '@/lib/utils'
import type { PendingSentRequest } from '@/lib/requester-pending-requests'

/** Build a display label for the recipient company on a pending request. */
export function pendingRecipientCompanyLabel(
  request: Pick<PendingSentRequest, 'recipient_company_legal_name' | 'recipient_company_dba_name'>
): string {
  return (
    request.recipient_company_legal_name?.trim()
    || request.recipient_company_dba_name?.trim()
    || ''
  )
}

/** Client-side filter for pending sent requests. */
export function filterPendingSentRequests(
  requests: PendingSentRequest[],
  query: string
): PendingSentRequest[] {
  const term = query.trim().toLowerCase()
  if (!term) return requests

  return requests.filter((request) => {
    const companyName = pendingRecipientCompanyLabel(request)
    const sentDate = formatDate(request.created_at)
    const haystack = [
      request.recipient_email ?? '',
      companyName,
      request.request_type ?? '',
      sentDate,
      request.created_at,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(term)
  })
}
