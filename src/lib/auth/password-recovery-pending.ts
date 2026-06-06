import type { SupabaseClient } from '@supabase/supabase-js'
import { AUTH_UPDATE_PASSWORD_PATH } from '@/lib/auth/auth-redirect'

const RECOVERY_PENDING_KEY = 'ramply_password_recovery_pending'
const PASSWORD_RECOVERY_EVENT_WAIT_MS = 2500
/** Marks that the user started a password reset in this browser (same-tab email link). */
export function markPasswordRecoveryPending(): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(RECOVERY_PENDING_KEY, '1')
}

export function isPasswordRecoveryPending(): boolean {
  return (
    typeof window !== 'undefined'
    && sessionStorage.getItem(RECOVERY_PENDING_KEY) === '1'
  )
}

/** Returns true if a pending recovery was consumed. */
export function consumePasswordRecoveryPending(): boolean {
  if (typeof window === 'undefined') return false
  const pending = sessionStorage.getItem(RECOVERY_PENDING_KEY) === '1'
  sessionStorage.removeItem(RECOVERY_PENDING_KEY)
  return pending
}

/**
 * Supabase falls back to Site URL (`/?code=…`) when redirect_to is not allowlisted.
 * Only bare PKCE codes (no `next`) are treated as password recovery — OAuth callbacks
 * include `next=/dashboard` (or similar) and must not be routed to update-password.
 */
export function applySupabaseSiteUrlRecoveryRouting(params: URLSearchParams): void {
  if (!params.get('code')) return

  const type = params.get('type')
  if (type && type !== 'recovery') return

  if (type === 'recovery') {
    if (!params.get('next')) params.set('next', AUTH_UPDATE_PASSWORD_PATH)
    return
  }

  const next = params.get('next')
  if (next) {
    if (next === AUTH_UPDATE_PASSWORD_PATH) {
      params.set('type', 'recovery')
    }
    return
  }

  params.set('type', 'recovery')
  params.set('next', AUTH_UPDATE_PASSWORD_PATH)
}

/**
 * Applies recovery routing from sessionStorage and Site URL fallback patterns.
 */
export function applyPasswordRecoveryRoutingHints(params: URLSearchParams): void {
  if (isPasswordRecoveryPending()) {
    if (!params.get('type')) params.set('type', 'recovery')
    if (!params.get('next')) params.set('next', AUTH_UPDATE_PASSWORD_PATH)
  }
  applySupabaseSiteUrlRecoveryRouting(params)
}

/** @deprecated Use applyPasswordRecoveryRoutingHints */
export function applyRecoveryParamsIfPending(params: URLSearchParams): void {
  applyPasswordRecoveryRoutingHints(params)
}

/**
 * Waits briefly for Supabase to emit PASSWORD_RECOVERY after a code exchange.
 */
export function waitForPasswordRecoveryEvent(supabase: SupabaseClient): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      subscription.unsubscribe()
      clearTimeout(timer)
      resolve(value)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') finish(true)
    })

    const timer = setTimeout(() => finish(false), PASSWORD_RECOVERY_EVENT_WAIT_MS)
  })
}