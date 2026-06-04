import type { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_WAIT_MS = 3000
const POLL_INTERVAL_MS = 75

/**
 * Waits for detectSessionInUrl (or another handler) to establish a session.
 */
export async function waitForAuthSession(
  supabase: SupabaseClient,
  maxWaitMs = DEFAULT_WAIT_MS
): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) return true
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  return false
}

export function isPkceVerifierError(message: string): boolean {
  return /code verifier/i.test(message)
}
