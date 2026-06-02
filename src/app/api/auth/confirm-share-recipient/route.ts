import { NextResponse } from 'next/server'
import { z } from 'zod'
import { canAutoConfirmShareRecipient } from '@/lib/auth/share-recipient-signup'
import { createAdminClient } from '@/lib/supabase/admin'
import { reportServerError } from '@/lib/monitoring'
import { safeLowerCase } from '@/lib/utils'

const ConfirmShareRecipientSchema = z.object({
  email: z.string().trim().email(),
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  userId: z.string().uuid(),
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

  const email = parsed.data.email.trim().toLowerCase()

  try {
    const admin = createAdminClient()

    const { data: shareRequest, error: shareError } = await admin
      .from('share_requests')
      .select('recipient_email, status, expires_at')
      .eq('token', parsed.data.token)
      .single()

    if (shareError || !shareRequest) {
      return NextResponse.json({ error: 'Share request not found' }, { status: 404 })
    }

    if (!canAutoConfirmShareRecipient(shareRequest, email)) {
      return NextResponse.json({ error: 'Email does not match this share request' }, { status: 403 })
    }

    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(parsed.data.userId)
    if (userError || !authUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (safeLowerCase(authUser.user.email) !== email) {
      return NextResponse.json({ error: 'User email mismatch' }, { status: 403 })
    }

    if (authUser.user.email_confirmed_at) {
      return NextResponse.json({ ok: true, alreadyConfirmed: true })
    }

    const { error: confirmError } = await admin.auth.admin.updateUserById(parsed.data.userId, {
      email_confirm: true,
    })

    if (confirmError) {
      reportServerError('confirm-share-recipient.updateUser', confirmError, { userId: parsed.data.userId })
      return NextResponse.json({ error: 'Failed to confirm account' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    reportServerError('confirm-share-recipient', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
