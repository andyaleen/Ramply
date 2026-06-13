import type { SupabaseClient } from '@supabase/supabase-js'

export interface OwnedBillingCompany {
  id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string | null
  subscription_price_id: string | null
}

/** Loads the signed-in user's company row used for Stripe billing operations. */
export async function getOwnedBillingCompany(
  supabase: SupabaseClient,
  userId: string,
): Promise<OwnedBillingCompany | null> {
  const { data: company, error } = await supabase
    .from('companies')
    .select(
      'id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_price_id',
    )
    .eq('owner_user_id', userId)
    .single()

  if (error || !company) return null
  return company
}
