import { createClient } from '@/lib/supabase/server'
import { FREE_TIER_LIMIT } from '@/lib/stripe'

export interface BillingStatus {
  /** Whether the company has an active paid subscription. */
  isSubscribed: boolean
  /** Number of unique companies that have completed a share request. */
  connectedCount: number
  /** True when on the free tier and at or over the limit. */
  isAtLimit: boolean
  /** The company's Stripe customer ID, if one exists. */
  stripeCustomerId: string | null
}

/**
 * Returns the billing status for the authenticated user's company.
 * Used server-side (Route Handlers and Server Components).
 */
export async function getBillingStatus(): Promise<BillingStatus | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: company } = await supabase
    .from('companies')
    .select('id, stripe_customer_id, subscription_status')
    .eq('owner_user_id', user.id)
    .single()

  if (!company) return null

  // Count distinct companies that have completed a share request to this requester
  const { data: connections } = await supabase
    .from('share_requests')
    .select('completed_by_company_id')
    .eq('requester_company_id', company.id)
    .eq('status', 'completed')
    .not('completed_by_company_id', 'is', null)

  const connectedCount = new Set(
    (connections ?? []).map((r) => r.completed_by_company_id)
  ).size

  const isSubscribed = company.subscription_status === 'active' ||
    company.subscription_status === 'trialing'

  return {
    isSubscribed,
    connectedCount,
    isAtLimit: !isSubscribed && connectedCount >= FREE_TIER_LIMIT,
    stripeCustomerId: company.stripe_customer_id ?? null,
  }
}
