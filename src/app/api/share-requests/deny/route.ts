import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { sendShareRequestDeniedEmail } from '@/lib/email/share-request-denied'
import { reportServerError } from '@/lib/monitoring'
import { getShareLinkOrigin } from '@/lib/share-link-origin'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const DenyShareRequestSchema = z.object({
  share_request_id: z.string().uuid(),
})

/**
 * Lets an authenticated recipient decline a pending share request and notify the sender.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const session = await requireAppSession(supabase)
  if (!session.ok) return session.response
  const { user } = session

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = DenyShareRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { error: denyError } = await supabase.rpc('deny_share_request', {
    p_share_request_id: parsed.data.share_request_id,
  })

  if (denyError) {
    const message = denyError.message ?? 'Failed to deny share request'
    const status = message.includes('share_request_not_allowed') ? 403 : 500
    if (status >= 500) {
      reportServerError('share-requests.deny', denyError)
    }
    return NextResponse.json({ error: message }, { status })
  }

  const admin = createAdminClient()
  const { data: shareRequest, error: loadError } = await admin
    .from('share_requests')
    .select(`
      id,
      request_type,
      recipient_email,
      requester_company_id,
      companies (
        legal_name,
        dba_name,
        owner_user_id
      )
    `)
    .eq('id', parsed.data.share_request_id)
    .eq('status', 'denied')
    .maybeSingle()

  if (loadError || !shareRequest) {
    reportServerError(
      'share-requests.deny-load',
      loadError ?? new Error('Denied share request not found after update')
    )
    return NextResponse.json({ ok: true, email_sent: false })
  }

  const requesterCompany = Array.isArray(shareRequest.companies)
    ? shareRequest.companies[0]
    : shareRequest.companies

  let requesterEmail: string | null = null
  let recipientCompanyName: string | null = null

  if (requesterCompany?.owner_user_id) {
    const { data: requesterUser } = await admin
      .from('users')
      .select('email')
      .eq('id', requesterCompany.owner_user_id)
      .maybeSingle()

    requesterEmail = requesterUser?.email ?? null
  }

  const { data: recipientCompany } = await supabase
    .from('companies')
    .select('legal_name, dba_name')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  recipientCompanyName =
    recipientCompany?.legal_name?.trim()
    || recipientCompany?.dba_name?.trim()
    || null

  const responsesUrl = `${getShareLinkOrigin(req)}/dashboard/responses`
  let emailSent = false

  if (requesterEmail) {
    const emailResult = await sendShareRequestDeniedEmail({
      requesterEmail,
      requestType: shareRequest.request_type,
      recipientEmail: shareRequest.recipient_email ?? user.email ?? 'the recipient',
      recipientCompanyName,
      responsesUrl,
    })

    emailSent = emailResult.ok
    if (!emailResult.ok) {
      reportServerError('share-requests.deny-email', new Error(emailResult.reason), {
        shareRequestId: parsed.data.share_request_id,
        requesterEmail,
      })
    }
  }

  return NextResponse.json({ ok: true, email_sent: emailSent })
}
