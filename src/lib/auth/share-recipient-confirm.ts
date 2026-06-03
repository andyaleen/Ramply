import type { SupabaseClient } from '@supabase/supabase-js'
import { adminConfirmAuthUserEmail, type AdminConfirmEmailResult } from '@/lib/auth/admin-confirm-email'
import { findAuthUserIdByEmail } from '@/lib/auth/lookup-auth-user'
import { canAutoConfirmShareRecipient, type ShareRequestRecipientRow } from '@/lib/auth/share-recipient-signup'
import { safeLowerCase } from '@/lib/utils'

export type ConfirmShareRecipientResult = AdminConfirmEmailResult

export { findAuthUserIdByEmail }

/**
 * Marks a share-invite recipient as email-confirmed when their signup email matches the invite.
 */
export async function confirmShareRecipientAccount(
  admin: SupabaseClient,
  params: {
    email: string
    token: string
    userId?: string
    shareRequest?: ShareRequestRecipientRow | null
  }
): Promise<ConfirmShareRecipientResult> {
  const email = params.email.trim().toLowerCase()

  let shareRequest = params.shareRequest
  if (!shareRequest) {
    const { data, error } = await admin
      .from('share_requests')
      .select('recipient_email, status, expires_at')
      .eq('token', params.token)
      .single()

    if (error || !data) {
      return { ok: false, status: 404, error: 'Share request not found' }
    }
    shareRequest = data
  }

  if (!canAutoConfirmShareRecipient(shareRequest, email)) {
    return { ok: false, status: 403, error: 'Email does not match this share request' }
  }

  let userId = params.userId
  if (!userId) {
    userId = (await findAuthUserIdByEmail(admin, email)) ?? undefined
  }

  if (!userId) {
    return { ok: false, status: 404, error: 'User not found' }
  }

  const { data: authUser, error: userError } = await admin.auth.admin.getUserById(userId)
  if (userError || !authUser.user) {
    return { ok: false, status: 404, error: 'User not found' }
  }

  if (safeLowerCase(authUser.user.email) !== email) {
    return { ok: false, status: 403, error: 'User email mismatch' }
  }

  return adminConfirmAuthUserEmail(admin, email, userId)
}
