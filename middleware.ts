import { createClient } from '@/lib/supabase/middleware'
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
    const hasAuthCode = request.nextUrl.searchParams.has('code')
    const isProtectedRoute = isProtectedAppPath(pathname)
    const isAuthPage = pathname === '/login' || pathname === '/signup'

    if (pathname === '/' && hasAuthCode) {
      const callbackUrl = request.nextUrl.clone()
      callbackUrl.pathname = '/auth/callback'
      if (!callbackUrl.searchParams.get('next')) {
        callbackUrl.searchParams.set('next', '/dashboard')
      }
      return NextResponse.redirect(callbackUrl)
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

    if (pathname === '/' && user) {
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
