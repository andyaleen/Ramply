import { normalizeRequestedPath } from '@/lib/auth/routing'

export const AUTH_UPDATE_PASSWORD_PATH = '/auth/update-password'

/**
 * Builds the redirect URL Supabase should return after email links (recovery, signup, etc.).
 */
export function buildSupabaseAuthRedirectUrl(nextPath: string): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  const browserOrigin =
    typeof window !== 'undefined' ? window.location.origin : undefined
  // Prefer configured app URL so OAuth redirect matches Supabase allowlist even when
  // the user started on www vs apex (e.g. www.ramply.org vs ramply.org).
  const origin = configuredOrigin ?? browserOrigin ?? 'http://localhost:3000'

  const next = normalizeRequestedPath(nextPath, '/dashboard')
  // Must match an entry in Supabase Auth → URL Configuration → Redirect URLs exactly.
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}`
}

/**
 * Redirect target for password-reset emails (include type=recovery for routing).
 */
export function buildPasswordRecoveryRedirectUrl(): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : configuredOrigin ?? 'http://localhost:3000'

  const next = encodeURIComponent(AUTH_UPDATE_PASSWORD_PATH)
  return `${origin}/auth/confirm?next=${next}&type=recovery`
}

/**
 * Default post-auth destination for recovery links.
 */
export function getAuthConfirmNextPath(
  requestedNext: string | null,
  type: string | null
): string {
  if (requestedNext) {
    return normalizeRequestedPath(requestedNext, '/dashboard')
  }
  if (type === 'recovery') {
    return AUTH_UPDATE_PASSWORD_PATH
  }
  return '/dashboard'
}
