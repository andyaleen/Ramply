import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getOwnedBillingCompany } from '@/lib/billing-company'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { isActiveSubscription } from '@/lib/plan-limits'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const DeleteAccountSchema = z.object({
  confirmation: z.literal('DELETE'),
})

/**
 * POST /api/account/delete
 * Permanently deletes the signed-in user's account and associated company data.
 */
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

  const parsed = DeleteAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Type DELETE to confirm account deletion' }, { status: 400 })
  }

  const company = await getOwnedBillingCompany(supabase, session.user.id)
  if (company?.stripe_subscription_id && isActiveSubscription(company.subscription_status)) {
    try {
      const stripe = getStripe()
      await stripe.subscriptions.cancel(company.stripe_subscription_id)
    } catch {
      return NextResponse.json({ error: 'Failed to cancel subscription before deleting account' }, { status: 500 })
    }
  }

  const admin = createAdminClient()
  const { error: deleteError } = await admin.auth.admin.deleteUser(session.user.id)
  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}
