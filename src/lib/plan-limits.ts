import { readEnv } from '@/lib/env'

export const FREE_REQUEST_LIMIT = 3
export const CLASSIC_MONTHLY_LIMIT = 20

export type SubscriptionPlan = 'free' | 'classic' | 'pro'
export type PlanLimitError = 'free_tier_limit' | 'classic_monthly_limit'

export function isActiveSubscription(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing'
}

/** Parses BILLING_EXEMPT_EMAILS (comma-separated, server-only) into a normalized set. */
export function getBillingExemptEmails(): Set<string> {
  const raw = readEnv('BILLING_EXEMPT_EMAILS')
  if (!raw) return new Set()

  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

/** True when the signed-in user's email is on the internal unlimited billing allowlist. */
export function isBillingExemptEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false
  return getBillingExemptEmails().has(email.trim().toLowerCase())
}

/** Maps a Stripe price ID to the Ramply subscription plan. */
export function getPlanFromPriceId(priceId: string | null | undefined): SubscriptionPlan {
  if (!priceId) return 'free'
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_CLASSIC_PRICE_ID) return 'classic'
  return 'free'
}

/** Returns the first instant of the current calendar month in UTC. */
export function getMonthStartUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export interface RequestCounts {
  totalSent: number
  monthlySent: number
}

export interface SendRequestLimitResult {
  allowed: boolean
  error?: PlanLimitError
  message?: string
  plan: SubscriptionPlan
}

/**
 * Enforces Ramply send limits:
 * - Free: 3 total share requests
 * - Classic: 20 share requests per calendar month
 * - Pro: unlimited
 */
export function checkSendRequestLimit(
  subscriptionStatus: string | null | undefined,
  subscriptionPriceId: string | null | undefined,
  counts: RequestCounts,
  userEmail?: string | null,
): SendRequestLimitResult {
  if (isBillingExemptEmail(userEmail)) {
    return { allowed: true, plan: 'pro' }
  }

  const subscribed = isActiveSubscription(subscriptionStatus)
  const plan = subscribed ? getPlanFromPriceId(subscriptionPriceId) : 'free'

  if (plan === 'pro') {
    return { allowed: true, plan }
  }

  if (plan === 'classic') {
    if (counts.monthlySent >= CLASSIC_MONTHLY_LIMIT) {
      return {
        allowed: false,
        plan,
        error: 'classic_monthly_limit',
        message: 'You have reached the Classic plan limit of 20 share requests this month. Upgrade to Ramply Pro for unlimited requests.',
      }
    }
    return { allowed: true, plan }
  }

  if (counts.totalSent >= FREE_REQUEST_LIMIT) {
    return {
      allowed: false,
      plan,
      error: 'free_tier_limit',
      message: 'You have used all 3 free share requests. Subscribe to Classic or Ramply Pro to send more.',
    }
  }

  return { allowed: true, plan }
}
