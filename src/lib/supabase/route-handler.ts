import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Supabase client for Route Handlers — mirrors middleware cookie wiring so
 * sign-in can persist session cookies on the HTTP response.
 */
export function createRouteHandlerClient(request: NextRequest) {
  let cookieResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...options })
          cookieResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookieResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: '', ...options })
          cookieResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookieResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  /** Copies auth cookies collected during the handler onto the final response. */
  const withAuthCookies = <T extends NextResponse>(response: T): T => {
    cookieResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value)
    })
    return response
  }

  return { supabase, withAuthCookies }
}
