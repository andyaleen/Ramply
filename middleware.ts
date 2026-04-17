import { createClient } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = createClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { pathname, search } = request.nextUrl
    const isProtectedRoute =
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/admin') ||
      pathname === '/complete-profile' ||
      pathname === '/post-login' ||
      pathname === '/promote' ||
      pathname === '/signout'
    const isAuthPage = pathname === '/login' || pathname === '/signup'

    if (!user && isProtectedRoute) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.search = ''
      loginUrl.searchParams.set('redirect', `${pathname}${search}`)
      return NextResponse.redirect(loginUrl)
    }

    if (user && isAuthPage) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/post-login'
      redirectUrl.search = ''
      redirectUrl.searchParams.set('next', '/dashboard')
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
