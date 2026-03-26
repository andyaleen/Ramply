import Stripe from 'stripe'

/** Server-only Stripe client. Never import this in client components. */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

/** The Stripe Price ID for the Ramply Pro monthly subscription. */
export const STRIPE_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID!

/** Free tier limit: max number of unique companies a requester can connect with. */
export const FREE_TIER_LIMIT = 3
