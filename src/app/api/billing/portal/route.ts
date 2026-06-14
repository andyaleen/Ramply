import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { getStripe } from '@/lib/stripe'

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session so the user can manage their subscription.
 * Requires an existing Stripe customer ID on the company.
 */
export async function POST() {
  const supabase = await createClient()
  const authSession = await requireAppSession(supabase)
  if (!authSession.ok) return authSession.response

  const { data: company } = await supabase
    .from('companies')
    .select('stripe_customer_id')
    .eq('owner_user_id', authSession.user.id)
    .single()

  if (!company?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const stripe = getStripe()
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: company.stripe_customer_id,
    return_url: `${appUrl}/dashboard/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}
