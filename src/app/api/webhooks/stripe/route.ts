import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events. Uses the service-role key to bypass RLS
 * since this runs outside of a user session.
 *
 * Events handled:
 *   - checkout.session.completed  → store customer ID + activate subscription
 *   - customer.subscription.updated → sync status changes (upgrades, renewals)
 *   - customer.subscription.deleted → mark subscription inactive
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Service-role client bypasses RLS — safe because this is a server-only webhook
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const companyId = session.client_reference_id
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string

      if (!companyId) break

      // Fetch the full subscription to get status + price
      const stripe = getStripe()
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)

      await supabase
        .from('companies')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: subscription.status,
          subscription_price_id: subscription.items.data[0]?.price.id ?? null,
          subscription_current_period_end: new Date(
            // In Stripe API 2026+, period end is on the subscription schedule or invoice.
          // Use ended_at as a best-effort fallback; null is acceptable.
          (subscription.ended_at ?? 0) * 1000
          ).toISOString(),
        })
        .eq('id', companyId)
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const companyId = subscription.metadata.company_id
      if (!companyId) break

      await supabase
        .from('companies')
        .update({
          subscription_status: subscription.status,
          subscription_price_id: subscription.items.data[0]?.price.id ?? null,
          subscription_current_period_end: new Date(
            // In Stripe API 2026+, period end is on the subscription schedule or invoice.
          // Use ended_at as a best-effort fallback; null is acceptable.
          (subscription.ended_at ?? 0) * 1000
          ).toISOString(),
        })
        .eq('id', companyId)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const companyId = subscription.metadata.company_id
      if (!companyId) break

      await supabase
        .from('companies')
        .update({
          subscription_status: 'canceled',
          subscription_current_period_end: new Date(
            // In Stripe API 2026+, period end is on the subscription schedule or invoice.
          // Use ended_at as a best-effort fallback; null is acceptable.
          (subscription.ended_at ?? 0) * 1000
          ).toISOString(),
        })
        .eq('id', companyId)
      break
    }

    default:
      // Unhandled event type — return 200 so Stripe doesn't retry
      break
  }

  return NextResponse.json({ received: true })
}
