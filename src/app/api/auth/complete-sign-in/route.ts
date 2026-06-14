import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { completePasswordSignIn } from '@/lib/auth/complete-password-sign-in'
import { bootstrapAppUser } from '@/lib/auth/bootstrap-app-user'
import { seedAppSessionActivityCookie } from '@/lib/auth/require-app-session'
import { AUTH_PASSWORD_MIN_LENGTH } from '@/lib/auth/session-policy'
import { reportServerError } from '@/lib/monitoring'
import { enforceAuthRateLimit } from '@/lib/rate-limit/auth-rate-limits'
import { createAdminClient } from '@/lib/supabase/admin'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  INVALID_SIGN_IN_CREDENTIALS_CODE,
  INVALID_SIGN_IN_CREDENTIALS_MESSAGE,
} from '@/lib/auth/sign-in-errors'

const CompleteSignInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(AUTH_PASSWORD_MIN_LENGTH),
  shareToken: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  userId: z.string().uuid().optional(),
})

function readEmailForRateLimit(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || !('email' in body)) return undefined
  const email = (body as { email?: unknown }).email
  return typeof email === 'string' ? email : undefined
}

/**
 * Password sign-in that sets the session cookie and bypasses Supabase email confirmation.
 * Requires a valid password; share invites optionally validate the onboard token first.
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rateLimit = await enforceAuthRateLimit(request, 'complete-sign-in', {
    email: readEmailForRateLimit(body),
  })
  if (!rateLimit.ok) {
    return rateLimit.response
  }

  const parsed = CompleteSignInSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: INVALID_SIGN_IN_CREDENTIALS_MESSAGE,
        code: INVALID_SIGN_IN_CREDENTIALS_CODE,
      },
      { status: 401 },
    )
  }

  try {
    const { supabase, withAuthCookies } = createRouteHandlerClient(request)
    const admin = createAdminClient()
    const result = await completePasswordSignIn(supabase, admin, {
      email: parsed.data.email,
      password: parsed.data.password,
      shareToken: parsed.data.shareToken,
      userId: parsed.data.userId,
    })

    if (!result.ok) {
      if (result.status >= 500) {
        reportServerError('complete-sign-in', new Error(result.error))
      }
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status }
      )
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await seedAppSessionActivityCookie(user)
    }

    let bootstrap = null
    try {
      bootstrap = await bootstrapAppUser(supabase)
    } catch (bootstrapError) {
      reportServerError('complete-sign-in-bootstrap', bootstrapError)
    }

    return withAuthCookies(
      NextResponse.json({
        ok: true,
        session: result.session,
        bootstrap,
      })
    )
  } catch (error) {
    reportServerError('complete-sign-in', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
