import { NextResponse } from 'next/server'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { getBillingStatus } from '@/lib/billing'
import { createClient } from '@/lib/supabase/server'

/** Returns billing and usage status for the signed-in user's company. */
export async function GET() {
  const supabase = await createClient()
  const session = await requireAppSession(supabase)
  if (!session.ok) return session.response
  const { user } = session

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
