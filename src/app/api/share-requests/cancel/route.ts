import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { reportServerError } from '@/lib/monitoring'
import { createClient } from '@/lib/supabase/server'

const CancelShareRequestSchema = z.object({
  share_request_id: z.string().uuid(),
})

/** Lets the requester cancel a pending share request they sent. */
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

  const parsed = CancelShareRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { error: cancelError } = await supabase.rpc('cancel_share_request', {
    p_share_request_id: parsed.data.share_request_id,
  })

  if (cancelError) {
    const message = cancelError.message ?? 'Failed to cancel share request'
    const status = message.includes('share_request_not_allowed') ? 403 : 500
    if (status >= 500) {
      reportServerError('share-requests.cancel', cancelError)
    }
    return NextResponse.json({ error: message }, { status })
  }

  return NextResponse.json({ ok: true })
}
