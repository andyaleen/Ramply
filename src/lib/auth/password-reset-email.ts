import { AUTH_UPDATE_PASSWORD_PATH } from '@/lib/auth/auth-redirect'
import { sendPasswordResetEmail } from '@/lib/email/password-reset'
import { readEnv } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

export type RequestPasswordResetResult =
  | { ok: true; channel: 'resend' }
  | { ok: false; reason: string; useClientFallback?: boolean }

/**
 * Builds a server-verifiable recovery URL (token_hash, no PKCE verifier required).
 */
export function buildPasswordResetCallbackUrl(tokenHash: string): string {
  const configuredOrigin = readEnv('NEXT_PUBLIC_APP_URL')?.replace(/\/$/, '')
  const origin = configuredOrigin || 'https://www.ramply.org'
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: 'recovery',
    next: AUTH_UPDATE_PASSWORD_PATH,
  })
  return `${origin}/auth/callback?${params.toString()}`
}

/**
 * Generates a recovery token and emails a link that works in any browser.
 */
export async function requestPasswordResetEmail(email: string): Promise<RequestPasswordResetResult> {
  const apiKey = readEnv('RESEND_API_KEY')
  if (!apiKey) {
    return { ok: false, reason: 'Resend is not configured', useClientFallback: true }
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { ok: false, reason: 'Admin credentials are not configured', useClientFallback: true }
  }

  const normalizedEmail = email.trim().toLowerCase()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: normalizedEmail,
  })

  if (error) {
    return { ok: false, reason: error.message }
  }

  const tokenHash = data?.properties?.hashed_token
  if (!tokenHash) {
    return { ok: false, reason: 'Recovery token was not generated' }
  }

  const resetLink = buildPasswordResetCallbackUrl(tokenHash)
  const sent = await sendPasswordResetEmail({
    recipientEmail: normalizedEmail,
    resetLink,
  })

  if (!sent.ok) {
    return { ok: false, reason: sent.reason }
  }

  return { ok: true, channel: 'resend' }
}
