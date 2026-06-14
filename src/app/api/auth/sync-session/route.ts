import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { seedAppSessionActivityCookie } from '@/lib/auth/require-app-session'
import { enforceAuthRateLimit } from '@/lib/rate-limit/auth-rate-limits'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

/**
 * GET /api/auth/sync-session
 * Returns the server-side Supabase session so the browser client can mirror it
 * after OAuth (httpOnly cookies are not readable by client-side getSession).
 */
export async function GET(request: NextRequest) {
  const { supabase, withAuthCookies } = createRouteHandlerClient(request)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'No active session' }, { status: 401 })
  }

  const rateLimit = await enforceAuthRateLimit(request, 'auth-sync-session', {
    userId: user.id,
  })
  if (!rateLimit.ok) {
    return rateLimit.response
  }

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'No active session' }, { status: 401 })
  }

  await seedAppSessionActivityCookie(user)

  return withAuthCookies(
    NextResponse.json({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
    }),
  )
}
