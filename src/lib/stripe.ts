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

/** The Stripe Price ID for the Ramply Pro monthly subscription. */
export function getStripePriceId(): string {
  if (!process.env.STRIPE_PRO_PRICE_ID) {
    throw new Error('STRIPE_PRO_PRICE_ID is not set')
  }
  return process.env.STRIPE_PRO_PRICE_ID
}

/** Free tier limit: max number of unique companies a requester can connect with. */
export const FREE_TIER_LIMIT = 3
