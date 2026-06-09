import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Supabase client for Route Handlers — uses getAll/setAll so auth cookies
 * persist correctly on redirects (required by @supabase/ssr 0.6+).
 */
export function createRouteHandlerClient(
  request: NextRequest,
  buildResponse: () => NextResponse = () =>
    NextResponse.next({ request: { headers: request.headers } }),
) {
  let response = buildResponse()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = buildResponse()
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  /** Returns the response that accumulated auth cookies during the handler. */
  const getResponse = () => response

  /** Merges auth cookies onto a different response (e.g. JSON). */
  const withAuthCookies = <T extends NextResponse>(finalResponse: T): T => {
    response.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie)
    })
    return finalResponse
  }

  return { supabase, getResponse, withAuthCookies }
}
