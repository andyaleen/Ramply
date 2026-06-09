import { getAuthConfirmNextPath } from '@/lib/auth/auth-redirect'
import { applyPasswordRecoveryRoutingHints } from '@/lib/auth/password-recovery-pending'

/**
 * Merges query-string and hash-fragment auth params (Supabase uses both).
 */
export function getAuthCallbackParamsFromLocation(
  location?: Pick<Location, 'search' | 'hash'>
): URLSearchParams {
  const search = location?.search ?? (typeof window !== 'undefined' ? window.location.search : '')
  const hash = location?.hash ?? (typeof window !== 'undefined' ? window.location.hash : '')
  const merged = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)

  const hashBody = hash.startsWith('#') ? hash.slice(1) : hash
  if (hashBody) {
    new URLSearchParams(hashBody).forEach((value, key) => {
      merged.set(key, value)
    })
  }

  return merged
}

export function hasAuthCallbackParams(params: URLSearchParams): boolean {
  return Boolean(
    params.get('code')
      || params.get('token_hash')
      || params.get('access_token')
      || params.get('error')
      || params.get('error_description')
  )
}

/**
 * Builds an auth handler path for callback params.
 * PKCE `code` links go to `/auth/callback` for server-side exchange.
 */
export function buildAuthConfirmPath(params: URLSearchParams): string {
  const handlerPath = params.get('code') && !params.get('access_token')
    ? '/auth/callback'
    : '/auth/confirm'

  applyPasswordRecoveryRoutingHints(params)
  const next = getAuthConfirmNextPath(params.get('next'), params.get('type'))
  const out = new URLSearchParams()

  for (const key of [
    'code',
    'token_hash',
    'type',
    'error',
    'error_description',
    'next',
    'access_token',
    'refresh_token',
  ]) {
    const value = params.get(key)
    if (value) out.set(key, value)
  }

  if (!out.get('next')) {
    out.set('next', next)
  }

  const query = out.toString()
  return query ? `${handlerPath}?${query}` : handlerPath
}
