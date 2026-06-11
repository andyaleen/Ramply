import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ShareRequestSchema } from '@/lib/validations'
import { reportServerError } from '@/lib/monitoring'
import { getShareLinkOrigin } from '@/lib/share-link-origin'
import { sendShareRequestInvite } from '@/lib/email/share-request-invite'
import { resolveUserBillingEmail } from '@/lib/billing'
import { checkSendRequestLimit } from '@/lib/plan-limits'
import { getShareRequestCounts } from '@/lib/request-usage'

/** Generate a URL-safe 32-byte hex token on the server. */
function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = ShareRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, subscription_status, subscription_price_id, legal_name')
    .eq('owner_user_id', user.id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 400 })
  }

  const counts = await getShareRequestCounts(supabase, company.id)
  const billingEmail = await resolveUserBillingEmail(supabase, user)
  const limit = checkSendRequestLimit(
    company.subscription_status,
    company.subscription_price_id,
    counts,
    billingEmail,
  )

  if (!limit.allowed && limit.error) {
    return NextResponse.json(
      { error: limit.error, message: limit.message },
      { status: 402 },
    )
  }

  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const recipientEmail = parsed.data.recipient_email.trim().toLowerCase()

  const { data: shareRequest, error: insertError } = await supabase
    .from('share_requests')
    .insert({
      requester_company_id: company.id,
      request_type: parsed.data.request_type,
      recipient_email: recipientEmail,
      mandatory_fields: parsed.data.mandatory_fields,
      optional_fields: parsed.data.optional_fields,
      mandatory_documents: parsed.data.mandatory_documents,
      optional_documents: parsed.data.optional_documents,
      token,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })
    .select('id, token')
    .single()

  if (insertError || !shareRequest) {
    reportServerError('share-requests.create', insertError ?? new Error('No row returned'))
    return NextResponse.json({ error: 'Failed to create share request' }, { status: 500 })
  }

  const shareUrl = `${getShareLinkOrigin(req)}/onboard/${token}`

  const fieldCount =
    parsed.data.mandatory_fields.length + parsed.data.optional_fields.length
  const documentCount =
    parsed.data.mandatory_documents.length + parsed.data.optional_documents.length

  const inviteResult = await sendShareRequestInvite({
    recipientEmail,
    requesterName: company.legal_name?.trim() || 'A Ramply customer',
    requestType: parsed.data.request_type,
    shareLink: shareUrl,
    fieldCount,
    documentCount,
  })

  if (!inviteResult.ok) {
    reportServerError('share-requests.invite-email', new Error(inviteResult.reason), {
      recipientEmail,
      shareRequestId: shareRequest.id,
    })
  }

  return NextResponse.json({
    link: shareUrl,
    recipient_email: recipientEmail,
    request_type: parsed.data.request_type,
    email_sent: inviteResult.ok,
    email_error: inviteResult.ok ? undefined : inviteResult.reason,
  })
}
