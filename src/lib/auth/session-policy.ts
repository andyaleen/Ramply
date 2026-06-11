export const AUTH_SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000
export const AUTH_SESSION_ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000
export const AUTH_SESSION_WARNING_WINDOW_MS = 2 * 60 * 1000
export const AUTH_SESSION_ACTIVITY_THROTTLE_MS = 15 * 1000
export const AUTH_SESSION_CHECK_INTERVAL_MS = 30 * 1000

export const AUTH_PASSWORD_MIN_LENGTH = 12

export const AUTH_REDIRECT_REASON_SESSION_EXPIRED = 'session-expired'

export type SessionExpiryReason = 'idle' | 'absolute'

export type StoredSessionMetadata = {
  userId: string
  sessionStartedAt: number
  lastActivityAt: number
}

const SESSION_METADATA_STORAGE_KEY = 'ramply.auth.session-metadata'

/**
 * Parses and validates persisted session metadata from local storage.
 */
export function readStoredSessionMetadata(): StoredSessionMetadata | null {
  if (typeof window === 'undefined') return null

  const rawValue = window.localStorage.getItem(SESSION_METADATA_STORAGE_KEY)
  if (!rawValue) return null

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredSessionMetadata>
    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.sessionStartedAt !== 'number' ||
      typeof parsed.lastActivityAt !== 'number'
    ) {
      return null
    }

    return {
      userId: parsed.userId,
      sessionStartedAt: parsed.sessionStartedAt,
      lastActivityAt: parsed.lastActivityAt,
    }
  } catch {
    return null
  }
}

/**
 * Persists the current session timing metadata for cross-refresh continuity.
 */
export function writeStoredSessionMetadata(metadata: StoredSessionMetadata): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SESSION_METADATA_STORAGE_KEY, JSON.stringify(metadata))
}

/**
 * Removes persisted session timing state after logout or account switches.
 */
export function clearStoredSessionMetadata(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SESSION_METADATA_STORAGE_KEY)
}

/**
 * Seeds the first authenticated timestamp from Supabase when available.
 */
export function getSessionStartTimestamp(lastSignInAt: string | null | undefined): number {
  const parsed = lastSignInAt ? Date.parse(lastSignInAt) : Number.NaN
  return Number.isFinite(parsed) ? parsed : Date.now()
}

/**
 * Returns the current timeout state for the active authenticated session.
 */
export function getSessionTimeoutState(metadata: StoredSessionMetadata, now = Date.now()) {
  const idleElapsedMs = now - metadata.lastActivityAt
  const absoluteElapsedMs = now - metadata.sessionStartedAt
  const idleRemainingMs = AUTH_SESSION_IDLE_TIMEOUT_MS - idleElapsedMs
  const absoluteRemainingMs = AUTH_SESSION_ABSOLUTE_TIMEOUT_MS - absoluteElapsedMs

  if (idleRemainingMs <= 0) {
    return {
      shouldExpire: true,
      reason: 'idle' as SessionExpiryReason,
      remainingMs: 0,
    }
  }

  if (absoluteRemainingMs <= 0) {
    return {
      shouldExpire: true,
      reason: 'absolute' as SessionExpiryReason,
      remainingMs: 0,
    }
  }

  const warningReason =
    absoluteRemainingMs <= AUTH_SESSION_WARNING_WINDOW_MS
      ? ('absolute' as SessionExpiryReason)
      : idleRemainingMs <= AUTH_SESSION_WARNING_WINDOW_MS
        ? ('idle' as SessionExpiryReason)
        : null

  return {
    shouldExpire: false,
    reason: warningReason,
    remainingMs: Math.min(idleRemainingMs, absoluteRemainingMs),
  }
}

/**
 * Returns true when the authenticated session has exceeded the absolute
 * lifetime limit, based on the user's last sign-in timestamp.
 */
export function isAbsoluteAppSessionExpired(
  user: { last_sign_in_at?: string | null },
  now = Date.now()
): boolean {
  const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0
  if (!lastSignIn) return false
  return now - lastSignIn > AUTH_SESSION_ABSOLUTE_TIMEOUT_MS
}

/**
 * Converts login-page reason query params into user-facing session messages.
 */
export function getSessionExpiryMessage(reason: string | null): string | null {
  if (reason !== AUTH_REDIRECT_REASON_SESSION_EXPIRED) {
    return null
  }

  return 'Your session expired for security reasons. Please sign in again.'
}
