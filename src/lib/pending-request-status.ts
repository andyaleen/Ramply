export type PendingRequestDisplayStatus = 'awaiting' | 'opened' | 'expired'

export const PENDING_REQUEST_STATUS_LABELS: Record<PendingRequestDisplayStatus, string> = {
  awaiting: 'Awaiting Response',
  opened: 'Opened',
  expired: 'Expired',
}

export const PENDING_REQUEST_STATUS_CLASSES: Record<PendingRequestDisplayStatus, string> = {
  awaiting: 'bg-yellow-100 text-yellow-800',
  opened: 'bg-blue-100 text-blue-800',
  expired: 'bg-red-100 text-red-800',
}

/** Derive requester-facing status for a pending outgoing share request. */
export function resolvePendingRequestDisplayStatus(request: {
  expires_at: string | null
  opened_at: string | null
}): PendingRequestDisplayStatus {
  if (request.expires_at && new Date(request.expires_at) < new Date()) {
    return 'expired'
  }
  if (request.opened_at) {
    return 'opened'
  }
  return 'awaiting'
}

export function isPendingRequestExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}
