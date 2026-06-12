import { createClient } from '@/lib/supabase/middleware'
import { getAuthConfirmNextPath } from '@/lib/auth/auth-redirect'
import {
  APP_SESSION_ACTIVITY_COOKIE,
  clearAppSessionActivityOnResponse,
  writeAppSessionActivityOnResponse,
} from '@/lib/auth/app-session-cookie'
import { shouldSkipMiddlewareAuth } from '@/lib/auth/middleware-session-cookie'
import { applyPasswordRecoveryRoutingHints } from '@/lib/auth/password-recovery-pending'
import { evaluateAppSessionForRequest } from '@/lib/auth/require-app-session'
import { isProtectedAppPath, isSafeRedirectPath, resolveRedirectTarget } from '@/lib/auth/routing'
import { AUTH_REDIRECT_REASON_SESSION_EXPIRED } from '@/lib/auth/session-policy'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const searchParams = request.nextUrl.searchParams

  const hasAuthCallback =
    searchParams.has('code')
    || searchParams.has('token_hash')
    || searchParams.has('access_token')
  const hasAuthError =
    searchParams.has('error') || searchParams.has('error_description')

  if (shouldSkipMiddlewareAuth(pathname, request, hasAuthCallback, hasAuthError)) {
    return NextResponse.next()
  }

  try {
    const { supabase, response } = createClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Legacy Supabase redirects may still target /auth/confirm?code=… — exchange on the server.
    if (
      pathname === '/auth/confirm'
      && searchParams.has('code')
      && !searchParams.has('access_token')
    ) {
      const callbackUrl = request.nextUrl.clone()
      callbackUrl.pathname = '/auth/callback'
      return NextResponse.redirect(callbackUrl)
    }

    const isProtectedRoute = isProtectedAppPath(pathname)
    const isAuthPage = pathname === '/login' || pathname === '/signup'
    const isAuthCallbackHandler =
      pathname === '/auth/callback' || pathname === '/auth/confirm'

    // Supabase may fall back to Site URL on any path (e.g. /auth/update-password?code=…)
    // when redirect_to is not allowlisted — always route through /auth/confirm.
    if (hasAuthCallback && !hasAuthError && !isAuthCallbackHandler) {
      const confirmUrl = request.nextUrl.clone()
      confirmUrl.pathname = searchParams.has('code') ? '/auth/callback' : '/auth/confirm'
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

    if (user) {
      const sessionState = evaluateAppSessionForRequest(user, request)
      if (!sessionState.ok) {
        await supabase.auth.signOut()
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.search = ''
        loginUrl.searchParams.set('reason', AUTH_REDIRECT_REASON_SESSION_EXPIRED)
        if (isProtectedRoute) {
          loginUrl.searchParams.set('redirect', `${pathname}${search}`)
        }
        const redirectResponse = NextResponse.redirect(loginUrl)
        clearAppSessionActivityOnResponse(redirectResponse)
        return redirectResponse
      }

      if (sessionState.refreshMetadata) {
        writeAppSessionActivityOnResponse(response, sessionState.refreshMetadata)
      } else if (!request.cookies.get(APP_SESSION_ACTIVITY_COOKIE)) {
        writeAppSessionActivityOnResponse(response, sessionState.metadata)
      }
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
      const { pathname, search } = resolveRedirectTarget(requestedRedirect, '/dashboard')
      redirectUrl.pathname = pathname
      redirectUrl.search = search
      return NextResponse.redirect(redirectUrl)
    }

    if (!user && request.cookies.get(APP_SESSION_ACTIVITY_COOKIE)) {
      clearAppSessionActivityOnResponse(response)
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
