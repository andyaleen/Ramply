import { normalizeRequestedPath } from '@/lib/auth/routing'

export const AUTH_UPDATE_PASSWORD_PATH = '/auth/update-password'

/**
 * Resolves the app origin for auth redirects.
 * In development, prefer the live browser origin so OAuth PKCE works on any local port.
 * In production, prefer NEXT_PUBLIC_APP_URL so callbacks match the Supabase allowlist.
 */
export function resolveAuthRedirectOrigin(browserOrigin?: string): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')

  if (process.env.NODE_ENV === 'development' && browserOrigin) {
    return browserOrigin
  }

  return configuredOrigin ?? browserOrigin ?? 'http://localhost:3000'
}

/**
 * Builds the redirect URL Supabase should return after email links (recovery, signup, etc.).
 */
export function buildSupabaseAuthRedirectUrl(nextPath: string): string {
  const browserOrigin =
    typeof window !== 'undefined' ? window.location.origin : undefined
  const origin = resolveAuthRedirectOrigin(browserOrigin)

  const next = normalizeRequestedPath(nextPath, '/dashboard')
  // PKCE codes are exchanged server-side in /auth/callback (see route handler).
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`
}

/**
 * Redirect target for password-reset emails (include type=recovery for routing).
 */
export function buildPasswordRecoveryRedirectUrl(): string {
  const browserOrigin =
    typeof window !== 'undefined' ? window.location.origin : undefined
  const origin = resolveAuthRedirectOrigin(browserOrigin)

  const next = encodeURIComponent(AUTH_UPDATE_PASSWORD_PATH)
  return `${origin}/auth/callback?next=${next}&type=recovery`
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
