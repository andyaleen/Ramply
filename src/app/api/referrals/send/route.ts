import { NextResponse } from 'next/server'
import { z } from 'zod'
import { EMAIL_DELIVERY_FAILED_MESSAGE } from '@/lib/api-error-response'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { createClient } from '@/lib/supabase/server'
import { buildReferralSignupUrl } from '@/lib/referrals/referral-link'
import { sendReferralInviteEmail } from '@/lib/email/referral-invite'
import { reportServerError } from '@/lib/monitoring'
import { getShareLinkOrigin } from '@/lib/share-link-origin'
import { enforceAuthenticatedRateLimit } from '@/lib/rate-limit/authenticated-rate-limits'

const SendReferralSchema = z.object({
  recipient_email: z.string().email(),
})

/** Sends a referral invite email to a prospective Ramply user. */
export async function POST(req: Request) {
  const supabase = await createClient()
  const session = await requireAppSession(supabase)
  if (!session.ok) return session.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = SendReferralSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const recipientEmail = parsed.data.recipient_email.trim().toLowerCase()
  const rateLimit = await enforceAuthenticatedRateLimit(req, 'referral-send', {
    userId: session.user.id,
    email: recipientEmail,
  })
  if (!rateLimit.ok) {
    return rateLimit.response
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, legal_name, contact_name')
    .eq('owner_user_id', session.user.id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 400 })
  }

  const companyName = company.legal_name?.trim() || 'Ramply'
  const referrerName = company.contact_name?.trim() || companyName
  const referralLink = buildReferralSignupUrl(getShareLinkOrigin(req), company.id)

  const emailResult = await sendReferralInviteEmail({
    recipientEmail,
    referrerName,
    companyName,
    referralLink,
  })

  if (!emailResult.ok) {
    reportServerError('referrals.send-email', new Error(emailResult.reason), {
      recipientEmail,
      companyId: company.id,
    })
    return NextResponse.json(
      {
        error: EMAIL_DELIVERY_FAILED_MESSAGE,
        link: referralLink,
        email_sent: false,
      },
      { status: emailResult.reason === 'Email service not configured' ? 503 : 502 }
    )
  }

  return NextResponse.json({
    link: referralLink,
    recipient_email: recipientEmail,
    email_sent: true,
    dev_logged: emailResult.devLogged ?? false,
  })
}
