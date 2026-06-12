import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  INVITE_CONFIRMATION_FAILURE_CODE,
  INVITE_CONFIRMATION_FAILURE_MESSAGE,
} from '@/lib/auth/sign-in-errors'
import { confirmShareRecipientAccount } from '@/lib/auth/share-recipient-confirm'
import { createAdminClient } from '@/lib/supabase/admin'
import { reportServerError } from '@/lib/monitoring'
import { enforceAuthRateLimit } from '@/lib/rate-limit/auth-rate-limits'

const ConfirmShareRecipientSchema = z.object({
  email: z.string().trim().email(),
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  userId: z.string().uuid().optional(),
})

/**
 * Confirms email for users who signed up from a share-request invite.
 * The invite email already verified inbox access, so Supabase confirmation is skipped.
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ConfirmShareRecipientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const rateLimit = await enforceAuthRateLimit(req, 'confirm-share-recipient', {
    email: parsed.data.email,
  })
  if (!rateLimit.ok) {
    return rateLimit.response
  }

  try {
    const admin = createAdminClient()
    const result = await confirmShareRecipientAccount(admin, {
      email: parsed.data.email,
      token: parsed.data.token,
      userId: parsed.data.userId,
    })

    if (!result.ok) {
      if (result.status >= 500) {
        reportServerError('confirm-share-recipient', new Error(result.error), {
          userId: parsed.data.userId,
        })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }

      return NextResponse.json(
        { error: INVITE_CONFIRMATION_FAILURE_MESSAGE, code: INVITE_CONFIRMATION_FAILURE_CODE },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, alreadyConfirmed: result.alreadyConfirmed })
  } catch (error) {
    reportServerError('confirm-share-recipient', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
