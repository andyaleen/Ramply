import type Stripe from 'stripe'

/** Returns ISO period end from a Stripe subscription, or null when unavailable. */
export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const periodEnd = subscription.items?.data?.[0]?.current_period_end
  if (!periodEnd) return null
  return new Date(periodEnd * 1000).toISOString()
}
