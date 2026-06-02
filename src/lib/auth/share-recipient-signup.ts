import { safeLowerCase } from '@/lib/utils'

export interface ShareRequestRecipientRow {
  recipient_email: string | null
  status: string | null
  expires_at: string | null
}

/**
 * Returns true when a share request is open and the email matches the invited recipient.
 */
export function canAutoConfirmShareRecipient(
  shareRequest: ShareRequestRecipientRow | null | undefined,
  email: string
): boolean {
  if (!shareRequest) return false

  const normalizedEmail = safeLowerCase(email)
  const recipientEmail = safeLowerCase(shareRequest.recipient_email)
  if (!normalizedEmail || !recipientEmail || normalizedEmail !== recipientEmail) {
    return false
  }

  if (shareRequest.status === 'completed' || shareRequest.status === 'expired') {
    return false
  }

  if (shareRequest.expires_at) {
    const expiresAt = Date.parse(shareRequest.expires_at)
    if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) {
      return false
    }
  }

  return true
}

/** Extract onboard token from paths like `/onboard/abc123`. */
export function extractShareRequestToken(path: string): string | null {
  const match = path.match(/^\/onboard\/([a-f0-9]{64})$/i)
  return match?.[1] ?? null
}
