import { createClient } from '@/lib/supabase/middleware'
import { isProtectedAppPath } from '@/lib/auth/routing'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

    if (pathname === '/' && user) {
      // Signed-in users skip the landing page and go straight to their
      // dashboard. Profile completeness / admin routing is handled inside
      // the dashboard shell, so there's no need to stop at /post-login.
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
      redirectUrl.pathname =
        requestedRedirect && requestedRedirect.startsWith('/')
          ? requestedRedirect.split('?')[0]
          : '/dashboard'
      redirectUrl.search = ''
      return NextResponse.redirect(redirectUrl)
    }

    return response
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
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
