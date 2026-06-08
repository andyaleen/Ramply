import { createClient } from '@/lib/supabase/middleware'
import { getAuthConfirmNextPath } from '@/lib/auth/auth-redirect'
import { applyPasswordRecoveryRoutingHints } from '@/lib/auth/password-recovery-pending'
import { isProtectedAppPath, isSafeRedirectPath, normalizeRequestedPath } from '@/lib/auth/routing'
import {
  AUTH_SESSION_ABSOLUTE_TIMEOUT_MS,
  AUTH_REDIRECT_REASON_SESSION_EXPIRED,
} from '@/lib/auth/session-policy'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Returns true when the authenticated session has exceeded the absolute
 * lifetime limit, based on the user's last sign-in timestamp.
 */
function isSessionExpired(user: { last_sign_in_at?: string | null }): boolean {
  const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0
  if (!lastSignIn) return false
  return Date.now() - lastSignIn > AUTH_SESSION_ABSOLUTE_TIMEOUT_MS
}

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = createClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { pathname, search } = request.nextUrl
    const searchParams = request.nextUrl.searchParams
    const hasAuthCallback =
      searchParams.has('code')
      || searchParams.has('token_hash')
      || searchParams.has('access_token')
    const hasAuthError =
      searchParams.has('error') || searchParams.has('error_description')
    const isProtectedRoute = isProtectedAppPath(pathname)
    const isAuthPage = pathname === '/login' || pathname === '/signup'
    const isAuthCallbackHandler =
      pathname === '/auth/confirm' || pathname === '/auth/callback'

    // Supabase may fall back to Site URL on any path (e.g. /auth/update-password?code=…)
    // when redirect_to is not allowlisted — always route through /auth/confirm.
    if (hasAuthCallback && !hasAuthError && !isAuthCallbackHandler) {
      const confirmUrl = request.nextUrl.clone()
      confirmUrl.pathname = '/auth/confirm'
      searchParams.forEach((value, key) => {
        confirmUrl.searchParams.set(key, value)
      })
      applyPasswordRecoveryRoutingHints(confirmUrl.searchParams)
      if (!confirmUrl.searchParams.get('next')) {
        confirmUrl.searchParams.set(
          'next',
          getAuthConfirmNextPath(null, confirmUrl.searchParams.get('type'))
        )
      }
      return NextResponse.redirect(confirmUrl)
    }

    if (user && isSessionExpired(user)) {
      await supabase.auth.signOut()
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.search = ''
      loginUrl.searchParams.set('reason', AUTH_REDIRECT_REASON_SESSION_EXPIRED)
      if (isProtectedRoute) {
        loginUrl.searchParams.set('redirect', `${pathname}${search}`)
      }
      return NextResponse.redirect(loginUrl)
    }

    if (pathname === '/' && user && !hasAuthCallback) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      redirectUrl.search = ''
      return NextResponse.redirect(redirectUrl)
    }

    if (!user && isProtectedRoute) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.search = ''
      loginUrl.searchParams.set('redirect', `${pathname}${search}`)
      return NextResponse.redirect(loginUrl)
    }

    if (user && isAuthPage) {
      // Already signed in — bounce straight to the requested destination
      // (or the dashboard) instead of flashing the legacy /post-login
      // interstitial. We re-resolve the redirect target on the client via
      // ProtectedAppShell, which covers profile completeness.
      const requestedRedirect = request.nextUrl.searchParams.get('redirect')
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = normalizeRequestedPath(
        requestedRedirect?.split('?')[0] ?? null,
        '/dashboard'
      )
      redirectUrl.search = ''
      return NextResponse.redirect(redirectUrl)
    }

    return response
  } catch {
    const { pathname, search } = request.nextUrl
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    if (isProtectedAppPath(pathname)) {
      const redirectTarget = isSafeRedirectPath(pathname) ? `${pathname}${search}` : '/dashboard'
      loginUrl.searchParams.set('redirect', redirectTarget)
    }
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
