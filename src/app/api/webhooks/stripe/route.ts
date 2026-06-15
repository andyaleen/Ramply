import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { getSubscriptionPeriodEnd } from '@/lib/stripe-subscription'
import { reportServerError } from '@/lib/monitoring'
import { getPostHogClient } from '@/lib/posthog-server'

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

      const { error: checkoutUpdateError } = await supabase
        .from('companies')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: subscription.status,
          subscription_price_id: subscription.items.data[0]?.price.id ?? null,
          subscription_current_period_end: getSubscriptionPeriodEnd(subscription),
        })
        .eq('id', companyId)

      if (checkoutUpdateError) {
        reportServerError('stripe.checkout.session.completed', checkoutUpdateError, { companyId })
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }

      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: companyId,
        event: 'subscription_started',
        properties: {
          plan: subscription.metadata.plan,
          subscription_id: subscriptionId,
        },
      })
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const companyId = subscription.metadata.company_id
      if (!companyId) break

      const { error: subscriptionUpdateError } = await supabase
        .from('companies')
        .update({
          subscription_status: subscription.status,
          subscription_price_id: subscription.items.data[0]?.price.id ?? null,
          subscription_current_period_end: getSubscriptionPeriodEnd(subscription),
        })
        .eq('id', companyId)

      if (subscriptionUpdateError) {
        console.error('Failed to update subscription:', subscriptionUpdateError)
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const companyId = subscription.metadata.company_id
      if (!companyId) break

      const { error: cancelUpdateError } = await supabase
        .from('companies')
        .update({
          subscription_status: 'canceled',
          subscription_current_period_end: getSubscriptionPeriodEnd(subscription),
        })
        .eq('id', companyId)

      if (cancelUpdateError) {
        console.error('Failed to cancel subscription in database:', cancelUpdateError)
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }
      break
    }

    default:
      // Unhandled event type — return 200 so Stripe doesn't retry
      break
  }

  return NextResponse.json({ received: true })
}
