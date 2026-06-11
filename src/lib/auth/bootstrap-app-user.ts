import type { SupabaseClient } from '@supabase/supabase-js'
import type { CompanyRow, UserRow } from '@/lib/database.types'

export type BootstrapAppUserResult = {
  userProfile: UserRow
  company: CompanyRow
}

type BootstrapAppUserPayload = {
  user: UserRow
  company: CompanyRow
}

/** Parses the JSON payload returned by the `bootstrap_app_user` RPC. */
export function parseBootstrapAppUserPayload(data: unknown): BootstrapAppUserResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid bootstrap payload')
  }

  const payload = data as Partial<BootstrapAppUserPayload>
  if (!payload.user || !payload.company) {
    throw new Error('Missing user or company in bootstrap payload')
  }

  return {
    userProfile: payload.user,
    company: payload.company,
  }
}

/**
 * Ensures the signed-in user has app-owned user + company rows and returns them.
 */
export async function bootstrapAppUser(
  supabase: SupabaseClient
): Promise<BootstrapAppUserResult> {
  const { data, error } = await supabase.rpc('bootstrap_app_user')
  if (error) throw error
  return parseBootstrapAppUserPayload(data)
}
