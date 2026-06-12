import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requestPasswordResetEmail } from '@/lib/auth/password-reset-email'
import { reportServerError } from '@/lib/monitoring'
import { enforceAuthRateLimit } from '@/lib/rate-limit/auth-rate-limits'

const RequestPasswordResetSchema = z.object({
  email: z.string().trim().email(),
})

/**
 * Sends a password reset email via Resend with a token_hash link (no PKCE).
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestPasswordResetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const rateLimit = await enforceAuthRateLimit(req, 'request-password-reset', {
    email: parsed.data.email,
  })
  if (!rateLimit.ok) {
    return rateLimit.response
  }

  try {
    const result = await requestPasswordResetEmail(parsed.data.email)

    if (!result.ok) {
      if (result.useClientFallback) {
        return NextResponse.json(
          { code: 'USE_CLIENT_FALLBACK', error: result.reason },
          { status: 503 }
        )
      }

      if (result.reason.toLowerCase().includes('user') && result.reason.toLowerCase().includes('not')) {
        return NextResponse.json({ ok: true })
      }

      reportServerError('request-password-reset', new Error(result.reason))
      return NextResponse.json({ error: result.reason }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    reportServerError('request-password-reset', err)
    return NextResponse.json({ error: 'Failed to send password reset email' }, { status: 500 })
  }
}
