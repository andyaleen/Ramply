import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getMonthStartUtc } from '@/lib/plan-limits'

type AppSupabase = SupabaseClient<Database>

/** Counts total and current-month share requests sent by a company. */
export async function getShareRequestCounts(
  supabase: AppSupabase,
  companyId: string,
): Promise<{ totalSent: number; monthlySent: number }> {
  const monthStart = getMonthStartUtc().toISOString()

  const [{ count: totalSent }, { count: monthlySent }] = await Promise.all([
    supabase
      .from('share_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requester_company_id', companyId),
    supabase
      .from('share_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requester_company_id', companyId)
      .gte('created_at', monthStart),
  ])

  return {
    totalSent: totalSent ?? 0,
    monthlySent: monthlySent ?? 0,
  }
}
