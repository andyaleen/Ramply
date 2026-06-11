import { NextResponse } from 'next/server'
import { getBillingStatus } from '@/lib/billing'
import { createClient } from '@/lib/supabase/server'

/** Returns billing and usage status for the signed-in user's company. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = await getBillingStatus()
  if (!status) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('subscription_status, subscription_current_period_end')
    .eq('owner_user_id', user.id)
    .single()

  return NextResponse.json({
    ...status,
    subscriptionStatus: company?.subscription_status ?? null,
    periodEnd: company?.subscription_current_period_end ?? null,
  })
}
