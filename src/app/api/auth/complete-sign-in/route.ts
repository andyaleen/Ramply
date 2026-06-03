import { NextResponse } from 'next/server'
import { z } from 'zod'
import { completePasswordSignIn } from '@/lib/auth/complete-password-sign-in'
import { AUTH_PASSWORD_MIN_LENGTH } from '@/lib/auth/session-policy'
import { reportServerError } from '@/lib/monitoring'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const CompleteSignInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(AUTH_PASSWORD_MIN_LENGTH),
  shareToken: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  userId: z.string().uuid().optional(),
})

/**
 * Password sign-in that sets the session cookie and bypasses Supabase email confirmation.
 * Requires a valid password; share invites optionally validate the onboard token first.
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CompleteSignInSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const supabase = await createClient()
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

    return NextResponse.json({ ok: true })
  } catch (error) {
    reportServerError('complete-sign-in', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
