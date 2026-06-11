import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  checkSendRequestLimit,
  CLASSIC_MONTHLY_LIMIT,
  FREE_REQUEST_LIMIT,
  getPlanFromPriceId,
  isActiveSubscription,
  isBillingExemptEmail,
  type SubscriptionPlan,
} from '@/lib/plan-limits'
import { getShareRequestCounts } from '@/lib/request-usage'

/** Resolve the email used for billing exemptions (auth email, then app users row). */
export async function resolveUserBillingEmail(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'email'>
): Promise<string | null> {
  const authEmail = user.email?.trim()
  if (authEmail) return authEmail

  const { data } = await supabase
    .from('users')
    .select('email')
    .eq('id', user.id)
    .maybeSingle()

  return data?.email?.trim() ?? null
}

export interface BillingStatus {
  plan: SubscriptionPlan
  isSubscribed: boolean
  isBillingExempt: boolean
  totalSent: number
  monthlySent: number
  isAtLimit: boolean
  limitError: 'free_tier_limit' | 'classic_monthly_limit' | null
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
    .select('id, stripe_customer_id, subscription_status, subscription_price_id')
    .eq('owner_user_id', user.id)
    .single()

  if (!company) return null

  const counts = await getShareRequestCounts(supabase, company.id)
  const billingEmail = await resolveUserBillingEmail(supabase, user)
  const isBillingExempt = isBillingExemptEmail(billingEmail)
  const subscribed = isActiveSubscription(company.subscription_status)
  const limit = checkSendRequestLimit(
    company.subscription_status,
    company.subscription_price_id,
    counts,
    billingEmail,
  )
  const plan = isBillingExempt
    ? 'pro'
    : subscribed
      ? getPlanFromPriceId(company.subscription_price_id)
      : 'free'

  return {
    plan,
    isSubscribed: subscribed,
    isBillingExempt,
    totalSent: counts.totalSent,
    monthlySent: counts.monthlySent,
    isAtLimit: !limit.allowed,
    limitError: limit.error ?? null,
    stripeCustomerId: company.stripe_customer_id ?? null,
  }
}

export { FREE_REQUEST_LIMIT, CLASSIC_MONTHLY_LIMIT }
