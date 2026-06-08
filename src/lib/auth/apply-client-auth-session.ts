import type { SupabaseClient } from '@supabase/supabase-js'

import type { CompletePasswordSignInSession } from '@/lib/auth/complete-password-sign-in'

/**
 * Establishes the browser Supabase session after a successful server sign-in.
 */
export async function applyClientAuthSession(
  supabase: SupabaseClient,
  session: CompletePasswordSignInSession | null | undefined
): Promise<void> {
  if (session?.access_token && session.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
    if (error) {
      throw error
    }
    return
  }

  await supabase.auth.getSession()
}
