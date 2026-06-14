import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { getStripe, getStripePriceId, type CheckoutPlan } from '@/lib/stripe'

const CHECKOUT_PLANS = new Set<CheckoutPlan>(['classic', 'pro'])

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout session for Classic or Ramply Pro.
 * Redirects to Stripe's hosted checkout page.
 */
export async function POST(req: Request) {
  let plan: CheckoutPlan = 'classic'
  try {
    const body = await req.json() as { plan?: string }
    if (body.plan && CHECKOUT_PLANS.has(body.plan as CheckoutPlan)) {
      plan = body.plan as CheckoutPlan
    }
  } catch {
    // Default to Classic when no body is provided.
  }

  const supabase = await createClient()
  const authSession = await requireAppSession(supabase)
  if (!authSession.ok) return authSession.response

  const { data: company } = await supabase
    .from('companies')
    .select('id, stripe_customer_id')
    .eq('owner_user_id', authSession.user.id)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const stripe = getStripe()
  const priceId = getStripePriceId(plan)

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    // Pre-fill customer if they already have a Stripe record
    ...(company.stripe_customer_id
      ? { customer: company.stripe_customer_id }
      : { customer_email: authSession.user.email }),
    // Pass company ID so the webhook can link the subscription back
    client_reference_id: company.id,
    success_url: `${appUrl}/dashboard/billing?success=1&plan=${plan}`,
    cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
    subscription_data: {
      metadata: { company_id: company.id, plan },
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
