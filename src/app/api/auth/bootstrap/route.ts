import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { bootstrapAppUser } from '@/lib/auth/bootstrap-app-user'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { reportServerError } from '@/lib/monitoring'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

/**
 * POST /api/auth/bootstrap
 * Ensures user + company rows exist for the active session (single server round-trip).
 */
export async function POST(request: NextRequest) {
  const { supabase, withAuthCookies } = createRouteHandlerClient(request)
  const session = await requireAppSession(supabase)

  if (!session.ok) {
    return session.response
  }

  try {
    const bootstrap = await bootstrapAppUser(supabase)
    return withAuthCookies(NextResponse.json(bootstrap))
  } catch (error) {
    reportServerError('auth-bootstrap', error)
    return NextResponse.json({ error: 'Failed to bootstrap account' }, { status: 500 })
  }
}
