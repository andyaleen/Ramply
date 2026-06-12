import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { sendShareRequestReminder } from '@/lib/email/share-request-reminder'
import { isPendingRequestExpired } from '@/lib/pending-request-status'
import { reportServerError } from '@/lib/monitoring'
import { getShareLinkOrigin } from '@/lib/share-link-origin'
import { createClient } from '@/lib/supabase/server'

const RemindShareRequestSchema = z.object({
  share_request_id: z.string().uuid(),
})

function resolveExpiresInDays(expiresAt: string | null): number {
  if (!expiresAt) return 30
  const msRemaining = new Date(expiresAt).getTime() - Date.now()
  return Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
}

/** Lets the requester send a reminder email for a pending share request they sent. */
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

  const parsed = RemindShareRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, legal_name')
    .eq('owner_user_id', session.user.id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 400 })
  }

  const { data: shareRequest, error: loadError } = await supabase
    .from('share_requests')
    .select(`
      id,
      request_type,
      recipient_email,
      token,
      status,
      expires_at,
      mandatory_fields,
      optional_fields,
      mandatory_documents,
      optional_documents
    `)
    .eq('id', parsed.data.share_request_id)
    .eq('requester_company_id', company.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (loadError) {
    reportServerError('share-requests.remind-load', loadError)
    return NextResponse.json({ error: 'Failed to load share request' }, { status: 500 })
  }

  if (!shareRequest) {
    return NextResponse.json({ error: 'share_request_not_allowed' }, { status: 403 })
  }

  if (isPendingRequestExpired(shareRequest.expires_at)) {
    return NextResponse.json({ error: 'Share request has expired' }, { status: 400 })
  }

  const recipientEmail = shareRequest.recipient_email?.trim()
  if (!recipientEmail) {
    return NextResponse.json({ error: 'No recipient email on this request' }, { status: 400 })
  }

  const shareUrl = `${getShareLinkOrigin(req)}/onboard/${shareRequest.token}`
  const fieldCount =
    shareRequest.mandatory_fields.length + shareRequest.optional_fields.length
  const documentCount =
    shareRequest.mandatory_documents.length + shareRequest.optional_documents.length

  const emailResult = await sendShareRequestReminder({
    recipientEmail,
    requesterName: company.legal_name?.trim() || 'A Ramply customer',
    requestType: shareRequest.request_type,
    shareLink: shareUrl,
    fieldCount,
    documentCount,
    expiresInDays: resolveExpiresInDays(shareRequest.expires_at),
  })

  if (!emailResult.ok) {
    reportServerError('share-requests.remind-email', new Error(emailResult.reason), {
      shareRequestId: shareRequest.id,
      recipientEmail,
    })
    return NextResponse.json({ error: emailResult.reason }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email_sent: true })
}
