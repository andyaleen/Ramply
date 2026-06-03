import type { SupabaseClient } from '@supabase/supabase-js'
import { findAuthUserIdByEmail } from '@/lib/auth/lookup-auth-user'
import { safeLowerCase } from '@/lib/utils'

export type AdminConfirmEmailResult =
  | { ok: true; alreadyConfirmed?: boolean }
  | { ok: false; status: number; error: string }

/**
 * Marks an auth user as email-confirmed via the Supabase admin API.
 */
export async function adminConfirmAuthUserEmail(
  admin: SupabaseClient,
  email: string,
  userId?: string
): Promise<AdminConfirmEmailResult> {
  const normalizedEmail = email.trim().toLowerCase()

  let resolvedUserId = userId
  if (!resolvedUserId) {
    resolvedUserId = (await findAuthUserIdByEmail(admin, normalizedEmail)) ?? undefined
  }

  if (!resolvedUserId) {
    return { ok: false, status: 404, error: 'User not found' }
  }

  const { data: authUser, error: userError } = await admin.auth.admin.getUserById(resolvedUserId)
  if (userError || !authUser.user) {
    return { ok: false, status: 404, error: 'User not found' }
  }

  if (safeLowerCase(authUser.user.email) !== normalizedEmail) {
    return { ok: false, status: 403, error: 'User email mismatch' }
  }

  if (authUser.user.email_confirmed_at) {
    return { ok: true, alreadyConfirmed: true }
  }

  const { error: confirmError } = await admin.auth.admin.updateUserById(resolvedUserId, {
    email_confirm: true,
  })

  if (confirmError) {
    return { ok: false, status: 500, error: 'Failed to confirm account' }
  }

  return { ok: true }
}

export function isEmailNotConfirmedError(message: string | undefined): boolean {
  return Boolean(message?.toLowerCase().includes('email not confirmed'))
}

/**
 * Supabase often returns "Invalid login credentials" for unconfirmed emails (anti-enumeration).
 */
export function isSignInBlockedByConfirmation(message: string | undefined): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return (
    isEmailNotConfirmedError(message)
    || lower.includes('invalid login credentials')
    || lower.includes('email not confirmed')
  )
}
