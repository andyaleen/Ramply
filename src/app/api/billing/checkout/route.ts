import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getStripe, getStripePriceId } from '@/lib/stripe'

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout session for the Pro subscription.
 * Redirects to Stripe's hosted checkout page.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, stripe_customer_id')
    .eq('owner_user_id', user.id)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const stripe = getStripe()
  const priceId = getStripePriceId()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    // Pre-fill customer if they already have a Stripe record
    ...(company.stripe_customer_id
      ? { customer: company.stripe_customer_id }
      : { customer_email: user.email }),
    // Pass company ID so the webhook can link the subscription back
    client_reference_id: company.id,
    success_url: `${appUrl}/dashboard/billing?success=1`,
    cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
    subscription_data: {
      metadata: { company_id: company.id },
    },
  })

  return NextResponse.json({ url: session.url })
}
