import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { resolveUserBillingEmail } from '@/lib/billing'
import { checkSendRequestLimit } from '@/lib/plan-limits'
import { getShareRequestCounts } from '@/lib/request-usage'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { reportServerError } from '@/lib/monitoring'
import { enforceAuthenticatedRateLimit } from '@/lib/rate-limit/authenticated-rate-limits'
import { z } from 'zod'

const EnsureTemplateSubmissionSchema = z.object({
  template_token: z.string().trim().min(1, 'Template token is required'),
})

type ShareRequestForFulfillment = {
  id: string
  requester_company_id: string
  request_type: string
  recipient_email: string | null
  mandatory_fields: string[]
  optional_fields: string[]
  mandatory_documents: string[]
  optional_documents: string[]
  expires_at: string | null
  status: string
  completed_by_company_id: string | null
  completed_at: string | null
  denied_at: string | null
  denied_by_company_id: string | null
  opened_at: string | null
  source_template_id: string | null
  created_at: string
  updated_at: string
  requester_company_legal_name: string | null
}

/** Creates or resumes a pending share request for an authenticated template submitter. */
export async function POST(req: Request) {
  const supabase = await createClient()
  const session = await requireAppSession(supabase)
  if (!session.ok) return session.response

  const rateLimit = await enforceAuthenticatedRateLimit(req, 'template-submission-ensure', {
    userId: session.user.id,
  })
  if (!rateLimit.ok) {
    return rateLimit.response
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = EnsureTemplateSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const recipientEmail = session.user.email?.trim().toLowerCase()
  if (!recipientEmail) {
    return NextResponse.json({ error: 'Authenticated email is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: template, error: templateError } = await admin
    .from('request_templates')
    .select('id, company_id, name, mandatory_fields, optional_fields, mandatory_documents, optional_documents')
    .eq('public_token', parsed.data.template_token)
    .maybeSingle()

  if (templateError) {
    reportServerError('template-submissions.ensure.load-template', templateError)
    return NextResponse.json({ error: 'Failed to load template' }, { status: 500 })
  }
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const { data: requesterCompany, error: requesterError } = await admin
    .from('companies')
    .select('id, legal_name, subscription_status, subscription_price_id, owner_user_id')
    .eq('id', template.company_id)
    .single()

  if (requesterError || !requesterCompany) {
    reportServerError('template-submissions.ensure.load-requester', requesterError ?? new Error('No company'))
    return NextResponse.json({ error: 'Failed to load template owner' }, { status: 500 })
  }

  const { data: existingPending, error: existingError } = await admin
    .from('share_requests')
    .select('*')
    .eq('source_template_id', template.id)
    .ilike('recipient_email', recipientEmail)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingError) {
    reportServerError('template-submissions.ensure.load-existing', existingError)
    return NextResponse.json({ error: 'Failed to load submission' }, { status: 500 })
  }

  let shareRequest = existingPending

  if (!shareRequest) {
    const counts = await getShareRequestCounts(admin, requesterCompany.id)
    const billingEmail = await resolveUserBillingEmail(admin, { id: requesterCompany.owner_user_id })
    const limit = checkSendRequestLimit(
      requesterCompany.subscription_status,
      requesterCompany.subscription_price_id,
      counts,
      billingEmail,
    )

    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: 'template_submissions_closed',
          message: 'This form is not accepting new submissions right now. Please contact the sender.',
        },
        { status: 503 },
      )
    }

    const token = randomBytes(32).toString('hex')
    const { data: created, error: createError } = await admin
      .from('share_requests')
      .insert({
        requester_company_id: requesterCompany.id,
        request_type: template.name?.trim() || 'General Request',
        recipient_email: recipientEmail,
        mandatory_fields: template.mandatory_fields,
        optional_fields: template.optional_fields,
        mandatory_documents: template.mandatory_documents,
        optional_documents: template.optional_documents,
        token,
        status: 'pending',
        expires_at: null,
        source_template_id: template.id,
      })
      .select('*')
      .single()

    if (createError || !created) {
      reportServerError('template-submissions.ensure.create', createError ?? new Error('No row returned'))
      return NextResponse.json({ error: 'Failed to start submission' }, { status: 500 })
    }

    shareRequest = created
  }

  const response: ShareRequestForFulfillment = {
    id: shareRequest.id,
    requester_company_id: shareRequest.requester_company_id,
    request_type: shareRequest.request_type,
    recipient_email: shareRequest.recipient_email,
    mandatory_fields: shareRequest.mandatory_fields ?? [],
    optional_fields: shareRequest.optional_fields ?? [],
    mandatory_documents: shareRequest.mandatory_documents ?? [],
    optional_documents: shareRequest.optional_documents ?? [],
    expires_at: shareRequest.expires_at,
    status: shareRequest.status,
    completed_by_company_id: shareRequest.completed_by_company_id,
    completed_at: shareRequest.completed_at,
    denied_at: shareRequest.denied_at,
    denied_by_company_id: shareRequest.denied_by_company_id,
    opened_at: shareRequest.opened_at,
    source_template_id: shareRequest.source_template_id,
    created_at: shareRequest.created_at,
    updated_at: shareRequest.updated_at,
    requester_company_legal_name: requesterCompany.legal_name,
  }

  return NextResponse.json(response)
}
