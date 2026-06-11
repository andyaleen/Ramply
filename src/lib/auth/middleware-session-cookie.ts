import type { NextRequest } from 'next/server'

const ANONYMOUS_PUBLIC_PATHS = new Set(['/', '/pricing', '/login'])

/** Marketing and auth entry routes that anonymous visitors can load without middleware auth. */
export function isAnonymousPublicPath(pathname: string): boolean {
  return ANONYMOUS_PUBLIC_PATHS.has(pathname)
}

/** True when the request includes a Supabase SSR auth session cookie (including chunks). */
export function hasSupabaseAuthSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (cookie) =>
      cookie.name.startsWith('sb-')
      && cookie.name.includes('-auth-token')
      && cookie.value.length > 0
  )
}

/** Skip `auth.getUser()` for anonymous visitors on public pages without auth callback params. */
export function shouldSkipMiddlewareAuth(
  pathname: string,
  request: NextRequest,
  hasAuthCallback: boolean,
  hasAuthError: boolean
): boolean {
  return (
    isAnonymousPublicPath(pathname)
    && !hasSupabaseAuthSessionCookie(request)
    && !hasAuthCallback
    && !hasAuthError
  )
}
