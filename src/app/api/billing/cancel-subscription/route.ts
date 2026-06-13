import { NextResponse } from 'next/server'
import { getOwnedBillingCompany } from '@/lib/billing-company'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { isActiveSubscription } from '@/lib/plan-limits'
import { getStripe } from '@/lib/stripe'
import { getSubscriptionPeriodEnd } from '@/lib/stripe-subscription'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/billing/cancel-subscription
 * Cancels the user's paid Stripe subscription and returns them to the free tier.
 */
export async function POST() {
  const supabase = await createClient()
  const session = await requireAppSession(supabase)
  if (!session.ok) return session.response

  const company = await getOwnedBillingCompany(supabase, session.user.id)
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  if (!company.stripe_subscription_id || !isActiveSubscription(company.subscription_status)) {
    return NextResponse.json({ ok: true, plan: 'free' })
  }

  const stripe = getStripe()
  const canceled = await stripe.subscriptions.cancel(company.stripe_subscription_id)

  const { error: updateError } = await supabase
    .from('companies')
    .update({
      subscription_status: canceled.status,
      subscription_price_id: null,
      subscription_current_period_end: getSubscriptionPeriodEnd(canceled),
      updated_at: new Date().toISOString(),
    })
    .eq('id', company.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update subscription status' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, plan: 'free' })
}
