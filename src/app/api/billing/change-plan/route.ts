import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getOwnedBillingCompany } from '@/lib/billing-company'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { isActiveSubscription } from '@/lib/plan-limits'
import { getStripe, getStripePriceId, type CheckoutPlan } from '@/lib/stripe'
import { getSubscriptionPeriodEnd } from '@/lib/stripe-subscription'
import { createClient } from '@/lib/supabase/server'

const ChangePlanSchema = z.object({
  plan: z.enum(['classic', 'pro']),
})

/**
 * POST /api/billing/change-plan
 * Switches an active Stripe subscription between Classic and Ramply Pro.
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

  const parsed = ChangePlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const company = await getOwnedBillingCompany(supabase, session.user.id)
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  if (!company.stripe_subscription_id || !isActiveSubscription(company.subscription_status)) {
    return NextResponse.json({ error: 'No active subscription to change' }, { status: 400 })
  }

  const plan = parsed.data.plan as CheckoutPlan
  const priceId = getStripePriceId(plan)
  if (company.subscription_price_id === priceId) {
    return NextResponse.json({ ok: true, plan })
  }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(company.stripe_subscription_id)
  const subscriptionItemId = subscription.items.data[0]?.id

  if (!subscriptionItemId) {
    return NextResponse.json({ error: 'Subscription item not found' }, { status: 400 })
  }

  const updated = await stripe.subscriptions.update(company.stripe_subscription_id, {
    items: [{ id: subscriptionItemId, price: priceId }],
    proration_behavior: 'create_prorations',
    metadata: { company_id: company.id, plan },
  })

  const { error: updateError } = await supabase
    .from('companies')
    .update({
      subscription_status: updated.status,
      subscription_price_id: updated.items.data[0]?.price.id ?? priceId,
      subscription_current_period_end: getSubscriptionPeriodEnd(updated),
      updated_at: new Date().toISOString(),
    })
    .eq('id', company.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, plan })
}
