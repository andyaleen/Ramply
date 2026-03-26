import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ShareRequestSchema } from '@/lib/validations'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'

/** Generate a URL-safe 32-byte hex token on the server. */
function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = ShareRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, legal_name, subscription_status')
    .eq('owner_user_id', user.id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 400 })
  }

  // Enforce free-tier limit: max 3 unique connected companies
  const isSubscribed = company.subscription_status === 'active' ||
    company.subscription_status === 'trialing'

  if (!isSubscribed) {
    const { data: connections } = await supabase
      .from('share_requests')
      .select('completed_by_company_id')
      .eq('requester_company_id', company.id)
      .eq('status', 'completed')
      .not('completed_by_company_id', 'is', null)

    const uniqueConnected = new Set(
      (connections ?? []).map((r) => r.completed_by_company_id)
    ).size

    if (uniqueConnected >= 3) {
      return NextResponse.json(
        { error: 'free_tier_limit', message: 'Upgrade to Pro to connect with more than 3 companies.' },
        { status: 402 }
      )
    }
  }

  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const { data: shareRequest, error: insertError } = await supabase
    .from('share_requests')
    .insert({
      requester_company_id: company.id,
      recipient_email: parsed.data.recipient_email,
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
    console.error('Failed to insert share request:', insertError)
    return NextResponse.json({ error: 'Failed to create share request' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const shareUrl = `${appUrl}/onboard/${token}`
  const requesterName = company.legal_name ?? 'A company'
  const totalFields = parsed.data.mandatory_fields.length + parsed.data.optional_fields.length
  const totalDocs = parsed.data.mandatory_documents.length + parsed.data.optional_documents.length

  // Send invite email — failure is non-blocking
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Ramply <info@ramply.org>',
      to: parsed.data.recipient_email,
      subject: `${requesterName} is requesting your company information`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="margin-bottom:8px;">You have a share request</h2>
          <p style="color:#374151;"><strong>${requesterName}</strong> is requesting:</p>
          <ul style="color:#374151;margin:8px 0 16px;">
            <li>${totalFields} information field${totalFields !== 1 ? 's' : ''}</li>
            <li>${totalDocs} document${totalDocs !== 1 ? 's' : ''}</li>
          </ul>
          <p>Click below to review and share your information:</p>
          <a href="${shareUrl}"
            style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:8px;">
            Review &amp; Share
          </a>
          <p style="margin-top:24px;color:#6b7280;font-size:13px;">
            This link expires in 30 days. If you did not expect this email, you can safely ignore it.
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error('Invite email failed (non-blocking):', err)
  }

  return NextResponse.json({ link: shareUrl })
}
