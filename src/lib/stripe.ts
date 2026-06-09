import Stripe from 'stripe'

let stripeClient: Stripe | null = null

/** Server-only Stripe client. Never import this in client components. */
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    })
  }
  return stripeClient
}

export type CheckoutPlan = 'classic' | 'pro'

/** Returns the Stripe Price ID for the requested paid plan. */
export function getStripePriceId(plan: CheckoutPlan): string {
  const envKey = plan === 'classic' ? 'STRIPE_CLASSIC_PRICE_ID' : 'STRIPE_PRO_PRICE_ID'
  const priceId = process.env[envKey]
  if (!priceId) {
    throw new Error(`${envKey} is not set`)
  }
  return priceId
}
